---
title: 【Android】Retrofit源码分析
layout: post
date: 2018-04-10 22:20:55
comments: true
tags: 
    - Android
    - 源码分析
categories: 
    - Android
    - 源码分析
keywords: Retrofit
description: 
photos:
    - https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/android_common/retrofit.jpg
---



### Retrofit简介

`retrofit` n. 式样翻新，花样翻新      vt. 给机器设备装配（新部件），翻新，改型



[**Retrofit**](http://square.github.io/retrofit/) 是一个 RESTful 的 HTTP 网络请求框架的封装。注意这里并没有说它是网络请求框架，主要原因在于网络请求的工作并不是 `Retrofit` 来完成的。`Retrofit` 2.0 开始内置 [`OkHttp`](http://square.github.io/okhttp/)，前者专注于接口的封装，后者专注于真正的网络请求。即通过 大量的设计模式 封装了 `OkHttp` ，使得简洁易用。

![](/gallery/android_common/4182937778-57515297dacff_articlex.png)

我们的应用程序通过 `Retrofit` 请求网络，实际上是使用 `Retrofit` 接口层封装请求参数、Header、Url 等信息，之后由 `OkHttp`完成后续的请求操作，在服务端返回数据之后，`OkHttp` 将原始的结果交给 `Retrofit`，后者根据用户的需求对结果进行解析的过程。Retrofit的大概原理过程如下：

1. `Retrofit` 将 `Http`请求 抽象 成 `Java`接口
2. 在接口里用 注解 描述和配置 网络请求参数
3. 用动态代理 的方式，动态将网络请求接口的注解 解析 成`HTTP`请求
4. 最后执行`HTTP`请求

这篇文章我将从Retrofit的基本用法出发，按照其使用步骤，一步步的探究Retrofit的实现原理及其源码的设计模式。

Retrofit Github: [https://github.com/square/retrofit](https://github.com/square/retrofit)

### 使用步骤

使用 `Retrofit` 非常简单，首先需要在 build.gradle 中添加依赖：

```Java
implementation 'com.squareup.retrofit2:retrofit:2.4.0'
```

如果需要使用Gson解析器，也需要在build.gradle中添加依赖（后文会详细讲到Retrofit的Converter）：

```java
implementation 'com.squareup.retrofit2:converter-gson:2.0.2'
```

#### 1. 定义Interface

Retrofit使用java interface和注解描述了HTTP请求的API参数，比如Github的一个API：

```java
public interface GitHubService {
  @GET("users/{user}/repos")
  Call<List<Repo>> listRepos(@Path("user") String user);
}

```

<!-- more -->

其中Repo类定义如下：

```java
public class Repo {
    public String name;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }
}
```

#### 2. 创建Retrofit实例

这样调用Retrofit就会为上面这个interface自动生成一个实现类：

```java
Retrofit retrofit = new Retrofit.Builder()
    .baseUrl("https://api.github.com/")
    .addConverterFactory(GsonConverterFactory.create())		//添加Gson解析器
    .build();

GitHubService service = retrofit.create(GitHubService.class);
```

#### 3. 发起请求

然后调用interface的具体方法时（这里是`listRepos()`）就构造好了一个`Call`，

```java
Call<List<Repo>> call = service.listRepos("octocat");
```

返回的 `call` 其实并不是真正的数据结果，只是封装成了一个随时可以执行的请求，需要在合适的时机去执行它：

```java
// 同步调用
List<Repo> data = repos.execute(); 

// 异步调用
repos.enqueue(new Callback<List<Repo>>() {
            @Override
            public void onResponse(Call<List<Repo>> call, Response<List<Repo>> response) {
                List<Repo> data = response.body();
            }

            @Override
            public void onFailure(Call<List<Repo>> call, Throwable t) {
                t.printStackTrace();
            }
        });
```

怎么样，有没有突然觉得请求接口就好像访问自家的方法一样简单？下面我们转入源码分析，按照使用步骤来探索Retrofit的实现原理。

### 源码分析

我们先来看看Retrofit的实例化步骤。先看看Retrofit这个类的参数

```java
public final class Retrofit {
  private final Map<Method, ServiceMethod<?, ?>> serviceMethodCache = new ConcurrentHashMap<>();

  final okhttp3.Call.Factory callFactory;	// 生产网络请求器（Call）的工厂，默认使用OkHttp
  final HttpUrl baseUrl;	// url地址
  final List<Converter.Factory> converterFactories;	// 数据转换器（converter）工厂
  final List<CallAdapter.Factory> callAdapterFactories;	// 生产网络请求适配器（CallAdapter）的工厂List
  final @Nullable Executor callbackExecutor;	// 回调方法执行器
  final boolean validateEagerly;	// 是否提前对业务接口中的注解进行验证转换的标志位

    
  //构造函数
  Retrofit(okhttp3.Call.Factory callFactory, HttpUrl baseUrl,
      List<Converter.Factory> converterFactories, List<CallAdapter.Factory> callAdapterFactories,
      @Nullable Executor callbackExecutor, boolean validateEagerly) {
    this.callFactory = callFactory;
    this.baseUrl = baseUrl;
    this.converterFactories = converterFactories; // Copy+unmodifiable at call site.
    this.callAdapterFactories = callAdapterFactories; // Copy+unmodifiable at call site.
    this.callbackExecutor = callbackExecutor;
    this.validateEagerly = validateEagerly;
  }
    
    
  //...省略其他代码...
}
```

Retrofit的构造函数是package包可见的，并不是public的，所以外部并不能直接new，而是要通过`Retrofit.Builder`来实例化。

#### Retrofit.Builder

`Retrofit.Builder` 是 Retrofit 类中的一个子类，负责用来创建 Retrofit 实例对象，使用『Builder模式』的好处是清晰明了可定制化。

```java
public static final class Builder {
    private final Platform platform;
    private @Nullable okhttp3.Call.Factory callFactory;
    private HttpUrl baseUrl;
    private final List<Converter.Factory> converterFactories = new ArrayList<>();
    private final List<CallAdapter.Factory> callAdapterFactories = new ArrayList<>();
    private @Nullable Executor callbackExecutor;
    private boolean validateEagerly;

    Builder(Platform platform) {
      this.platform = platform;
    }

    //构造函数
    public Builder() {
      // Retrofit支持Android Java8 默认Platform 三种平台，此处确认当前是在哪个平台环境运行
      this(Platform.get());
    }
    
    //...省略其他代码...
}
```

可以看到`Retrofit.Builder` 中的成员变量跟Retrofit中基本上是一一对应的，就不过多解释了。这里可以看到Builder的构造函数中默认判断了一下当前的运行平台。

最后，在创建 `Retrofit.Builder` 对象并进行自定义配置后，我们就要调用 `build()` 方法来构造出 `Retrofit` 对象了。那么，我们来看下 `build()` 方法里干了什么：

```java
public Retrofit build() {
    // 必须要配置baseUrl
    if (baseUrl == null) {
        throw new IllegalStateException("Base URL required.");
    }

    // 默认为 OkHttpClient
    okhttp3.Call.Factory callFactory = this.callFactory;
    if (callFactory == null) {
        callFactory = new OkHttpClient();
    }

    // Android 平台下默认为 MainThreadExecutor
    Executor callbackExecutor = this.callbackExecutor;
    if (callbackExecutor == null) {
        callbackExecutor = platform.defaultCallbackExecutor();
    }

    // Make a defensive copy of the adapters and add the default Call adapter.
    List<CallAdapter.Factory> callAdapterFactories = new ArrayList<>(this.callAdapterFactories);
    // 添加默认的 ExecutorCallAdapterFactory
    callAdapterFactories.add(platform.defaultCallAdapterFactory(callbackExecutor));

    // Make a defensive copy of the converters.
    List<Converter.Factory> converterFactories =
            new ArrayList<>(1 + this.converterFactories.size());

    // Add the built-in converter factory first. This prevents overriding its behavior but also
    // ensures correct behavior when using converters that consume all types.
    // 首先添加默认的 BuiltInConverters
    converterFactories.add(new BuiltInConverters());
    converterFactories.addAll(this.converterFactories);

    return new Retrofit(callFactory, baseUrl, unmodifiableList(converterFactories),
            unmodifiableList(callAdapterFactories), callbackExecutor, validateEagerly);
}
```

在 `build()` 中，做的事情有：检查配置、设置默认配置、创建 `Retrofit` 对象。并且在执行 `.build()` 方法前，只有 `.baseUrl()` 是必须调用来设置访问地址的，其余方法则是可选的。同时我们可以看到设置了很多默认成员，但这里我们重点关注四个成员：`callFactory`，`callAdapter`，`responseConverter`和 `parameterHandlers`。

1. `callFactory` 负责创建 HTTP 请求，HTTP 请求被抽象为了 `okhttp3.Call` 类，它表示一个已经准备好，可以随时执行的 HTTP 请求；
2. `callAdapter` 负责把 `retrofit2.Call<?>` 里的`Call`转换为 另一种类型`T`（注意和 `okhttp3.Call` 区分开来，`retrofit2.Call<?>` 表示的是对一个 Retrofit 方法的调用），这个过程会发送一个 HTTP 请求，拿到服务器返回的数据（通过 `okhttp3.Call` 实现），并把数据转换为声明的 `T` 类型对象（通过 `Converter<F, T>` 实现）；
3. `responseConverter` 是 `Converter<ResponseBody, T>` 类型，负责把服务器返回的数据（JSON、XML、PB、二进制或者其他格式，由 `ResponseBody` 封装）转化为 `T` 类型的对象；
4. `parameterHandlers` 则负责解析 API 定义时每个方法的参数，并在构造 HTTP 请求时设置参数；

#### CallAdapter和Converter到底是干什么的？

这里多插两句，给大家解释一下这个`CallAdapter`和`Converter`到底是干什么的？我们知道，最简单的Retrofit接口一般定义如下：

```java
public interface GitHubService {
    @GET("users/{user}/repos")
    Call<ResponseBody> listRepos(@Path("user") String user);
}
```

在给Retrofit不添加任何`CallAdapterFactory`的情况下，接口方法的返回类型必须是`Call<?>`，不能是其他类型。因而Retrofit提供了对这个Call进行转换为其他类型的功能，那就是`CallAdapter`。比如添加一个**RxJava**的CallAdapter：

```java
Retrofit retrofit = new Retrofit.Builder()
    .baseUrl("https://api.example.com")
    .addCallAdapterFactory(RxJavaCallAdapterFactory.create())	// RxJava转换器
    .build();
```

然后我们就可以这样定义接口：

```java
interface MyService {
    @GET("/user")
    Observable<User> getUser();
}
```

如果添加了一个**Java8**的CallAdapter，就可以这样定义接口：

```java
interface MyService {
    @GET("/user")
    CompletableFuture<User> getUser();
}
```

##### Retrofit提供的CallAdapter：

| CallAdapter | Gradle依赖                                           |
| ----------- | ---------------------------------------------------- |
| guava       | com.squareup.retrofit2:adapter-guava:latest.version  |
| Java8       | com.squareup.retrofit2:adapter-java8:latest.version  |
| rxjava      | com.squareup.retrofit2:adapter-rxjava:latest.version |
| rxjava2	|com.squareup.retrofit2:adapter-rxjava2:latest.version|
| scala         |com.squareup.retrofit2:adapter-scala:latest.version|

同样地，如果在不给Retrofit添加任何`ConverterFactory`的情况下，接口方法返回类型`Call<T>`里的泛型`T`必须是`ResponseBody`，而不能是其他类型（比如`List<User>`），这就是`Converter`的作用，直白点也就是数据解析器，负责把`ResponseBody`解析成`List<User>`。

另外，在我们构造 HTTP 请求时，我们传递的参数都是使用的注解类型（诸如 `Path`，`Query`，`Field` 等），那 Retrofit 是如何把我们传递的各种参数都转化为 String 的呢？还是由 `Retrofit` 类提供` Converter`！

`Converter.Factory` 除了提供responseBodyConverter，还提供 requestBodyConverter 和 stringConverter，API 方法中除了 `@Body` 和 `@Part` 类型的参数，都利用 stringConverter 进行转换，而 `@Body` 和 `@Part` 类型的参数则利用 requestBodyConverter 进行转换。

##### Retrofit提供的Converter

| Converter  | Gradle依赖                                           |
| ---------- | ---------------------------------------------------- |
| Gson       | com.squareup.retrofit2:converter-gson:latest.version |
| Guava		| com.squareup.retrofit2:converter-guava:latest.version|
| Jackson    | com.squareup.retrofit2:converter-jackson:latest.version |
| Java8 | com.squareup.retrofit2:converter-java8:latest.version|
| Jaxb | com.squareup.retrofit2:converter-jaxb:latest.version|
| Moshi      | com.squareup.retrofit2:converter-moshi:latest.version |
| Protobuf   | com.squareup.retrofit2:converter-protobuf:latest.version |
| Scalars | com.squareup.retrofit2:converter-scalars:latest.version |
| Wire       |com.squareup.retrofit2:converter-wire:latest.version |
| Simple XML | com.squareup.retrofit2:converter-simplexml:latest.version |


#### Platform

这里我们再来个小插曲，来看下 Retrofit 是如何确定当前运行的是哪个平台环境的。

```java
class Platform {
    private static final Platform PLATFORM = findPlatform();

    static Platform get() {
        return PLATFORM;
    }

    private static Platform findPlatform() {
        try {
            Class.forName("android.os.Build");		//通过反射判断平台
            if (Build.VERSION.SDK_INT != 0) {
                return new Android();
            }
        } catch (ClassNotFoundException ignored) {
        }
        try {
            Class.forName("java.util.Optional");
            return new Java8();
        } catch (ClassNotFoundException ignored) {
        }
        return new Platform();
    }

    //默认Platform的callbackExecutor
    @Nullable
    Executor defaultCallbackExecutor() {
        return null;
    }

    CallAdapter.Factory defaultCallAdapterFactory(@Nullable Executor callbackExecutor) {
        if (callbackExecutor != null) {
            return new ExecutorCallAdapterFactory(callbackExecutor);
        }
        return DefaultCallAdapterFactory.INSTANCE;
    }

    boolean isDefaultMethod(Method method) {
        return false;
    }

    @Nullable
    Object invokeDefaultMethod(Method method, Class<?> declaringClass, Object object,
                               @Nullable Object... args) throws Throwable {
        throw new UnsupportedOperationException();
    }
}
```

从上面的代码中可以看到，是通过反射判断有没有该类来实现的。比较巧妙，大家可以的学习一下。

而此处的`Android`和`Java8`均是Platform的子类：

```java
static class Android extends Platform {
    
    //Android平台的默认callbackExecutor，实际上就是抛到UI线程去执行回调
    @Override 
    public Executor defaultCallbackExecutor() {
        return new MainThreadExecutor();
    }

    //Android平台的默认CallAdapterFactory
    @Override 
    CallAdapter.Factory defaultCallAdapterFactory(@Nullable Executor callbackExecutor) {
        if (callbackExecutor == null) throw new AssertionError();
        return new ExecutorCallAdapterFactory(callbackExecutor);
    }

    static class MainThreadExecutor implements Executor {
        private final Handler handler = new Handler(Looper.getMainLooper());

        @Override 
        public void execute(Runnable r) {
            handler.post(r);
        }
    }
}
```

Java8的定义如下：

```java
@IgnoreJRERequirement // Only classloaded and used on Java 8.
static class Java8 extends Platform {
    
    //判断被调用的method是否Java8的默认方法
    @Override 
    boolean isDefaultMethod(Method method) {
        return method.isDefault();
    }

    //调用默认方法
    @Override 
    Object invokeDefaultMethod(Method method, Class<?> declaringClass, Object object,
                                         @Nullable Object... args) throws Throwable {
        // Because the service interface might not be public, we need to use a MethodHandle lookup
        // that ignores the visibility of the declaringClass.
        Constructor<Lookup> constructor = Lookup.class.getDeclaredConstructor(Class.class, int.class);
        constructor.setAccessible(true);
        return constructor.newInstance(declaringClass, -1 /* trusted */)
                .unreflectSpecial(method, declaringClass)
                .bindTo(object)
                .invokeWithArguments(args);
    }
}
```

Java 8 的interface引入了新的语言特性——默认方法（Default Methods）。大家可以参考这篇文章：[Java8 默认方法 default method](https://blog.csdn.net/u010003835/article/details/76850242)

> 默认方法允许您添加新的功能到现有库的接口中，并能确保与采用旧版本接口编写的代码的二进制兼容性。

所以如果在Java8的平台上使用Retrofit的话，Retrofit需要排除我们定义的interface中的这些Default Methods。



在使用`Retrofit.Builder`实例化得到 `Retrofit` 对象后就是调用 `Retrofit#create()` 方法来创建我们 API 接口的实例。

#### Retrofit

所以我们需要跟进Retrofit类中的 `create(final Class<T> service)` 方法来看下：

```java
public <T> T create(final Class<T> service) {
  // 校验是否为接口，且不能继承其他接口
  Utils.validateServiceInterface(service);
  // 是否需要提前解析接口方法
  if (validateEagerly) {
    eagerlyValidateMethods(service);
  }
  // 动态代理模式, 返回一个 service 接口的代理对象
  return (T) Proxy.newProxyInstance(service.getClassLoader(), new Class<?>[] { service },
      new InvocationHandler() {
        private final Platform platform = Platform.get();

        @Override public Object invoke(Object proxy, Method method, Object... args)
            throws Throwable {
          // If the method is a method from Object then defer to normal invocation.
          if (method.getDeclaringClass() == Object.class) {
            return method.invoke(this, args);
          }
          if (platform.isDefaultMethod(method)) {
            return platform.invokeDefaultMethod(method, service, proxy, args);
          }
          // 将接口中的方法构造为 ServiceMethod
          ServiceMethod serviceMethod = loadServiceMethod(method);
          OkHttpCall okHttpCall = new OkHttpCall<>(serviceMethod, args);
          return serviceMethod.callAdapter.adapt(okHttpCall);
        }
      });
}
```

在上面的代码中，最关键的就是『动态代理』，返回了一个 Proxy 代理类，调用接口中的任何方法都会调用 proxy 里的 invoke 方法。实际上，进行网络操作的都是通过代理类来完成的。**简单的说，在我们前面的示例代码中调用 `GitHubService.listRepos` 时，实际上调用的是这里的 `InvocationHandler.invoke` 方法。**

 `InvocationHandler.invoke`这个方法的意思是：如果调用的是 `Object` 的方法，例如 `equals`，`toString`，那就直接调用。如果是 default 方法（Java 8 引入的新语法），就调用 default 方法。这些我们都先不管，因为我们在Android平台调用 `listRepos`，肯定不是这两种情况，那这次调用真正干活的就是这三行代码了：

```java
// 将接口中的方法构造为 ServiceMethod
ServiceMethod<Object, Object> serviceMethod = (ServiceMethod<Object, Object>) loadServiceMethod(method);
OkHttpCall<Object> okHttpCall = new OkHttpCall<>(serviceMethod, args);
return serviceMethod.adapt(okHttpCall);
```

**这三句代码，下面我们着重来看。**

在代理中，会根据参数中传入的具体接口方法来构造出对应的 `serviceMethod` 。`ServiceMethod` 类的作用就是把接口的方法适配为对应的 HTTP call 。

```java
ServiceMethod<?, ?> loadServiceMethod(Method method) {
    // 先从缓存中取，若没有就去创建对应的 ServiceMethod
    ServiceMethod<?, ?> result = serviceMethodCache.get(method);
    if (result != null) return result;

    synchronized (serviceMethodCache) {
      result = serviceMethodCache.get(method);
      if (result == null) {
        // 没有缓存就创建，之后再放入缓存中
        result = new ServiceMethod.Builder<>(this, method).build();
        serviceMethodCache.put(method, result);
      }
    }
    return result;
}
```

可以看到在内部还维护了一个 `serviceMethodCache` 来缓存 `ServiceMethod` ，同一个 API 的同一个方法，只会创建一次。由于我们每次获取 API 实例都是传入的 `class` 对象（比如示例中的GitHubService.class），而 `class` 对象是进程内单例的，所以获取到它的同一个方法 `Method` 实例也是单例的，所以这里的缓存是有效的。我们就直接来看 `ServiceMethod` 是如何被创建的吧。

#### ServiceMethod

`ServiceMethod<R, T>` 类的作用正如其 JavaDoc 所言：

> Adapts an invocation of an interface method into an HTTP call. 把对接口方法的调用转为一次 HTTP 调用。

一个 `ServiceMethod` 对象对应于一个 API interface 的一个方法，上面的`loadServiceMethod(method)`方法负责加载了 `ServiceMethod`。我们发现 `ServiceMethod` 也是通过建造者模式（`ServiceMethod.Builder`）来创建对象的。那就进入对应构造方法：

```java
// 位于ServiceMethod类中
Builder(Retrofit retrofit, Method method) {
      this.retrofit = retrofit;
      this.method = method;
      // 接口方法的注解
      this.methodAnnotations = method.getAnnotations();
      // 接口方法的参数类型
      this.parameterTypes = method.getGenericParameterTypes();
      // 接口方法参数的注解
      this.parameterAnnotationsArray = method.getParameterAnnotations();
}
```

在构造方法中没有什么特别的地方，我们单刀直入 `build()` 方法：

```java
public ServiceMethod build() {
      // 根据接口方法的注解和返回类型创建 callAdapter
      // 如果没有添加 CallAdapter 那么默认会用 ExecutorCallAdapterFactory
      callAdapter = createCallAdapter();
      // calladapter 的响应类型中的泛型，比如 Call<User> 中的 User
      responseType = callAdapter.responseType();
      if (responseType == Response.class || responseType == okhttp3.Response.class) {
          throw methodError("'"
                  + Utils.getRawType(responseType).getName()
                  + "' is not a valid response body type. Did you mean ResponseBody?");
      }
    
      // 根据之前泛型中的类型以及接口方法的注解创建 ResponseConverter
      responseConverter = createResponseConverter();

      // 根据接口方法的注解构造请求方法，比如 @GET @POST @DELETE 等
      // 另外还有添加请求头，检查url中有无带?，转化 path 中的参数
      for (Annotation annotation : methodAnnotations) {
          parseMethodAnnotation(annotation);
      }

      if (httpMethod == null) {
          throw methodError("HTTP method annotation is required (e.g., @GET, @POST, etc.).");
      }

      // 若无 body 则不能有 Multipart 和 FormEncoded 的注解
      if (!hasBody) {
          if (isMultipart) {
              throw methodError(
                      "Multipart can only be specified on HTTP methods with request body (e.g., @POST).");
          }
          if (isFormEncoded) {
              throw methodError("FormUrlEncoded can only be specified on HTTP methods with "
                      + "request body (e.g., @POST).");
          }
      }

      // 解析接口方法参数中的注解，比如 @Path @Query @QueryMap @Field 等等
      // 相应的，每个方法的参数都创建了一个 ParameterHandler<?> 对象
      int parameterCount = parameterAnnotationsArray.length;
      parameterHandlers = new ParameterHandler<?>[parameterCount];
      for (int p = 0; p < parameterCount; p++) {
          Type parameterType = parameterTypes[p];
          if (Utils.hasUnresolvableType(parameterType)) {
              throw parameterError(p, "Parameter type must not include a type variable or wildcard: %s",
                      parameterType);
          }

          Annotation[] parameterAnnotations = parameterAnnotationsArray[p];
          if (parameterAnnotations == null) {
              throw parameterError(p, "No Retrofit annotation found.");
          }

          parameterHandlers[p] = parseParameter(p, parameterType, parameterAnnotations);
      }

      // 检查构造出的请求有没有不对的地方
      if (relativeUrl == null && !gotUrl) {
          throw methodError("Missing either @%s URL or @Url parameter.", httpMethod);
      }
      if (!isFormEncoded && !isMultipart && !hasBody && gotBody) {
          throw methodError("Non-body HTTP method cannot contain @Body.");
      }
      if (isFormEncoded && !gotField) {
          throw methodError("Form-encoded method must contain at least one @Field.");
      }
      if (isMultipart && !gotPart) {
          throw methodError("Multipart method must contain at least one @Part.");
      }

      return new ServiceMethod<>(this);
  }
```

在 `build()` 中代码挺长的，总结起来就一句话：就是将 API 接口中的方法进行解析，构造成 `ServiceMethod`，交给下面的 `OkHttpCall` 使用。

基本上做的事情就是：

1. 创建 CallAdapter ；
2. 创建 ResponseConverter；
3. 根据 API 接口方法的注解构造网络请求方法；
4. 根据 API 接口方法参数中的注解构造网络请求的参数；
5. 检查有无异常；

下面我们看看第二句重要的代码`OkHttpCall<Object> okHttpCall = new OkHttpCall<>(serviceMethod, args);`



#### OkHttpCall

`OkHttpCall` 实现了 `retrofit2.Call`，我们通常会使用它的 `execute()` 和 `enqueue(Callback<T> callback)` 接口。前者用于同步执行 HTTP 请求，后者用于异步执行。我们先看 `execute()`

```java
@Override 
public Response<T> execute() throws IOException {
    okhttp3.Call call;

    synchronized (this) {
        if (executed) throw new IllegalStateException("Already executed.");
        executed = true;

        if (creationFailure != null) {
            if (creationFailure instanceof IOException) {
                throw (IOException) creationFailure;
            } else if (creationFailure instanceof RuntimeException) {
                throw (RuntimeException) creationFailure;
            } else {
                throw (Error) creationFailure;
            }
        }

        call = rawCall;
        if (call == null) {
            try {
                // 根据 serviceMethod 中的众多数据创建出 Okhttp 中的 Request 对象
	            // 注意的一点，会调用上面的 ParameterHandler.apply 方法来填充网络请求参数
	            // 然后再根据 OkhttpClient 创建出 Okhttp 中的 Call
	            // 这一步也说明了在 Retrofit 中的 OkHttpCall 内部请求最后会转换为 OkHttp 的 Call
                call = rawCall = createRawCall();
            } catch (IOException | RuntimeException | Error e) {
                throwIfFatal(e); //  Do not assign a fatal error to creationFailure.
                creationFailure = e;
                throw e;
            }
        }
    }

    if (canceled) {
        call.cancel();
    }
    
    // 执行 call 并转换成响应的 response
    return parseResponse(call.execute());
}
```

在 `execute()` 做的就是将 Retrofit 中的 call 转化为 OkHttp 中的 Call 。最后让 OkHttp 的 Call 去执行。

主要包括三步：

1. 调用`createRawCall()`创建了 `okhttp3.Call`，包括构造参数；
2. 使用`call.execute()`执行网络请求；
3. 解析网络请求返回的数据；

我们分别来看看`createRawCall()`和`parseResponse()`这两个方法：

```java
// OkHttpCall类中
private okhttp3.Call createRawCall() throws IOException {
    okhttp3.Call call = serviceMethod.toCall(args);
    if (call == null) {
      throw new NullPointerException("Call.Factory returned null.");
    }
    return call;
}
```

`createRawCall()` 函数中，我们调用了 `serviceMethod.toCall(args)` 来创建 `okhttp3.Call`，而在后者中，我们之前准备好的 `parameterHandlers` 就派上了用场。

然后我们再调用 `serviceMethod.callFactory.newCall(request)` 来创建 `okhttp3.Call`，这里之前准备好的 `callFactory` 同样也派上了用场，由于工厂在构造 `Retrofit` 对象时可以指定，所以我们也可以指定其他的工厂（例如使用过时的 `HttpURLConnection` 的工厂），来使用其它的底层 HttpClient 实现。



```java
Response<T> parseResponse(okhttp3.Response rawResponse) throws IOException {
    ResponseBody rawBody = rawResponse.body();

    // Remove the body's source (the only stateful object) so we can pass the response along.
    rawResponse = rawResponse.newBuilder()
            .body(new NoContentResponseBody(rawBody.contentType(), rawBody.contentLength()))
            .build();

    // 如果返回的响应码不是成功的话，返回错误 Response
    int code = rawResponse.code();
    if (code < 200 || code >= 300) {
        try {
            // Buffer the entire body to avoid future I/O.
            ResponseBody bufferedBody = Utils.buffer(rawBody);
            return Response.error(bufferedBody, rawResponse);
        } finally {
            rawBody.close();
        }
    }

    // 如果返回的响应码是204或者205，返回没有 body 的成功 Response
    if (code == 204 || code == 205) {
        rawBody.close();
        return Response.success(null, rawResponse);
    }

    ExceptionCatchingRequestBody catchingBody = new ExceptionCatchingRequestBody(rawBody);
    try {
        // 将 body 转换为对应的泛型，然后返回成功 Response
        T body = serviceMethod.toResponse(catchingBody);
        return Response.success(body, rawResponse);
    } catch (RuntimeException e) {
        // If the underlying source threw an exception, propagate that rather than indicating it was
        // a runtime exception.
        catchingBody.throwIfCaught();
        throw e;
    }
}
```

我们调用 `okhttp3.Call#execute()` 来执行网络请求，这个方法是阻塞的，执行完毕之后将返回收到的响应数据。收到响应数据之后，我们进行了状态码的检查，通过检查之后我们调用了 `serviceMethod.toResponse(catchingBody)` 来把响应数据转化为了我们需要的数据类型对象T。

```java
// ServiceMethod类中
R toResponse(ResponseBody body) throws IOException {
    return responseConverter.convert(body);
}
```

在`serviceMethod` 的`toResponse` 函数中，我们之前准备好的 `responseConverter` 也派上了用场。我们分别看下：

1. `responseConverter`这个实例哪里来？
2. `ResponseConverter`的`convert()`方法干了什么？

#### 默认的Converter

##### #1. `responseConverter`这个实例哪里来？

在`ServiceMethod.Builder`类中，我们找到了它的赋值的地方：

```java
// 在ServiceMethod.Builder类中
public ServiceMethod build() {
      // 创建默认的CallAdapter
      callAdapter = createCallAdapter();
      responseType = callAdapter.responseType();
      if (responseType == Response.class || responseType == okhttp3.Response.class) {
        throw methodError("'"
            + Utils.getRawType(responseType).getName()
            + "' is not a valid response body type. Did you mean ResponseBody?");
      }
    
      // 创建默认的ResponseConverter
      responseConverter = createResponseConverter();
    
      //...省略其他代码...
}
```

很明显，在`build()`方法中同时创建了默认的CallAdapter和ResponseConverter。我们先继续前往`createResponseConverter`关注ResponseConverter：

```java
private Converter<ResponseBody, T> createResponseConverter() {
    Annotation[] annotations = method.getAnnotations();
    try {
        return retrofit.responseBodyConverter(responseType, annotations);
    } catch (RuntimeException e) { // Wide exception range because factories are user code.
        throw methodError(e, "Unable to create converter for %s", responseType);
    }
}
```

原来是根据我们定义的接口方法的返回类型和注解，交给了Retrofit的`responseBodyConverter(Type type, Annotation[] annotations)`去找：

```Java
public <T> Converter<ResponseBody, T> responseBodyConverter(Type type, Annotation[] annotations) {
    return nextResponseBodyConverter(null, type, annotations);
}


public <T> Converter<ResponseBody, T> nextResponseBodyConverter(
        @Nullable Converter.Factory skipPast, Type type, Annotation[] annotations) {
    checkNotNull(type, "type == null");
    checkNotNull(annotations, "annotations == null");

    // 根据接口方法的返回类型、注解等信息找到对应的ResponseConverter
    int start = converterFactories.indexOf(skipPast) + 1;
    for (int i = start, count = converterFactories.size(); i < count; i++) {
        Converter<ResponseBody, ?> converter =
                converterFactories.get(i).responseBodyConverter(type, annotations, this);
        if (converter != null) {
            //noinspection unchecked
            return (Converter<ResponseBody, T>) converter;
        }
    }

    // 找不到任何ResponseConverter的话，就抛异常
    StringBuilder builder = new StringBuilder("Could not locate ResponseBody converter for ")
            .append(type)
            .append(".\n");
    if (skipPast != null) {
        builder.append("  Skipped:");
        for (int i = 0; i < start; i++) {
            builder.append("\n   * ").append(converterFactories.get(i).getClass().getName());
        }
        builder.append('\n');
    }
    builder.append("  Tried:");
    for (int i = start, count = converterFactories.size(); i < count; i++) {
        builder.append("\n   * ").append(converterFactories.get(i).getClass().getName());
    }
    throw new IllegalArgumentException(builder.toString());
}
```

在 `Retrofit` 类内部，将遍历一个 `converterFactories` 列表，让工厂们提供，如果最终没有工厂能（根据 `returnType` 和 `annotations`）提供需要的 `ResponseConverter`，那将抛出异常。而这个工厂列表我们可以在构造 `Retrofit` 对象时进行添加。

还记得我们在使用`Retrofit.Builder`构造Retrofit对象的时候，默认添加的`converterFactory`吗？

```java
public Retrofit build() {
    
      //...省略其他代码...

      // Add the built-in converter factory first. This prevents overriding its behavior but also
      // ensures correct behavior when using converters that consume all types.
      converterFactories.add(new BuiltInConverters());		// 默认的Converter
      converterFactories.addAll(this.converterFactories);   // 我们自定义的Converter

      return new Retrofit(callFactory, baseUrl, unmodifiableList(converterFactories),
          unmodifiableList(callAdapterFactories), callbackExecutor, validateEagerly);
    }
```

##### #2. `ResponseConverter`的`convert()`方法干了什么？

我们看看这个内置转换器（`BuildInConverters`）是什么东西：

```java
final class BuiltInConverters extends Converter.Factory {
    @Override
    public Converter<ResponseBody, ?> responseBodyConverter(Type type, Annotation[] annotations, Retrofit retrofit) {
        // 内置的BuiltInConverters直接返回ResponseBody或者Void类型
        if (type == ResponseBody.class) {
            return Utils.isAnnotationPresent(annotations, Streaming.class)
                    ? StreamingResponseBodyConverter.INSTANCE
                    : BufferingResponseBodyConverter.INSTANCE;
        }
        if (type == Void.class) {
            return VoidResponseBodyConverter.INSTANCE;
        }
        return null;
    }

    @Override
    public Converter<?, RequestBody> requestBodyConverter(Type type,
                                                          Annotation[] parameterAnnotations, Annotation[] methodAnnotations, Retrofit retrofit) {
        if (RequestBody.class.isAssignableFrom(Utils.getRawType(type))) {
            return RequestBodyConverter.INSTANCE;
        }
        return null;
    }

    //...省略其他代码...
    
    static final class StreamingResponseBodyConverter
      implements Converter<ResponseBody, ResponseBody> {
   
        static final StreamingResponseBodyConverter INSTANCE = new StreamingResponseBodyConverter();

        @Override 
        public ResponseBody convert(ResponseBody value) {
            // 直接返回，不进行任何处理
            return value;
        }
    }
}
```

内置的`BuiltInConverters`会直接返回`ResponseBody`或者`Void`类型，不做其他任何的转换操作，所以如果我们不添加任何ConverterFactory的默认情况下，我们定义的接口方法返回类型只能接受`ResponseBody`或者`Void`这两种类型。

#### 默认的CallAdapter

下面，我们来看下那三句重要代码中的最后一句`return serviceMethod.adapt(okHttpCall);`。ServiceMethod类中的`adapt()`方法如下：

```java
// ServiceMethod类中
T adapt(Call<R> call) {
    return callAdapter.adapt(call);
}
```

这里我们分别看下：

1. 这个`callAdapter`实例哪里来的？
2. `CallAdapter`类的`adapt()`方法干了什么？



##### #1. 这个`callAdapter`实例哪里来的？

这个`callAdapter`实例是在哪里赋值的呢，我们找到了`ServiceMethod.Builder`的`build()`方法，可以回到上面看看这个方法的源码，可以看到它是调用了`createCallAdapter`这个方法创建的，如下。

```java
// ServiceMethod.Builder类中
private CallAdapter<T, R> createCallAdapter() {
    Type returnType = method.getGenericReturnType();
    if (Utils.hasUnresolvableType(returnType)) {
        throw methodError(
                "Method return type must not include a type variable or wildcard: %s", returnType);
    }
    
    // 接口方法返回的类型不能是void
    if (returnType == void.class) {
        throw methodError("Service methods cannot return void.");
    }
    
    Annotation[] annotations = method.getAnnotations();
    try {
        //noinspection unchecked
        return (CallAdapter<T, R>) retrofit.callAdapter(returnType, annotations);
    } catch (RuntimeException e) { // Wide exception range because factories are user code.
        throw methodError(e, "Unable to create call adapter for %s", returnType);
    }
}
```

可以看到，`callAdapter` 还是由 `Retrofit` 类提供的。

```java
public CallAdapter<?, ?> callAdapter(Type returnType, Annotation[] annotations) {
    return nextCallAdapter(null, returnType, annotations);
}


public CallAdapter<?, ?> nextCallAdapter(@Nullable CallAdapter.Factory skipPast, Type returnType,
                                         Annotation[] annotations) {
    checkNotNull(returnType, "returnType == null");
    checkNotNull(annotations, "annotations == null");

    // 根据接口方法的返回类型、注解等信息找到对应的CallAdapter
    int start = callAdapterFactories.indexOf(skipPast) + 1;
    for (int i = start, count = callAdapterFactories.size(); i < count; i++) {
        CallAdapter<?, ?> adapter = callAdapterFactories.get(i).get(returnType, annotations, this);
        if (adapter != null) {
            return adapter;
        }
    }

    // 找不到任何CallAdapter，抛异常
    StringBuilder builder = new StringBuilder("Could not locate call adapter for ")
            .append(returnType)
            .append(".\n");
    if (skipPast != null) {
        builder.append("  Skipped:");
        for (int i = 0; i < start; i++) {
            builder.append("\n   * ").append(callAdapterFactories.get(i).getClass().getName());
        }
        builder.append('\n');
    }
    builder.append("  Tried:");
    for (int i = start, count = callAdapterFactories.size(); i < count; i++) {
        builder.append("\n   * ").append(callAdapterFactories.get(i).getClass().getName());
    }
    throw new IllegalArgumentException(builder.toString());
}
```

在 `Retrofit` 类内部，将遍历一个 `CallAdapter.Factory` 列表，让工厂们提供，如果最终没有工厂能（根据 `returnType` 和 `annotations`）提供需要的 `CallAdapter`，那将抛出异常。而这个工厂列表我们可以在构造 `Retrofit` 对象时进行添加。

还记得我们在使用`Retrofit.Builder`构造Retrofit对象的时候，默认添加的`CallAdapterFactory`吗？

```java
// Retrofit.Builder类
public Retrofit build() {
      
      //...省略其他代码...

      // Make a defensive copy of the adapters and add the default Call adapter.
      List<CallAdapter.Factory> callAdapterFactories = new ArrayList<>(this.callAdapterFactories);
      // 添加默认的CallAdapterFactory
      callAdapterFactories.add(platform.defaultCallAdapterFactory(callbackExecutor));

    
      //...省略其他代码...
      return new Retrofit(callFactory, baseUrl, unmodifiableList(converterFactories),
          unmodifiableList(callAdapterFactories), callbackExecutor, validateEagerly);
    }
}
```

而此时的Platform是`Android`，回顾一下Android的默认CallAdapterFactory：

```java
static class Android extends Platform {
    
    @Override 
    public Executor defaultCallbackExecutor() {
      return new MainThreadExecutor();
    }

    // 实现了默认的CallAdapterFactory
    @Override 
    CallAdapter.Factory defaultCallAdapterFactory(@Nullable Executor callbackExecutor) {
      if (callbackExecutor == null) throw new AssertionError();
      return new ExecutorCallAdapterFactory(callbackExecutor);
    }

    static class MainThreadExecutor implements Executor {
      private final Handler handler = new Handler(Looper.getMainLooper());

      @Override public void execute(Runnable r) {
        handler.post(r);
      }
    }
}
```

可以看到默认的是`ExecutorCallAdapterFactory`这个工厂类，

```java
final class ExecutorCallAdapterFactory extends CallAdapter.Factory {
    final Executor callbackExecutor;

    ExecutorCallAdapterFactory(Executor callbackExecutor) {
        this.callbackExecutor = callbackExecutor;
    }

    // 关注一下这个get()方法
    @Override
    public CallAdapter<?, ?> get(Type returnType, Annotation[] annotations, Retrofit retrofit) {
        if (getRawType(returnType) != Call.class) {
            return null;
        }
        final Type responseType = Utils.getCallResponseType(returnType);
        return new CallAdapter<Object, Call<?>>() {
            @Override
            public Type responseType() {
                return responseType;
            }

            @Override
            public Call<Object> adapt(Call<Object> call) {
                return new ExecutorCallbackCall<>(callbackExecutor, call);
            }
        };
    }
}
```

可以看到`ExecutorCallAdapterFactory`这个工厂类通过`get()`方法new了一个`CallAdapter`。然后来看看第二个问题。

##### #2. `CallAdapter`类的`adapt()`方法干了什么？

好了，搞清楚了`callAdapter`的来历，我们看看它的`adapt()`方法。从上面的分析我们知道，这个`CallAdapter`类的`adapt()`方法返回了一个`ExecutorCallbackCall`：

```java
static final class ExecutorCallbackCall<T> implements Call<T> {
    final Executor callbackExecutor;
    final Call<T> delegate;  // delegate 就是构造器中传进来的 OkHttpCall

    ExecutorCallbackCall(Executor callbackExecutor, Call<T> delegate) {
        this.callbackExecutor = callbackExecutor;
        this.delegate = delegate;
    }

    @Override 
    public void enqueue(final Callback<T> callback) {
        checkNotNull(callback, "callback == null");

        delegate.enqueue(new Callback<T>() {
            @Override 
            public void onResponse(Call<T> call, final Response<T> response) {
                callbackExecutor.execute(new Runnable() {
                    @Override 
                    public void run() {
                        if (delegate.isCanceled()) {
                            // Emulate OkHttp's behavior of throwing/delivering an IOException on cancellation.
                            callback.onFailure(ExecutorCallbackCall.this, new IOException("Canceled"));
                        } else {
                            callback.onResponse(ExecutorCallbackCall.this, response);
                        }
                    }
                });
            }

            @Override 
            public void onFailure(Call<T> call, final Throwable t) {
                callbackExecutor.execute(new Runnable() {
                    @Override 
                    public void run() {
                        callback.onFailure(ExecutorCallbackCall.this, t);
                    }
                });
            }
        });
    }

    @Override
    public Response<T> execute() throws IOException {
        return delegate.execute();
    }

}
```

我们可以看见这个默认的`ExecutorCallbackCall`仅仅是把结果回调CallBack放到了对应的`CallbackExecutor`去执行，并没有对结果进行任何加工。



### 设计模式

一般客户端向服务器请求API，总共分三步：

1. build request(API参数配置)
2. executor(这里可以有很多变体，比如有无队列，进出顺序，线程管理)
3. parse callback(解析数据，返回T给上层)

如今的retrofit也是换汤不换药的。也是这三步：

1. 通过定义interface和使用注解来配置API参数
2. `CallAdapter`(你可以把它理解成executor)
3. `Converter`(解析数据并转换成T)


![](/gallery/android_common/625299-29a632638d9f518f.png)



Retrofit采用了**外观模式**统一调用创建网络请求接口实例和网络请求参数配置的方法，具体细节是：

- 动态创建网络请求接口的实例**（代理模式 - 动态代理）**
- 创建 `serviceMethod` 对象**（建造者模式 & 单例模式（缓存机制））**
- 对 `serviceMethod` 对象进行网络请求参数配置：通过解析网络请求接口方法的参数、返回值和注解类型，从Retrofit对象中获取对应的网络请求的url地址、网络请求执行器、网络请求适配器 & 数据转换器。**（策略模式）**
- 对 `serviceMethod` 对象加入线程切换的操作，便于接收数据后通过Handler从子线程切换到主线程从而对返回数据结果进行处理**（装饰模式）**
- 最终创建并返回一个`OkHttpCall`类型的网络请求对象



### 参考资料

- [Retrofit - Sample](https://gist.github.com/hachy/82d0f7f1a93d80b12fd8)
- [拆轮子系列：拆 Retrofit](https://blog.piasy.com/2016/06/25/Understand-Retrofit/)
- [Retrofit2.0源码解析](http://wensibo.top/2017/09/05/retrofit/)
- [Retrofit分析-漂亮的解耦套路](https://www.jianshu.com/p/45cb536be2f4)
- [「Android技术汇」Retrofit2 源码解析和案例说明](https://zhuanlan.zhihu.com/p/21662195)
- [深入浅出 Retrofit，这么牛逼的框架你们还不来看看？](https://segmentfault.com/a/1190000005638577)
- [你真的会用Retrofit2吗?Retrofit2完全教程](https://www.jianshu.com/p/308f3c54abdd)
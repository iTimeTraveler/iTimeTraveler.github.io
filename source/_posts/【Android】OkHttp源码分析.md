---
title: 【Android】OkHttp源码分析
layout: post
date: 2018-01-25 22:20:55
comments: true
tags: 
    - Android
    - 源码分析
categories: 
    - Android
    - 源码分析
keywords: OkHttp
description: 
photos:
    - https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/android_common/okhttp_interceptors.png
---





Android为我们提供了两种HTTP交互的方式：[HttpURLConnection](https://developer.android.com/reference/java/net/HttpURLConnection.html) 和 Apache HttpClient，虽然两者都支持HTTPS，流的上传和下载，配置超时，IPv6和连接池，已足够满足我们各种HTTP请求的需求。但更高效的使用HTTP 可以让您的应用运行更快、更节省流量。而[OkHttp](https://github.com/square/okhttp)库就是为此而生。在开始分析OkHttp之前我们先了解一下 HttpURLConnection 和 HttpClient 两者之间关系，以及它们和 OkHttp 之间的关系。



## HttpClient vs HttpURLConnection

在Android API Level 9（Android 2.2）之前之能使用`DefaultHttpClient`类发送http请求。`DefaultHttpClient`是Apache用于发送http请求的客户端，其提供了强大的API支持，而且基本没有什么bug，但是由于其太过复杂，Android团队在保持向后兼容的情况下，很难对`DefaultHttpClient`进行增强。为此，Android团队从Android API Level 9开始自己实现了一个发送http请求的客户端类 —— `HttpURLConnection`。

相比于`DefaultHttpClient`，`HttpURLConnection`比较轻量级，虽然功能没有`DefaultHttpClient`那么强大，但是能够满足大部分的需求，所以Android推荐使用`HttpURLConnection`代替`DefaultHttpClient`，并不强制使用`HttpURLConnection`。

但从Android API Level 23（Android 6.0）开始，不能再在Android中使用`HttpClient`，强制使用`HttpURLConnection`。参考官网：[Android 6.0 Changes - Google Developer](https://developer.android.com/about/versions/marshmallow/android-6.0-changes.html)

> Android 6.0 版移除了对 Apache HTTP client的支持。如果您的应用使用该客户端，并以 Android 2.3（API level 9）或更高版本为目标平台，请改用 `HttpURLConnection` 类。此 API 效率更高，因为它可以通过透明压缩和响应缓存减少网络使用，并可最大限度降低耗电量。要继续使用 Apache HTTP API，您必须先在 `build.gradle` 文件中声明以下编译时依赖项：

```gradle
android {
    useLibrary 'org.apache.http.legacy'
}
```



<!-- more -->

### 二者对比

- **HttpURLConnection** 

  在Android2.2之前：HttpURLConnection 有个重大 Bug：调用 close() 函数会影响连接池,导致连接复用失效；所以**Android2.2之前不建议使用HttpURLConnection**。在Android2.2之后：HttpURLConnection默认开启了 gzip 压缩&提高了HTTPS 的性能

- **HttpClient** 

  优点：相比于HttpURLConnection，更加高效简洁 
  缺点：结构过于复杂；维护成本高

  > 在5.0版本后被Android官方弃用

尽管Google在大部分安卓版本中推荐使用HttpURLConnection，但是这个类相比HttpClient实在是太难用，太弱爆了。OkHttp是一个相对成熟的解决方案，我们跟踪这篇文章：[Android HttpURLConnection源码分析](http://blog.csdn.net/charon_chui/article/details/46895773)。就会发现Android4.4之后的HttpURLConnection基于`OkHttp`实现的。所以我们更有理由相信OkHttp的强大。


### 二者与网络请求库之间的关系

网络请求框架本质上是一个将网络请求的相关方法（ HttpClient或HttpURLConnection）封装好的类库，并实现另开线程进行请求和处理数据，从而实现整个网络请求模块的功能。具体的关系可看下图: 

![](https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/android_common/20160810152440105.jpg)

而`OkHttp`是基于http协议封装的一套请求客户端，虽然它也可以开线程，但根本上它更偏向真正的请求，跟`HttpClient`，`HttpUrlConnection`的职责是一样的。



## OkHttp简介

[OkHttp](https://github.com/square/okhttp) 库的设计和实现的首要目标是高效。这也是选择 OkHttp 的重要理由之一。OkHttp 提供了对最新的 HTTP 协议版本 HTTP/2 和 SPDY 的支持，这使得对同一个主机发出的所有请求都可以共享相同的套接字连接。如果 HTTP/2 和 SPDY 不可用，OkHttp 会使用连接池来复用连接以提高效率。OkHttp 提供了对 GZIP 的默认支持来降低传输内容的大小。OkHttp 也提供了对 HTTP 响应的缓存机制，可以避免不必要的网络请求。当网络出现问题时，OkHttp 会自动重试一个主机的多个 IP 地址。

OkHttp是一个高效的HTTP库:

> - 支持 SPDY ，共享同一个Socket来处理同一个服务器的所有请求
> - 如果SPDY不可用，则通过连接池来减少请求延时
> - 无缝的支持GZIP来减少数据流量
> - 缓存响应数据来减少重复的网络请求

## 如何使用

OkHttp的使用是比较简单的，整体步骤是：

1. 初始化OkHttp客户端
2. 初始化一个Request
3. 由客户端和Request生成一个Call
4. call调用enqueue或者execute

### 同步Get请求

这是OkHttp 最基本的 HTTP 请求，注意别放到UI线程执行。

```java
public class SyncGet {
    public static void main(String[] args) throws IOException {
        OkHttpClient client = new OkHttpClient();

        Request request = new Request.Builder()
                .url("http://www.baidu.com")
                .header("User-Agent", "My super agent")
                .addHeader("Accept", "text/html")
                .build();

        Response response = client.newCall(request).execute();
        if (!response.isSuccessful()) {
            throw new IOException("服务器端错误: " + response);
        }

        Headers responseHeaders = response.headers();
        for (int i = 0; i < responseHeaders.size(); i++) {
            System.out.println(responseHeaders.name(i) + ": " + responseHeaders.value(i));
        }

        System.out.println(response.body().string());
    }
}
```

### 异步Get请求

```java
public class AsyncGet {
    public static void main(String[] args) throws IOException {
        OkHttpClient client = new OkHttpClient();

        Request request = new Request.Builder()
                .url("http://www.baidu.com")
                .build();

        client.newCall(request).enqueue(new Callback() {
            public void onFailure(Request request, IOException e) {
                e.printStackTrace();
            }

            public void onResponse(Response response) throws IOException {
                if (!response.isSuccessful()) {
                    throw new IOException("服务器端错误: " + response);
                }

                System.out.println(response.body().string());
            }
        });
    }
}
```

### Post请求

HTTP POST 和 PUT 请求可以包含要提交的内容。只需要在创建 Request 对象时，通过 post 和 put 方法来指定要提交的内容即可。下面的代码通过 RequestBody 的 create 方法来创建媒体类型为application/ json 的内容并提交。

```java
public static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");
OkHttpClient client = new OkHttpClient();

//post请求
public String post(String url, String json) throws IOException {
    RequestBody body = RequestBody.create(JSON, json);
    Request request = new Request.Builder()
            .url(url)
            .post(body)
            .build();
    Response response = client.newCall(request).execute();
    return response.body().string();
}
```

具体的使用方法可以参考IBM的这篇文章：[OkHttp：Java平台上的新一代HTTP客户端](https://www.ibm.com/developerworks/cn/java/j-lo-okhttp/) ，下面我们转入源码的分析。



## 源码分析

### 1. 创建 OkHttpClient 对象

```java
OkHttpClient client = new OkHttpClient();
```

看看其构造函数：

```java
public OkHttpClient() {
    this(new Builder());
}
```

原来是方便我们使用，提供了一个“快捷操作”，全部使用了默认的配置。`OkHttpClient.Builder` 类成员很多，后面我们再慢慢分析，这里先暂时略过：

```java
//OkHttpClient.java类中
public Builder() {
	dispatcher = new Dispatcher();
	protocols = DEFAULT_PROTOCOLS;
	connectionSpecs = DEFAULT_CONNECTION_SPECS;
	eventListenerFactory = EventListener.factory(EventListener.NONE);
	proxySelector = ProxySelector.getDefault();
	cookieJar = CookieJar.NO_COOKIES;
	socketFactory = SocketFactory.getDefault();
	hostnameVerifier = OkHostnameVerifier.INSTANCE;
	certificatePinner = CertificatePinner.DEFAULT;
	proxyAuthenticator = Authenticator.NONE;
	authenticator = Authenticator.NONE;
	connectionPool = new ConnectionPool();
	dns = Dns.SYSTEM;
	followSslRedirects = true;
	followRedirects = true;
	retryOnConnectionFailure = true;
	connectTimeout = 10_000;
	readTimeout = 10_000;
	writeTimeout = 10_000;
	pingInterval = 0;
}
```




## 拦截器

拦截器是 OkHttp 提供的对 HTTP 请求和响应进行统一处理的强大机制。拦截器在实现和使用上类似于 Servlet 规范中的过滤器。多个拦截器可以链接起来，形成一个链条。拦截器会按照在链条上的顺序依次执行。 拦截器在执行时，可以先对请求的 Request 对象进行修改；再得到响应的 Response 对象之后，可以进行修改之后再返回。


## 小结

OkHttp 作为一个简洁高效的 HTTP 客户端，可以在 Java 和 Android 程序中使用。相对于 Apache HttpClient 来说，OkHttp 的性能更好，其 API 设计也更加简单实用。



OkHttp 使用调用（Call）来对发送 HTTP 请求和获取响应的过程进行抽象。

```java
public interface Call extends Cloneable {

	Request request();

	Response execute() throws IOException;

	void enqueue(Callback responseCallback);

	void cancel();

	boolean isExecuted();

	boolean isCanceled();

	Call clone();

	interface Factory {
		Call newCall(Request request);
	}
}
```





## HTTP 连接

虽然在使用 OkHttp 发送 HTTP 请求时只需要提供 URL 即可，OkHttp 在实现中需要综合考虑 3 种不同的要素来确定与 HTTP 服务器之间实际建立的 HTTP 连接。这样做的目的是为了达到最佳的性能。

首先第一个考虑的要素是 URL 本身。URL 给出了要访问的资源的路径。比如 URL http://www.baidu.com 所对应的是百度首页的 HTTP 文档。在 URL 中比较重要的部分是访问时使用的模式，即 HTTP 还是 HTTPS。这会确定 OkHttp 所建立的是明文的 HTTP 连接，还是加密的 HTTPS 连接。

第二个要素是 HTTP 服务器的地址，如 baidu.com。每个地址都有对应的配置，包括端口号，HTTPS 连接设置和网络传输协议。同一个地址上的 URL 可以共享同一个底层 TCP 套接字连接。通过共享连接可以有显著的性能提升。OkHttp 提供了一个连接池来复用连接。

第三个要素是连接 HTTP 服务器时使用的路由。路由包括具体连接的 IP 地址（通过 DNS 查询来发现）和所使用的代理服务器。对于 HTTPS 连接还包括通讯协商时使用的 TLS 版本。对于同一个地址，可能有多个不同的路由。OkHttp 在遇到访问错误时会自动尝试备选路由。

当通过 OkHttp 来请求某个 URL 时，OkHttp 首先从 URL 中得到地址信息，再从连接池中根据地址来获取连接。如果在连接池中没有找到连接，则选择一个路由来尝试连接。尝试连接需要通过 DNS 查询来得到服务器的 IP 地址，也会用到代理服务器和 TLS 版本等信息。当实际的连接建立之后，OkHttp 发送 HTTP 请求并获取响应。当连接出现问题时，OkHttp 会自动选择另外的路由进行尝试。这使得 OkHttp 可以自动处理可能出现的网络问题。当成功获取到 HTTP 请求的响应之后，当前的连接会被放回到连接池中，提供给后续的请求来复用。连接池会定期把闲置的连接关闭以释放资源。



## 参考资料

- [OkHttp的初始化](http://blog.csdn.net/a109340/article/details/73887753)
- [OKHttp源码解析](http://www.jcodecraeer.com/a/anzhuokaifa/androidkaifa/2015/0326/2643.html)
- [OkHttp源码解析](https://juejin.im/entry/597800116fb9a06baf2eeb63) - [yuqirong.me](https://link.juejin.im/?target=http%3A%2F%2Fyuqirong.me%2F2017%2F07%2F25%2FOkHttp%E6%BA%90%E7%A0%81%E8%A7%A3%E6%9E%90%2F)
- [拆轮子系列：拆OkHttp](https://blog.piasy.com/2016/07/11/Understand-OkHttp/)
- [OkHttp：Java 平台上的新一代 HTTP 客户端 - IBM DeveloperWorks](https://www.ibm.com/developerworks/cn/java/j-lo-okhttp/)
- [Android主流网络请求开源库的对比（Android-Async-Http、Volley、OkHttp、Retrofit）](http://blog.csdn.net/carson_ho/article/details/52171976)
- [OkHttp, Retrofit, Volley应该选择哪一个？](https://www.jianshu.com/p/77d418e7b5d6)

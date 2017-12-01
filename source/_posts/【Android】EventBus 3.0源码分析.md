---
title: 【Android】EventBus 3.0 源码分析
layout: post
date: 2017-09-30 22:03:00
comments: true
tags: 
    - Android
    - 源码分析
categories: 
    - 源码分析
keywords: 
description: 
photos: 
	- /gallery/EventBus/android_with_eventbus.png
---





### 概述

**[EventBus](https://github.com/greenrobot/EventBus)**是Android中一个基于**观察者模式**的事件发布/订阅框架，开发者可以通过极少的代码去实现多个模块之间的通信，主要功能是替代Intent，Handler，BroadCast 在 Fragment，Activity，Service，线程Thread之间传递消息。优点是开销小，使用方便，可以很大程度上降低它们之间的耦合。 类似的库还有[Otto](https://github.com/square/otto) ，今天就带大家一起研读 EventBus 的源码。

这是EventBus源码中的介绍：

```java
/**
 * EventBus is a central publish/subscribe event system for Android. Events are posted ({@link #post(Object)}) to the
 * bus, which delivers it to subscribers that have a matching handler method for the event type. To receive events,
 * subscribers must register themselves to the bus using {@link #register(Object)}. Once registered, subscribers
 * receive events until {@link #unregister(Object)} is called. Event handling methods must be annotated by
 * {@link Subscribe}, must be public, return nothing (void), and have exactly one parameter
 * (the event).
 *
 * @author Markus Junginger, greenrobot
 */
```


> EventBus 是Android上的以**发布\订阅事件**为核心的库。事件 (`event`) 通过 `post()` 发送到总线，然后再分发到匹配事件类型的订阅者 (`subscribers`) 。订阅者只有在总线中注册 (`register`) 了才能收到事件，注销 (`unrigister`) 之后就收不到任何事件了。事件方法必须带有 `Subscribe` 的注解，必须是 `public` ，没有返回类型 `void` 并且只能有一个参数。



EventBus3 与之前的相比，其主要差别在于订阅方法可以不再以` onEvent` 开头了，改为用**注解**。

<!-- more -->

### 一、使用EventBus

![](/gallery/EventBus/how_to_use.png)

在Gradle中添加依赖

```java
compile 'org.greenrobot:eventbus:3.0.0'
```

#### 1.1 初始化

EventBus默认有一个单例，可以通过`getDefault()`获取，也可以通过`EventBus.builder()`构造自定义的EventBus，比如要应用我们生成好的索引时：

```java
EventBus mEventBus = EventBus.builder().addIndex(new MyEventBusIndex()).build();
```

如果想把自定义的设置应用到EventBus默认的单例中，则可以用`installDefaultEventBus()`方法：

```java
EventBus.builder().addIndex(new MyEventBusIndex()).installDefaultEventBus();
```

#### 1.2 定义事件

所有能被实例化为Object的实例都可以作为事件：

```java
public class MessageEvent {
    public final String message;

    public MessageEvent(String message) {
        this.message = message;
    }
}
```

在最新版的eventbus 3中如果用到了索引加速，事件类的修饰符必须为**public**，不然编译时会报错：`Subscriber method must be public`。


#### 1.3 监听事件

订阅者需要在总线上注册和注销自己。只有当订阅者注册了才能接收到事件。在Android中，通常与 Activity 和 Fragment 的生命周期绑定在一起。

之前2.x版本中有四种注册方法，区分了普通注册和粘性事件注册，并且在注册时可以选择接收事件的优先级，这里我们就不对2.x版本做过多的研究了。由于3.0版本将粘性事件以及订阅事件的优先级换成了**注解**的实现方式，所以3.0版本中的注册就变得简单，只有一个register()方法即可。

```java
//3.0版本的注册
EventBus.getDefault().register(this);
	   
//2.x版本的四种注册方法
EventBus.getDefault().register(this);
EventBus.getDefault().register(this, 100);
EventBus.getDefault().registerSticky(this);
EventBus.getDefault().registerSticky(this, 100);
```

当我们不在需要接收事件的时候需要解除注册unregister，2.x和3.0的解除注册也是相同的。代码如下:

```java
//取消注册
EventBus.getDefault().unregister(this);
```

接收到消息之后的处理方式，在2.x版本中，注册这些消息的监听需要区分是否监听黏性（sticky）事件，监听EventBus事件的模块需要实现以onEvent开头的方法。如今3.0改为在方法上添加注解的形式：

```java
//3.0版本
@Subscribe(threadMode = ThreadMode.POSTING, priority = 0, sticky = true)
public void handleEvent(DriverEvent event) {
    Log.d(TAG, event.info);
}

//2.x版本
public void onEvent(String str) {
}
public void onEventMainThread(String str) {
}
public void onEventBackgroundThread(String str) {
}
```

在2.x版本中只有通过onEvent开头的方法会被注册，而且响应事件方法触发的线程通过`onEventMainThread`或`onEventBackgroundThread`这些方法名区分，而在3.0版本中，通过`@Subscribe`注解，来确定运行的线程threadMode，是否接受粘性事件sticky以及事件优先级priority，而且方法名不在需要`onEvent`开头，所以又简洁灵活了不少。

我们可以看到注解`@Subscribe`有三个参数，threadMode为回调所在的线程，priority为优先级，sticky为是否接收黏性事件。调度单位从类细化到了方法，对方法的命名也没有了要求，方便混淆代码。但注册了监听的模块必须有一个标注了Subscribe注解方法，不然在register时会抛出异常：

```
Subscriber class XXX and its super classes have no public methods with the @Subscribe annotation
```

#### 1.4 发送事件

可以从代码的任何地方调用post或者postSticky发送事件，此时注册了的且匹配事件的订阅者能够接收到事件。

```java
EventBus.getDefault().post(new MessageEvent("Hello everyone!"));
```

在实际项目的使用中，register和unregister通常与Activity和Fragment的生命周期相关，ThreadMode.MainThread可以很好地解决Android的界面刷新必须在UI线程的问题，不需要再回调后用Handler中转（**EventBus中已经自动用Handler做了处理**），黏性事件可以很好地解决post与register同时执行时的异步问题（这个在原理中会说到），事件的传递也没有序列化与反序列化的性能消耗，足以满足我们大部分情况下的模块间通信需求。

### 二、EventBus源码跟踪

我们通过`EventBus`的使用流程来跟踪分析它的调用流程，通过我们熟悉的使用方法来深入到`EventBus`的实现内部并理解它的实现原理。

#### **2.1 创建EventBus对象**

先看看 `getDefault()` :

```java
static volatile EventBus defaultInstance;

/** Convenience singleton for apps using a process-wide EventBus instance. */
public static EventBus getDefault() {
    if (defaultInstance == null) {
        synchronized (EventBus.class) {
            if (defaultInstance == null) {
                defaultInstance = new EventBus();
            }
        }
    }
    return defaultInstance;
}
```

这里就是设计模式里我们常用的**单例模式**，用到了double check。保证了`getDefault()`得到的都是同一个实例。如果不存在实例，就调用了`EventBus`的构造方法:

```java
/**
 * 构造函数可以创建多个不同的EventBus，不同的实例之间可以相互隔离，如果只想使用同一个总线，就直接使用getDefault()方法获取单例
 * 
 * Creates a new EventBus instance; each instance is a separate scope in which events are delivered. To use a
 * central bus, consider {@link #getDefault()}.
 */
public EventBus() {
	this(DEFAULT_BUILDER);
}

EventBus(EventBusBuilder builder) {
	//key:订阅的事件,value:订阅这个事件的所有订阅者集合
	//private final Map<Class<?>, CopyOnWriteArrayList<Subscription>> subscriptionsByEventType;
	subscriptionsByEventType = new HashMap<>();
	
	//key:订阅者对象,value:这个订阅者订阅的事件集合
	//private final Map<Object, List<Class<?>>> typesBySubscriber;
	typesBySubscriber = new HashMap<>();
	
	//粘性事件 key:粘性事件的class对象, value:事件对象
	//private final Map<Class<?>, Object> stickyEvents;
	stickyEvents = new ConcurrentHashMap<>();
	
	//事件主线程处理
	mainThreadPoster = new HandlerPoster(this, Looper.getMainLooper(), 10);
	//事件 Background 处理
	backgroundPoster = new BackgroundPoster(this);
	//事件异步线程处理
	asyncPoster = new AsyncPoster(this);
	indexCount = builder.subscriberInfoIndexes != null ? builder.subscriberInfoIndexes.size() : 0;
	//订阅者响应函数信息存储和查找类
	subscriberMethodFinder = new SubscriberMethodFinder(builder.subscriberInfoIndexes,
	       builder.strictMethodVerification, builder.ignoreGeneratedIndex);
	logSubscriberExceptions = builder.logSubscriberExceptions;
	logNoSubscriberMessages = builder.logNoSubscriberMessages;
	sendSubscriberExceptionEvent = builder.sendSubscriberExceptionEvent;
	sendNoSubscriberEvent = builder.sendNoSubscriberEvent;
	throwSubscriberException = builder.throwSubscriberException;
	//是否支持事件继承
	eventInheritance = builder.eventInheritance;
	executorService = builder.executorService;
}
```

什么，既然是单例模式构造函数还是 `public` ？没错，这样的设计是因为不仅仅可以只有一条总线，还可以有其他的线 (bus) ，订阅者可以注册到不同的线上的 `EventBus`，通过不同的 `EventBus` 实例来发送数据，不同的 `EventBus` 是相互隔离开的，订阅者都只会收到注册到该线上事件。

然后我们说一下构造函数里这三个 `HasMap`。

- **`subscriptionsByEventType`** 是以 `event` 为 *key*，`subscriber列表` 为 *value*，当发送 `event` 的时候，都是去这里找对应的订阅者。
- **`typesBySubscriber`** 是以 `subscriber` 为 *key*，`event列表`为 *value*，当 `register()` 和 `unregister()` 的时候都是操作这个map，同时对 `subscriptionsByEventType` 进行对用操作。
- **`stickyEvents`** 维护的是粘性事件，粘性事件也就是当 `event` 发送出去之后再注册粘性事件的话，该粘性事件也能收到之前发送出去的 `event`。

同时构造函数中还创建了 3 个 poster ：**HandlerPoster ，BackgroundPoster和AsyncPoster，这 3 个 poster 负责线程间调度**，稍后的事件分发模块我们会详细讲到。我们接着看这个构造函数中，最终运用到了builder设计模式，那么来看看这个 `EventBusBuilder` 中有哪些参数：

```java
public class EventBusBuilder {
	//线程池
	private final static ExecutorService DEFAULT_EXECUTOR_SERVICE = Executors.newCachedThreadPool();
	//当调用事件处理函数异常时是否打印异常信息
	boolean logSubscriberExceptions = true;
	//当没有订阅者订阅该事件时是否打印日志
	boolean logNoSubscriberMessages = true;
	//当调用事件处理函数异常时是否发送 SubscriberExceptionEvent 事件
	boolean sendSubscriberExceptionEvent = true;
	//当没有事件处理函数对事件处理时是否发送 NoSubscriberEvent 事件
	boolean sendNoSubscriberEvent = true;
	//是否要抛出异常，建议debug开启
	boolean throwSubscriberException;
	//与event有继承关系的类是否需要发送
	boolean eventInheritance = true;
	//是否忽略生成的索引(SubscriberInfoIndex)
	boolean ignoreGeneratedIndex;
	//是否严格的方法名校验
	boolean strictMethodVerification;
	//线程池，async 和 background 的事件会用到
	ExecutorService executorService = DEFAULT_EXECUTOR_SERVICE;
	//当注册的时候会进行方法名的校验(EventBus3之前方法名必须以onEvent开头)，而这个列表是不参加校验的类的列表(EventBus3之后就没用这个参数了)
	List<Class<?>> skipMethodVerificationForClasses;
	//维护着由EventBus生成的索引(SubscriberInfoIndex)
	List<SubscriberInfoIndex> subscriberInfoIndexes;

	EventBusBuilder() {
	}

	//赋值buidler(可用户自定义的)给单例的EventBus，如果单例的EventBus不为null了，则抛出异常
	public EventBus installDefaultEventBus() {
		synchronized (EventBus.class) {
	        if (EventBus.defaultInstance != null) {
	            throw new EventBusException("Default instance already exists." +
	                    " It may be only set once before it's used the first time to ensure consistent behavior.");
	        }
	        EventBus.defaultInstance = build();
	        return EventBus.defaultInstance;
	    }
	}

	public EventBus build() {
	    return new EventBus(this);
	}

	//...省略其他代码...
}
```

可以看出是通过初始化了一个`EventBusBuilder()`对象来分别初始化`EventBus`的一些配置，注释里我标注了大部分比较重要的对象，这里没必要记住，看下面的文章时如果对某个对象不了解，可以再回来看看。

#### **2.2 注册与订阅Register**

EventBus 3.0的注册入口只提供一个`register()`方法了，所以我们先来看看register()方法做了什么：

```java
public void register(Object subscriber) {
    //首先获得订阅者的class对象
    Class<?> subscriberClass = subscriber.getClass();
    
    //通过subscriberMethodFinder来找到订阅者订阅了哪些事件.返回一个SubscriberMethod对象的List
    List<SubscriberMethod> subscriberMethods = subscriberMethodFinder.findSubscriberMethods(subscriberClass);
    synchronized (this) {
        for (SubscriberMethod subscriberMethod : subscriberMethods) {
            //订阅
            subscribe(subscriber, subscriberMethod);
        }
    }
}
```
可以看到`register()`方法很简洁，代码里的注释也很清楚了，我们可以看出通过`subscriberMethodFinder.findSubscriberMethods(subscriberClass)`方法就能返回一个`SubscriberMethod`的对象，而`SubscriberMethod`里包含了所有我们需要的接下来执行`subscribe()`的信息。

那 **`SubscriberMethod`**里包含了什么呢？下面是它的变量和构造函数。可以看到里面包括订阅类里的具体执行方法`Method`对象，需要在哪个线程执行`ThreadMode`，事件类型`eventType`，优先级`priority`，以及是否接收粘性`sticky`事件。

```java
public class SubscriberMethod {
    final Method method;        //具体的执行方法
    final ThreadMode threadMode; //执行线程
    final Class<?> eventType;   //事件类型，也就是执行方法接受的参数类型
    final int priority;         //优先级
    final boolean sticky;       //是否粘性，之后会讲到
    /** Used for efficient comparison */
    String methodString;

    public SubscriberMethod(Method method, Class<?> eventType, ThreadMode threadMode, int priority, boolean sticky) {
        this.method = method;
        this.threadMode = threadMode;
        this.eventType = eventType;
        this.priority = priority;
        this.sticky = sticky;
    }
    
    //...省略其他代码...
}
```

然后我们去看看SubscriberMethodFinder类的`findSubscriberMethods()`是怎么找到订阅方法的，最后我们再去关注`subscribe()`。


**SubscriberMethodFinder的实现**

从字面理解，这个类就是订阅者方法发现者。一句话来描述`SubscriberMethodFinder`类就是用来**查找和缓存订阅者响应函数的信息**的类。所以我们首先要知道怎么能获得订阅者响应函数的相关信息。在3.0版本中，EventBus提供了一个**`EventBusAnnotationProcessor`注解处理器**来在编译期通过读取`@Subscribe()`注解并解析，处理其中所包含的信息，然后生成java类来保存所有订阅者关于订阅的信息，这样就比在运行时使用反射来获得这些订阅者的信息速度要快。我们可以参考EventBus项目里的[EventBusPerformance](https://github.com/greenrobot/EventBus/tree/master/EventBusPerformance)这个例子，编译后我们可以在build文件夹里找到这个类，[MyEventBusIndex 类](https://github.com/greenrobot/EventBus/blob/master/EventBusPerformance/build.gradle#L27)，当然类名是可以自定义的。我们大致看一下生成的`MyEventBusIndex`类是什么样的:

```java
/**
 * This class is generated by EventBus, do not edit.
 */
public class MyEventBusIndex implements SubscriberInfoIndex {
    private static final Map<Class<?>, SubscriberInfo> SUBSCRIBER_INDEX;

    static {
        SUBSCRIBER_INDEX = new HashMap<Class<?>, SubscriberInfo>();

        putIndex(new SimpleSubscriberInfo(org.greenrobot.eventbusperf.testsubject.PerfTestEventBus.SubscriberClassEventBusAsync.class,
                true, new SubscriberMethodInfo[]{
                new SubscriberMethodInfo("onEventAsync", TestEvent.class, ThreadMode.ASYNC),
        }));

        putIndex(new SimpleSubscriberInfo(TestRunnerActivity.class, true, new SubscriberMethodInfo[]{
                new SubscriberMethodInfo("onEventMainThread", TestFinishedEvent.class, ThreadMode.MAIN),
        }));
    }

    private static void putIndex(SubscriberInfo info) {
        SUBSCRIBER_INDEX.put(info.getSubscriberClass(), info);
    }

    @Override
    public SubscriberInfo getSubscriberInfo(Class<?> subscriberClass) {
        SubscriberInfo info = SUBSCRIBER_INDEX.get(subscriberClass);
        if (info != null) {
            return info;
        } else {
            return null;
        }
    }
}
```

可以看出是使用一个静态HashMap即：`SUBSCRIBER_INDEX`来保存订阅类的信息，其中包括了订阅类的class对象，是否需要检查父类，以及订阅方法的信息`SubscriberMethodInfo`的数组，`SubscriberMethodInfo`中又保存了，订阅方法的方法名，订阅的事件类型，触发线程，是否接收sticky事件以及优先级priority。这其中就保存了register()的所有需要的信息，如果再配置EventBus的时候通过`EventBusBuilder`配置：`eventBus = EventBus.builder().addIndex(new MyEventBusIndex()).build();`来将编译生成的`MyEventBusIndex`配置进去，这样就能在`SubscriberMethodFinder`类中直接查找出订阅类的信息，就不需要再利用注解判断了，当然这种方法是作为EventBus的可选配置，`SubscriberMethodFinder`同样提供了通过注解来获得订阅类信息的方法，下面我们就来看`findSubscriberMethods()`到底是如何实现的：

```java
List<SubscriberMethod> findSubscriberMethods(Class<?> subscriberClass) {
    //先从METHOD_CACHE取看是否有缓存, key:保存订阅类的类名,value:保存类中订阅的方法数据,
    List<SubscriberMethod> subscriberMethods = METHOD_CACHE.get(subscriberClass);
    if (subscriberMethods != null) {
        return subscriberMethods;
    }
    
    //是否忽略注解器生成的MyEventBusIndex类
    if (ignoreGeneratedIndex) {
        //利用反射来读取订阅类中的订阅方法信息
        subscriberMethods = findUsingReflection(subscriberClass);
    } else {
        //从注解器生成的MyEventBusIndex类中获得订阅类的订阅方法信息
        subscriberMethods = findUsingInfo(subscriberClass);
    }
    if (subscriberMethods.isEmpty()) {
        throw new EventBusException("Subscriber " + subscriberClass
                + " and its super classes have no public methods with the @Subscribe annotation");
    } else {
        //保存进METHOD_CACHE缓存
        METHOD_CACHE.put(subscriberClass, subscriberMethods);
        return subscriberMethods;
    }
}
```

我们看看利用反射来读取订阅类中的订阅方法信息的函数：`findUsingReflection()`

```java
private List<SubscriberMethod> findUsingReflection(Class<?> subscriberClass) {
    //FindState 用来做订阅方法的校验和保存
    FindState findState = prepareFindState();
    findState.initForSubscriber(subscriberClass);
    while (findState.clazz != null) {
        //通过反射来获得订阅方法信息
        findUsingReflectionInSingleClass(findState);
        //查找父类的订阅方法
        findState.moveToSuperclass();
    }
    //获取findState中的SubscriberMethod(也就是订阅方法List)并返回
    return getMethodsAndRelease(findState);
}
```
以及从注解器生成的MyEventBusIndex类中获得订阅类的订阅方法信息： `findUsingInfo()`：
```java
private List<SubscriberMethod> findUsingInfo(Class<?> subscriberClass) {
    FindState findState = prepareFindState();
    findState.initForSubscriber(subscriberClass);
    while (findState.clazz != null) {
        //得到订阅者信息
        findState.subscriberInfo = getSubscriberInfo(findState);
        if (findState.subscriberInfo != null) {
            //遍历订阅者方法
            SubscriberMethod[] array = findState.subscriberInfo.getSubscriberMethods();
            for (SubscriberMethod subscriberMethod : array) {
                if (findState.checkAdd(subscriberMethod.method, subscriberMethod.eventType)) {
                    findState.subscriberMethods.add(subscriberMethod);
                }
            }
        } else {
            //如果没有订阅者信息就使用反射查找订阅方法
            findUsingReflectionInSingleClass(findState);
        }
        //跳转到父类中继续查找
        findState.moveToSuperclass();
    }
    return getMethodsAndRelease(findState);
}
```
进入到`getSubscriberInfo()` 方法中我们看到了从自定义索引Index获取订阅方法信息的操作：

```java
private SubscriberInfo getSubscriberInfo(FindState findState) {
    //判断FindState对象中是否有缓存的订阅方法
    if (findState.subscriberInfo != null && findState.subscriberInfo.getSuperSubscriberInfo() != null) {
        SubscriberInfo superclassInfo = findState.subscriberInfo.getSuperSubscriberInfo();
        if (findState.clazz == superclassInfo.getSubscriberClass()) {
            return superclassInfo;
        }
    }
    //从注解器生成的MyEventBusIndex类中获得订阅类的订阅方法信息
    if (subscriberInfoIndexes != null) {
        for (SubscriberInfoIndex index : subscriberInfoIndexes) {
            SubscriberInfo info = index.getSubscriberInfo(findState.clazz);
            if (info != null) {
                return info;
            }
        }
    }
    return null;
}
```

上面我们可以看到作者使用了`FindState`类来做**订阅方法的校验和保存**，并通过`FIND_STATE_POOL`静态数组来保存`FindState`对象，可以使`FindState`复用，避免重复创建过多的对象。最终是通过`findUsingReflectionInSingleClass()`来具体获得相关订阅方法的信息的：

```java
//在较新的类文件，编译器可能会添加方法。那些被称为BRIDGE或SYNTHETIC方法。EventBus必须忽略两者。有修饰符没有公开，但在Java类文件中有格式定义
private static final int BRIDGE = 0x40;
private static final int SYNTHETIC = 0x1000;
//需要忽略的修饰符
private static final int MODIFIERS_IGNORE = Modifier.ABSTRACT | Modifier.STATIC | BRIDGE | SYNTHETIC;


private void findUsingReflectionInSingleClass(FindState findState) {
    Method[] methods;
    //通过反射得到方法数组
    try {
        // This is faster than getMethods, especially when subscribers are fat classes like Activities
        methods = findState.clazz.getDeclaredMethods();
    } catch (Throwable th) {
        // Workaround for java.lang.NoClassDefFoundError, see https://github.com/greenrobot/EventBus/issues/149
        methods = findState.clazz.getMethods();
        findState.skipSuperClasses = true;
    }
    //遍历Method
    for (Method method : methods) {
        int modifiers = method.getModifiers();
        //必须是public的方法
        if ((modifiers & Modifier.PUBLIC) != 0 && (modifiers & MODIFIERS_IGNORE) == 0) {
            Class<?>[] parameterTypes = method.getParameterTypes();
            //保证必须只有一个事件参数
            if (parameterTypes.length == 1) {
                //得到注解
                Subscribe subscribeAnnotation = method.getAnnotation(Subscribe.class);
                if (subscribeAnnotation != null) {
                    Class<?> eventType = parameterTypes[0];
                    //校验是否添加该方法
                    if (findState.checkAdd(method, eventType)) {
                        ThreadMode threadMode = subscribeAnnotation.threadMode();
                        //实例化SubscriberMethod对象并添加
                        findState.subscriberMethods.add(new SubscriberMethod(method, eventType, threadMode,
                                subscribeAnnotation.priority(), subscribeAnnotation.sticky()));
                    }
                }
            } else if (strictMethodVerification && method.isAnnotationPresent(Subscribe.class)) {
                String methodName = method.getDeclaringClass().getName() + "." + method.getName();
                throw new EventBusException("@Subscribe method " + methodName +
                        "must have exactly 1 parameter but has " + parameterTypes.length);
            }
        } else if (strictMethodVerification && method.isAnnotationPresent(Subscribe.class)) {
            String methodName = method.getDeclaringClass().getName() + "." + method.getName();
            throw new EventBusException(methodName +
                    " is a illegal @Subscribe method: must be public, non-static, and non-abstract");
        }
    }
}
```

关于 `BRIDGE` 和 `SYNTHETIC` ，注释写道：

> In newer class files, compilers may add methods. Those are called bridge or synthetic methods. EventBus must ignore both. There modifiers are not public but defined in the Java class file format: <http://docs.oracle.com/javase/specs/jvms/se7/html/jvms-4.html#jvms-4.6-200-A.1>

在较新的类文件，编译器可能会添加方法。那些被称为 BRIDGE 或 SYNTHETIC 方法，EventBus 必须忽略两者。有修饰符没有公开，但在 Java 类文件中有格式定义。

该`findUsingReflectionInSingleClass`方法流程是：

1. 拿到当前 class 的所有方法；
2. 过滤掉不是 public 和是 abstract、static、bridge、synthetic 的方法；
3. 过滤出方法参数只有一个的方法；
4. 过滤出被Subscribe注解修饰的方法；
5. 将 method 方法和 event 事件添加到 `findState` 中；
6. 将 EventBus 关心的 method 方法、event 事件、threadMode、priority、sticky 封装成 `SubscriberMethod` 对象添加到 `findState.subscriberMethods` 列表中；

这里走完，我们订阅类的所有`SubscriberMethod`都已经被保存了，最后再通过`getMethodsAndRelease()`返回`List<SubscriberMethod>`。至此，所有关于如何获得订阅类的订阅方法信息即：`SubscriberMethod`对象就已经完全分析完了，下面我们来看`subscribe()`是如何实现的。


**subscribe()方法的实现**

```java
//必须在同步代码块里调用
private void subscribe(Object subscriber, SubscriberMethod subscriberMethod) {
    //获取订阅的事件类型
    Class<?> eventType = subscriberMethod.eventType;
    //创建Subscription对象
    Subscription newSubscription = new Subscription(subscriber, subscriberMethod);
    //从subscriptionsByEventType里检查是否已经添加过该Subscription,如果添加过就抛出异常,也就是每个类只能有一个函数响应同一种事件类型
    CopyOnWriteArrayList<Subscription> subscriptions = subscriptionsByEventType.get(eventType);
    if (subscriptions == null) {
        subscriptions = new CopyOnWriteArrayList<>();
        subscriptionsByEventType.put(eventType, subscriptions);
    } else {
        if (subscriptions.contains(newSubscription)) {
            throw new EventBusException("Subscriber " + subscriber.getClass() + " already registered to event "
                    + eventType);
        }
    }
    //根据优先级priority来添加Subscription对象
    int size = subscriptions.size();
    for (int i = 0; i <= size; i++) {
        if (i == size || subscriberMethod.priority > subscriptions.get(i).subscriberMethod.priority) {
            subscriptions.add(i, newSubscription);
            break;
        }
    }
    //将订阅者对象以及订阅的事件保存到typesBySubscriber里.
    List<Class<?>> subscribedEvents = typesBySubscriber.get(subscriber);
    if (subscribedEvents == null) {
        subscribedEvents = new ArrayList<>();
        typesBySubscriber.put(subscriber, subscribedEvents);
    }
    subscribedEvents.add(eventType);
    //如果接收sticky事件,立即分发sticky事件
    if (subscriberMethod.sticky) {
        //eventInheritance 表示是否分发订阅了响应事件类父类事件的方法
        if (eventInheritance) {
            // Existing sticky events of all subclasses of eventType have to be considered.
            // Note: Iterating over all events may be inefficient with lots of sticky events,
            // thus data structure should be changed to allow a more efficient lookup
            // (e.g. an additional map storing sub classes of super classes: Class -> List<Class>).
            Set<Map.Entry<Class<?>, Object>> entries = stickyEvents.entrySet();
            for (Map.Entry<Class<?>, Object> entry : entries) {
                Class<?> candidateEventType = entry.getKey();
                if (eventType.isAssignableFrom(candidateEventType)) {
                    Object stickyEvent = entry.getValue();
                    checkPostStickyEventToSubscription(newSubscription, stickyEvent);
                }
            }
        } else {
            Object stickyEvent = stickyEvents.get(eventType);
            checkPostStickyEventToSubscription(newSubscription, stickyEvent);
        }
    }
}
```

以上就是所有注册过程，现在再来看这张图就会特别清晰`EventBus`的`register()`过程了:

![](/gallery/EventBus/register-flow-chart.png)



到这里，订阅流程就走完了。接下来我们在看事件分发的流程。




#### **2.3 发送事件Post**

我们知道发送事件是通过`post()` 方法进行广播的，比如第一节我们例子中提到的`EventBus.getDefault().post(new MessageEvent("Hello everyone!"));` 接下来我们进入这个`post()`方法一窥究竟：

```java
public void post(Object event) {
    //得到当前线程的Posting状态.
    PostingThreadState postingState = currentPostingThreadState.get();
    //获取当前线程的事件队列
    List<Object> eventQueue = postingState.eventQueue;
    eventQueue.add(event);

    if (!postingState.isPosting) {
        // 记录当前发送线程是否为主线程
        postingState.isMainThread = Looper.getMainLooper() == Looper.myLooper();
        postingState.isPosting = true;
        if (postingState.canceled) {
            throw new EventBusException("Internal error. Abort state was not reset");
        }
        try {
            //处理队列，一直发送完所有事件
            while (!eventQueue.isEmpty()) {
                //发送单个事件
                postSingleEvent(eventQueue.remove(0), postingState);
            }
        } finally {
            postingState.isPosting = false;
            postingState.isMainThread = false;
        }
    }
}
```

首先是通过`currentPostingThreadState.get()`方法来得到当前线程`PostingThreadState`的对象，为什么是说当前线程？我们来看看`currentPostingThreadState`的实现：

```java
private final ThreadLocal<PostingThreadState> currentPostingThreadState = new ThreadLocal<PostingThreadState>() {
    @Override
    protected PostingThreadState initialValue() {
        return new PostingThreadState();
    }
};
```

其实现是返回一个 `PostingThreadState` 对象，而 `PostingThreadState` 类的结构如下，封装的是当前线程的 post 信息，包括事件队列、是否正在分发中、是否在主线程、订阅者信息、事件实例、是否取消。

```java
/** For ThreadLocal, much faster to set (and get multiple values). */
final static class PostingThreadState {
	final List<Object> eventQueue = new ArrayList<Object>();
    boolean isPosting;
    boolean isMainThread;
    Subscription subscription;
    Object event;
    boolean canceled;
}
```

综上，`currentPostingThreadState`的实现是一个包含了`PostingThreadState`的`ThreadLocal`对象，关于`ThreadLocal`[张涛的这篇文章](http://kymjs.com/code/2015/12/16/01)解释的很好：**ThreadLocal 是一个线程内部的数据存储类，通过它可以在指定的线程中存储数据，而这段数据是不会与其他线程共享的。** 其内部原理是通过生成一个它包裹的泛型对象的数组，在不同的线程会有不同的数组索引值，通过这样就可以做到每个线程通过`get()` 方法获取的时候，取到的只能是自己线程所对应的数据。 所以这里取到的就是每个线程的`PostingThreadState`状态.接下来我们来看`postSingleEvent()`：



```java
private void postSingleEvent(Object event, PostingThreadState postingState) throws Error {
    Class<?> eventClass = event.getClass();
    boolean subscriptionFound = false;
    //是否触发订阅了该事件(eventClass)的父类,以及接口的类的响应方法
    if (eventInheritance) {
        //查找eventClass类所有的父类以及接口
        List<Class<?>> eventTypes = lookupAllEventTypes(eventClass);
        int countTypes = eventTypes.size();
        //循环postSingleEventForEventType
        for (int h = 0; h < countTypes; h++) {
            Class<?> clazz = eventTypes.get(h);
            //只要右边有一个为true,subscriptionFound就为true
            subscriptionFound |= postSingleEventForEventType(event, postingState, clazz);
        }
    } else {
        //post单个
        subscriptionFound = postSingleEventForEventType(event, postingState, eventClass);
    }
    //如果没发现
    if (!subscriptionFound) {
        if (logNoSubscriberMessages) {
            Log.d(TAG, "No subscribers registered for event " + eventClass);
        }
        if (sendNoSubscriberEvent && eventClass != NoSubscriberEvent.class &&
                eventClass != SubscriberExceptionEvent.class) {
            //发送一个NoSubscriberEvent事件,如果我们需要处理这种状态,接收这个事件就可以了
            post(new NoSubscriberEvent(this, event));
        }
    }
}
```

`lookupAllEventTypes()` 就是查找该事件的所有父类，返回所有的该事件的父类的 class 。它通过循环和递归一起用，将一个类的父类（接口）全部添加到全局静态变量 `eventTypes` 集合中。跟着上面的代码的注释，我们可以很清楚的发现是在`postSingleEventForEventType()`方法里去进行事件的分发，代码如下：

```java
private boolean postSingleEventForEventType(Object event, PostingThreadState postingState, Class<?> eventClass) {
    CopyOnWriteArrayList<Subscription> subscriptions;
    //获取订阅了这个事件的Subscription列表.
    synchronized (this) {
        subscriptions = subscriptionsByEventType.get(eventClass);
    }
    if (subscriptions != null && !subscriptions.isEmpty()) {
        for (Subscription subscription : subscriptions) {
            postingState.event = event;
            postingState.subscription = subscription;
            //是否被中断
            boolean aborted = false;
            try {
                //分发给订阅者
                postToSubscription(subscription, event, postingState.isMainThread);
                aborted = postingState.canceled;
            } finally {
                postingState.event = null;
                postingState.subscription = null;
                postingState.canceled = false;
            }
            if (aborted) {
                break;
            }
        }
        return true;
    }
    return false;
}

private void postToSubscription(Subscription subscription, Object event, boolean isMainThread) {
    //根据接收该事件的订阅方法约定的ThreadMode决定分配到哪个线程执行
    switch (subscription.subscriberMethod.threadMode) {
        case POSTING:
            invokeSubscriber(subscription, event);
            break;
        case MAIN:
            if (isMainThread) {
                invokeSubscriber(subscription, event);
            } else {
                mainThreadPoster.enqueue(subscription, event);
            }
            break;
        case BACKGROUND:
            if (isMainThread) {
                backgroundPoster.enqueue(subscription, event);
            } else {
                invokeSubscriber(subscription, event);
            }
            break;
        case ASYNC:
            asyncPoster.enqueue(subscription, event);
            break;
        default:
            throw new IllegalStateException("Unknown thread mode: " + subscription.subscriberMethod.threadMode);
    }
}
```

总结上面的代码就是,首先从`subscriptionsByEventType`里获得所有订阅了这个事件的`Subscription`列表，然后在通过`postToSubscription()`方法来分发事件，在`postToSubscription()`通过不同的`threadMode`在不同的线程里`invoke()`订阅者的方法,`ThreadMode`共有四类：



1. `PostThread`：默认的 ThreadMode，表示在执行 Post 操作的线程直接调用订阅者的事件响应方法，不论该线程是否为主线程（UI 线程）。当该线程为主线程时，响应方法中不能有耗时操作，否则有卡主线程的风险。适用场景：**对于是否在主线程执行无要求，但若 Post 线程为主线程，不能耗时的操作**；
2. `MainThread`：在主线程中执行响应方法。如果发布线程就是主线程，则直接调用订阅者的事件响应方法，否则通过主线程的 Handler 发送消息在主线程中处理——调用订阅者的事件响应函数。显然，`MainThread`类的方法也不能有耗时操作，以避免卡主线程。适用场景：**必须在主线程执行的操作**；
3. `BackgroundThread`：在后台线程中执行响应方法。如果发布线程**不是**主线程，则直接调用订阅者的事件响应函数，否则启动**唯一的**后台线程去处理。由于后台线程是唯一的，当事件超过一个的时候，它们会被放在队列中依次执行，因此该类响应方法虽然没有`PostThread`类和`MainThread`类方法对性能敏感，但最好不要有重度耗时的操作或太频繁的轻度耗时操作，以造成其他操作等待。适用场景：*操作轻微耗时且不会过于频繁*，即一般的耗时操作都可以放在这里；
4. `Async`：不论发布线程是否为主线程，都使用一个空闲线程来处理。和`BackgroundThread`不同的是，`Async`类的所有线程是相互独立的，因此不会出现卡线程的问题。适用场景：*长耗时操作，例如网络访问*。



这里我们先看看`invokeSubscriber(subscription, event);`是如何实现的：

```java
void invokeSubscriber(Subscription subscription, Object event) {
    try {
        subscription.subscriberMethod.method.invoke(subscription.subscriber, event);
    } catch (InvocationTargetException e) {
        handleSubscriberException(subscription, event, e.getCause());
    } catch (IllegalAccessException e) {
        throw new IllegalStateException("Unexpected exception", e);
    }
}
```

实际上就是通过反射调用了订阅者的订阅函数并把`event`对象作为参数传入。然后我们就又遇到了在EventBus构造函数中初始化的3个Poster：**HandlerPoster**（也就是代码中的mainThreadPoster对象） ，**BackgroundPoster**和**AsyncPoster**，这 3 个 poster 负责线程间调度。我们分别来看看：

**#  HandlerPoster**

```java
final class HandlerPoster extends Handler {
	//队列，即将执行的Post
    private final PendingPostQueue queue;
  	//一个Post最大的在HandleMessage中的时间
    private final int maxMillisInsideHandleMessage;
    private final EventBus eventBus;
  	//handler是否运行起来了
    private boolean handlerActive;

    //EventBus的构造函数中初始化了mainThreadPoster = new HandlerPoster(this, Looper.getMainLooper(), 10);
    //注意此处的Looper.getMainLooper()便指定了主线程的Looper
    HandlerPoster(EventBus eventBus, Looper looper, int maxMillisInsideHandleMessage) {
        super(looper);
        this.eventBus = eventBus;
        this.maxMillisInsideHandleMessage = maxMillisInsideHandleMessage;
        queue = new PendingPostQueue();
    }

    void enqueue(Subscription subscription, Object event) {
      	//PendingPost维护了一个可以复用PendingPost对象的复用池
        PendingPost pendingPost = PendingPost.obtainPendingPost(subscription, event);
        synchronized (this) {
          	//加入到队列中
            queue.enqueue(pendingPost);
          	//如果handleMessage没有运行起来
            if (!handlerActive) {
                handlerActive = true;
              	//发送一个空消息，让handleMessage运行起来
                if (!sendMessage(obtainMessage())) {
                    throw new EventBusException("Could not send handler message");
                }
            }
        }
    }

    @Override
    public void handleMessage(Message msg) {
        boolean rescheduled = false;
        try {
            long started = SystemClock.uptimeMillis();
            while (true) {
              	//从队列中取出PendingPost
                PendingPost pendingPost = queue.poll();
                if (pendingPost == null) {
                    synchronized (this) {
                        // Check again, this time in synchronized
                        pendingPost = queue.poll();
                        if (pendingPost == null) {
                            handlerActive = false;
                            return;
                        }
                    }
                }
              	//调用eventBus的方法，分发消息
                eventBus.invokeSubscriber(pendingPost);
                long timeInMethod = SystemClock.uptimeMillis() - started;
              	//如果再一定时间内都还没有将队列排空，则退出
                if (timeInMethod >= maxMillisInsideHandleMessage) {
                    if (!sendMessage(obtainMessage())) {
                        throw new EventBusException("Could not send handler message");
                    }
                    rescheduled = true;
                    return;
                }
            }
        } finally {
            handlerActive = rescheduled;
        }
    }
}
```

我们有必要回看EventBus的构造函数中初始化了`mainThreadPoster = new HandlerPoster(this, Looper.getMainLooper(), 10);`的代码。注意这行代码中传入的第二个参数**Looper.getMainLooper()**便指定了主线程的Looper，保证了这个HandlerPoster的运行在主线程。

然后`PendingPost` 的数据结构是这样的：

```java
final class PendingPost {
    Object event;//事件
    Subscription subscription;//订阅
    PendingPost next;//与队列的数据结构有关，指向下一个节点
}
```

其中 `PendingPost` 维护着一个可以复用PendingPost对象的复用池，通过 `obtainPendingPost(Subscription, Object)` 方法复用，通过 `releasePendingPost(PendingPost )` 方法回收。

`handleMessage()` 中有一个死循环，这个死循环不停的从队列中拿数据，然后通过 `EventBus.invokeSubscriber()` 分发出去。每分发完一次比对一下时间，如果超过了 `maxMillisInsideHandleMessage` ，那么发送空 `message`再次进入到 `handlerMessage` 中且退出本次循环。


**# BackgroundPoster**

```java
/**
 * Posts events in background.
 * @author Markus
 */
 //我们注意到它实现了Runable接口
final class BackgroundPoster implements Runnable {

    private final PendingPostQueue queue;
    private final EventBus eventBus;

    private volatile boolean executorRunning;

    BackgroundPoster(EventBus eventBus) {
        this.eventBus = eventBus;
        queue = new PendingPostQueue();
    }

    public void enqueue(Subscription subscription, Object event) {
        PendingPost pendingPost = PendingPost.obtainPendingPost(subscription, event);
        synchronized (this) {
            //加入到队列中
            queue.enqueue(pendingPost);
            if (!executorRunning) {
                executorRunning = true;
                //把自己这个Runable抛入线程池开始运行
                eventBus.getExecutorService().execute(this);
            }
        }
    }

    @Override
    public void run() {
        try {
            try {
                while (true) {
                    //从队列中取出PendingPost，此处的1000表示如果队列为空就暂停1000毫秒再取
                    PendingPost pendingPost = queue.poll(1000);
                    if (pendingPost == null) {
                        synchronized (this) {
                            // Check again, this time in synchronized
                            pendingPost = queue.poll();
                            if (pendingPost == null) {
                                executorRunning = false;
                                return;
                            }
                        }
                    }
                    //调用eventBus的方法，分发消息
                    eventBus.invokeSubscriber(pendingPost);
                }
            } catch (InterruptedException e) {
                Log.w("Event", Thread.currentThread().getName() + " was interruppted", e);
            }
        } finally {
            executorRunning = false;
        }
    }

}
```

同理 `BackgroundPoster` ，只不过 `HandlerPoster` 是在 `handlerMessage` 中进行分发操作，而 `BackgroundPoster` 是在 `Runnable` 的 `run` 方法中将所有队列中的消息取出进行分发，直到取完为止。

**# AsyncPoster**

```java
/**
 * Posts events in background.
 * @author Markus
 */
 //它也实现Runable接口
class AsyncPoster implements Runnable {

    private final PendingPostQueue queue;
    private final EventBus eventBus;

    AsyncPoster(EventBus eventBus) {
        this.eventBus = eventBus;
        queue = new PendingPostQueue();
    }

    public void enqueue(Subscription subscription, Object event) {
        PendingPost pendingPost = PendingPost.obtainPendingPost(subscription, event);
        queue.enqueue(pendingPost);
        eventBus.getExecutorService().execute(this);
    }

    @Override
    public void run() {
        PendingPost pendingPost = queue.poll();
        if(pendingPost == null) {
            throw new IllegalStateException("No pending post available");
        }
        eventBus.invokeSubscriber(pendingPost);
    }

}
```

而 `AsyncPoster` 虽然也是在 `Runnable` 的 `run` 方法中取出队列中的消息，但是只取一个。不论发布线程是否为主线程，都使用一个空闲线程来处理。和`BackgroundThread`不同的是，`Async`类的所有线程是相互独立的，因此不会出现卡线程的问题。适用场景：*长耗时操作，例如网络访问*。

可以看到，不同的Poster会在post事件时，调度相应的事件队列PendingPostQueue，让每个订阅者的回调方法收到相应的事件，并在其注册的Thread中运行。而这个事件队列是一个链表，由一个个PendingPost组成，其中包含了事件，事件订阅者，回调方法这三个核心参数，以及需要执行的下一个PendingPost。至此`post()`流程就结束了，整体流程图如下：

![](/gallery/EventBus/post-flow-chart.png)

#### 2.4 解除注册Unregister

看完了上面的分析，解除注册就相对容易了，解除注册只要调用`unregister()`方法即可。实现如下：

```java
public synchronized void unregister(Object subscriber) {
    //通过typesBySubscriber来取出这个subscriber订阅者订阅的事件类型,
    List<Class<?>> subscribedTypes = typesBySubscriber.get(subscriber);
    if (subscribedTypes != null) {
        //分别解除每个订阅了的事件类型
        for (Class<?> eventType : subscribedTypes) {
            unsubscribeByEventType(subscriber, eventType);
        }
        //从typesBySubscriber移除subscriber
        typesBySubscriber.remove(subscriber);
    } else {
        Log.w(TAG, "Subscriber to unregister was not registered before: " + subscriber.getClass());
    }
}
```

然后接着看`unsubscribeByEventType()`方法的实现：

```java
private void unsubscribeByEventType(Object subscriber, Class<?> eventType) {
    //subscriptionsByEventType里拿出这个事件类型的订阅者列表.
    List<Subscription> subscriptions = subscriptionsByEventType.get(eventType);
    if (subscriptions != null) {
        int size = subscriptions.size();
        //取消订阅
        for (int i = 0; i < size; i++) {
            Subscription subscription = subscriptions.get(i);
            if (subscription.subscriber == subscriber) {
                subscription.active = false;
                subscriptions.remove(i);
                i--;
                size--;
            }
        }
    }
}
```

最终分别从`typesBySubscriber`和`subscriptions`里分别移除订阅者以及相关信息即可。



#### 2.5 注解Subscribe

最后我们来看一下EventBus中的这个`Subscribe`注解定义：

```java

@Documented
@Retention(RetentionPolicy.RUNTIME)    //运行时注解
@Target({ElementType.METHOD})        //用来修饰方法
public @interface Subscribe {
    ThreadMode threadMode() default ThreadMode.POSTING;

    /**
     * If true, delivers the most recent sticky event (posted with
     * {@link EventBus#postSticky(Object)}) to this subscriber (if event available).
     */
    boolean sticky() default false;

    /** Subscriber priority to influence the order of event delivery.
     * Within the same delivery thread ({@link ThreadMode}), higher priority subscribers will receive events before
     * others with a lower priority. The default priority is 0. Note: the priority does *NOT* affect the order of
     * delivery among subscribers with different {@link ThreadMode}s! */
    int priority() default 0;
}

```

我们可以看到EventBus使用的这个注解`Subscribe`是**运行时注解**（RetentionPolicy.RUNTIME），为什么需要定义成运行时而不是编译时注解呢？我们先看一下三种不同时机的注解：

```java
/**
1.SOURCE:在源文件中有效（即源文件保留）
2.CLASS:在class文件中有效（即class保留）
3.RUNTIME:在运行时有效（即运行时保留）
*/
@Retention(RetentionPolicy.RUNTIME)
@Retention(RetentionPolicy.SOURCE)
@Retention(RetentionPolicy.CLASS)
```

`@Retention`定义了该Annotation被保留的时间长短：某些Annotation仅出现在源代码中，而被编译器丢弃；而另一些却被编译在class文件中；编译在class文件中的Annotation可能会被虚拟机忽略，而另一些在class被装载时将被读取（请注意并不影响class的执行，因为Annotation与class在使用上是被分离的）。

因为EventBus的`register()`方法中需要通过**反射**获得注册类中通过注解声明的订阅方法，也就意味着必须在运行时保留注解信息，以便能够反射得到这些方法。所以这个`Subcribe`注解必须是运行时注解。大家有疑惑的可以自己写个Demo尝试一下使用反射得到某个类中方法的编译时注解信息，一定会**抛出NullPointerException异常**。



### 三、EventBus原理分析

在平时使用中我们不需要关心EventBus中对事件的分发机制，但要成为能够快速排查问题的老司机，我们还是得熟悉它的工作原理，下面我们就透过UML图来学习一下。

#### 3.1 核心架构

EventBus的核心工作机制透过作者Blog中的这张图就能很好地理解：

![](/gallery/EventBus/eventbus_overview.png)

订阅者模块需要通过EventBus订阅相关的事件，并准备好处理事件的回调方法，而事件发布者则在适当的时机把事件post出去，EventBus就能帮我们搞定一切。在架构方面，EventBus 3.0与之前稍老版本有不同，我们直接看架构图：

![EventBus 3.0架构图](/gallery/EventBus/class_overview.png)

为了方便理解或者对比，顺便也放一张2.x老版本的结构图吧：

![EventBus 2.x老版本结构图](/gallery/EventBus/class-relation.png)

虽然更新了3.0，但是整体上的设计还是可以用上面的类图来分析，从类图上我们可以看到大部分类都是依赖于EventBus的，上部分主要是订阅者相关信息，中间是 EventBus 类，下面是发布者发布事件后的调用。



根据UML图，我们先看核心类EventBus，其中`subscriptionByEventType`是以事件的类为key，订阅者的回调方法为value的映射关系表。也就是说EventBus在收到一个事件时，就可以根据这个事件的类型，在`subscriptionByEventType`中找到所有监听了该事件的订阅者及处理事件的回调方法。而`typesBySubscriber`则是每个订阅者所监听的事件类型表，在取消注册时可以通过该表中保存的信息，快速删除`subscriptionByEventType`中订阅者的注册信息，避免遍历查找。注册事件、发送事件和注销都是围绕着这两个核心数据结构来展开。上面的Subscription可以理解为每个订阅者与回调方法的关系，在其他模块发送事件时，就会通过这个关系，让订阅者执行回调方法。

回调方法在这里被封装成了`SubscriptionMethod`，里面保存了在需要反射invoke方法时的各种参数，包括优先级，是否接收黏性事件和所在线程等信息。而要生成这些封装好的方法，则需要`SubscriberMethodFinder`，它可以在regster时得到订阅者的所有回调方法，并封装返回给EventBus。而右边的加速器模块，就是为了提高`SubscriberMethodFinder`的效率，这里就不再啰嗦。

至此EventBus 3.0的架构就分析完了，与之前EventBus老版本最明显的区别在于：分发事件的调度单位从订阅者，细化成了订阅者的回调方法。也就是说每个回调方法都有自己的优先级，执行线程和是否接收黏性事件，提高了事件分发的灵活程度，接下来我们在看核心功能的实现时更能体现这一点。

#### 3.2 register

简单来说就是：根据订阅者的类来找回调方法，把订阅者和回调方法封装成关系，并保存到相应的数据结构中，为随后的事件分发做好准备，最后处理黏性事件。

![注册订阅流程](/gallery/EventBus/register.png)


1. 根据订阅者来找到订阅方法和事件，封装成 `SubscriberMehod`
2. 循环每个 `SubscriberMethod`
3. 通过事件得到该事件的所有订阅者列表，再根据优先级插入到 `subscriptionsByEventType` 的所有订阅者列表中
4. 通过订阅者得到该订阅者的所有事件列表，再将事件添加到 `typeBySubscriber` 的所以事件列表中
5. 是否是粘性事件
6. 是的话进行分发，post此事件给当前订阅者，不是的话不管
7. 结束本次循环，跳到 2


#### 3.3 post

总的来说就是分析事件，得到所有监听该事件的订阅者的回调方法，并利用反射来invoke方法，实现回调。

![发送流程](/gallery/EventBus/post.png)


1. 从 `currentPostingThreadState` 中得到当前线程的 `PostThreadState` 信息
2. 将此事件添加到 `PostPostThreadState` 的事件队列中
3. 判断是否再分发
4. 不是的话，循环队列，是的话跳 7
5. 判断是个需要继承关系
6. 是的话，循环得到父类，不是的话跳 7
7. 查找该事件的订阅者，循环订阅者
8. 根据 `ThreadMoth` 发送事件
9. 结束本次循环订阅者，跳 7
10. 结束本次循环队列，跳 4


在源代码中为了保证post执行不会出现死锁，等待和对同一订阅者发送相同的事件，增加了很多线程保护锁和标志位，值得我们每个开发者学习。


#### 3.4 unregister

注销就比较简单了，把在注册时往两个数据结构中添加的订阅者信息删除即可：

![注销流程](/gallery/EventBus/unregister.png)

至此大家对EventBus的运行原理应该有了一定的了解，虽然看起来像是一个复杂耗时的自动机，但大部分时候事件都是一瞬间就能分发到位的，而大家关心的性能问题反而是发生在注册EventBus的时候，因为需要遍历监听者的所有方法去找到回调的方法。作者也提到运行时注解的性能在Android上并不理想，为了解决这个问题，作者才会以索引的方式去生成回调方法表，也就是在EventBus 3.0中引入了**EventBusAnnotationProcessor**（注解分析生成索引）技术，大大提高了EventBus的运行效率。关于索引技术的源码分析，大家可以参考腾讯Bugly的这边文章：[老司机教你 “飙” EventBus 3](https://segmentfault.com/a/1190000005089229) 。

### 四、缺点与问题

一直以来，EventBus被大家吐槽的一大问题就是代码混淆问题。

#### 4.1 混淆问题

混淆作为版本发布必备的流程，经常会闹出很多奇奇怪怪的问题，且不方便定位，尤其是EventBus这种依赖反射技术的库。通常情况下都会把相关的类和回调方法都keep住，但这样其实会留下被人反编译后破解的后顾之忧，所以我们的目标是keep最少的代码。

首先，因为EventBus 3弃用了反射的方式去寻找回调方法，改用注解的方式。作者的意思是在混淆时就不用再keep住相应的类和方法。但是我们在运行时，却会报`java.lang.NoSuchFieldError: No static field POSTING`。网上给出的解决办法是keep住所有eventbus相关的代码：

```java
-keep class de.greenrobot.** {*;}
```

其实我们仔细分析，可以看到是因为在SubscriberMethodFinder的findUsingReflection方法中，在调用Method.getAnnotation()时获取ThreadMode这个enum失败了，所以我们只需要keep住这个enum就可以了（如下）。

```java
-keep public enum org.greenrobot.eventbus.ThreadMode { public static *; }
```

这样就能正常编译通过了，但如果使用了索引加速，是不会有上面这个问题的。因为在找方法时，调用的不是findUsingReflection，而是findUsingInfo。但是使用了索引加速后，编译后却会报新的错误：`Could not find subscriber method in XXX Class. Maybe a missing ProGuard rule?`

这就很好理解了，因为生成索引GeneratedSubscriberIndex是在代码混淆之前进行的，混淆之后类名和方法名都不一样了（上面这个错误是方法无法找到），得keep住所有被Subscribe注解标注的方法：

```java
-keepclassmembers class * {
    @de.greenrobot.event.Subscribe <methods>;
}
```

所以又倒退回了EventBus2.4时不能混淆onEvent开头的方法一样的处境了。所以这里就得权衡一下利弊：使用了注解不用索引加速，则只需要keep住EventBus相关的代码，现有的代码可以正常的进行混淆。而使用了索引加速的话，则需要keep住相关的方法和类。

#### 4.2 跨进程问题

目前EventBus只支持跨线程，而**不支持跨进程**。如果一个app的service起到了另一个进程中，那么注册监听的模块则会收不到另一个进程的EventBus发出的事件。这里可以考虑利用IPC做映射表，并在两个进程中各维护一个EventBus，不过这样就要自己去维护register和unregister的关系，比较繁琐，而且这种情况下通常用广播会更加方便，大家可以思考一下有没有更优的解决方案。

#### 4.3 事件环路问题

在使用EventBus时，通常我们会把两个模块相互监听，来达到一个相互回调通信的目的。但这样一旦出现死循环，而且如果没有相应的日志信息，很难定位问题。所以在使用EventBus的模块，如果在回调上有环路，而且回调方法复杂到了一定程度的话，就要考虑把接收事件专门封装成一个子模块，同时考虑避免出现事件环路。

### 五、总结

`EventBus`不论从使用方式和实现方式上都是非常值得我们学习的开源项目，可以说是目前消息通知里最好用的项目。但是业内对`EventBus`的主要争论点是在于`EventBus`使用反射会出现性能问题，实际上在`EventBus`里我们可以看到不仅可以使用注解处理器预处理获取订阅信息，`EventBus`也会将订阅者的方法缓存到`METHOD_CACHE`里避免重复查找，所以只有在最后`invoke()`方法的时候会比直接调用多出一些性能损耗。

而且相比旧版的2.x，现在新版的EventBus 3.0，订阅者已经没有固定的处理事件的方法了，`onEvent`、`onEventMainThread`、`onEventBackgroundThread`、`onEventAsync`都没有了，现在支持处理事件的方法名自定义，但必须public，只有一个参数，然后使用注解`@Subscribe`来标记该方法为处理事件的方法，ThreadMode和priority也通过该注解来定义。在subscriberMethodFinder中，通过反射的方式寻找事件方法。使用注解，用起来才更爽。

当然，EventBus并不是重构代码的唯一之选。作为观察者模式的“同门师兄弟”——RxJava，作为功能更为强大的响应式编程框架，可以轻松实现EventBus的事件总线功能（[RxBus](http://www.jianshu.com/p/ca090f6e2fe2)）。但毕竟大型项目要接入RxJava的成本高，复杂的操作符需要开发者投入更多的时间去学习。所以想在成熟的项目中快速地重构、解耦模块，EventBus依旧是我们的不二之选。

---

### 参考资料

- [Markus Junginger - EventBus 3 beta announced at droidcon](http://androiddevblog.com/eventbus-3-droidcon/)
- [老司机教你 “飙” EventBus 3](https://segmentfault.com/a/1190000005089229) -  [**腾讯Bugly**](https://segmentfault.com/u/tencentbugly)
- [EventBus源码研读(上)](https://kymjs.com/code/2015/12/12/01/)，[(中)](https://www.kymjs.com/code/2015/12/13/01/)，[(下)](https://kymjs.com/code/2015/12/16/01/) - kymjs张涛
- [EventBus3.0源码解析](http://yydcdut.com/2016/03/07/eventbus3-code-analyse/) - yydcdut
- [EventBus 3.0 源代码分析](http://skykai521.github.io/2016/02/20/EventBus-3-0%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90/) - Skykai
- [EventBus 源码解析](http://a.codekk.com/detail/Android/Trinea/EventBus%20%E6%BA%90%E7%A0%81%E8%A7%A3%E6%9E%90) - codeKK




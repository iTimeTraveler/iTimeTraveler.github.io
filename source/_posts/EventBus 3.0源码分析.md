---
title: EventBus 3.0 源码分析
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
---





### 概述

**[EventBus](https://github.com/greenrobot/EventBus)**是一个基于**观察者模式**的事件发布/订阅框架，开发者可以通过极少的代码去实现多个模块之间的通信，既可用于 Android 四大组件间通讯，也可以用于异步线程和主线程间通讯，而不需要以Interface回调、handler或者BroadCastReceiver的形式去单独构建通信桥梁。从而降低因多重回调导致的模块间强耦合，同时避免产生大量内部类。

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

什么，既然是单例模式构造函数还是 `public` ？？没错，这样的设计是因为不仅仅可以只有一条总线，还可以有其他的线 (bus) ，订阅者可以注册到不同的线上的 `EventBus`，通过不同的 `EventBus` 实例来发送数据，不同的 `EventBus` 是相互隔离开的，订阅者都只会收到注册到该线上事件。

我们看到这个构造函数中，最终运用到了builder设计模式，那么来看看这个 `EventBusBuilder` 中有哪些参数：

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

#### **2.2 注册与订阅Event**

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

一句话来描述`SubscriberMethodFinder`类就是用来**查找和缓存订阅者响应函数的信息**的类。所以我们首先要知道怎么能获得订阅者响应函数的相关信息。在3.0版本中，EventBus提供了一个**`EventBusAnnotationProcessor`注解处理器**来在编译期通过读取`@Subscribe()`注解并解析，处理其中所包含的信息，然后生成java类来保存所有订阅者关于订阅的信息，这样就比在运行时使用反射来获得这些订阅者的信息速度要快。我们可以参考EventBus项目里的[EventBusPerformance](https://github.com/greenrobot/EventBus/tree/master/EventBusPerformance)这个例子，编译后我们可以在build文件夹里找到这个类，[MyEventBusIndex 类](https://github.com/greenrobot/EventBus/blob/master/EventBusPerformance/build.gradle#L27)，当然类名是可以自定义的。我们大致看一下生成的`MyEventBusIndex`类是什么样的:

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

这里走完，我们订阅类的所有`SubscriberMethod`都已经被保存了，最后再通过`getMethodsAndRelease()`返回`List<SubscriberMethod>`。至此，所有关于如何获得订阅类的订阅方法信息即：`SubscriberMethod`对象就已经完全分析完了，下面我们来看`subscribe()`是如何实现的。


**subscribe()方法的实现**

下面看一下`subscribe()`的实现：

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

#### **2.3 事件分发Post**

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









### 三、EventBus原理分析



### 四、缺点与问题

### 五、总结




现在新版的EventBus，订阅者已经没有固定的处理事件的方法了，onEvent、onEventMainThread、onEventBackgroundThread、onEventAsync都没有了，现在支持处理事件的方法名自定义，但必须public，只有一个参数，然后使用注解Subscribe来标记该方法为处理事件的方法，ThreadMode和priority也通过该注解来定义。在subscriberMethodFinder中，通过反射的方式寻找事件方法。使用注解，用起来才更爽。[嘻嘻]



---

### 参考资料

- [老司机教你 “飙” EventBus 3](https://segmentfault.com/a/1190000005089229)
- [EventBus3.0源码解析](http://yydcdut.com/2016/03/07/eventbus3-code-analyse/)
- [EventBus 3.0 源代码分析](http://skykai521.github.io/2016/02/20/EventBus-3-0%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90/)
- [EventBus 源码解析](http://a.codekk.com/detail/Android/Trinea/EventBus%20%E6%BA%90%E7%A0%81%E8%A7%A3%E6%9E%90)
- [EventBus源码解析](https://segmentfault.com/a/1190000004295210)
- [EventBus 源码解析](https://juejin.im/entry/58710e9eb123db4a2eb866c4)



---
title: 【Android】源码分析 - IntentService机制
layout: post
date: 2017-10-05 16:03:00
comments: true
tags: 
    - Android
    - 源码分析
categories: 
    - Android
keywords: 
description: 
photos:
---







### 前言

提到Android的多线程机制，除了我们常用的Thread来实现异步任务之外，还有

1. **AsyncTask**：封装了线程池和Handler，主要为了子线程更新UI；
2. **HandlerThread**：一个已经拥有了Looper的线程类，内部可以直接使用Handler；
3. **IntentService**：一个内部采用HandlerThread来执行任务的Service服务，任务执行完毕后会自动退出；


今天我们来根据平时的使用方式来分析一下第三个IntentSevice到底是什么怎么实现的？

### IntentService的使用

IntentService继承了Service并且它本身是一个**抽象类**，因此使用它必须创建它的子类才能使用。所以这里我们自定义一个MyIntentService，来处理异步任务：

```java
public class MyIntentService extends IntentService {

	private static final String TAG = "MyIntentService";
    private boolean isRunning = true;
    private int count = 0;

    public MyIntentService() {
        super("MyIntentService");
    }

    @Override
    public void onCreate() {
        super.onCreate();
    }

    @Override
    protected void onHandleIntent(Intent intent) {
        try {
	        //查看线程id
	        Log.i(TAG, intent.getStringExtra("params") + ", 线程id:" + Thread.currentThread().getId());
            Thread.sleep(1000);

            //从0-100渐增
            isRunning = true;
            count = 0;
            while (isRunning) {
                count++;
                Log.i(TAG, "MyIntentService 线程运行中..." + count);
                if (count >= 100) {
                    isRunning = false;
                }
                Thread.sleep(50);
            }
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
    }
}
```

<!-- more -->

然后启动服务之前别忘了在manifest文件中注册这个Service：

```java
// 在 Manifest 中注册服务
<service android:name=".service.MyIntentService"/>
```
最后是启动服务，就和普通Service一样启动：
```java
// 像启动 Service 那样启动 IntentService
Intent intent= new Intent(getActivity(), MyIntentService.class);
intent.putExtra("params", "testString...");
getActivity().startService(intent);
```
到此，通过IntentService执行的异步任务已经开始执行了，当执行完毕之后它会自动停止而不用我们手动操作。

当这个MyIntentService启动之后，我们看到它接收到了消息并打印出了传递过去的intent参数，同时显示**onHandlerIntent方法执行的线程ID并非主线程**，也就是说它果真开了一个额外的线程，什么时候开启的呢？我们进入IntentService源码看看。


### IntentService源码

```java
//IntentService继承了Service并且它本身是一个抽象类，因此使用它必须创建它的子类才能使用。
public abstract class IntentService extends Service {
    private volatile Looper mServiceLooper;
    private volatile ServiceHandler mServiceHandler;
    private String mName;
    private boolean mRedelivery;

    private final class ServiceHandler extends Handler {
        public ServiceHandler(Looper looper) {
            super(looper);
        }

        @Override
        public void handleMessage(Message msg) {
	        // onHandleIntent 方法在工作线程中执行，执行完调用 stopSelf() 结束服务。
            onHandleIntent((Intent)msg.obj);
            stopSelf(msg.arg1);
        }
    }

    
    public IntentService(String name) {
        super();
        mName = name;
    }

    
    public void setIntentRedelivery(boolean enabled) {
        mRedelivery = enabled;
    }

    @Override
    public void onCreate() {
        // TODO: It would be nice to have an option to hold a partial wakelock
        // during processing, and to have a static startService(Context, Intent)
        // method that would launch the service & hand off a wakelock.

        super.onCreate();
        HandlerThread thread = new HandlerThread("IntentService[" + mName + "]");
        thread.start();

        mServiceLooper = thread.getLooper();
        mServiceHandler = new ServiceHandler(mServiceLooper);
    }

    @Override
    public void onStart(@Nullable Intent intent, int startId) {
        Message msg = mServiceHandler.obtainMessage();
        msg.arg1 = startId;
        msg.obj = intent;
        mServiceHandler.sendMessage(msg);
    }

    
    @Override
    public int onStartCommand(@Nullable Intent intent, int flags, int startId) {
        onStart(intent, startId);
        return mRedelivery ? START_REDELIVER_INTENT : START_NOT_STICKY;
    }

    @Override
    public void onDestroy() {
        mServiceLooper.quit();
    }

    
    @Override
    @Nullable
    public IBinder onBind(Intent intent) {
        return null;
    }

    @WorkerThread
    protected abstract void onHandleIntent(@Nullable Intent intent);
}
```
代码还是相当的简洁的，首先通过定义我们可以知道IntentService是一个Service，并且是一个抽象类，所以我们在继承IntentService的时候需要实现其抽象方法：onHandlerIntent。

#### **1. 启动 IntentService 为什么不需要新建线程？**

我们来看看它的onCreate()函数：

```java
private volatile ServiceHandler mServiceHandler;


@Override
public void onCreate() {
    super.onCreate();
    // HandlerThread 继承自 Thread，内部封装了 Looper，在这里新建线程并启动，所以启动 IntentService 不需要新建线程。
    HandlerThread thread = new HandlerThread("IntentService[" + mName + "]");
    thread.start();

    // 获得工作线程的 Looper，并维护自己的消息队列MessageQueue
    mServiceLooper = thread.getLooper();
    // mServiceHandler 是属于这个工作线程的
    mServiceHandler = new ServiceHandler(mServiceLooper);
}
```
我们可以发现其内部定义一个HandlerThread（本质上是一个含有消息队列的线程）。然后用成员变量维护其Looper和Handler，由于其Handler（也就是mServiceHandler对象）关联着这个HandlerThread的Looper对象，**所以这个`ServiceHandler`的handleMessage方法在HandlerThread线程中执行**。

然后我们发现其onStartCommand方法就是调用的其onStart方法，具体看一下其onStart方法：

```java
@Override
public void onStart(@Nullable Intent intent, int startId) {
    Message msg = mServiceHandler.obtainMessage();
    msg.arg1 = startId;
    msg.obj = intent;
    mServiceHandler.sendMessage(msg);
}
```

很简单就是将startId和启动时接受到的intent对象传递到ServiceHandler的消息队列中处理，那么我们具体看一下ServiceHandler的处理逻辑：

```java
private final class ServiceHandler extends Handler {
    public ServiceHandler(Looper looper) {
        super(looper);
    }

    @Override
    public void handleMessage(Message msg) {
		// onHandleIntent 方法在工作线程中执行，执行完调用 stopSelf() 结束服务。
        onHandleIntent((Intent)msg.obj);
        stopSelf(msg.arg1);
    }
}
```
可以看到起handleMessage方法内部执行了两个逻辑：

- 一个是调用了其`onHandlerIntent()`抽象方法，在子线程中执行。

- 二是调用了`stopSelf()`方法，这里需要注意的是stopSelf方法传递了`msg.arg1`参数，从刚刚的onStart方法我们可以知道我们传递了`startId`，这是**由于service可以启动多次，可以传递N次消息**，当IntentService的消息队列中含有消息时调用stopSelf(startId)并不会立即stop自己，**只有当消息队列中最后一个消息被执行完成时才会真正的stop自身**。


#### **2. 为什么不建议通过 bindService() 启动 IntentService？**

我们看IntentService的`onBind()`方法：

```java
@Override
public IBinder onBind(Intent intent) {
    return null;
}
```
IntentService 源码中的 `onBind()` 默认返回 null，不适合 `bindService()` 启动服务，如果你执意要 `bindService()` 来启动 IntentService，可能因为你想通过 Binder 或 Messenger 使得 IntentService 和 Activity 可以通信，**这样 onHandleIntent() 就不会被回调**，相当于在你使用 Service 而不是 IntentService。



<!-- ### HandlerThread

HandlerThread，其本质上是一个Thread，只不过内部定义了其自身的Looper和MessageQueue。为了让多个线程之间能够方便的通信，我们会使用Handler实现线程间的通信。这个时候我们手动实现的多线程+Handler的简化版就是我们HandlerThrea所要做的事了。 -->


### 总结

IntentService 是继承自 Service 并处理异步请求的一个**抽象类**，在 IntentService 内有一个工作线程来处理耗时操作，当任务执行完后，IntentService 会自动停止，不需要我们去手动结束。如果启动 IntentService 多次，那么每一个耗时操作会以工作队列的方式在 IntentService 的 onHandleIntent 回调方法中执行，依次去执行，执行完自动结束。

IntentService有以下特点：

1）.  它创建了一个独立的工作线程来处理所有的通过onStartCommand()传递给服务的intents。
2）.  创建了一个工作队列，来逐个发送intent给onHandleIntent()。
3）.  不需要主动调用stopSelft()来结束服务。因为，在所有的intent被处理完后，系统会自动关闭服务。
4）.  默认实现的onBind()返回null
5）.  默认实现的onStartCommand()的目的是将intent插入到工作队列中

 继承IntentService的类至少要实现两个函数：**构造函数**和**onHandleIntent()**函数。要覆盖IntentService的其它函数时，注意要通过super调用父类的对应的函数。


### 参考资料

- [Android源码解析之（五）-->IntentService](http://blog.csdn.net/qq_23547831/article/details/50958757)
- [IntentService 示例与详解](http://www.jianshu.com/p/332b6daf91f0)
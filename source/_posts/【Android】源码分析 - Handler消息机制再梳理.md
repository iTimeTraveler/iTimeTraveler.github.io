---
title: 【Android】源码分析 - Handler消息机制再梳理
layout: post
date: 2017-08-03 16:03:00
comments: true
tags: 
    - Android
    - 源码分析
categories: 
    - Android
keywords: 
description: 
photos:
   - /gallery/14987336455200.jpg
---





## 前言

多线程的消息传递处理，从初学Android时的Handler，懵懵懂懂地照猫画虎，到后来一头雾水的疑惑它为什么这么复杂，再到熟悉之后的叹为观止，一步步地都是自己踩过的足迹，都是成长啊哈哈哈。虽然离出神入化的境界还远十万八千里呢，但Android中的Handler多线程消息传递机制，的确是研发技术学习中不可多得的一个宝藏。本来我以为自己之前的学习以及比较了解 Handler，在印象中 Android 消息机制无非就是：

1. Handler 给 MessageQueue 添加消息
2. 然后 Looper 无限循环读取消息
3. 再调用 Handler 处理消息

但是只知道整体流程，细节还不是特别透彻。最近不甚忙碌，回头看到这块又有些许收获，我们来记录一下吧。

在整个Android的源码世界里，有两大利剑，其一是**Binder IPC机制**，另一个便是**消息机制**。Android有大量的消息驱动方式来进行交互，比如Android的四剑客`Activity`, `Service`, `Broadcast`, `ContentProvider`的启动过程的交互，都离不开消息机制，Android某种意义上也可以说成是一个以消息驱动的系统。而Android 消息机制主要涉及 4 个类：

- Handler
- Message
- MessageQueue
- Looper

我们依次结合源码分析一下。

<!-- more -->

## 初学Handler

每个初学Android开发的都绕不开Handler这个“坎”，为什么说是个坎呢，首先这是Android架构的精髓之一，其次大部分人都是知其然却不知其所以然。所以决定再去翻翻源代码梳理一下Handler的实现机制。

### 异步更新UI

我们都知道Android中主线程就是UI线程。**在主线程不能做耗时操作，而子线程不能更新UI**。主线程如果耗时操作太久（超过5秒）会引起ANR。子线程更新UI，会导致线程不安全，界面的刷新不能同步，可能不起作用甚至是崩溃。详细的分析可以看这篇文章[Android子线程真的不能更新UI么？](http://www.cnblogs.com/lao-liang/p/5108745.html)

上面这个规定应该是初学必知的，那要怎么来解决这个问题呢，这时候`Handler`就出现在我们面前了，我们也可以利用`AsyncTask`或者`IntentService`进行异步的操作。这两者又是怎么做到的呢？其实，在AsyncTask和IntentService的内部亦使用了`Handler`实现其主要功能。抛开这两者不谈，当我们打开Android源码的时候也随处可见Handler的身影。所以，Handler是Android异步操作的核心和精髓，它在众多领域发挥着极其重要甚至是不可替代的作用。我们先来一段经典常用代码（这里忽略内存泄露问题，我们后面再说）：

首先在Activity中新建一个handler:

```java
private Handler mHandler = new Handler() {
	@Override
	public void handleMessage(Message msg) {
		super.handleMessage(msg);
		switch (msg.what) {
			case 0:
				mTestTV.setText("This is handleMessage");	//更新UI
				break;
		}
	}
};
```

然后在子线程里发送消息：

```java
new Thread(new Runnable() {
    @Override
    public void run() {
        try {
            Thread.sleep(1000);	//在子线程有一段耗时操作,比如请求网络
            mHandler.sendEmptyMessage(0);
        } catch (InterruptedException e) {
            e.printStackTrace();
        }
    }
}).start();
```

我们可以看到，子线程拿着主线程的`mHandler`对象调用了它的`sendEmptyMessage(0)`方法发送了一个空Message。然后主线程就更新了`mTestTV`这个TextView的内容。下面，我们就根据这段代码逐步跟踪分析一下Handler源码，梳理一下Android的这个消息机制。

## Handler源码跟踪

根据上面的Handler使用例子，我们从Handler的`sendEmptyMessage()`方法这里开始，翻看Handler的源码：

```java
    public final boolean sendEmptyMessage(int what)
    {
        return sendEmptyMessageDelayed(what, 0);
    }
    
    public final boolean sendEmptyMessageDelayed(int what, long delayMillis) {
        Message msg = Message.obtain();
        msg.what = what;
        return sendMessageDelayed(msg, delayMillis);
    }
    
    public final boolean sendMessageDelayed(Message msg, long delayMillis)
    {
        if (delayMillis < 0) {
            delayMillis = 0;
        }
        return sendMessageAtTime(msg, SystemClock.uptimeMillis() + delayMillis);
    }
```

我们可以看到，最后调用了`sendMessageAtTime()`方法，我们接着看这个方法：

```java
public boolean sendMessageAtTime(Message msg, long uptimeMillis) {
    MessageQueue queue = mQueue;	//拿到MessageQueue队列对象
    if (queue == null) {
        RuntimeException e = new RuntimeException(
                this + " sendMessageAtTime() called with no mQueue");
        Log.w("Looper", e.getMessage(), e);
        return false;
    }
  	//把msg对象入队
    return enqueueMessage(queue, msg, uptimeMillis);
}
```

也就是说，目前我们看到的Handler的`sendEmptyMessage()`方法调用逻辑如下图：

![Handler的sendEmptyMessage()方法调用逻辑](/gallery/android-handler/java_sendmessage.png)


最后这个`sendMessageAtTime()`方法我们看到两个亮点：

- 第一步，**首先拿到消息队列`MessageQueue`类型的`mQueue`对象**。
- 第二步，**把消息`Message`类型的实例`msg`对象入队**。


接下来，我们就沿着这两个问题分别往下跟踪。

## MessageQueue对象从哪里来

我们先来看`mQueue`这个MessageQueue对象哪来的呢？我们找到了赋值的地方，原来在Handler的构造函数里：

```java
public Handler(Callback callback, boolean async) {
    if (FIND_POTENTIAL_LEAKS) {
        final Class<? extends Handler> klass = getClass();
        if ((klass.isAnonymousClass() || klass.isMemberClass() || klass.isLocalClass()) &&
                (klass.getModifiers() & Modifier.STATIC) == 0) {
            Log.w(TAG, "The following Handler class should be static or leaks might occur: " +
                klass.getCanonicalName());
        }
    }

    mLooper = Looper.myLooper();	//使用Looper.myLooper()取到了mLooper对象
    if (mLooper == null) {
        throw new RuntimeException(
            "Can't create handler inside thread that has not called Looper.prepare()");
    }
    mQueue = mLooper.mQueue;	//原来消息队列来自mLooper对象里的mQueue
    mCallback = callback;
    mAsynchronous = async;
}
```

原来`mQueue`这个对象是从`Looper`这个对象中获取的，同时我们看到是通过`Looper.myLooper()`获取到Looper对象的。也就是说每个Looper拥有一个消息队列`MessageQueue`对象。我们在Looper的构造函数里看到是它new了一个MessageQueue：

```java
final MessageQueue mQueue;

private Looper(boolean quitAllowed) {
    mQueue = new MessageQueue(quitAllowed);	//初始化MessageQueue对象
    mThread = Thread.currentThread();
}
```

我们紧接着再进入Looper类中的`myLooper()`方法看看如何得到Looper实例对象的：

```java
/**
 * Return the Looper object associated with the current thread.  Returns
 * null if the calling thread is not associated with a Looper.
 */
public static Looper myLooper() {
    return sThreadLocal.get();
}

// sThreadLocal.get() will return null unless you've called prepare().
static final ThreadLocal<Looper> sThreadLocal = new ThreadLocal<Looper>();
```

原来这个looper对象是从一个`ThreadLocal`线程本地存储TLS对象中取到的，而且这个实例声明上面我们可以看到一行注释：**如果不提前调用`prepare()`方法的话`sThreadLocal.get()`可能返回null**。

我们来看看这个`prepare()`方法到底干了什么：

```java
private static void prepare(boolean quitAllowed) {
	 //每个线程只允许执行一次该方法，第二次执行时线程的TLS已有数据，则会抛出异常。
    if (sThreadLocal.get() != null) {
        throw new RuntimeException("Only one Looper may be created per thread");
    }
    //创建Looper对象，并保存到当前线程的TLS区域
    sThreadLocal.set(new Looper(quitAllowed));	
}
```

原来是给`ThreadLocal`线程本地存储TLS对象set了一个新的Looper对象。换句话说，就是new了一个Looper对象然后保存在了线程本地存储区里了。而这个`ThreadLocal`线程本地存储对象就是每个线程专有的变量，可以理解成线程的自有变量保存区。我们这里不作深入介绍，只用理解每个线程可以通过`Looper.prepare()`方法new一个Looper对象保存起来，然后就可以拥有一个Looper了。这也就是我们在非UI线程中使用Handler之前必须首先调用`Looper.prepare()`方法的根本原因。

> **插播**：`ThreadLocal`类实现一个线程本地的存储，也就是说，每个线程都有自己的局部变量。所有线程都共享一个ThreadLocal对象，但是每个线程在访问这些变量的时候能得到不同的值，每个线程可以更改这些变量并且不会影响其他的线程，并且支持null值。详细介绍可以看看这里：[Android线程管理之ThreadLocal理解及应用场景](http://www.cnblogs.com/whoislcj/p/5811989.html)

比如我们在Activity的onCreate()方法中写一段这样的代码：

```java
@Override
protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    setContentView(R.layout.activity_main);

    Handler h1 = new Handler();

    new Thread(new Runnable() {
        @Override public void run() {
            Handler h2 = new Handler();		//直接在子线程中new一个Handler
        }
    }).start();
}
```

运行之后h1正常创建，但是创建h2的时候crash了：

> --------- beginning of crash
> E/AndroidRuntime: FATAL EXCEPTION: Thread-263
> Process: com.example.stone.sfsandroidclient, PID: 32286
> java.lang.RuntimeException: **Can't create handler inside thread that has not called Looper.prepare()**
>    at android.os.Handler.<init>(Handler.java:200)
>    at android.os.Handler.<init>(Handler.java:114)
>    at com.example.stone.sfsandroidclient.MainActivity$1.run(MainActivity.java:71)
>    at java.lang.Thread.run(Thread.java:818)

很明显，出错日志提示**不能在一个没有调用过`Looper.prepare()`的Thread里边`new Handler()`**。

看到了这里有一个疑惑，那就是我们在文章开头的示例代码中新建`mHandler`的时候并没有调用`Looper.prepare()`方法，那Looper的创建以及方法调用在哪里呢？其实这些东西Android本身已经帮我们做了，在程序入口**ActivityThread**的main方法里面我们可以找到：

```java
 public static void main(String[] args) {
    ...
    Looper.prepareMainLooper();		//这里等同于Looper.prepare()
    ...
    Looper.loop();
    ...
}
```


## Message对象如何入队

我们明白了MessageQueue消息队列对象是来自于ThreadLocal线程本地存储区存储的那个唯一的Looper对象。我们接着看**Handler**在发送消息的最后调用的`enqueueMessage()`方法，看名字应该是把消息加入队列的意思，点进去看下：

```java
private boolean enqueueMessage(MessageQueue queue, Message msg, long uptimeMillis) {
    msg.target = this;		//注意此处Handler把自己this赋值给了Message的target变量
    if (mAsynchronous) {
        msg.setAsynchronous(true);
    }
    return queue.enqueueMessage(msg, uptimeMillis);
}
```

我们看到msg的target的赋值是Handler自己，也就是说这个`msg`实例对象现在持有了主线程中`mHandler`这个对象。注意这里，我们稍后会讲到`msg`持有这个`mHandler`对象的用途。最后调用了`MessageQueue`类的`enqueueMessage()`方法加入到了消息队列。

看来真正的入队方法交给了**MessageQueue**，这个`enqueueMessage()`方法较长，我们现在继续进入看看：

```java
boolean enqueueMessage(Message msg, long when) {
    if (msg.target == null) {    //这里要求消息必须跟 Handler 关联
        throw new IllegalArgumentException("Message must have a target.");
    }
    if (msg.isInUse()) {    
        throw new IllegalStateException(msg + " This message is already in use.");
    }

    synchronized (this) {
        if (mQuitting) {    //如果消息队列已经退出，还入队就报错
            IllegalStateException e = new IllegalStateException(
                    msg.target + " sending message to a Handler on a dead thread");
            Log.w(TAG, e.getMessage(), e);
            msg.recycle();
            return false;
        }

        msg.markInUse();    //消息入队后就标记为 在被使用
        msg.when = when;
        Message p = mMessages;
        boolean needWake;
        //添加消息到链表中
        if (p == null || when == 0 || when < p.when) {    
            //之前是空链表的时候读取消息会阻塞，新添加消息后唤醒
            msg.next = p;
            mMessages = msg;
            needWake = mBlocked;
        } else {
            //插入消息到队列时，只有在队列头部有个屏障并且当前消息是异步的时才需要唤醒队列
            needWake = mBlocked && p.target == null && msg.isAsynchronous();
            Message prev;
            for (;;) {
                prev = p;
                p = p.next;
                if (p == null || when < p.when) {
                    break;
                }
                if (needWake && p.isAsynchronous()) {
                    needWake = false;
                }
            }
            msg.next = p; // invariant: p == prev.next
            prev.next = msg;
        }

        // We can assume mPtr != 0 because mQuitting is false.
        if (needWake) {
            nativeWake(mPtr);
        }
    }
    return true;
}
```

可以看到一个无限循环将消息加入到消息队列中（链表的形式），但是有放就有拿，这个消息怎样把它取出来呢？

翻看`MessageQueue`的方法，我们找到了`next()`方法，也就是出队方法。这个方法代码太长，可以不用细看我们知道它是用来把消息取出来的就行了。

```java
Message next() {
    //如果消息的 looper 退出，就退出这个方法
    final long ptr = mPtr;
    if (ptr == 0) {
        return null;
    }

    int pendingIdleHandlerCount = -1; // -1 only during first iteration
    int nextPollTimeoutMillis = 0;
    //也是一个循环，有合适的消息就返回，没有就阻塞
    for (;;) {
        if (nextPollTimeoutMillis != 0) {    //如果有需要过段时间再处理的消息，先调用 Binder 的这个方法
            Binder.flushPendingCommands();
        }

        nativePollOnce(ptr, nextPollTimeoutMillis);

        synchronized (this) {
            //获取下一个消息
            final long now = SystemClock.uptimeMillis();
            Message prevMsg = null;
            Message msg = mMessages;    //当前链表的头结点
            if (msg != null && msg.target == null) {
                //如果消息没有 target，那它就是一个屏障，需要一直往后遍历找到第一个异步的消息
                                do {
                    prevMsg = msg;
                    msg = msg.next;
                } while (msg != null && !msg.isAsynchronous());
            }
            if (msg != null) {
                if (now < msg.when) {    //如果这个消息还没到处理时间，就设置个时间过段时间再处理
                    nextPollTimeoutMillis = (int) Math.min(msg.when - now, Integer.MAX_VALUE);
                } else {
                    // 消息是正常的、可以立即处理的
                    mBlocked = false;
                    //取出当前消息，链表头结点后移一位
                    if (prevMsg != null) {
                        prevMsg.next = msg.next;
                    } else {
                        mMessages = msg.next;
                    }
                    msg.next = null;
                    if (DEBUG) Log.v(TAG, "Returning message: " + msg);
                    msg.markInUse();    //标记这个消息在被使用
                    return msg;
                }
            } else {
                // 消息链表里没有消息了
                nextPollTimeoutMillis = -1;
            }

            //如果收到退出的消息，并且所有等待处理的消息都处理完时，调用 Native 方法销毁队列
                        if (mQuitting) {
                dispose();
                return null;
            }

            //有消息等待过段时间执行时，pendingIdleHandlerCount 增加
            if (pendingIdleHandlerCount < 0
                    && (mMessages == null || now < mMessages.when)) {
                pendingIdleHandlerCount = mIdleHandlers.size();
            }
            if (pendingIdleHandlerCount <= 0) {
                mBlocked = true;
                continue;
            }

            if (mPendingIdleHandlers == null) {
                mPendingIdleHandlers = new IdleHandler[Math.max(pendingIdleHandlerCount, 4)];
            }
            mPendingIdleHandlers = mIdleHandlers.toArray(mPendingIdleHandlers);
        }

        for (int i = 0; i < pendingIdleHandlerCount; i++) {
            final IdleHandler idler = mPendingIdleHandlers[i];
            mPendingIdleHandlers[i] = null; // release the reference to the handler

            boolean keep = false;
            try {
                keep = idler.queueIdle();
            } catch (Throwable t) {
                Log.wtf(TAG, "IdleHandler threw exception", t);
            }

            if (!keep) {
                synchronized (this) {
                    mIdleHandlers.remove(idler);
                }
            }
        }

        // Reset the idle handler count to 0 so we do not run them again.
        pendingIdleHandlerCount = 0;

        // While calling an idle handler, a new message could have been delivered
        // so go back and look again for a pending message without waiting.
        nextPollTimeoutMillis = 0;
    }
}
```

可以看到，`MessageQueue.next()` 方法里有一个循环，在这个循环中遍历消息链表，找到下一个可以处理的、`target` 不为空的消息并且执行时间不在未来的消息，就返回，否则就继续往后找。

如果有阻塞（没有消息了或者只有 Delay 的消息），会把 `mBlocked`这个变量标记为 `true`，在下一个 Message 进队时会判断这个`message` 的位置，如果在队首就会调用` nativeWake()` 方法唤醒线程！

不过`MessageQueue.next()` 这个方法是在什么地方调用的呢，不是在`Handler`中，我们找到了**`Looper`**这个关键人物，专门负责从消息队列中拿消息。


## Looper如何处理Message

我们又来到了`Looper`的阵地，他在调用MessageQueue的`next()`方法，来从消息队列中拿Message对象，关键代码如下：

```java
/**
 * Run the message queue in this thread. Be sure to call
 * {@link #quit()} to end the loop.
 */
public static void loop() {
    final Looper me = myLooper();
    if (me == null) {    //当前线程必须创建 Looper 才可以执行
        throw new RuntimeException("No Looper; Looper.prepare() wasn't called on this thread.");
    }
    final MessageQueue queue = me.mQueue;

    //底层对 IPC 标识的处理，不用关心 
    Binder.clearCallingIdentity();
    final long ident = Binder.clearCallingIdentity();

    for (;;) {    //无限循环模式
        Message msg = queue.next(); //从消息队列中读取消息，可能会阻塞
        if (msg == null) {    //当消息队列中没有消息时就会返回，不过这只发生在 queue 退出的时候
            return;
        }

        //...
        try {
            msg.target.dispatchMessage(msg);    //调用消息关联的 Handler 处理消息
        } finally {
            if (traceTag != 0) {
                Trace.traceEnd(traceTag);
            }
        }
        //...
        msg.recycleUnchecked();    //标记这个消息被回收
    }
}
```

可以看到，`Looper.loop()` 也很简单，就是调用消息队列 `MessageQueue.next()` 方法取消息，如果没有消息的话会阻塞，直到有新的消息进入或者消息队列退出。也就是不断重复下面的操作，直到没有消息时退出循环

- 读取MessageQueue的下一条**Message**；
- 把Message分发给相应的**target**；
- 再把分发后的Message回收到消息池，以便重复利用。

拿到消息后调用`msg.target`的`dispatchMessage(msg)`方法，而这个`msg.target`是什么呢？就是前面`Handler`发送消息`sendMessageAtTime()`时把自己赋值给`msg.target`的主线程的`mHandler`对象。也就是说，最后还是 Handler 负责处理消息。可以看到，**Looper 并没有执行消息，真正执行消息的还是添加消息到队列中的那个 Handler**。

![Looper处理Message的大致流程](/gallery/android-handler/looper.png)

所以我们来看Handler中的`dispatchMessage(msg)`方法：

```java
/**
 * Handle system messages here.
 */
public void dispatchMessage(Message msg) {
    if (msg.callback != null) {
        handleCallback(msg);
    } else {
        if (mCallback != null) {
            if (mCallback.handleMessage(msg)) {
                return;
            }
        }
        handleMessage(msg);
    }
}

private static void handleCallback(Message message) {
    message.callback.run();
}

public void handleMessage(Message msg) {
}
```

可以看到，Handler 在处理消息时，会有三种情况：

1. **msg.callback 不为空** 
   - 这在使用 `Handler.postXXX(Runnable)` 发送消息的时候会发生
   - 这就直接调用 Runnable 的 run() 方法
2. **mCallback 不为空** 
   - 这在我们使用前面介绍的 Handler.Callback 为参数构造 Handler 时会发生
   - 那就调用构造函数里传入的 `handleMessage()` 方法
   - 如果返回 true，那就不往下走了
3. **最后就调用` Handler.handleMessage()` 方法**
   - 这是一个空实现，需要我们在 Handler 子类里重写

而我们开头的例子，使用的就是第3种方法，大家可以回顾一下。

![子线程向主线程中发送UI更新消息的整体流程](/gallery/android-handler/0_1327991304aZK7.jpg)

到这里，我们的疑问基本上就解决了，虽然没有再深入到jni层看native底层实现，但是java层的机制我们大概明白了。最后我们对上面的源码跟踪分析做一个宏观上的总结。

## 整体运行机制

### 四大主角

与Windows系统一样，Android也是消息驱动型的系统。引用一下消息驱动机制的四要素：

- 接收消息的“消息队列”
- 阻塞式地从消息队列中接收消息并进行处理的“线程”
- 可发送的“消息的格式”
- “消息发送函数”

与之对应，Android中的实现对应了

- 接收消息的“消息队列” ——【MessageQueue】
- 阻塞式地从消息队列中接收消息并进行处理的“线程” ——【Thread+Looper】
- 可发送的“消息的格式” ——【Message】
- “消息发送函数”——【Handler的post和sendMessage】

也就是说，消息机制主要包含以下四个主角：

- **Message**：消息分为硬件产生的消息（如按钮、触摸）和软件生成的消息；
- **MessageQueue**：消息队列的主要功能向消息池投递消息（`MessageQueue.enqueueMessage()`）和取走消息池的消息（`MessageQueue.next()`）；
- **Handler**：消息辅助类，主要功能向消息池发送各种消息事件（`Handler.sendMessage()`）和处理相应消息事件（`Handler.handleMessage()`）；
- **Looper**：不断循环执行（`Looper.loop()`），按分发机制将消息分发给目标处理者。

他们之间的关系如下：

- **Thread**：一个线程有唯一一个对应的Looper；
- **Looper**：有一个MessageQueue消息队列；
- **MessageQueue**：有一组待处理的Message；
- **Message**中有一个用于处理消息的Handler；
- **Handler**中有Looper和MessageQueue。

### 流程图


![](/gallery/android-handler/1836169-c13aab3f58697aaa.png)

一个`Looper`类似一个消息泵。它本身是一个死循环，不断地从`MessageQueue`中提取`Message`或者Runnable。而`Handler`可以看做是一个`Looper`的暴露接口，向外部暴露一些事件，并暴露`sendMessage()`和`post()`函数。



在安卓中，除了`UI线程`/`主线程`以外，普通的线程(先不提`HandlerThread`)是不自带`Looper`的。想要通过UI线程与子线程通信需要在子线程内自己实现一个`Looper`。开启Looper分**三步走**：

1. 判定是否已有`Looper`并`Looper.prepare()`
2. 做一些准备工作(如暴露handler等)
3. 调用`Looper.loop()`，线程进入阻塞态

由于每一个线程内最多只可以有一个`Looper`，所以一定要在`Looper.prepare()`之前做好判定，否则会抛出`java.lang.RuntimeException: Only one Looper may be created per thread`。为了获取Looper的信息可以使用两个方法：

- Looper.myLooper()
- Looper.getMainLooper()

`Looper.myLooper()`获取当前线程绑定的Looper，如果没有返回`null`。`Looper.getMainLooper()`返回主线程的`Looper`,这样就可以方便的与主线程通信。



### 总结

- `Looper`调用`prepare()`进行初始化，创建了一个与当前线程对应的`Looper`对象（通过`ThreadLocal`实现），并且初始化了一个与当前`Looper`对应的`MessageQueue`对象。
- `Looper`调用静态方法`loop()`开始消息循环，通过`MessageQueue.next()`方法获取`Message`对象。
- 当获取到一个`Message`对象时，让`Message`的发送者（`target`）去处理它。
- `Message`对象包括数据，发送者（`Handler`），可执行代码段（`Runnable`）三个部分组成。
- `Handler`可以在一个已经`Looper.prepare()`的线程中初始化，如果线程没有初始化`Looper`，创建`Handler`对象会失败
- 一个线程的执行流中可以构造多个`Handler`对象，它们都往同一个MQ中发消息，消息也只会分发给对应的`Handler`处理。
- `Handler`将消息发送到MQ中，`Message`的`target`域会引用自己的发送者，`Looper`从MQ中取出来后，再交给发送这个`Message`的`Handler`去处理。
- `Message`可以直接添加一个`Runnable`对象，当这条消息被处理的时候，直接执行`Runnable.run()`方法。


## Handler的内存泄露问题

再来看看我们的新建Handler的代码：

```java
private Handler mHandler = new Handler() {
    @Override
    public void handleMessage(Message msg) {
        ...
    }
};
```

**当使用内部类（包括匿名类）来创建Handler的时候，Handler对象会隐式地持有Activity的引用。**

而Handler通常会伴随着一个耗时的后台线程一起出现，这个后台线程在任务执行完毕后发送消息去更新UI。然而，如果用户在网络请求过程中关闭了Activity，正常情况下，Activity不再被使用，它就有可能在GC检查时被回收掉，但由于这时线程尚未执行完，而该线程持有Handler的引用（不然它怎么发消息给Handler？），这个Handler又持有Activity的引用，就导致该Activity无法被回收（即内存泄露），直到网络请求结束。

另外，如果执行了Handler的postDelayed()方法，那么在设定的delay到达之前，会有一条**MessageQueue -> Message -> Handler -> Activity**的链，导致你的Activity被持有引用而无法被回收。

解决方法之一，使用弱引用：

```java
static class MyHandler extends Handler {
    WeakReference<Activity > mActivityReference;
    MyHandler(Activity activity) {
        mActivityReference= new WeakReference<Activity>(activity);
    }
    @Override
    public void handleMessage(Message msg) {
        final Activity activity = mActivityReference.get();
        if (activity != null) {
            mImageView.setImageBitmap(mBitmap);
        }
    }
}
```

从JDK1.2开始，Java把对象的引用分为四种级别，这四种级别由高到低依次为：强引用、软引用、弱引用和虚引用。

1. **强引用**：我们一般使用的就是强引用，垃圾回收器一般都不会对其进行回收操作。当内存空间不足时Java虚拟机宁愿抛出OutOfMemoryError错误使程序异常终止，也不会回收具有强引用的对象。

2. **软引用(SoftReference)**：如果一个对象具有软引用(SoftReference)，在内存空间足够的时候GC不会回收它，如果内存空间不足了GC就会回收这些对象的内存空间。

3. **弱引用(WeakReference)** ：如果一个对象具有弱引用(WeakReference)，那么当GC线程扫描的过程中一旦发现某个对象只具有弱引用而不存在强引用时不管当前内存空间足够与否GC都会回收它的内存。由于垃圾回收器是一个优先级较低的线程，所以不一定会很快发现那些只具有弱引用的对象。为了防止内存溢出，在处理一些占用内存大而且生命周期较长的对象时候，可以尽量使用软引用和弱引用。

4. **虚引用(PhantomReference)** ：虚引用(PhantomReference)与其他三种引用都不同，它并不会决定对象的生命周期。如果一个对象仅持有虚引用，那么它就和没有任何引用一样，在任何时候都可能被垃圾回收器回收。所以，虚引用主要用来跟踪对象被垃圾回收器回收的活动，在一般的开发中并不会使用它。

## 进程、线程间通信方式

文章最后，我们来整理一下进程、线程间通信方式，参考[线程通信与进程通信的区别](http://www.cnblogs.com/xh0102/p/5710074.html)。看看Handler消息传递机制属于哪种？

### 一、进程间的通信方式

- **管道( pipe )**：管道是一种半双工的通信方式，数据只能单向流动，而且只能在具有亲缘关系的进程间使用。进程的亲缘关系通常是指父子进程关系。
- **有名管道 (namedpipe)** ： 有名管道也是半双工的通信方式，但是它允许无亲缘关系进程间的通信。
- **信号量(semophore )** ： 信号量是一个计数器，可以用来控制多个进程对共享资源的访问。它常作为一种锁机制，防止某进程正在访问共享资源时，其他进程也访问该资源。因此，主要作为进程间以及同一进程内不同线程之间的同步手段。
- **消息队列( messagequeue )** ： 消息队列是由消息的链表，存放在内核中并由消息队列标识符标识。消息队列克服了信号传递信息少、管道只能承载无格式字节流以及缓冲区大小受限等缺点。
- **信号 (sinal )** ： 信号是一种比较复杂的通信方式，用于通知接收进程某个事件已经发生。
- **共享内存(shared memory )** ：共享内存就是映射一段能被其他进程所访问的内存，这段共享内存由一个进程创建，但多个进程都可以访问。共享内存是最快的 IPC 方式，它是针对其他进程间通信方式运行效率低而专门设计的。它往往与其他通信机制，如信号两，配合使用，来实现进程间的同步和通信。
- **套接字(socket )** ： 套解口也是一种进程间通信机制，与其他通信机制不同的是，它可用于不同及其间的进程通信。


| **IPC**        | **数据拷贝次数** |
| -------------- | ---------- |
| 共享内存           | 0          |
| Android Binder | 1          |
| Socket/管道/消息队列 | 2          |

### 二、线程间的通信方式

-  **锁机制**：包括互斥锁、条件变量、读写锁
   1. 互斥锁提供了以排他方式防止数据结构被并发修改的方法。
   2. 读写锁允许多个线程同时读共享数据，而对写操作是互斥的。
   3. 条件变量可以以原子的方式阻塞进程，直到某个特定条件为真为止。对条件的测试是在互斥锁的保护下进行的。条件变量始终与互斥锁一起使用。
-  **信号量机制(Semaphore)**：包括无名线程信号量和命名线程信号量
-  **信号机制(Signal)**：类似进程间的信号处理

线程间的通信目的主要是用于线程同步，所以线程没有像进程通信中的用于数据交换的通信机制。

> 很明显，Android的Handler消息机制使用消息队列( MessageQueue )实现的线程间通信方式。而Binder是Android建立额一套新的IPC机制来满足系统对通信方式，传输性能和安全性的要求。**Binder基于Client-Server通信模式，传输过程只需一次拷贝，为发送方添加UID/PID身份，既支持实名Binder也支持匿名Binder，安全性高。**此处就不对Binder作更多介绍了。






## 参考资料

- [Android消息机制1-Handler(Java层)](http://gityuan.com/2015/12/26/handler-message-framework/)
- [从Handler.post(Runnable r)再一次梳理Android的消息机制](http://blog.csdn.net/ly502541243/article/details/52062179/)
- [[Android 进阶14：源码解读 Android 消息机制（ Message MessageQueue Handler Looper）](http://blog.csdn.net/u011240877/article/details/72892321)](http://blog.csdn.net/u011240877/article/details/72892321)
- [Android源码：Handler, Looper和MessageQueue实现解析](http://www.jianshu.com/p/10dd4d605d40)
- [深入探讨Android异步精髓Handler](http://www.androidchina.net/6053.html)
- [Android消息机制](https://hzj163.gitbooks.io/android-thread/content/androidxiao_xi_ji_zhi.html)
- [哈工大面试指导：Android中的Thread, Looper和Handler机制](https://hit-alibaba.github.io/interview/Android/basic/Android-handler-thread-looper.html)
- [Android 线程本地变量<一> ThreadLocal源码解析](http://blog.csdn.net/fenggit/article/details/50766820)
- [Android线程管理之ThreadLocal理解及应用场景](http://www.cnblogs.com/whoislcj/p/5811989.html)
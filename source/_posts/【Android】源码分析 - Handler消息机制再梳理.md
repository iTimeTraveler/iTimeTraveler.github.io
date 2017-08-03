---
title: 【Android】源码分析 - Handler消息机制再梳理
layout: post
date: 2017-08-03 16:03:00
comments: true
tags: 
    - Android
categories: 
    - Android
keywords: 
description: 
photos:
   - /gallery/memoryleak.png
---

## 前言

多线程的消息传递处理，从初学Android时的Handler，懵懵懂懂地照猫画虎，到后来一头雾水的疑惑它为什么这么复杂，再到熟悉之后的叹为观止，一步步地都是自己踩过的足迹，都是成长啊哈哈哈。虽然离出神入化的境界还远十万八千里呢，但Android中的Handler多线程消息传递机制，的确是研发技术学习中不可多得的一个宝藏。本来我以为自己之前的学习以及比较了解 Handler，在印象中 Android 消息机制无非就是：

1. Handler 给 MessageQueue 添加消息
2. 然后 Looper 无限循环读取消息
3. 再调用 Handler 处理消息

但是只知道整体流程，细节还不是特别透彻。最近不甚忙碌，回头看到这块又有些许收获，我们来记录一下吧。Android 消息机制主要涉及 4 个类：

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

我们可以看到，子线程拿着主线程的`mHandler`对象调用了它的`sendEmptyMessage(0)`方法发送了一个空Message。然后主线程就更新了`mTestTV`这个TextView的内容。

### Handler源码跟踪

然后，我们从Handler的`sendEmptyMessage()`方法这里开始，翻看Handler的源码：

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

这个方法我们看到两个亮点：

- 第一步，**首先拿到消息队列`mQueue`对象**。
- 第二步，**把msg对象入队**。

我们先来看`mQueue`这个对象哪来的呢？我们找到了赋值的地方，原来在Handler的构造函数里：

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

原来`mQueue`这个对象是从`Looper`这个对象中获取的，也就是说Looper拥有一个消息队列`MessageQueue`对象。稍后我们再深入Looper查看。

我们接着看前面调用的` enqueueMessage()`方法，看名字应该是把消息加入队列的意思，点进去看下：

```java
private boolean enqueueMessage(MessageQueue queue, Message msg, long uptimeMillis) {
    msg.target = this;		//注意此处Handler把自己this赋值给了Message的target变量
    if (mAsynchronous) {
        msg.setAsynchronous(true);
    }
    return queue.enqueueMessage(msg, uptimeMillis);
}
```

我们看到msg的target的赋值是Handler自己，也就是说这个`msg`实例对象现在持有了主线程中`mHandler`这个对象。最后调用了`MessageQueue`类的`enqueueMessage()`方法加入到了消息队列。

## 消息队列MessageQueue

`MessageQueue`类的`enqueueMessage()`方法较长，我们现在继续进入看看：

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

不过`MessageQueue.next()` 这个方法是在什么地方调用的呢，不是在`Handler`中，我们找到了`Looper`这个关键人物，专门负责从消息队列中拿消息。


## Looper

我们来到了`Looper`的阵地，他在调用MessageQueue的`next()`方法，来从消息队列中拿Message对象，关键代码如下：

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

可以看到，`Looper.loop()` 也很简单，就是调用 `MessageQueue.next()` 方法取消息，如果没有消息的话会阻塞，直到有新的消息进入或者消息队列退出。

拿到消息后调用`msg.target`的`dispatchMessage(msg)`方法，而这个`msg.target`是什么呢？就是前面`Handler`发送消息`sendMessageAtTime()`时把自己赋值给`msg.target`的主线程的`mHandler`对象。所以，最后还是 Handler 负责处理消息。可以看到，**Looper 并没有执行消息，真正执行消息的还是添加消息到队列中的那个 Handler**。

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





























## 参考资料


- [从Handler.post(Runnable r)再一次梳理Android的消息机制](http://blog.csdn.net/ly502541243/article/details/52062179/)
- [[Android 进阶14：源码解读 Android 消息机制（ Message MessageQueue Handler Looper）](http://blog.csdn.net/u011240877/article/details/72892321)](http://blog.csdn.net/u011240877/article/details/72892321)
- [Android源码：Handler, Looper和MessageQueue实现解析](http://www.jianshu.com/p/10dd4d605d40)
- [深入探讨Android异步精髓Handler](http://www.androidchina.net/6053.html)
- [哈工大面试指导：Android中的Thread, Looper和Handler机制](https://hit-alibaba.github.io/interview/Android/basic/Android-handler-thread-looper.html)
- [Android 线程本地变量<一> ThreadLocal源码解析](http://blog.csdn.net/fenggit/article/details/50766820)
- [Android线程管理之ThreadLocal理解及应用场景](http://www.cnblogs.com/whoislcj/p/5811989.html)
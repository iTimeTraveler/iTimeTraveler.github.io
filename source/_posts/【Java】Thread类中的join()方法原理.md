---
title: 【Java】Thread类中的join()方法原理
layout: post
date: 2018-05-04 22:20:55
comments: true
tags: 
    - Java
    - 源码分析
categories: 
    - Java
    - 源码分析
keywords: Thread
description: 
photos:
    - /gallery/java-common/20170531150958304.jpeg
---



## 简介

`join()`是Thread类的一个方法。根据jdk文档的定义：

> public final void join()throws InterruptedException:  **Waits for this thread to die**.

`join()`方法的作用，是等待这个线程结束；但显然，这样的定义并不清晰。个人认为"Java 7 Concurrency Cookbook"的定义较为清晰：

> **join() method suspends the execution of the calling thread until the object called finishes its execution.**

 

也就是说，t.join()方法阻塞调用此方法的线程(calling thread)，直到线程t完成，此线程再继续；通常用于在main()主线程内，等待其它线程完成再结束main()主线程。我们来看看下面的例子。



<!-- more -->

## 例子

我们对比一下下面这两个例子，看看使用`join()`方法的作用是什么？

1. 不使用`join()`方法的情况：

```java
public static void main(String[] args){
    System.out.println("MainThread run start.");

    //启动一个子线程
    Thread threadA = new Thread(new Runnable() {
        @Override
        public void run() {
            System.out.println("threadA run start.");
            try {
                Thread.sleep(1000);
            } catch (Exception e) {
                e.printStackTrace();
            }
            System.out.println("threadA run finished.");
        }
    });
    threadA.start();

    System.out.println("MainThread join before");
    System.out.println("MainThread run finished.");
}
```
运行结果如下：
> MainThread run start.
> threadA run start.
> MainThread join before
> MainThread run finished.
> threadA run finished.

因为上述子线程执行时间相对较长，所以是在主线程执行完毕之后才结束。

2. 使用了`join()`方法的情况：

```java
public static void main(String[] args){
    System.out.println("MainThread run start.");

    //启动一个子线程
    Thread threadA = new Thread(new Runnable() {
        @Override
        public void run() {
            System.out.println("threadA run start.");
            try {
                Thread.sleep(1000);
            } catch (Exception e) {
                e.printStackTrace();
            }
            System.out.println("threadA run finished.");
        }
    });
    threadA.start();

    System.out.println("MainThread join before");
    try {
        threadA.join();    //调用join()
    } catch (InterruptedException e) {
        e.printStackTrace();
    }
    System.out.println("MainThread run finished.");
}
```

运行结果如下：

> MainThread run start.
> threadA run start.
> MainThread join before
> threadA run finished.
> MainThread run finished.

对子线程threadA使用了`join()`方法之后，我们发现主线程会等待子线程执行完成之后才往后执行。

## `join()`的原理和作用



java层次的状态转换图

![](/gallery/java-common/20170531150958304.jpeg)



我们来深入源码了解一下join()：

```java
//Thread类中
public final void join() throws InterruptedException {
    join(0);
}


public final synchronized void join(long millis) throws InterruptedException {
    long base = System.currentTimeMillis();  //获取当前时间
    long now = 0;

    if (millis < 0) {
        throw new IllegalArgumentException("timeout value is negative");
    }

    if (millis == 0) {    //这个分支是无限期等待直到b线程结束
        while (isAlive()) {
            wait(0);
        }
    } else {    //这个分支是等待固定时间，如果b没结束，那么就不等待了。
        while (isAlive()) {
            long delay = millis - now;
            if (delay <= 0) {
                break;
            }
            wait(delay);
            now = System.currentTimeMillis() - base;
        }
    }
}
```

我们重点关注一下这两句，无限期等待的情况：：

```java
while (isAlive()) {
    wait(0);	//wait操作，那必然有synchronized与之对应
}
```

注意这个`wait()`方法是Object类中的方法，再来看sychronized的是谁：

```java
public final synchronized void join(long millis) throws InterruptedException { ... }
```

成员方法加了synchronized说明是`synchronized(this)`，this是谁啊？this就是threadA子线程对象本身。也就是说，主线程持有了threadA这个对象的锁。

大家都知道，有了`wait()`，必然有`notify()`，什么时候才会notify呢？在jvm源码里：

```java
// 位于/hotspot/src/share/vm/runtime/thread.cpp中
void JavaThread::exit(bool destroy_vm, ExitType exit_type) {
    // ...
    
    // Notify waiters on thread object. This has to be done after exit() is called
    // on the thread (if the thread is the last thread in a daemon ThreadGroup the
    // group should have the destroyed bit set before waiters are notified).
    // 有一个贼不起眼的一行代码，就是这行
    ensure_join(this);
    
    // ...
}


static void ensure_join(JavaThread* thread) {
    // We do not need to grap the Threads_lock, since we are operating on ourself.
    Handle threadObj(thread, thread->threadObj());
    assert(threadObj.not_null(), "java thread object must exist");
    ObjectLocker lock(threadObj, thread);
    // Ignore pending exception (ThreadDeath), since we are exiting anyway
    thread->clear_pending_exception();
    // Thread is exiting. So set thread_status field in  java.lang.Thread class to TERMINATED.
    java_lang_Thread::set_thread_status(threadObj(), java_lang_Thread::TERMINATED);
    // Clear the native thread instance - this makes isAlive return false and allows the join()
    // to complete once we've done the notify_all below
    java_lang_Thread::set_thread(threadObj(), NULL);
    
    // 同志们看到了没，别的不用看，就看这一句
    // thread就是当前线程，是啥？就是刚才例子中说的threadA线程啊。
    lock.notify_all(thread);
    
    // Ignore pending exception (ThreadDeath), since we are exiting anyway
    thread->clear_pending_exception();
}
```

当子线程threadA执行完毕的时候，jvm会自动唤醒阻塞在threadA对象上的线程，在我们的例子中也就是主线程。至此，threadA线程对象被notifyall了，那么主线程也就能继续跑下去了。

**可以看出，`join()`方法实现是通过`wait()`（小提示：Object 提供的方法）。 当main线程调用threadA.join时候，main线程会获得线程对象threadA的锁（wait 意味着拿到该对象的锁),调用该对象的wait(等待时间)，直到该对象唤醒main线程 （也就是子线程threadA执行完毕退出的时候）**

## 总结

首先`join()` 是一个synchronized方法， 里面调用了`wait()`，这个过程的目的是让持有这个同步锁的线程进入等待，那么谁持有了这个同步锁呢？答案是主线程，因为主线程调用了`threadA.join()`方法，相当于在`threadA.join()`代码这块写了一个同步代码块，谁去执行了这段代码呢，是主线程，所以主线程被wait()了。然后在子线程threadA执行完毕之后，JVM会调用`lock.notify_all(thread);`唤醒持有threadA这个对象锁的线程，也就是主线程，会继续执行。



## 参考资料

- [Java中Thread类的join方法到底是如何实现等待的？](https://www.zhihu.com/question/44621343)
- [简谈Java的join()方法](http://www.cnblogs.com/techyc/p/3286678.html)


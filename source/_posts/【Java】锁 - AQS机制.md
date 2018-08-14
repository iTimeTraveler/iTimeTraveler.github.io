---
title: 【Java】J.U.C并发包 - AQS机制
layout: post
date: 2018-07-19 22:20:55
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

Java并发包（java.util.concurrent）中提供了很多并发工具，这其中，很多我们耳熟能详的并发工具，譬如ReentrantLock、Semaphore，CountDownLatch，CyclicBarrier，它们的实现都用到了一个共同的基类 - **AbstractQueuedSynchronizer**，简称AQS。AQS提供了一种原子式管理同步状态、阻塞和唤醒线程功能以及队列模型的简单框架。是一个用来构建锁和同步器的框架，使用AQS能简单且高效地构造出应用广泛的大量的同步器，比如我们提到的ReentrantLock，Semaphore，其他的诸如ReentrantReadWriteLock，SynchronousQueue，FutureTask等等皆是基于AQS的。

## 设计思想

同步器背后的基本思想非常简单，可以参考AQS作者 Doug Lea 的论文：[The java.util.concurrent Synchronizer Framework](http://gee.cs.oswego.edu/dl/papers/aqs.pdf)。同步器一般包含两种方法，一种是acquire，另一种是release。

- acquire操作阻塞调用的线程，直到同步状态允许其继续执行。
- release操作则是改变同步状态，使得一或多个被acquire阻塞的线程继续执行。

其中acquire操作伪代码如下：

```java
while (synchronization state does not allow acquire) {
	enqueue current thread if not already queued;
	possibly block current thread;
}
dequeue current thread if it was queued;
```

release操作伪代码如下：

```java
update synchronization state;
if (state may permit a blocked thread to acquire)
	unblock one or more queued threads;
```

为了实现上述操作，需要下面三个基本组件的相互协作：

- 同步状态的原子性管理；
- 线程的阻塞与解除阻塞；
- 队列的管理；

AQS框架借助于两个类：**Unsafe**(提供CAS操作) 和 **LockSupport**(提供park/unpark操作)。

## 1. 同步状态的原子性管理

AQS类使用单个`int`（32位）来保存同步状态，并暴露出`getState`、`setState`以及`compareAndSet`操作来读取和更新这个状态。该整数可以表现任何状态。比如， `Semaphore` 用它来表现剩余的许可数，`ReentrantLock` 用它来表现拥有它的线程已经请求了多少次锁；`FutureTask` 用它来表现任务的状态(尚未开始、运行、完成和取消)。

如JDK的文档中所说，使用AQS来实现一个同步器需要覆盖实现如下几个方法，并且使用`getState`，`setState`，`compareAndSetState`这几个方法来设置或者获取状态。

- `boolean tryAcquire(int arg)` 

- `boolean tryRelease(int arg)` 
- `int tryAcquireShared(int arg)` 

-  `boolean tryReleaseShared(int arg)` 
-  `boolean isHeldExclusively()`

以上方法不需要全部实现，根据获取的锁的种类可以选择实现不同的方法，支持独占(排他)获取锁的同步器应该实现`tryAcquire`、 `tryRelease`、`isHeldExclusively`而支持共享获取的同步器应该实现`tryAcquireShared`、`tryReleaseShared`、`isHeldExclusively`。下面以 `CountDownLatch` 举例说明基于AQS实现同步器, `CountDownLatch` 用同步状态持有当前计数，`countDown`方法调用 release从而导致计数器递减；当计数器为0时，解除所有线程的等待；`await`调用acquire，如果计数器为0，`acquire` 会立即返回，否则阻塞。

## 参考资料

- [The java.util.concurrent Synchronizer Framework - AQS框架作者Doug Lea的论文](http://gee.cs.oswego.edu/dl/papers/aqs.pdf)
- [The j.u.c Synchronizer Framework翻译(二)设计与实现](http://ifeve.com/aqs-2/)
- [Java多线程（九）之ReentrantLock与Condition](https://blog.csdn.net/vernonzheng/article/details/8288251)


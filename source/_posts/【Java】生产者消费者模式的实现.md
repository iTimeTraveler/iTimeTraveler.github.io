---
title: 【Java】生产者消费者模式的实现
layout: post
date: 2017-11-10 22:20:55
comments: true
tags: 
    - Java
categories: 
    - Java
keywords: 生产者消费者 
description: 
photos:
    - /gallery/android_common/producer-consumer.png
---


### 前言

生产者消费者问题是线程模型中的经典问题：生产者和消费者在同一时间段内共用同一存储空间，生产者向空间里生产数据，而消费者取走数据。

阻塞队列就相当于一个缓冲区，平衡了生产者和消费者的处理能力。这个阻塞队列就是用来给生产者和消费者解耦的。

<!-- more -->


### wait/notify方法

首先，我们搞清楚Thread.sleep()方法和Object.wait()、Object.notify()方法的区别。根据这篇文章[java sleep和wait的区别的疑惑?](https://www.zhihu.com/question/23328075)

1. `sleep()`是Thread类的方法；而`wait()`，`notify()`，`notifyAll()`是Object类中定义的方法；尽管这两个方法都会影响线程的执行行为，但是本质上是有区别的。

2. `Thread.sleep()`不会导致锁行为的改变，如果当前线程是拥有锁的，那么`Thread.sleep()`不会让线程释放锁。如果能够帮助你记忆的话，可以简单认为和锁相关的方法都定义在Object类中，因此调用`Thread.sleep()`是不会影响锁的相关行为。

3. `Thread.sleep`和`Object.wait`都会暂停当前的线程，对于CPU资源来说，不管是哪种方式暂停的线程，都表示它暂时不再需要CPU的执行时间。OS会将执行时间分配给其它线程。区别是调用wait后，需要别的线程执行notify/notifyAll才能够重新获得CPU执行时间。

**线程状态图：**

![](/gallery/android_common/1886630-1301e97750ae36a3.jpg)

- `Thread.sleep()`让线程从 【running】 -> 【阻塞态】 时间结束/interrupt -> 【runnable】
- `Object.wait()`让线程从 【running】 -> 【等待队列】notify  -> 【锁池】 -> 【runnable】



### 实现生产者消费者模型

生产者消费者问题是研究多线程程序时绕不开的经典问题之一，它描述是有一块缓冲区作为仓库，生产者可以将产品放入仓库，消费者则可以从仓库中取走产品。在Java中一共有四种方法支持同步，其中前三个是同步方法，一个是管道方法。

（1）**Object**的wait() / notify()方法
（2）**Lock**和**Condition**的await() / signal()方法
（3）**BlockingQueue**阻塞队列方法
（4）**PipedInputStream** / **PipedOutputStream**

本文只介绍最常用的前三种，第四种暂不做讨论。源代码在这里：[Java实现生产者消费者模型](https://github.com/iTimeTraveler/DataStructureAndAlgorithms/tree/master/src/main/java/multithread)

#### 1. 使用Object的wait() / notify()方法

`wait() `/ `nofity()`方法是基类Object的两个方法，也就意味着所有Java类都会拥有这两个方法，这样，我们就可以为任何对象实现同步机制。

- `wait()`：当缓冲区已满/空时，生产者/消费者线程停止自己的执行，放弃锁，使自己处于等待状态，让其他线程执行。
- `notify()`：当生产者/消费者向缓冲区放入/取出一个产品时，向其他等待的线程发出可执行的通知，同时放弃锁，使自己处于等待状态。


```java
/**
 * 生产者消费者模式：使用Object.wait() / notify()方法实现
 */
public class ProducerConsumer {
	private static final int CAPACITY = 5;

	public static void main(String args[]){
		Queue<Integer> queue = new LinkedList<Integer>();
		
		Thread producer1 = new Producer("P-1", queue, CAPACITY);
		Thread producer2 = new Producer("P-2", queue, CAPACITY);
		Thread consumer1 = new Consumer("C1", queue, CAPACITY);
		Thread consumer2 = new Consumer("C2", queue, CAPACITY);
		Thread consumer3 = new Consumer("C3", queue, CAPACITY);

		producer1.start();
		producer2.start();
		consumer1.start();
		consumer2.start();
		consumer3.start();
	}
	
	/**
	 * 生产者
	 */
	public static class Producer extends Thread{
		private Queue<Integer> queue;
		String name;
		int maxSize;
		int i = 0;
		
		public Producer(String name, Queue<Integer> queue, int maxSize){
			super(name);
			this.name = name;
			this.queue = queue;
			this.maxSize = maxSize;
		}
		
		@Override
		public void run(){
			while(true){
				synchronized(queue){
					while(queue.size() == maxSize){
						try {
							System.out .println("Queue is full, Producer[" + name + "] thread waiting for " + "consumer to take something from queue.");
							queue.wait();
						} catch (Exception ex) {
							ex.printStackTrace();
						}
					}
					System.out.println("[" + name + "] Producing value : +" + i);
					queue.offer(i++);
					queue.notifyAll();

					try {
						Thread.sleep(new Random().nextInt(1000));
					} catch (InterruptedException e) {
						e.printStackTrace();
					}
				}
			}
			
		}
	}
	
	/**
	 * 消费者
	 */
	public static class Consumer extends Thread{
		private Queue<Integer> queue;
		String name;
		int maxSize;
		
		public Consumer(String name, Queue<Integer> queue, int maxSize){
			super(name);
			this.name = name;
			this.queue = queue;
			this.maxSize = maxSize;
		}
		
		@Override
		public void run(){
			while(true){
				synchronized(queue){
					while(queue.isEmpty()){
						try {
							System.out.println("Queue is empty, Consumer[" + name + "] thread is waiting for Producer");
							queue.wait();
						} catch (Exception ex) {
							ex.printStackTrace();
						}
					}
					int x = queue.poll();
					System.out.println("[" + name + "] Consuming value : " + x);
					queue.notifyAll();

					try {
						Thread.sleep(new Random().nextInt(1000));
					} catch (InterruptedException e) {
						e.printStackTrace();
					}
				}
			}
		}
	}
}
```

##### 注意要点

判断Queue大小为0或者大于等于queueSize时须使用 `while (condition) {}`，不能使用 `if(condition) {}`。其中 `while(condition)`循环，它又被叫做**“自旋锁”**。自旋锁以及`wait()`和`notify()`方法在[线程通信](http://ifeve.com/thread-signaling/)这篇文章中有更加详细的介绍。为防止该线程没有收到`notify()`调用也从`wait()`中返回（也称作**虚假唤醒**），这个线程会重新去检查condition条件以决定当前是否可以安全地继续执行还是需要重新保持等待，而不是认为线程被唤醒了就可以安全地继续执行了。


输出日志如下：

```java
[P-1] Producing value : +0
[P-1] Producing value : +1
[P-1] Producing value : +2
[P-1] Producing value : +3
[P-1] Producing value : +4
Queue is full, Producer[P-1] thread waiting for consumer to take something from queue.
[C3] Consuming value : 0
[C3] Consuming value : 1
[C3] Consuming value : 2
[C3] Consuming value : 3
[C3] Consuming value : 4
Queue is empty, Consumer[C3] thread is waiting for Producer
Queue is empty, Consumer[C2] thread is waiting for Producer
Queue is empty, Consumer[C1] thread is waiting for Producer
[P-2] Producing value : +0
[C1] Consuming value : 0
Queue is empty, Consumer[C1] thread is waiting for Producer
Queue is empty, Consumer[C2] thread is waiting for Producer
Queue is empty, Consumer[C3] thread is waiting for Producer
[P-1] Producing value : +5
[P-1] Producing value : +6
[P-1] Producing value : +7
[P-1] Producing value : +8
[P-1] Producing value : +9
Queue is full, Producer[P-1] thread waiting for consumer to take something from queue.
[C3] Consuming value : 5
[C3] Consuming value : 6
[C3] Consuming value : 7
[C3] Consuming value : 8
[C3] Consuming value : 9
Queue is empty, Consumer[C3] thread is waiting for Producer
Queue is empty, Consumer[C2] thread is waiting for Producer
Queue is empty, Consumer[C1] thread is waiting for Producer
[P-2] Producing value : +1
[C1] Consuming value : 1
Queue is empty, Consumer[C1] thread is waiting for Producer
Queue is empty, Consumer[C2] thread is waiting for Producer
Queue is empty, Consumer[C3] thread is waiting for Producer
[P-1] Producing value : +10
[P-1] Producing value : +11
[P-1] Producing value : +12
[P-1] Producing value : +13
[P-1] Producing value : +14
Queue is full, Producer[P-1] thread waiting for consumer to take something from queue.
[C3] Consuming value : 10
[C3] Consuming value : 11
[C3] Consuming value : 12
[C3] Consuming value : 13
[C3] Consuming value : 14
Queue is empty, Consumer[C3] thread is waiting for Producer
Queue is empty, Consumer[C2] thread is waiting for Producer
Queue is empty, Consumer[C1] thread is waiting for Producer
[P-2] Producing value : +2
[P-2] Producing value : +3
[P-2] Producing value : +4
[P-2] Producing value : +5
[P-2] Producing value : +6
Queue is full, Producer[P-2] thread waiting for consumer to take something from queue.
[C1] Consuming value : 2
[C1] Consuming value : 3
[C1] Consuming value : 4
[C1] Consuming value : 5
[C1] Consuming value : 6
Queue is empty, Consumer[C1] thread is waiting for Producer
Queue is empty, Consumer[C2] thread is waiting for Producer
Queue is empty, Consumer[C3] thread is waiting for Producer
[P-1] Producing value : +15
[C3] Consuming value : 15
Queue is empty, Consumer[C3] thread is waiting for Producer
Queue is empty, Consumer[C2] thread is waiting for Producer
Queue is empty, Consumer[C1] thread is waiting for Producer
[P-2] Producing value : +7
[P-2] Producing value : +8
[P-2] Producing value : +9
```

#### 2. 使用Lock和Condition的await() / signal()方法

在JDK5.0之后，Java提供了更加健壮的线程处理机制，包括同步、锁定、线程池等，它们可以实现更细粒度的线程控制。Condition接口的`await()`和`signal()`就是其中用来做同步的两种方法，它们的功能基本上和Object的`wait() `/ `nofity()`相同，完全可以取代它们，但是它们和新引入的锁定机制`Lock`直接挂钩，具有更大的灵活性。通过在`Lock`对象上调用`newCondition()`方法，将条件变量和一个锁对象进行绑定，进而控制并发程序访问竞争资源的安全。下面来看代码：

```java
/**
 * 生产者消费者模式：使用Lock和Condition实现
 * {@link java.util.concurrent.locks.Lock}
 * {@link java.util.concurrent.locks.Condition}
 */
public class ProducerConsumerByLock {
	private static final int CAPACITY = 5;
	private static final Lock lock = new ReentrantLock();
	private static final Condition fullCondition = lock.newCondition();		//队列满的条件
	private static final Condition emptyCondition = lock.newCondition();		//队列空的条件


	public static void main(String args[]){
		Queue<Integer> queue = new LinkedList<Integer>();

		Thread producer1 = new Producer("P-1", queue, CAPACITY);
		Thread producer2 = new Producer("P-2", queue, CAPACITY);
		Thread consumer1 = new Consumer("C1", queue, CAPACITY);
		Thread consumer2 = new Consumer("C2", queue, CAPACITY);
		Thread consumer3 = new Consumer("C3", queue, CAPACITY);

		producer1.start();
		producer2.start();
		consumer1.start();
		consumer2.start();
		consumer3.start();
	}

	/**
	 * 生产者
	 */
	public static class Producer extends Thread{
		private Queue<Integer> queue;
		String name;
		int maxSize;
		int i = 0;

		public Producer(String name, Queue<Integer> queue, int maxSize){
			super(name);
			this.name = name;
			this.queue = queue;
			this.maxSize = maxSize;
		}

		@Override
		public void run(){
			while(true){

				//获得锁
				lock.lock();
				while(queue.size() == maxSize){
					try {
						System.out .println("Queue is full, Producer[" + name + "] thread waiting for " + "consumer to take something from queue.");
						//条件不满足，生产阻塞
						fullCondition.await();
					} catch (InterruptedException ex) {
						ex.printStackTrace();
					}
				}
				System.out.println("[" + name + "] Producing value : +" + i);
				queue.offer(i++);

				//唤醒其他所有生产者、消费者
				fullCondition.signalAll();
				emptyCondition.signalAll();

				//释放锁
				lock.unlock();

				try {
					Thread.sleep(new Random().nextInt(1000));
				} catch (InterruptedException e) {
					e.printStackTrace();
				}
			}

		}
	}

	/**
	 * 消费者
	 */
	public static class Consumer extends Thread{
		private Queue<Integer> queue;
		String name;
		int maxSize;

		public Consumer(String name, Queue<Integer> queue, int maxSize){
			super(name);
			this.name = name;
			this.queue = queue;
			this.maxSize = maxSize;
		}

		@Override
		public void run(){
			while(true){
				//获得锁
				lock.lock();

				while(queue.isEmpty()){
					try {
						System.out.println("Queue is empty, Consumer[" + name + "] thread is waiting for Producer");
						//条件不满足，消费阻塞
						emptyCondition.await();
					} catch (Exception ex) {
						ex.printStackTrace();
					}
				}
				int x = queue.poll();
				System.out.println("[" + name + "] Consuming value : " + x);

				//唤醒其他所有生产者、消费者
				fullCondition.signalAll();
				emptyCondition.signalAll();

				//释放锁
				lock.unlock();

				try {
					Thread.sleep(new Random().nextInt(1000));
				} catch (InterruptedException e) {
					e.printStackTrace();
				}
			}
		}
	}
}
```

输入日志如下：

```java
[P-1] Producing value : +0
[C1] Consuming value : 0
Queue is empty, Consumer[C3] thread is waiting for Producer
Queue is empty, Consumer[C2] thread is waiting for Producer
[P-2] Producing value : +0
[C3] Consuming value : 0
Queue is empty, Consumer[C2] thread is waiting for Producer
Queue is empty, Consumer[C1] thread is waiting for Producer
[P-2] Producing value : +1
[C2] Consuming value : 1
Queue is empty, Consumer[C1] thread is waiting for Producer
Queue is empty, Consumer[C3] thread is waiting for Producer
[P-1] Producing value : +1
[C1] Consuming value : 1
Queue is empty, Consumer[C3] thread is waiting for Producer
[P-1] Producing value : +2
[C3] Consuming value : 2
Queue is empty, Consumer[C2] thread is waiting for Producer
[P-2] Producing value : +2
[C2] Consuming value : 2
Queue is empty, Consumer[C1] thread is waiting for Producer
Queue is empty, Consumer[C2] thread is waiting for Producer
[P-1] Producing value : +3
[C1] Consuming value : 3
Queue is empty, Consumer[C2] thread is waiting for Producer
Queue is empty, Consumer[C1] thread is waiting for Producer
Queue is empty, Consumer[C3] thread is waiting for Producer
[P-2] Producing value : +3
[C2] Consuming value : 3
Queue is empty, Consumer[C1] thread is waiting for Producer
Queue is empty, Consumer[C3] thread is waiting for Producer
Queue is empty, Consumer[C2] thread is waiting for Producer
[P-1] Producing value : +4
[C1] Consuming value : 4
Queue is empty, Consumer[C3] thread is waiting for Producer
Queue is empty, Consumer[C2] thread is waiting for Producer
Queue is empty, Consumer[C1] thread is waiting for Producer
[P-2] Producing value : +4
[C3] Consuming value : 4
Queue is empty, Consumer[C2] thread is waiting for Producer
Queue is empty, Consumer[C1] thread is waiting for Producer
[P-2] Producing value : +5
[C2] Consuming value : 5
Queue is empty, Consumer[C1] thread is waiting for Producer
Queue is empty, Consumer[C2] thread is waiting for Producer
[P-1] Producing value : +5
[C1] Consuming value : 5
Queue is empty, Consumer[C2] thread is waiting for Producer
Queue is empty, Consumer[C3] thread is waiting for Producer
[P-2] Producing value : +6
[C2] Consuming value : 6
Queue is empty, Consumer[C3] thread is waiting for Producer
[P-1] Producing value : +6
[C3] Consuming value : 6
Queue is empty, Consumer[C3] thread is waiting for Producer
Queue is empty, Consumer[C1] thread is waiting for Producer
[P-2] Producing value : +7
[C3] Consuming value : 7
Queue is empty, Consumer[C1] thread is waiting for Producer
[P-1] Producing value : +7
[C1] Consuming value : 7
Queue is empty, Consumer[C2] thread is waiting for Producer
[P-2] Producing value : +8
[C2] Consuming value : 8
[P-1] Producing value : +8
[C1] Consuming value : 8
[P-2] Producing value : +9
[C3] Consuming value : 9
[P-2] Producing value : +10
[C2] Consuming value : 10
[P-1] Producing value : +9
[P-1] Producing value : +10
[C1] Consuming value : 9
[P-2] Producing value : +11
[C3] Consuming value : 10
[C2] Consuming value : 11
[P-2] Producing value : +12
[C1] Consuming value : 12
[P-1] Producing value : +11
[C3] Consuming value : 11
[P-2] Producing value : +13
[C2] Consuming value : 13
Queue is empty, Consumer[C2] thread is waiting for Producer
Queue is empty, Consumer[C3] thread is waiting for Producer
[P-1] Producing value : +12
[C2] Consuming value : 12
Queue is empty, Consumer[C3] thread is waiting for Producer
[P-1] Producing value : +13
[C3] Consuming value : 13
Queue is empty, Consumer[C1] thread is waiting for Producer
Queue is empty, Consumer[C3] thread is waiting for Producer
[P-2] Producing value : +14
[C1] Consuming value : 14
Queue is empty, Consumer[C3] thread is waiting for Producer
Queue is empty, Consumer[C1] thread is waiting for Producer
[P-1] Producing value : +14
[C3] Consuming value : 14
Queue is empty, Consumer[C1] thread is waiting for Producer
[P-1] Producing value : +15
[C1] Consuming value : 15
[P-2] Producing value : +15
[P-1] Producing value : +16
[C3] Consuming value : 15
[P-2] Producing value : +16
```

#### 3. 使用BlockingQueue阻塞队列方法

JDK 1.5 以后新增的 `java.util.concurrent`包新增了 `BlockingQueue` 接口。并提供了如下几种阻塞队列实现：

- java.util.concurrent.**ArrayBlockingQueue**
- java.util.concurrent.**LinkedBlockingQueue**
- java.util.concurrent.**SynchronousQueue**
- java.util.concurrent.**PriorityBlockingQueue**

实现生产者-消费者模型使用 `ArrayBlockingQueue`或者 `LinkedBlockingQueue`即可。

我们这里使用`LinkedBlockingQueue`，它是一个已经在内部实现了同步的队列，实现方式采用的是我们第2种`await() `/ `signal()`方法。它可以在生成对象时指定容量大小。它用于阻塞操作的是put()和take()方法。

- `put()`方法：类似于我们上面的生产者线程，容量达到最大时，自动阻塞。
- `take()`方法：类似于我们上面的消费者线程，容量为0时，自动阻塞。

我们可以跟进源码看一下`LinkedBlockingQueue`类的`put()`方法实现：

```java
/** Main lock guarding all access */
final ReentrantLock lock = new ReentrantLock();

/** Condition for waiting takes */
private final Condition notEmpty = lock.newCondition();

/** Condition for waiting puts */
private final Condition notFull = lock.newCondition();



public void put(E e) throws InterruptedException {
    putLast(e);
}

public void putLast(E e) throws InterruptedException {
    if (e == null) throw new NullPointerException();
    Node<E> node = new Node<E>(e);
    final ReentrantLock lock = this.lock;
    lock.lock();
    try {
        while (!linkLast(node))
            notFull.await();
    } finally {
        lock.unlock();
    }
}
```

看到这里证实了它的实现方式采用的是我们第2种`await() `/ `signal()`方法。下面我们就使用它实现吧。


```java
/**
 * 生产者消费者模式：使用{@link java.util.concurrent.BlockingQueue}实现
 */
public class ProducerConsumerByBQ{
	private static final int CAPACITY = 5;

	public static void main(String args[]){
		LinkedBlockingDeque<Integer> blockingQueue = new LinkedBlockingDeque<Integer>(CAPACITY);

		Thread producer1 = new Producer("P-1", blockingQueue, CAPACITY);
		Thread producer2 = new Producer("P-2", blockingQueue, CAPACITY);
		Thread consumer1 = new Consumer("C1", blockingQueue, CAPACITY);
		Thread consumer2 = new Consumer("C2", blockingQueue, CAPACITY);
		Thread consumer3 = new Consumer("C3", blockingQueue, CAPACITY);

		producer1.start();
		producer2.start();
		consumer1.start();
		consumer2.start();
		consumer3.start();
	}

	/**
	 * 生产者
	 */
	public static class Producer extends Thread{
		private LinkedBlockingDeque<Integer> blockingQueue;
		String name;
		int maxSize;
		int i = 0;

		public Producer(String name, LinkedBlockingDeque<Integer> queue, int maxSize){
			super(name);
			this.name = name;
			this.blockingQueue = queue;
			this.maxSize = maxSize;
		}

		@Override
		public void run(){
			while(true){
				try {
					blockingQueue.put(i);
					System.out.println("[" + name + "] Producing value : +" + i);
					i++;

					//暂停最多1秒
					Thread.sleep(new Random().nextInt(1000));
				} catch (InterruptedException e) {
					e.printStackTrace();
				}
			}

		}
	}

	/**
	 * 消费者
	 */
	public static class Consumer extends Thread{
		private LinkedBlockingDeque<Integer> blockingQueue;
		String name;
		int maxSize;

		public Consumer(String name, LinkedBlockingDeque<Integer> queue, int maxSize){
			super(name);
			this.name = name;
			this.blockingQueue = queue;
			this.maxSize = maxSize;
		}

		@Override
		public void run(){
			while(true){
				try {
					int x = blockingQueue.take();
					System.out.println("[" + name + "] Consuming : " + x);

					//暂停最多1秒
					Thread.sleep(new Random().nextInt(1000));
				} catch (InterruptedException e) {
					e.printStackTrace();
				}
			}
		}
	}
}
```

输出日志如下：

```java
[P-2] Producing value : +0
[P-1] Producing value : +0
[C1] Consuming : 0
[C3] Consuming : 0
[P-2] Producing value : +1
[C2] Consuming : 1
[P-2] Producing value : +2
[C1] Consuming : 2
[P-1] Producing value : +1
[C2] Consuming : 1
[P-1] Producing value : +2
[C3] Consuming : 2
[P-1] Producing value : +3
[C2] Consuming : 3
[P-2] Producing value : +3
[C1] Consuming : 3
[P-1] Producing value : +4
[C2] Consuming : 4
[P-2] Producing value : +4
[C3] Consuming : 4
[P-2] Producing value : +5
[C1] Consuming : 5
[P-1] Producing value : +5
[C2] Consuming : 5
[P-1] Producing value : +6
[C1] Consuming : 6
[P-2] Producing value : +6
[C2] Consuming : 6
[P-2] Producing value : +7
[C2] Consuming : 7
[P-1] Producing value : +7
[C1] Consuming : 7
[P-2] Producing value : +8
[C3] Consuming : 8
[P-2] Producing value : +9
[C2] Consuming : 9
[P-1] Producing value : +8
[C2] Consuming : 8
[P-2] Producing value : +10
[C1] Consuming : 10
[P-1] Producing value : +9
[C3] Consuming : 9
[P-1] Producing value : +10
[C2] Consuming : 10
[P-2] Producing value : +11
[C1] Consuming : 11
[C3] Consuming : 12
[P-2] Producing value : +12
[P-2] Producing value : +13
[C2] Consuming : 13
[P-1] Producing value : +11
[C3] Consuming : 11
[P-1] Producing value : +12
[C3] Consuming : 12
[P-2] Producing value : +14
[C1] Consuming : 14
[P-1] Producing value : +13
[C2] Consuming : 13
[P-2] Producing value : +15
[C3] Consuming : 15
[P-2] Producing value : +16
[C1] Consuming : 16
[P-1] Producing value : +14
[C3] Consuming : 14
[P-2] Producing value : +17
[C2] Consuming : 17
```





### 参考资料

- [Producer-Consumer solution using threads in Java](http://www.geeksforgeeks.org/producer-consumer-solution-using-threads-java/)
- [生产者消费者问题 - 维基百科](https://zh.wikipedia.org/wiki/%E7%94%9F%E4%BA%A7%E8%80%85%E6%B6%88%E8%B4%B9%E8%80%85%E9%97%AE%E9%A2%98)
- [生产者/消费者问题的多种Java实现方式](http://blog.csdn.net/monkey_d_meng/article/details/6251879/)
- [如何在 Java 中正确使用 wait, notify 和 notifyAll – 以生产者消费者模型为例](http://www.importnew.com/16453.html)
- [JAVA多线程之wait/notify](http://www.cnblogs.com/hapjin/p/5492645.html)
- [java sleep和wait的区别的疑惑?](https://www.zhihu.com/question/23328075)
---
title: 【Java】使用Atomic变量实现锁
layout: post
date: 2018-05-22 22:20:55
comments: true
tags: 
    - Java
categories: 
    - Java
keywords: lock 
description: 
photos:
    - /gallery/java-common/writing-scalable-software-in-java-23-728.jpg
---



## Atomic原子操作

Java从JDK1.5开始提供了java.util.concurrent.atomic包，方便程序员在多线程环境下，无锁的进行原子操作。原子变量的底层使用了处理器提供的原子指令，但是不同的CPU架构可能提供的原子指令不一样，也有可能需要某种形式的内部锁,所以该方法不能绝对保证线程不被阻塞。

在Atomic包里一共有12个类，四种原子更新方式，分别是原子更新基本类型，原子更新数组，原子更新引用和原子更新字段。Atomic包里的类基本都是使用Unsafe实现的包装类。

- 原子更新基本类型类： AtomicBoolean，AtomicInteger，AtomicLong，AtomicReference
- 原子更新数组类：AtomicIntegerArray，AtomicLongArray
- 原子更新引用类型：AtomicMarkableReference，AtomicStampedReference，AtomicReferenceArray
- 原子更新字段类：AtomicLongFieldUpdater，AtomicIntegerFieldUpdater，AtomicReferenceFieldUpdater

详细介绍可以参考：[Java中的Atomic包使用指南](http://ifeve.com/java-atomic/)


## Atomic的原理

下面通过`AtomicInteger`的源码来看一下是怎么在没有锁的情况下保证数据正确性。首先看一下`incrementAndGet()`方法的实现：

```java
/**
 * Atomically increments by one the current value.
 * @return the updated value
 */
public final int incrementAndGet() {
    return unsafe.getAndAddInt(this, valueOffset, 1) + 1;
}
```

<!-- more -->

我们继续看，`unsafe.getAndAddInt()` 的实现是什么样的。

```java
/**
 * Atomically adds the given value to the current value of a field
 * or array element within the given object <code>o</code>
 * at the given <code>offset</code>.
 *
 * @param o object/array to update the field/element in
 * @param offset field/element offset
 * @param delta the value to add
 * @return the previous value
 * @since 1.8
 */
public final int getAndAddInt(Object o, long offset, int delta) {
    int v;
    do {
        v = getIntVolatile(o, offset);
    } while (!compareAndSwapInt(o, offset, v, v + delta));
    return v;
}


public final native boolean compareAndSwapInt(Object o, long offset,
                                                  int expected,
                                                  int x);
```

这是一个循环，offset是变量v在内存中相对于对象o起始位置的偏移，传给JNI层用来计算这个value的内存绝对地址。

然后找到JNI的实现代码，来看 native层的`compareAndSwapInt()`方法的实现。这个方法的实现是这样的：

```c++
UNSAFE_ENTRY(jboolean, Unsafe_CompareAndSwapInt(JNIEnv *env, jobject unsafe, jobject obj, jlong offset, jint e, jint x))
  UnsafeWrapper("Unsafe_CompareAndSwapInt");
  oop p = JNIHandles::resolve(obj);
  jint* addr = (jint *) index_oop_from_field_offset_long(p, offset);    //计算变量的内存绝对地址
  return (jint)(Atomic::cmpxchg(x, addr, e)) == e;
UNSAFE_END
```

这个函数其实很简单，就是去看一下obj 的 offset 上的那个位置上的值是多少，如果是 e，那就把它更新为 x，返回true，如果不是 e，那就什么也不做，并且返回false。里面的核心方法是`Atomic::compxchg()`，这个方法所属的类文件是在os_cpu目录下面，由此可以看出这个类是和CPU操作有关，进入代码如下：

```c++
inline jint     Atomic::cmpxchg    (jint     exchange_value, volatile jint*     dest, jint     compare_value) {
  // alternative for InterlockedCompareExchange
  int mp = os::is_MP();
  __asm {
    mov edx, dest
    mov ecx, exchange_value
    mov eax, compare_value
    LOCK_IF_MP(mp)
    cmpxchg dword ptr [edx], ecx
  }
}
```

这个方法里面都是汇编指令，看到`LOCK_IF_MP`也有锁指令实现的原子操作，其实CAS也算是有锁操作，只不过是由CPU来触发，比synchronized性能好的多。



### **什么是CAS**

​       CAS，Compare and Swap即比较并交换。 java.util.concurrent包借助CAS实现了区别于synchronized同步锁的一种乐观锁。乐观锁就是每次去取数据的时候都乐观的认为数据不会被修改，所以不会上锁，但是在更新的时候会判断一下在此期间数据有没有更新。**CAS有3个操作数：内存值V，旧的预期值A，要修改的新值B**。当且仅当预期值A和内存值V相同时，将内存值V修改为B，否则什么都不做。CAS的关键点在于，系统在硬件层面保证了比较并交换操作的原子性，处理器使用基于对缓存加锁或总线加锁的方式来实现多处理器之间的原子操作。



### **CAS的优缺点**

- CAS由于是在硬件层面保证的原子性，不会锁住当前线程，它的效率是很高的。 
- CAS虽然很高效的实现了原子操作，但是它依然存在三个问题。

1、ABA问题。CAS在操作值的时候检查值是否已经变化，没有变化的情况下才会进行更新。但是如果一个值原来是A，变成B，又变成A，那么CAS进行检查时会认为这个值没有变化，但是实际上却变化了。ABA问题的解决方法是使用版本号。在变量前面追加上版本号，每次变量更新的时候把版本号加一，那么A－B－A 就变成1A-2B－3A。从Java1.5开始JDK的atomic包里提供了一个类AtomicStampedReference来解决ABA问题。

2、并发越高，失败的次数会越多，CAS如果长时间不成功，会极大的增加CPU的开销。因此CAS不适合竞争十分频繁的场景。

3、只能保证一个共享变量的原子操作。当对多个共享变量操作时，CAS就无法保证操作的原子性，这时就可以用锁，或者把多个共享变量合并成一个共享变量来操作。比如有两个共享变量i＝2,j=a，合并一下ij=2a，然后用CAS来操作ij。从Java1.5开始JDK提供了AtomicReference类来保证引用对象的原子性，你可以把多个变量放在一个对象里来进行CAS操作。

## 实现自旋锁

```java
/**
 * 使用AtomicInteger实现自旋锁
 */
public class SpinLock {

	private AtomicInteger state = new AtomicInteger(0);

	/**
	 * 自旋等待直到获得许可
	 */
	public void lock(){
		for (;;){
			//CAS指令要锁总线，效率很差。所以我们通过一个if判断避免了多次使用CAS指令。
			if (state.get() == 1) {
				continue;
			} else if(state.compareAndSet(0, 1)){
				return;
			}
		}
	}

	public void unlock(){
		state.set(0);
	}
}
```

原理很简单，就是一直CAS抢锁，如果抢不到，就一直死循环，直到抢到了才退出这个循环。

自旋锁实现起来非常简单，如果关键区的执行时间很短，往往自旋等待会是一种比较高效的做法，它可以避免线程的频繁切换和调度。但如果关键区的执行时间很长，那这种做法就会大量地浪费CPU资源。

针对关键区执行时间长的情况，该怎么办呢？

## 实现可等待的锁

如果关键区的执行时间很长，自旋的锁会大量地浪费CPU资源，我们可以这样改进：**当一个线程拿不到锁的时候，就让这个线程先休眠等待。**这样，CPU就不会白白地空转了。大致步骤如下：

1. 需要一个容器，如果线程抢不到锁，就把线程挂起来，并记录到这个容器里。
2. 当一个线程放弃了锁，得从容器里找出一个挂起的线程，把它恢复了。

```java
/**
 * 使用AtomicInteger实现可等待锁
 */
public class BlockLock implements Lock {
    
    private AtomicInteger state = new AtomicInteger(0);
    private ConcurrentLinkedQueue<Thread> waiters = new ConcurrentLinkedQueue<>();

    @Override
    public void lock() {
        if (state.compareAndSet(0, 1)) {
            return;
        }
        //放到等待队列
        waiters.add(Thread.currentThread());

        for (;;) {
            if (state.get() == 0) {
                if (state.compareAndSet(0, 1)) {
                    waiters.remove(Thread.currentThread());
                    return;
                }
            } else {
                LockSupport.park();     //挂起线程
            }
        }
    }

    @Override
    public void unlock() {
        state.set(0);
        //唤醒等待队列的第一个线程
        Thread waiterHead = waiters.peek();
        if(waiterHead != null){
            LockSupport.unpark(waiterHead);     //唤醒线程
        }
    }
}
```

我们引入了一个 waitList，用于存储抢不到锁的线程，让它挂起。这里我们先借用一下JDK里的`ConcurrentLinkedQueue`，因为这个Queue也是使用CAS操作实现的无锁队列，所以并不会引入JDK里的其他锁机制。如果大家去看`AbstractQueuedSynchronizer`的实现，就会发现，它的`acquire()`方法的逻辑与上面的实现是一样的。

不过上面的代码是不是没问题了呢？如果一个线程在还未调用park挂起之前，是不是有可能被其他线程先调用一遍unpark？这就是唤醒发生在休眠之前。发生这样的情况会不会带来问题呢？

## 参考资料

- [Java中的Atomic包使用指南](http://ifeve.com/java-atomic/)
- [用Atomic实现锁](https://zhuanlan.zhihu.com/p/33076650)
- [用Atomic实现可以等待的锁](https://zhuanlan.zhihu.com/p/33127453)
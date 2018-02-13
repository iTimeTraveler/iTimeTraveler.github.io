---
title: 【Java】线程池ThreadPoolExecutor实现原理
layout: post
date: 2018-02-13 22:20:55
comments: true
tags: 
    - Android
    - 源码分析
categories: 
    - Android
    - 源码分析
keywords: 线程池
description: 
photos:
    - https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/android_common/okhttp_interceptors.png
---





## 引言

线程池：可以理解为缓冲区，由于频繁的创建销毁线程会带来一定的成本，可以预先创建但不立即销毁，以共享方式为别人提供服务，一来可以提供效率，再者可以控制线程无线扩张。合理利用线程池能够带来三个好处：

1. 降低资源消耗。通过重复利用已创建的线程降低线程创建和销毁造成的消耗。
2. 提高响应速度。当任务到达时，任务可以不需要等到线程创建就能立即执行。
3. 提高线程的可管理性。线程是稀缺资源，如果无限制的创建，不仅会消耗系统资源，还会降低系统的稳定性，使用线程池可以进行统一的分配，调优和监控。

但是要做到合理的利用线程池，必须对其原理了如指掌。



## **线程的几种状态**

线程在一定条件下，状态会发生变化。根据[线程的几种状态](https://my.oschina.net/cctester/blog/991744) 这篇文章，线程一共有以下几种状态：

**1、新建状态(New)**：新创建了一个线程对象。
**2、就绪状态(Runnable)**：线程对象创建后，其他线程调用了该对象的start()方法。该状态的线程位于“可运行线程池”中，变得可运行，只等待获取CPU的使用权，即**在就绪状态的线程除CPU之外，其它的运行所需资源都已全部获得。**
**3、运行状态(Running)**：就绪状态的线程获取了CPU，执行程序代码。
**4、阻塞状态(Blocked)**：阻塞状态是线程因为某种原因放弃CPU使用权，暂时停止运行。直到线程进入就绪状态，才有机会转到运行状态。阻塞的情况分三种：
-  ①. 等待阻塞：运行的线程执行wait()方法，该线程会释放占用的所有资源，JVM会把该线程放入“等待池”中。进入这个状态后，是不能自动唤醒的必须依靠其他线程调用notify()或notifyAll()方法才能被唤醒。
-  ②. 同步阻塞：运行的线程在获取对象的同步锁时，若该同步锁被别的线程占用，则JVM会把该线程放入“锁池”中。
-  ③. 其他阻塞：运行的线程执行sleep()或join()方法，或者发出了I/O请求时，JVM会把该线程置为阻塞状态。当sleep()状态超时、join()等待线程终止或者超时，或者I/O处理完毕时，线程重新转入就绪状态。

**5、死亡状态(Dead)**：线程执行完了或者因异常退出了run()方法，该线程结束生命周期。



<!-- more -->



线程变化的状态转换图如下：

![](https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/java_common/149974_1450349079825_4697A22AC611680A692472687DEC1CFD.png)

![](https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/java_common/java-thread-state.png)

> 拿到对象的锁标记，即为获得了对该对象(临界区)的使用权限。即该线程获得了运行所需的资源，进入“就绪状态”，只需获得CPU，就可以运行。
>
> 因为当调用wait()后，线程会释放掉它所占有的“锁标志”，所以线程只有在此获取资源才能进入就绪状态。



下面作下解释： 

- 线程的实现有两种方式，一是继承Thread类，二是实现Runnable接口，但不管怎样，  当我们new了这个对象后，线程就进入了初始状态； 
- 当该对象调用了start()方法，就进入就绪状态； 
- 进入就绪后，当该对象被操作系统选中，获得CPU时间片就会进入运行状态； 
- 进入运行状态后情况就比较复杂；
   1. run()方法或main()方法结束后，线程就进入终止状态； 
   2. 当线程调用了自身的sleep()方法或其他线程的join()方法，进程让出CPU，然后就会进入阻塞状态（该状态既停止当前线程，但并不释放所占有的资源，即调用sleep()函数后，线程不会释放它的“锁标志”。）。当sleep()结束或join()结束后，该线程进入可运行状态，继续等待OS分配CPU时间片；典型地，sleep()被用在等待某个资源就绪的情形；测试发现条件不满足后，让线程阻塞一段时间后重新测试，直到条件满足为止。
   3. 线程调用了yield()方法，意思是放弃当前获得的CPU时间片，回到就绪状态，这时与其他进程处于同等竞争状态，OS有可能会接着又让这个进程进入运行状态；调用 yield() 的效果等价于调度程序认为该线程已执行了足够的时间片从而需要转到另一个线程。yield()只是使当前线程重新回到可执行状态，所以执行yield()的线程有可能在进入到可执行状态后马上又被执行。
   4. 当线程刚进入可运行状态（注意，还没运行），发现将要调用的资源被synchroniza（同步），获取不到锁标记，将会立即进入锁池状态，等待获取锁标记（这时的锁池里也许已经有了其他线程在等待获取锁标记，这时它们处于队列状态，既先到先得），一旦线程获得锁标记后，就转入就绪状态，等待OS分配CPU时间片。
   5. suspend() 和 resume()方法：两个方法配套使用，suspend()使得线程进入阻塞状态，并且不会自动恢复，必须其对应的resume()被调用，才能使得线程重新进入可执行状态。典型地，suspend()和 resume() 被用在等待另一个线程产生的结果的情形：测试发现结果还没有产生后，让线程阻塞，另一个线程产生了结果后，调用resume()使其恢复。 
   6. ​wait()和 notify() 方法：当线程调用wait()方法后会进入等待队列（进入这个状态会释放所占有的所有资源，与阻塞状态不同），进入这个状态后，是不能自动唤醒的，必须依靠其他线程调用notify()或notifyAll()方法才能被唤醒（由于notify()只是唤醒一个线程，但我们由不能确定具体唤醒的是哪一个线程，也许我们需要唤醒的线程不能够被唤醒， 因此在实际使用时，一般都用notifyAll()方法，唤醒有所线程），线程被唤醒后会进入锁池，等待获取锁标记。 **wait() 使得线程进入阻塞状态，它有两种形式：**一种允许指定以ms为单位的时间作为参数，另一种没有参数。前者当对应的notify()被调用或超出指定时间时线程重新进入可执行状态即就绪状态，后者则必须对应的notify()被调用。 当调用wait()后，线程会释放掉它所占有的“锁标志”，从而使线程所在对象中的其它synchronized数据可被别的线程使用。 waite()和notify()因为会对对象的“锁标志”进行操作，所以它们必须在synchronized函数或synchronizedblock中进行调用。 如果在non-synchronized函数或non-synchronizedblock中进行调用，虽然能编译通过，但在运行时会发生IllegalMonitorStateException的异常。



## 线程池ThreadPoolExecutor实现原理

```java
public class ThreadPoolExecutor extends AbstractExecutorService { ... }
public abstract class AbstractExecutorService implements ExecutorService { ... }
public interface ExecutorService extends Executor { ... }
public interface Executor { ... }
```

![](https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/java_common/1506308400666NssJxY.png)

我们先通过ThreadPoolExecutor的构造方法了解一下这个类:

```java
public ThreadPoolExecutor(int corePoolSize,
                          int maximumPoolSize,
                          long keepAliveTime,
                          TimeUnit unit,
                          BlockingQueue<Runnable> workQueue,
                          ThreadFactory threadFactory,
                          RejectedExecutionHandler handler) { 
    //...省略...
}
```

构造参数比较多，一个一个说下：

- corePoolSize：线程池中的核心线程数
- maximumPoolSize：线程池最大线程数，它表示在线程池中最多能创建多少个线程；
- keepAliveTime：线程池中的线程存活时间（准确来说应该是没有任务执行时的回收时间，后面会分析）
- unit：时间单位
- workQueue：任务的阻塞队列，缓存将要执行的Runnable任务，由各线程轮询该任务队列获取任务执行。
- ThreadFactory：线程创建的工厂。可以进行一些属性设置，比如线程名，优先级等等，有默认实现。
- RejectedExecutionHandler：任务拒绝策略，当运行线程数已达到maximumPoolSize，队列也已经装满时会调用该参数拒绝任务，有默认实现。

### ThreadPoolExecutor的状态变量

```java
private final AtomicInteger ctl = new AtomicInteger(ctlOf(RUNNING, 0));
private static final int COUNT_BITS = Integer.SIZE - 3;
private static final int CAPACITY   = (1 << COUNT_BITS) - 1;

// runState is stored in the high-order bits
private static final int RUNNING    = -1 << COUNT_BITS;
private static final int SHUTDOWN   =  0 << COUNT_BITS;
private static final int STOP       =  1 << COUNT_BITS;
private static final int TIDYING    =  2 << COUNT_BITS;
private static final int TERMINATED =  3 << COUNT_BITS;

// Packing and unpacking ctl
private static int runStateOf(int c)     { return c & ~CAPACITY; }
private static int workerCountOf(int c)  { return c & CAPACITY; }
private static int ctlOf(int rs, int wc) { return rs | wc; }
```

其中ctl是ThreadPoolExecutor的同步状态变量。

workerCountOf()方法取得当前线程池的线程数量，算法是将ctl的值取低29位。

runStateOf()方法取得线程池的状态，算法是将ctl的值取高3位:

1. RUNNING 111   表示正在运行
2. SHUTDOWN 000   表示拒绝接收新的任务
3. STOP 001   表示拒绝接收新的任务并且不再处理任务队列中剩余的任务，并且中断正在执行的任务。
4. TIDYING 010   表示所有线程已停止，准备执行terminated()方法。
5. TERMINATED 011   表示已执行完terminated()方法。

当我们向线程池提交任务时，通常使用`execute`方法，接下来就先从该方法开始分析。

### execute()方法

在分析execute代码之前，需要先说明下，我们都知道线程池是维护了一批线程来处理用户提交的任务，达到线程复用的目的，**线程池维护的这批线程被封装成了Worker**。

```java
public void execute(Runnable command) {
    if (command == null)
        throw new NullPointerException();
    /*
     * Proceed in 3 steps:
     *
     * 1. If fewer than corePoolSize threads are running, try to
     * start a new thread with the given command as its first
     * task.  The call to addWorker atomically checks runState and
     * workerCount, and so prevents false alarms that would add
     * threads when it shouldn't, by returning false.
     *
     * 2. If a task can be successfully queued, then we still need
     * to double-check whether we should have added a thread
     * (because existing ones died since last checking) or that
     * the pool shut down since entry into this method. So we
     * recheck state and if necessary roll back the enqueuing if
     * stopped, or start a new thread if there are none.
     *
     * 3. If we cannot queue task, then we try to add a new
     * thread.  If it fails, we know we are shut down or saturated
     * and so reject the task.
     */
    int c = ctl.get();
    //情况1
    if (workerCountOf(c) < corePoolSize) {
        if (addWorker(command, true))
            return;
        c = ctl.get();
    }
    //情况2
    if (isRunning(c) && workQueue.offer(command)) {
        int recheck = ctl.get();
        if (! isRunning(recheck) && remove(command))
            reject(command);
        else if (workerCountOf(recheck) == 0)
            addWorker(null, false);
    }
    //情况3
    else if (!addWorker(command, false))
        reject(command);
}
```

以上代码对应了三种情况:

1. 线程池的线程数量小于corePoolSize核心线程数量，开启核心线程执行任务。
2. 线程池的线程数量不小于corePoolSize核心线程数量，或者开启核心线程失败，尝试将任务以非阻塞的方式添加到任务队列。
3. 任务队列已满导致添加任务失败，开启新的非核心线程执行任务。



回顾FixedThreadPool，因为它配置的corePoolSize与maximumPoolSize相等，所以不会执行到情况3，并且因为workQueue为默认的LinkedBlockingQueue，其长度为Integer.MAX_VALUE，几乎不可能出现任务无法被添加到workQueue的情况，所以FixedThreadPool的所有任务执行在核心线程中。

而CachedThreadPool的corePoolSize为0，表示它不会执行到情况1，因为它的maximumPoolSize为Integer.MAX_VALUE，所以几乎没有线程数量上限，因为它的workQueue为SynchronousQueue，所以当线程池里没有闲置的线程SynchronousQueue就会添加任务失败，因此会执行到情况3添加新的线程执行任务。



从上面`execute()`的源码可以看出`addWorker()`方法是重中之重，马上来看下它的实现。

### addWorker()方法

```java
 private boolean addWorker(Runnable firstTask, boolean core) {
    retry:
    //使用CAS机制轮询线程池的状态，如果线程池处于SHUTDOWN及大于它的状态则拒绝执行任务
    for (;;) {
        int c = ctl.get();
        int rs = runStateOf(c);

        // Check if queue empty only if necessary.
        if (rs >= SHUTDOWN &&
            ! (rs == SHUTDOWN &&
               firstTask == null &&
               ! workQueue.isEmpty()))
            return false;

        //使用CAS机制尝试将当前线程数+1
        //如果是核心线程当前线程数必须小于corePoolSize 
        //如果是非核心线程则当前线程数必须小于maximumPoolSize
        //如果当前线程数小于线程池支持的最大线程数CAPACITY 也会返回失败
        for (;;) {
            int wc = workerCountOf(c);
            if (wc >= CAPACITY ||
                wc >= (core ? corePoolSize : maximumPoolSize))
                return false;
            if (compareAndIncrementWorkerCount(c))
                break retry;
            c = ctl.get();  // Re-read ctl
            if (runStateOf(c) != rs)
                continue retry;
            // else CAS failed due to workerCount change; retry inner loop
        }
    }

    //这里已经成功执行了CAS操作将线程池数量+1，下面创建线程
    boolean workerStarted = false;
    boolean workerAdded = false;
    Worker w = null;
    try {
        w = new Worker(firstTask);
        //Worker内部有一个Thread，并且执行Worker的run方法，因为Worker实现了Runnable
        final Thread t = w.thread;
        if (t != null) {
            //这里必须同步在状态为运行的情况下将Worker添加到workers中
            final ReentrantLock mainLock = this.mainLock;
            mainLock.lock();
            try {
                // Recheck while holding lock.
                // Back out on ThreadFactory failure or if
                // shut down before lock acquired.
                int rs = runStateOf(ctl.get());

                if (rs < SHUTDOWN ||
                    (rs == SHUTDOWN && firstTask == null)) {
                    if (t.isAlive()) // precheck that t is startable
                        throw new IllegalThreadStateException();
                    workers.add(w);  //把新建的woker线程放入集合保存，这里使用的是HashSet
                    int s = workers.size();
                    if (s > largestPoolSize)
                        largestPoolSize = s;
                    workerAdded = true;
                }
            } finally {
                mainLock.unlock();
            }
            //如果添加成功则运行线程
            if (workerAdded) {
                t.start();
                workerStarted = true;
            }
        }
    } finally {
        //如果woker启动失败，则进行一些善后工作，比如说修改当前woker数量等等
        if (! workerStarted)
            addWorkerFailed(w);
    }
    return workerStarted;
}
```

addWorker这个方法先尝试在线程池运行状态为RUNNING并且线程数量未达上限的情况下通过CAS操作将线程池数量+1,接着在ReentrantLock同步锁的同步保证下判断线程池为运行状态，然后把Worker添加到HashSet workers中。如果添加成功则执行Worker的内部线程。



###  Worker是什么

Worker是ThreadPoolExecutor的内部类，源码如下：

```java
private final class Worker
        extends AbstractQueuedSynchronizer
        implements Runnable
    {
    /**
     * This class will never be serialized, but we provide a
     * serialVersionUID to suppress a javac warning.
     */
    private static final long serialVersionUID = 6138294804551838833L;

    /** Thread this worker is running in.  Null if factory fails. */
    final Thread thread;
    /** Initial task to run.  Possibly null. */
    Runnable firstTask;
    /** Per-thread task counter */
    volatile long completedTasks;

    /**
     * Creates with given first task and thread from ThreadFactory.
     * @param firstTask the first task (null if none)
     */
    Worker(Runnable firstTask) {
        setState(-1); // inhibit interrupts until runWorker
        this.firstTask = firstTask;
        this.thread = getThreadFactory().newThread(this);
    }

    /** Delegates main run loop to outer runWorker. */
    public void run() {
        runWorker(this);
    }

    // Lock methods
    //
    // The value 0 represents the unlocked state.
    // The value 1 represents the locked state.

    protected boolean isHeldExclusively() {
        return getState() != 0;
    }

    protected boolean tryAcquire(int unused) {
        if (compareAndSetState(0, 1)) {
            setExclusiveOwnerThread(Thread.currentThread());
            return true;
        }
        return false;
    }

    protected boolean tryRelease(int unused) {
        setExclusiveOwnerThread(null);
        setState(0);
        return true;
    }

    public void lock()        { acquire(1); }
    public boolean tryLock()  { return tryAcquire(1); }
    public void unlock()      { release(1); }
    public boolean isLocked() { return isHeldExclusively(); }

    void interruptIfStarted() {
        Thread t;
        if (getState() >= 0 && (t = thread) != null && !t.isInterrupted()) {
            try {
                t.interrupt();
            } catch (SecurityException ignore) {
            }
        }
    }
}
```

Worker构造方法指定了第一个要执行的任务firstTask，并通过线程池的线程工厂创建线程。可以发现这个线程的参数为this，即Worker对象，因为Worker实现了Runnable因此可以被当成任务执行，执行的即Worker实现的run方法：

```java
public void run() {
    runWorker(this);
}
```

#### runWorker()方法

因为Worker为ThreadPoolExecutor的内部类，因此runWorker方法实际是ThreadPoolExecutor定义的:

```java
//ThreadPoolExecutor类中
final void runWorker(Worker w) {
    Thread wt = Thread.currentThread();
    Runnable task = w.firstTask;
    w.firstTask = null;
    // 因为Worker的构造函数中setState(-1)禁止了中断，这里的unclock用于恢复中断
    w.unlock(); // allow interrupts
    boolean completedAbruptly = true;
    try {
        //一般情况下，task都不会为空（特殊情况上面注释中也说明了），因此会直接进入循环体中
        while (task != null || (task = getTask()) != null) {
            w.lock();
            // If pool is stopping, ensure thread is interrupted;
            // if not, ensure thread is not interrupted.  This
            // requires a recheck in second case to deal with
            // shutdownNow race while clearing interrupt
            if ((runStateAtLeast(ctl.get(), STOP) ||
                 (Thread.interrupted() &&
                  runStateAtLeast(ctl.get(), STOP))) &&
                !wt.isInterrupted())
                wt.interrupt();
            try {
                //该方法是个空的实现，如果有需要用户可以自己继承该类进行实现
                beforeExecute(wt, task);
                Throwable thrown = null;
                try {
                    //真正的任务执行逻辑
                    task.run();
                } catch (RuntimeException x) {
                    thrown = x; throw x;
                } catch (Error x) {
                    thrown = x; throw x;
                } catch (Throwable x) {
                    thrown = x; throw new Error(x);
                } finally {
                    //该方法是个空的实现，如果有需要用户可以自己继承该类进行实现
                    afterExecute(task, thrown);
                }
            } finally {
                //这里设为null，也就是循环体再执行的时候会调用getTask方法
                task = null;
                w.completedTasks++;
                w.unlock();
            }
        }
        completedAbruptly = false;
    } finally {
        //当指定任务执行完成，阻塞队列中也取不到可执行任务时，会进入这里，做一些善后工作
        //比如在corePoolSize跟maximumPoolSize之间的woker会进行回收
        processWorkerExit(w, completedAbruptly);
    }
}
```

这个方法是线程池复用线程的核心代码，注意Worker继承了AbstractQueuedSynchronizer，在执行每个任务前通过lock方法加锁，执行完后通过unlock方法解锁，这种机制用来防止运行中的任务被中断。在执行任务时先尝试获取firstTask，即构造方法传入的Runnable对象，然后尝试从getTask方法中获取任务队列中的任务。在任务执行前还要再次判断线程池是否已经处于STOP状态或者线程被中断。

woker线程的执行流程就是首先执行初始化时分配给的任务，执行完成以后会尝试从阻塞队列中获取可执行的任务，如果指定时间内仍然没有任务可以执行，则进入销毁逻辑调用`processWorkerExit()`方法。
**注：这里只会回收corePoolSize与maximumPoolSize直接的那部分woker**



### getTask()方法

这里getTask方法是要重点说明的，它的实现跟我们构造参数keepAliveTime存活时间有关。我们都知道keepAliveTime代表了线程池中的线程（即woker线程）的存活时间，如果到期则回收woker线程，这个逻辑的实现就在getTask中。

getTask方法就是去阻塞队列中取任务，用户设置的存活时间，就是从这个阻塞队列中取任务等待的最大时间，如果getTask返回null，意思就是woker等待了指定时间仍然没有取到任务，此时就会跳过循环体，进入woker线程的销毁逻辑。

```java
private Runnable getTask() {
    boolean timedOut = false; // Did the last poll() time out?

    for (;;) {
        int c = ctl.get();
        int rs = runStateOf(c);

        // Check if queue empty only if necessary.
        if (rs >= SHUTDOWN && (rs >= STOP || workQueue.isEmpty())) {
            decrementWorkerCount();
            return null;
        }

        int wc = workerCountOf(c);

        // Are workers subject to culling?
        boolean timed = allowCoreThreadTimeOut || wc > corePoolSize;

        if ((wc > maximumPoolSize || (timed && timedOut))
            && (wc > 1 || workQueue.isEmpty())) {
            if (compareAndDecrementWorkerCount(c))
                return null;
            continue;
        }

        try {
            //根据超时配置有两种方法取出任务
            Runnable r = timed ?
                workQueue.poll(keepAliveTime, TimeUnit.NANOSECONDS) :
                workQueue.take();
            if (r != null)
                return r;
            timedOut = true;
        } catch (InterruptedException retry) {
            timedOut = false;
        }
    }
}
```

这个`getTask()`方法通过一个循环不断轮询任务队列有没有任务到来，首先判断线程池是否处于正常运行状态，根据超时配置有两种方法取出任务：

1. BlockingQueue.poll 阻塞指定的时间尝试获取任务，如果超过指定的时间还未获取到任务就返回null。
2. BlockingQueue.take 这种方法会在取到任务前一直阻塞。



FixedThreadPool使用的是take方法，所以会线程会一直阻塞等待任务。CachedThreadPool使用的是poll方法，也就是说CachedThreadPool中的线程如果在60秒内未获取到队列中的任务就会被终止。

到此ThreadPoolExecutor是怎么执行Runnable任务的分析结束。





## 常用的几个线程池工厂方法

`Executors`是java.util.concurrent包下的一个线程池工厂，负责创建常用的线程池，主要有如下几种:

**newFixedThreadPool** 一个固定线程数量的线程池:

```java
public static ExecutorService newFixedThreadPool(int nThreads, ThreadFactory threadFactory) {
    return new ThreadPoolExecutor(nThreads, nThreads,
                                  0L, TimeUnit.MILLISECONDS,
                                  new LinkedBlockingQueue<Runnable>(),
                                  threadFactory);
}
```

**newCachedThreadPool** 不固定线程数量，且支持最大为Integer.MAX_VALUE的线程数量:

```java
public static ExecutorService newCachedThreadPool() {
    return new ThreadPoolExecutor(0, Integer.MAX_VALUE,
                                  60L, TimeUnit.SECONDS,
                                  new SynchronousQueue<Runnable>());
}
```

**newSingleThreadExecutor** 可以理解为线程数量为1的FixedThreadPool:

```java
public static ExecutorService newSingleThreadExecutor() {
    return new FinalizableDelegatedExecutorService
        (new ThreadPoolExecutor(1, 1,
                                0L, TimeUnit.MILLISECONDS,
                                new LinkedBlockingQueue<Runnable>()));
}
```

**newScheduledThreadPool** 支持定时以指定周期循环执行任务:

```java
public static ScheduledExecutorService newScheduledThreadPool(int corePoolSize) {
    return new ScheduledThreadPoolExecutor(corePoolSize);
}
```

其中前三种线程池是ThreadPoolExecutor不同配置的实例，最后一种是ScheduledThreadPoolExecutor的实例。

## 线程池技术适用范围及应注意的问题

线程池的应用范围：

1. 需要大量的线程来完成任务，且完成任务的时间比较短。 WEB服务器完成网页请求这样的任务，使用线程池技术是非常合适的。因为单个任务小，而任务数量巨大，你可以想象一个热门网站的点击次数。 但对于长时间的任务，比如一个Telnet连接请求，线程池的优点就不明显了。因为Telnet会话时间比线程的创建时间大多了。
2. 对性能要求苛刻的应用，比如要求服务器迅速相应客户请求。
3. 接受突发性的大量请求，但不至于使服务器因此产生大量线程的应用。突发性大量客户请求，在没有线程池情况下，将产生大量线程，虽然理论上大部分操作系统线程数目最大值不是问题，短时间内产生大量线程可能使内存到达极限，并出现"OutOfMemory"的错误。




## 总结

到此无论是主动提交任务给新建线程执行，还是已有的线程自己到阻塞队列取任务执行，都应该清楚了然了。
从数据结构的角度来看，线程池主要使用了阻塞队列（BlockingQueue）和HashSet集合构成。
从任务提交的流程角度来看，对于使用线程池的外部来说，线程池的机制是这样的：

1. 如果正在运行的线程数 < coreSize，马上创建线程执行该task，不排队等待；
2. 如果正在运行的线程数 >= coreSize，把该task放入队列；
3. 如果队列已满 && 正在运行的线程数 < maximumPoolSize，创建新的线程执行该task；
4. 如果队列已满 && 正在运行的线程数 >= maximumPoolSize，线程池调用handler的reject方法拒绝本次提交。
   从worker线程自己的角度来看，当worker的task执行结束之后，循环往阻塞队列中取出任务执行。






在runWorker中，每一个Worker getTask成功之后都要获取Worker的锁之后运行，也就是说运行中的Worker不会中断。因为核心线程一般在空闲的时候会一直阻塞在获取Task上，也只有中断才可能导致其退出。这些阻塞着的Worker就是空闲的线程（当然，非核心线程，并且阻塞的也是空闲线程）



如果设置了keepAliveTime>0，那非核心线程会在空闲状态下等待keepAliveTime之后销毁，直到最终的线程数量等于corePoolSize





## 参考资料

- [线程池，这一篇或许就够了](https://liuzho.github.io/2017/04/17/%E7%BA%BF%E7%A8%8B%E6%B1%A0%EF%BC%8C%E8%BF%99%E4%B8%80%E7%AF%87%E6%88%96%E8%AE%B8%E5%B0%B1%E5%A4%9F%E4%BA%86/)
- [线程池的介绍及简单实现](https://www.ibm.com/developerworks/cn/java/l-threadPool/)
- [深入分析java线程池的实现原理](https://www.jianshu.com/p/87bff5cc8d8c)
- [Java线程池(ThreadPoolExecutor)原理分析与使用](http://blog.csdn.net/fuyuwei2015/article/details/72758179)
- [Java线程池原理分析ThreadPoolExecutor篇](https://www.jianshu.com/p/9d03bf5ed5cd)
- [并发新特性—Executor 框架与线程池](http://wiki.jikexueyuan.com/project/java-concurrency/executor.html)
- [深入理解Java之线程池](http://www.importnew.com/19011.html)
- [java线程池大小为何会大多被设置成CPU核心数+1？](https://www.zhihu.com/question/38128980)


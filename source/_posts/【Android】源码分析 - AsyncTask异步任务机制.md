---
title: 【Android】源码分析 - AsyncTask异步任务机制
layout: post
date: 2017-10-09 20:03:00
comments: true
tags: 
    - Android
    - 源码分析
categories: 
    - Android
keywords: 
description: 
photos:
   - /gallery/android-asynctask/AsyncTask.webp
---


### 前言

提到Android的多线程机制，尽管Android已经设计了基本的Handler异步消息机制提供给我们进行线程间通信，不过对于频繁得UI更新操作Handler用起来确实有点细碎，为了更加方便我们在子线程中更新UI元素，Android从1.5版本就引入了一个AsyncTask类，使用它我们可以非常灵活方便地从子线程切换到UI线程。

- **AsyncTask:** 封装了线程池和Handler，为 UI 线程与工作线程之间进行快速切换提供一种便捷机制。适用于当下立即需要启动，但是异步执行的生命周期短暂的使用场景。
- **HandlerThread:** 一个已经拥有了Looper的线程类，内部可以直接使用Handler。为某些回调方法或者等待某些任务的执行设置一个专属的线程，并提供线程任务的调度机制。
- **ThreadPool:** 把任务分解成不同的单元，分发到各个不同的线程上，进行同时并发处理。
- **IntentService:** 适合于执行由 UI 触发的后台 Service 任务，并可以把后台任务执行的情况通过一定的机制反馈给 UI。

我们从AsyncTask的基本用法开始，一起分析下AsyncTask源码，看看它是如何实现的。

![](/gallery/android-asynctask/worker_thread.png)

### 使用AsyncTask

由于AsyncTask是一个抽象类，所以如果我们想使用它，就必须要创建一个子类去继承它。在继承时我们可以为AsyncTask类指定三个泛型参数，这三个参数的用途如下：

1. **Params**：在执行AsyncTask时需要传入的参数，可用于在后台任务中使用。
2. **Progress**：后台任务执行时，如果需要在界面上显示当前的进度，则使用这里指定的泛型作为进度单位。
3. **Result**：当任务执行完毕后，如果需要对结果进行返回，则使用这里指定的泛型作为返回值类型。

一个最简单的自定义AsyncTask就可以写成如下方式：

```java
 private class MyTask extends AsyncTask<Void, Void, Void> { ... }
```



<!-- more -->

然后我们还需要去重写AsyncTask中的几个方法才能完成对任务的定制。经常需要去重写的方法有以下四个：

- **onPreExecute()**：一般会在`UI Thread`中执行。用于进行一些界面上的初始化操作，比如显示一个进度条对话框等。

- **doInBackground(Params...)**：这个方法中的所有代码都会在子线程`Worker Thread`中运行，我们应该在这里去处理所有的耗时任务。任务一旦完成就可以通过return语句来将任务的执行结果进行返回，如果AsyncTask的第三个泛型参数指定的是Void，就可以不返回任务执行结果。注意，在这个方法中是不可以进行UI操作的，如果需要更新UI元素，比如说反馈当前任务的执行进度，可以调用下面这个`publishProgress(Progress...)`方法来完成。

- **onProgressUpdate(Progress...)**：当在后台任务中调用了publishProgress(Progress...)方法后，这个方法就很快会被调用，方法中携带的参数就是在后台任务中传递过来的。在这个方法中可以对UI进行操作，利用参数中的数值就可以对界面元素进行相应的更新。

- **onPostExecute(Result)**：在`UI Thread`中执行。当后台任务执行完毕并通过return语句进行返回时，这个方法就很快会被调用。返回的数据会作为参数传递到此方法中，可以利用返回的数据来进行一些UI操作，比如弹出Toast提醒任务执行的结果，以及关闭掉进度条对话框等。


> 特别说明！`onPreExecute`并不保证一定在UI线程中执行！我们稍后源码分析时说明

一个比较完整的自定义AsyncTask就可以写成如下方式：

```java
private class DownloadFilesTask extends AsyncTask<URL, Integer, Long> {
    @Override  
    protected void onPreExecute() {  
        progressDialog.show();  
    }

    @Override
    protected Long doInBackground(URL... urls) {
        int count = urls.length;
        long totalSize = 0;
        for (int i = 0; i < count; i++) {
            totalSize += Downloader.downloadFile(urls[i]);
            publishProgress((int) ((i / (float) count) * 100));
            // Escape early if cancel() is called
            if (isCancelled()) break;
        }
        return totalSize;
    }

    @Override
    protected void onProgressUpdate(Integer... progress) {
        progressDialog.setMessage("当前下载进度：" + progress[0] + "%");  
    }
    
    @Override
    protected void onPostExecute(Long result) {
        showDialog("下载已完成！Downloaded " + result + " bytes");
    }
}
```

然后，调用`execute()`执行任务就可以了：

```java
new DownloadFilesTask().execute(url1, url2, url3);
```

以上就是AsyncTask的基本用法，我们并不需要去考虑什么异步消息处理机制，也不需要专门使用一个Handler来发送和接收消息，只需要调用一下`publishProgress()`方法就可以轻松地从子线程切换到UI线程了。


### AsyncTask源码

该版本分析的代码是Android API 21（对应的Android 5.0）的源码，由于AsyncTask在之前几个版本改动比较大，不过不影响我们分析原理，所以最后我尽量介绍一下区别。

首先给出AsyncTask的源码链接：https://github.com/android/platform_frameworks_base/blob/master/core/java/android/os/AsyncTask.java

可以看到AsyncTask开头定义了一些字段，如下所示：

```java
private static final String LOG_TAG = "AsyncTask";

//CPU_COUNT为手机中的CPU核数
private static final int CPU_COUNT = Runtime.getRuntime().availableProcessors();
//线程池的核心线程数
private static final int CORE_POOL_SIZE = CPU_COUNT + 1;
//线程池的最大线程数
private static final int MAXIMUM_POOL_SIZE = CPU_COUNT * 2 + 1;
//同一时刻只允许1个线程执行
private static final int KEEP_ALIVE = 1;

//sThreadFactory用于在后面创建线程池
private static final ThreadFactory sThreadFactory = new ThreadFactory() {
    private final AtomicInteger mCount = new AtomicInteger(1);

    //重写newThread方法: 为了将新增线程的名字以"AsyncTask #"标识
    public Thread newThread(Runnable r) {
        return new Thread(r, "AsyncTask #" + mCount.getAndIncrement());
    }
};

//实例化阻塞式队列BlockingQueue，队列中存放Runnable，容量为128
private static final BlockingQueue<Runnable> sPoolWorkQueue =
        new LinkedBlockingQueue<Runnable>(128);

//根据上面定义的参数实例化线程池
public static final Executor THREAD_POOL_EXECUTOR
        = new ThreadPoolExecutor(CORE_POOL_SIZE, MAXIMUM_POOL_SIZE, KEEP_ALIVE,
                TimeUnit.SECONDS, sPoolWorkQueue, sThreadFactory);
```

通过以上代码和注释我们可以知道，AsyncTask初始化了一些参数，并用这些参数实例化了一个线程池`THREAD_POOL_EXECUTOR`，需要注意的是该线程池被定义为`public static final`，由此我们可以看出AsyncTask内部维护了一个静态的线程池，默认情况下，AsyncTask的实际工作就是通过该`THREAD_POOL_EXECUTOR`完成的。

#### 构造函数

我们来看一看AsyncTask的构造函数：

```java
public abstract class AsyncTask<Params, Progress, Result> {    
    
    private final WorkerRunnable<Params, Result> mWorker;
    private final FutureTask<Result> mFuture;
    
    /**
     * Creates a new asynchronous task. This constructor must be invoked on the UI thread.
     */
    public AsyncTask() {
        //实例化mWorker，实现了Callable接口的call方法
        mWorker = new WorkerRunnable<Params, Result>() {
            public Result call() throws Exception {
                mTaskInvoked.set(true);

                Process.setThreadPriority(Process.THREAD_PRIORITY_BACKGROUND);
                //在线程池的工作线程中执行doInBackground方法，执行完的结果传递给postResult方法
                return postResult(doInBackground(mParams));
            }
        };
      
        //用mWorker实例化mFuture
        mFuture = new FutureTask<Result>(mWorker) {
            @Override
            protected void done() {
                try {
                    postResultIfNotInvoked(get());
                } catch (InterruptedException e) {
                    android.util.Log.w(LOG_TAG, e);
                } catch (ExecutionException e) {
                    throw new RuntimeException("An error occured while executing doInBackground()",
                            e.getCause());
                } catch (CancellationException e) {
                    postResultIfNotInvoked(null);
                }
            }
        };
    }


    ...省略其他代码...
}
```

首先我们看到AsyncTask是一个**抽象类**，所以我们不能直接使用。在构造函数上有一句注释说：**AsyncTask的构造函数需要在UI线程上调用**，言外之意也就是说我们必须在主线程中new创建AsyncTask对象。

然后构造函数中实际上并没有任何具体的逻辑会得到执行，只是初始化了两个变量，`mWorker`和`mFuture`，并在初始化`mFuture`的时候将`mWorker`作为参数传入。`mWorker`是一个Callable对象，`mFuture`是一个FutureTask对象，这两个变量会暂时保存在内存中，稍后才会用到它们。

- **mWorker** ：我们之前提到，mWorker其实是一个Callable类型的对象。实例化mWorker，实现了Callable接口的call方法。call方法是在线程池的某个线程中执行的，而不是运行在主线程中。在线程池的工作线程中执行doInBackground方法，执行实际的任务，并返回结果。当doInBackground执行完毕后，将执行完的结果传递给postResult方法。postResult方法我们后面会再讲解。
- **mFuture** ：mFuture是一个FutureTask类型的对象，用mWorker作为参数实例化了mFuture。在这里，其实现了FutureTask的done方法，我们之前提到，当FutureTask的任务执行完成或任务取消的时候会执行FutureTask的done方法。done方法里面的逻辑我们稍后再讲。

这里先详细说一下FutureTask：由于AsyncTask能够取消任务，所以AsyncTask使用了FutureTask以及与其相关的Callable，此处对二者简单进行一下介绍。FutureTask、Callable在Java的并发编程中是比较常见的，可以用来获取任务执行完之后的返回值，也可以取消线程池中的某个任务。Callable是一个接口，其内部定义了call方法，在call方法内需要编写代码执行具体的任务，在这一点上Callable接口与Runnable接口很类似，不过不同的是Runnable的run方法没有返回值，Callable的call方法可以指定返回值。FutureTask类同时实现了Callable接口和Runnable接口，FutureTask的构造函数中需要传入一个Callable对象以对其进行实例化。Executor的execute方法接收一个Runnable对象，由于FutureTask实现了Runnable接口，所以可以把一个FutureTask对象传递给Executor的execute方法去执行。当任务执行完毕的时候会执行FutureTask的done方法，我们可以在这个方法中写一些逻辑处理。在任务执行的过程中，我们也可以随时调用FutureTask的cancel方法取消执行任务，任务取消后也会执行FutureTask的done方法。我们也可以通过FutureTask的get方法阻塞式地等待任务的返回值（即Callable的call方法的返回值），如果任务执行完了就立即返回执行的结果，否则就阻塞式等待call方法的完成。

mWorker是WorkerRunnable类型的对象，WorkerRunnable是AsyncTask中的一个内部类，代码如下所示：

```java
private static abstract class WorkerRunnable<Params, Result> implements Callable<Result> {
    Params[] mParams;
}
```

#### execute()方法

接着如果想要启动某一个任务，就需要调用该任务的execute()方法，因此现在我们来看一看：

```java
public final AsyncTask<Params, Progress, Result> execute(Params... params) {
    return executeOnExecutor(sDefaultExecutor, params);
}

public final AsyncTask<Params, Progress, Result> executeOnExecutor(Executor exec,
        Params... params) {
    if (mStatus != Status.PENDING) {
        switch (mStatus) {
            case RUNNING:
                //如果当前AsyncTask已经处于运行状态，那么就抛出异常，不再执行新的任务
                throw new IllegalStateException("Cannot execute task:"
                        + " the task is already running.");
            case FINISHED:
                //如果当前AsyncTask已经把之前的任务运行完成，那么也抛出异常，不再执行新的任务
                throw new IllegalStateException("Cannot execute task:"
                        + " the task has already been executed "
                        + "(a task can be executed only once)");
        }
    }

    mStatus = Status.RUNNING;

    onPreExecute();

    mWorker.mParams = params;
    //Executor的execute方法接收Runnable参数，由于mFuture是FutureTask的实例，
    //且FutureTask同时实现了Callable和Runnable接口，所以此处可以让exec执行mFuture
    exec.execute(mFuture);

    return this;
}

public static final Executor SERIAL_EXECUTOR = new SerialExecutor();
private static volatile Executor sDefaultExecutor = SERIAL_EXECUTOR;
```

可以看到`execute()`方法调用了`executeOnExecutor()`方法。

在`executeOnExecutor()`方法中，我们终于看到它调用了`onPreExecute()`方法，因此证明了onPreExecute()方法会第一个得到执行。

下面对以上代码进行一下说明：

- 一个AsyncTask实例执行执行一次任务，当第二次执行任务时就会抛出异常。executeOnExecutor方法一开始就检查AsyncTask的状态是不是PENDING，只有PENDING状态才往下执行，如果是其他状态表明现在正在执行另一个已有的任务或者已经执行完成了一个任务，这种情况下都会抛出异常。
- 如果开始是PENDING状态，那么就说明该AsyncTask还没执行过任何任务，代码可以继续执行，然后将状态设置为RUNNING，表示开始执行任务。
- 在真正执行任务前，先调用onPreExecute方法。由于executeOnExecutor方法应该运行在主线程上，所以此处的onPreExecute方法也会运行在主线程上，可以在该方法中做一些UI上的处理操作。
- Executor的execute方法接收Runnable参数，由于mFuture是FutureTask的实例，且FutureTask同时实现了Callable和Runnable接口，所以此处可以让exec通过execute方法在执行mFuture。在执行了exec.execute(mFuture)之后，后面会在exec的工作线程中执行mWorker的call方法，我们之前在介绍mWorker的实例化的时候也介绍了call方法内部的执行过程，会首先在工作线程中执行doInBackground方法，并返回结果，然后将结果传递给postResult方法。


最后调用`exec.execute(mFuture);`去执行真正的任务，此处exec对象就是`sDefaultExecutor`，可以看到其实是个`SerialExecutor`对象，源码如下所示：

```java
private static class SerialExecutor implements Executor {
    //mTasks是一个维护Runnable的双端队列，ArrayDeque没有容量限制，其容量可自增长
    final ArrayDeque<Runnable> mTasks = new ArrayDeque<Runnable>();
    Runnable mActive;

    public synchronized void execute(final Runnable r) {
        //execute方法会传入一个Runnable类型的变量r
        //然后我们会实例化一个Runnable类型的匿名内部类以对r进行封装，
        //通过队列的offer方法将封装后的Runnable添加到队尾
        mTasks.offer(new Runnable() {
            public void run() {
                try {
                    //此处r的run方法是在线程池中执行的
                    r.run();
                } finally {
                    //当前任务执行完毕后，通过调用scheduleNext方法执行下一个Runnable任务
                    scheduleNext();
                }
            }
        });
        //只有当前没有执行任何任务时，才会立即执行scheduleNext方法
        if (mActive == null) {
            scheduleNext();
        }
    }

    protected synchronized void scheduleNext() {
        //通过mTasks的poll方法进行出队操作，删除并返回队头的Runnable，
        //将返回的Runnable赋值给mActive，并将其作为参数传递给THREAD_POOL_EXECUTOR的execute方法进行执行
        if ((mActive = mTasks.poll()) != null) {
            THREAD_POOL_EXECUTOR.execute(mActive);
        }
    }
}
```

SerialExecutor实现了Executor接口中的execute方法，该类用于串行执行任务，即一个接一个地执行任务，而不是并行执行任务。

通过以上代码和注释我们可以知道：

- SerialExecutor实现了Executor接口中的execute方法，该类用于串行执行任务，即一个接一个地执行任务，而不是并行执行任务。
- SerialExecutor内部维护了一个存放Runnable的双端队列mTasks。当执行SerialExecutor的execute方法时，会传入一个Runnable变量r，但是mTasks并不直接存储r，而是又新new了一个匿名Runnable对象，其内部会调用r，这样就对r进行了封装，将该封装后的Runnable对象通过队列的offer方法入队，添加到mTasks的队尾。
- SerialExecutor内部通过mActive存储着当前正在执行的任务Runnable。当执行SerialExecutor的execute方法时，首先会向mTasks的队尾添加进一个Runnable。然后判断如果mActive为null，即当前没有任务Runnable正在运行，那么就会执行scheduleNext()方法。当执行scheduleNext方法的时候，会首先从mTasks中通过poll方法出队，删除并返回队头的Runnable，将返回的Runnable赋值给mActive，如果不为空，那么就让将其作为参数传递给THREAD_POOL_EXECUTOR的execute方法进行执行。由此，我们可以看出SerialExecutor实际上是通过之前定义的线程池`THREAD_POOL_EXECUTOR`进行实际的处理的。
- 当将mTasks中的Runnable作为参数传递给THREAD_POOL_EXECUTOR执行execute方法时，会在线程池的工作线程中执行匿名内部类Runnable中的try-finally代码段，即先在工作线程中执行r.run()方法去执行任务，无论任务r正常完成还是抛出异常，都会在finally中执行scheduleNext方法，用于执行mTasks中的下一个任务。从而在此处我们可以看出SerialExecutor是一个接一个执行任务，是串行执行任务，而不是并行执行。


#### 执行任务 - 调用doInBackground()

然后我们看看mWorker这个任务对象了，在构造函数中的mWorker定义如下，

```java
mWorker = new WorkerRunnable<Params, Result>() {
    public Result call() throws Exception {
        mTaskInvoked.set(true);

        Process.setThreadPriority(Process.THREAD_PRIORITY_BACKGROUND);
        //noinspection unchecked
        return postResult(doInBackground(mParams));
    }
};
```

我们看最后这句`postResult(doInBackground(mParams));`，它会调用我们的doInBackground()函数执行任务，并把结果发送给`postResult()`方法，我们跟进去看：

```java
private Result postResult(Result result) {
    @SuppressWarnings("unchecked")
    Message message = sHandler.obtainMessage(MESSAGE_POST_RESULT,
            new AsyncTaskResult<Result>(this, result));
    message.sendToTarget();
    return result;
}

private static final InternalHandler sHandler = new InternalHandler();
```

它使用`sHandler`对象发出了一条消息，InternalHandler创建一个Message Code为MESSAGE_POST_RESULT的Message，此处还将`doInBackground`返回的result通过`new AsyncTaskResult<Result>(this, result)`封装成了AsyncTaskResult，将其作为message的obj属性。

AsyncTaskResult是AsyncTask的一个内部类，其代码如下所示：

```java
private static class AsyncTaskResult<Data> {
    //mTask表示当前AsyncTaskResult是哪个AsyncTask的结果
    final AsyncTask mTask;
    //mData表示其存储的数据
    final Data[] mData;

    AsyncTaskResult(AsyncTask task, Data... data) {
        mTask = task;
        mData = data;
    }
}
```

在构建了message对象后，通过`message.sendToTarget()`将该message发送给`sHandler`，之后`sHandler`的handleMessage方法会接收并处理该message，这个`sHandler`对象是InternalHandler类的一个实例，InternalHandler的源码如下所示：

```java
private static class InternalHandler extends Handler {
    @SuppressWarnings({"unchecked", "RawUseOfParameterizedType"})
    @Override
    public void handleMessage(Message msg) {
        AsyncTaskResult result = (AsyncTaskResult) msg.obj;
        switch (msg.what) {
            case MESSAGE_POST_RESULT:
                // There is only one result
                result.mTask.finish(result.mData[0]);
                break;
            case MESSAGE_POST_PROGRESS:
                result.mTask.onProgressUpdate(result.mData);
                break;
        }
    }
}
```

msg.obj是AsyncTaskResult类型，result.mTask表示当前AsyncTaskResult所绑定的AsyncTask。result.mData[0]表示的是doInBackground所返回的处理结果。将该结果传递给AsyncTask的finish方法，finish代码如下所示：

```java
private void finish(Result result) {
    if (isCancelled()) {
        //如果任务被取消了，那么执行onCancelled方法
        onCancelled(result);
    } else {
        //将结果发传递给onPostExecute方法
        onPostExecute(result);
    }
    //最后将AsyncTask的状态设置为完成状态
    mStatus = Status.FINISHED;
}
```

finish方法内部会首先判断AsyncTask是否被取消了，如果被取消了执行onCancelled(result)，否则执行onPostExecute(result)方法。需要注意的是InternalHandler是指向主线程的，所以其handleMessage方法是在主线程中执行的，从而此处的finish方法也是在主线程中执行的，进而onPostExecute也是在主线程中执行的。



我们知道，在doInBackground方法中是在工作线程中执行比较耗时的操作，这个操作时间可能比较长，而我们的任务有可能分成多个部分，每当我完成其中的一部分任务时，我们可以在doInBackground中多次调用AsyncTask的publishProgress方法，将阶段性数据发布出去。

publishProgress方法代码如下所示：

```java
protected final void publishProgress(Progress... values) {
    if (!isCancelled()) {
        sHandler.obtainMessage(MESSAGE_POST_PROGRESS,
                new AsyncTaskResult<Progress>(this, values)).sendToTarget();
    }
}
```

可以看到最后发送了一条`MESSAGE_POST_PROGRESS`的Message给sHandler，到sHandler的代码中，我们能看到它调用了`onProgressUpdate()`这个方法，也就是我们使用示例当中的进度条更新函数。



AsyncTask无论任务完成还是取消任务，FutureTask都会执行done方法，如下所示：

```java
mFuture = new FutureTask<Result>(mWorker) {
    @Override
    protected void done() {
        //任务执行完毕或取消任务都会执行done方法
        try {
            //任务正常执行完成
            postResultIfNotInvoked(get());
        } catch (InterruptedException e) {
            //任务出现中断异常
            android.util.Log.w(LOG_TAG, e);
        } catch (ExecutionException e) {
            //任务执行出现异常
            throw new RuntimeException("An error occurred while executing doInBackground()",
                    e.getCause());
        } catch (CancellationException e) {
            //任务取消
            postResultIfNotInvoked(null);
        }
    }
};
```

无论任务正常执行完成还是任务取消，都会执行postResultIfNotInvoked方法。postResultIfNotInvoked代码如下所示：

```java
private void postResultIfNotInvoked(Result result) {
    final boolean wasTaskInvoked = mTaskInvoked.get();
    if (!wasTaskInvoked) {
        //只有mWorker的call没有被调用才会执行postResult方法
        postResult(result);
    }
}
```

如果AsyncTask正常执行完成的时候，call方法都执行完了，mTaskInvoked设置为true，并且在call方法中最后执行了postResult方法，然后进入mFuture的done方法，然后进入postResultIfNotInvoked方法，由于mTaskInvoked已经执行，所以不会执行再执行postResult方法。

如果在调用了AsyncTask的execute方法后立马就执行了AsyncTask的cancel方法（实际执行mFuture的cancel方法），那么会执行done方法，且捕获到CancellationException异常，从而执行语句`postResultIfNotInvoked(null)`，由于此时还没有来得及执行mWorker的call方法，所以mTaskInvoked还未false，这样就可以把null传递给postResult方法。

到这里，AsyncTask中的细节基本上就分析完了。

### 注意事项

在Google官方文档里有这么一段：


> #### Threading rules
> 
> ------
> 
> There are a few threading rules that must be followed for this class to work properly:
> 
> -  The AsyncTask class must be loaded on the UI thread. This is done automatically as of `JELLY_BEAN`.
> - The task instance must be created on the UI thread.
> - `execute(Params...)` must be invoked on the UI thread.
> - Do not call `onPreExecute()`, `onPostExecute(Result)`, `doInBackground(Params...)`, `onProgressUpdate(Progress...)` manually.
> - The task can be executed only once (an exception will be thrown if a second execution is attempted.

翻译过来就是：

- AsyncTask必须在UI主线程中创建（new）；
- `execute(Params...)`函数必须在UI线程中调用；
- 不要手动调用 `onPreExecute()`, `onPostExecute(Result)`, `doInBackground(Params...)`, `onProgressUpdate(Progress...)` 这些方法。
- 每个AsyncTask任务只能被执行一次；

### 总结

AsyncTask的底层其实是对Thread、Handler、Message的封装，智能的应用了Handler。


Android3.0之前，异步任务是并发执行的，即几个任务同时切换执行，3.0之后，异步任务改成了顺序执行，即任务队列中的任务要一个个执行（并非按顺序），一个执行不完，不能执行另一个，即顺序执行，他是默认的执行方式`execue()`方法，其默认执行的方法是：`executeOnExecutor(AsyncTask.SERIAL_EXECUTOR)`，如果要并发执行，需要执行`AsyncTask.executeOnExecutor(AsyncTask.THREAD_POOL_EXECUTOR)`，且为了防止系统的任务繁重，只在线程池中维护了5个线程，也就是，每次最多跑5个任务（类似于迅雷下载）。如果需要并发更多的任务，需要自定义线程池了。所以异步任务只适合处理一些轻量级的并随时修改UI的异步线程，如果遇到繁重的任务，最好自己新建一个Thread并用handler和looper机制处理。


### 参考资料

- [Android AsyncTask完全解析，带你从源码的角度彻底理解](http://blog.csdn.net/guolin_blog/article/details/11711405)
- [源码解析Android中AsyncTask的工作原理 - 孙群](http://blog.csdn.net/iispring/article/details/50670388)
- [Android性能优化典范之多线程篇 - 腾讯Bugly](https://dev.qq.com/topic/59157b344ba93ae12c5f8f3e)
- [Android: AsyncTask onPreExecute() method is NOT executed in UI thread - stackoverflow](https://stackoverflow.com/questions/16416305/android-asynctask-onpreexecute-method-is-not-executed-in-ui-thread)
- [AsyncTask - Google Android Developers](https://developer.android.com/reference/android/os/AsyncTask.html)
---
title: 【Android】Dialog异常CalledFromWrongThreadException深入分析
layout: post
date: 2017-10-26 22:20:55
comments: true
tags: 
    - Android
categories: 
    - Android
keywords: 源码分析
description: 
photos:
    - /gallery/android_common/components-dialogs-usage2.png
---



### 问题

在使用Dialog时，因为线程问题，在调用dismiss方法时出现了CalledFromWrongThreadException的Crash，如下：

```java
android.view.ViewRootImpl$CalledFromWrongThreadException: Only the original thread that created a view hierarchy can touch its views.
```

抛出异常为`CalledFromWrongThreadException`，很明显第一反应就是出现了非ui线程进行了ui操作造成了此异常。通过分析工程代码，发现本质上是因为在非ui线程中创建了Dialog，而在主线程（即ui线程）中调用了`show()`以及`dismiss()`方法，我把问题模型写成测试代码如下：

```java
public class MainActivity extends BaseActivity {
    private static final String TAG = "MainActivity test";
    private ProgressDialog dialog;


    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        EventBus.getDefault().register(this);

        new Thread(new Runnable() {
            @Override
            public void run() {
                Looper.prepare();

                //子线程中创建Dialog
                dialog = new ProgressDialog(MainActivity.this);
                dialog.setCanceledOnTouchOutside(true);
                dialog.setOnCancelListener(new DialogInterface.OnCancelListener() {
                    @Override
                    public void onCancel(DialogInterface dialog) {
                        Log.d(TAG, "Dialog onCancel thread: " + getThreadInfo());
                    }
                });
                dialog.setOnDismissListener(new DialogInterface.OnDismissListener() {
                    @Override
                    public void onDismiss(DialogInterface dialog) {
                        Log.d(TAG, "Dialog onDismiss thread: " + getThreadInfo());
                    }
                });
                dialog.setMessage("正在加载...");
                Log.d(TAG, "Dialog create thread: " + getThreadInfo());

                Looper.loop();
            }
        }).start();


        Button btn = (Button) findViewById(R.id.btn_helloworld);
        btn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                //UI主线程中show，然后点击空白区域dismiss
                dialog.show();
                Log.d(TAG, "Dialog show thread: " + getThreadInfo());
            }
        });
    }

  
    /**
     * 输出线程信息
     */
    private String getThreadInfo(){
        return "[" + Thread.currentThread().getId() + "]" +
                ((Looper.myLooper() == Looper.getMainLooper())? " is UI-Thread" : "");
    }
} 
```

就是Activity打开的时候，使用work子线程创建了一个Dialog，然后手动点击按钮的时候，显示Dialog。再点击空白处，dialog本应该dismiss的，但是直接crash了。抛出了`CalledFromWrongThreadException`的异常。

在上面的代码中，我顺便输出了Dialog每个操作的线程ID，同时会判定是不是ui主线程。我们来看看log：
> 10-26 16:11:07.836 7405-7652/com.cuc.myandroidtest D/MainActivity test: Dialog create thread: [3953]
> 10-26 16:11:27.763 7405-7405/com.cuc.myandroidtest D/MainActivity test: Dialog show thread: [1] is UI-Thread
> 10-26 16:11:35.642 7405-7652/com.cuc.myandroidtest D/MainActivity test: Dialog onCancel thread: [3953]
>
> -------- beginning of crash

可以看到，以上出现的问题中执行Dialog操作的线程信息如下：

- 创建Dialog：work子线程
- show()：ui主线程
- cancel()：work子线程
- dismiss()：因为crash没有执行到，未知

如果说**只有创建这个控件的线程才能去更新该控件的内容**。那么在调用show方法的时候为什么不会crash，然后dismiss的时候才会崩溃？

另外，到底是不是所有的操作都必须放到ui线程中执行才对？带着疑问我们深入Dialog源码一看究竟。

<!-- more -->

### 源码分析

我们先看Dialog的dismiss方法：

```java
/**
 * Dismiss this dialog, removing it from the screen. This method can be
 * invoked safely from any thread.  Note that you should not override this
 * method to do cleanup when the dialog is dismissed, instead implement
 * that in {@link #onStop}.
 */
@Override
public void dismiss() {
    if (Looper.myLooper() == mHandler.getLooper()) {
        dismissDialog();
    } else {
        mHandler.post(mDismissAction);
    }
}


private final Runnable mDismissAction = new Runnable() {
    public void run() {
        dismissDialog();
    }
};
```
我们先看注释，意思是**dismiss()这个函数可以在任意线程中调用，不用担心线程安全问题**。

很明显，dialog对于ui操作做了特别处理。如果当前执行dismiss操作的线程和mHandler所依附的线程不一致的话那么就会将dismiss操作丢到对应的mHandler的线程队列中等待执行。那么这个Handler又是哪里来的呢？

我们开始调查，可以看到`mHandler`对象是Dialog类中私有的，会在new Dialog的时候自动初始化：

```
public class Dialog implements DialogInterface, Window.Callback,
        KeyEvent.Callback, OnCreateContextMenuListener, Window.OnWindowDismissedCallback {

    private final Handler mHandler = new Handler();
    
    //...省略其余代码...
} 
```
可以分析得出，该mHandler直接关联的就是new Dialog的线程。也就能得出以下结论：

> **结论一**：最终真正执行`dismissDialog()`方法销毁Dialog的线程就是new Dialog的线程。

然后我们跟进去`dismissDialog()`看看到底如何销毁Dialog的：

```java
void dismissDialog() {
    if (mDecor == null || !mShowing) {
        return;
    }

    if (mWindow.isDestroyed()) {
        Log.e(TAG, "Tried to dismissDialog() but the Dialog's window was already destroyed!");
        return;
    }

    try {
        mWindowManager.removeViewImmediate(mDecor);
    } finally {
        if (mActionMode != null) {
            mActionMode.finish();
        }
        mDecor = null;
        mWindow.closeAllPanels();
        onStop();
        mShowing = false;

        sendDismissMessage();
    }
}
```

可以看出最终调用了`mWindowManager.removeViewImmediate(mDecor);`来销毁Dialog，继续跟进`removeViewImmediate()`这个方法。发现`mWindowManager`的类WindowManager是个abstract的类，我们来找找本尊。

#### Dialog中mWindowManager对象的来历

发现`mWindowManager`这个对象的初始化是在Dialog的构造函数中：

```java
Dialog(Context context, int theme, boolean createContextThemeWrapper) {
    if (createContextThemeWrapper) {
        if (theme == 0) {
            TypedValue outValue = new TypedValue();
            context.getTheme().resolveAttribute(com.android.internal.R.attr.dialogTheme,
                    outValue, true);
            theme = outValue.resourceId;
        }
        mContext = new ContextThemeWrapper(context, theme);
    } else {
        mContext = context;
    }

    mWindowManager = (WindowManager)context.getSystemService(Context.WINDOW_SERVICE);
    Window w = PolicyManager.makeNewWindow(mContext);
    mWindow = w;
    w.setCallback(this);
    w.setOnWindowDismissedCallback(this);
    w.setWindowManager(mWindowManager, null, null);
    w.setGravity(Gravity.CENTER);
    mListenersHandler = new ListenersHandler(this);
}
```
它是通过`context.getSystemService(Context.WINDOW_SERVICE);`得到的，这里的context肯定就是Activity了，我们去Activity中找`getSystemService()`函数：

```java
@Override
public Object getSystemService(@ServiceName @NonNull String name) {
    if (getBaseContext() == null) {
        throw new IllegalStateException(
                "System services not available to Activities before onCreate()");
    }

    if (WINDOW_SERVICE.equals(name)) {
        return mWindowManager;
    } else if (SEARCH_SERVICE.equals(name)) {
        ensureSearchManager();
        return mSearchManager;
    }
    return super.getSystemService(name);
}


final void attach(Context context, ActivityThread aThread,
        Instrumentation instr, IBinder token, int ident,
        Application application, Intent intent, ActivityInfo info,
        CharSequence title, Activity parent, String id,
        NonConfigurationInstances lastNonConfigurationInstances,
        Configuration config, IVoiceInteractor voiceInteractor) {

    mWindow.setWindowManager((WindowManager)context.getSystemService(Context.WINDOW_SERVICE),
            mToken, mComponent.flattenToString(),
            (info.flags & ActivityInfo.FLAG_HARDWARE_ACCELERATED) != 0);

    mWindowManager = mWindow.getWindowManager();
    
    //...省略其他代码...
}
```

我们看到`mWindowManager`这个对象是在Activity被创建之后调用attach函数的时候通过`mWindow.setWindowManager()`初始化的，而这个函数里干了什么呢？

```java
public void setWindowManager(WindowManager wm, IBinder appToken, String appName,
        boolean hardwareAccelerated) {
    mAppToken = appToken;
    mAppName = appName;
    mHardwareAccelerated = hardwareAccelerated
            || SystemProperties.getBoolean(PROPERTY_HARDWARE_UI, false);
    if (wm == null) {
        wm = (WindowManager)mContext.getSystemService(Context.WINDOW_SERVICE);
    }
    mWindowManager = ((WindowManagerImpl)wm).createLocalWindowManager(this);
}
```

可以看到`mWindowManager`这个对象最终来源于`WindowManagerImpl`类：

```java
public final class WindowManagerImpl implements WindowManager {
    private final WindowManagerGlobal mGlobal = WindowManagerGlobal.getInstance();
    private final Display mDisplay;
    private final Window mParentWindow;


    public WindowManagerImpl createLocalWindowManager(Window parentWindow) {
        return new WindowManagerImpl(mDisplay, parentWindow);
    }

    @Override
    public void addView(View view, ViewGroup.LayoutParams params) {
        mGlobal.addView(view, params, mDisplay, mParentWindow);
    }

    @Override
    public void removeView(View view) {
        mGlobal.removeView(view, false);
    }

    @Override
    public void removeViewImmediate(View view) {
        mGlobal.removeView(view, true);
    }
    
    //...省略其余代码...
}
```

在其中我们终于看到了`removeViewImmediate()`函数的身影，也就是说，在执行Dialog销毁的函数`dismissDialog()`中，最终调用了`mWindowManager.removeViewImmediate(mDecor);`来销毁Dialog。实际上调用的就是`WindowManagerImpl`实例中的`removeViewImmediate()`方法。

而它又调用的是`WindowManagerGlobal`的`removeView()`函数：

```java
public void removeView(View view, boolean immediate) {
    if (view == null) {
        throw new IllegalArgumentException("view must not be null");
    }

    synchronized (mLock) {
        int index = findViewLocked(view, true);
        View curView = mRoots.get(index).getView();
        removeViewLocked(index, immediate);
        if (curView == view) {
            return;
        }

        throw new IllegalStateException("Calling with view " + view
                + " but the ViewAncestor is attached to " + curView);
    }
}


private void removeViewLocked(int index, boolean immediate) {
    ViewRootImpl root = mRoots.get(index);
    View view = root.getView();

    if (view != null) {
        InputMethodManager imm = InputMethodManager.getInstance();
        if (imm != null) {
            imm.windowDismissed(mViews.get(index).getWindowToken());
        }
    }
    boolean deferred = root.die(immediate);
    if (view != null) {
        view.assignParent(null);
        if (deferred) {
            mDyingViews.add(view);
        }
    }
}
```
注意这句`boolean deferred = root.die(immediate);`，其中root对象是个`ViewRootImpl`的实例，我们看看它的`die()`方法：

```java
boolean die(boolean immediate) {
    // Make sure we do execute immediately if we are in the middle of a traversal or the damage
    // done by dispatchDetachedFromWindow will cause havoc on return.
    if (immediate && !mIsInTraversal) {
        doDie();
        return false;
    }

     //...省略其余代码...
}



void doDie() {
    checkThread();
    
    //...省略其余代码...
}
```

最终，执行到了`ViewRootImpl`类的`doDie()`方法，这个方法的第一句就是`checkThread()`，根据[Android4.4DialogUI线程CalledFromWrongThreadExcection](https://my.oschina.net/qixiaobo025/blog/195396)这篇文章，我们知道最终抛出异常的位置就是是在`ViewRootImpl`代码中的`checkThread`函数：

```java
void checkThread() {
    if (mThread != Thread.currentThread()) {
        throw new CalledFromWrongThreadException(
                "Only the original thread that created a view hierarchy can touch its views.");
    }
}
```
也就是说，当调用Dialog的`dismiss()`方法时，Dialog会自动抛到new Dialog的线程中执行，而这个线程就是当前的`Thread.currentThread()`。换句话说ViewRootImpl本身的mThread和这个new Dialog的线程不是同一个线程。然后我们看看这个ViewRootImpl本身的mThread的来源在何处。

#### ViewRootImpl中mThread的来历

在ViewRootImpl的构造函数中发现了mThread赋值的地方：

```java
public ViewRootImpl(Context context, Display display) {
    mThread = Thread.currentThread();
    
    //...省略其余代码...
}
```
那这个ViewRootImpl什么时候调用这个构造函数创建实例的呢？我们刚才在`WindowManagerGlobal`的`removeView()`函数中，看到了`root`对象是从`mRoots`对象中取出来的，而`mRoots`是一个`ArrayList<ViewRootImpl>`。

所以我们来`WindowManagerGlobal`中找找`mRoots.add()`的地方，发现是在它的`addView()`函数中创建了一个`ViewRootImpl`对象并添加到了`mRoots`这个list中：

```java
public void addView(View view, ViewGroup.LayoutParams params,
        Display display, Window parentWindow) {
    
    //...省略其余代码.....

    ViewRootImpl root;
    synchronized (mLock) {
       
       //...省略其余代码.....

        root = new ViewRootImpl(view.getContext(), display);
        mRoots.add(root);
    }

    // do this last because it fires off messages to start doing things
    try {
        root.setView(view, wparams, panelParentView);
    } catch (RuntimeException e) {
        // BadTokenException or InvalidDisplayException, clean up.
        synchronized (mLock) {
            final int index = findViewLocked(view, false);
            if (index >= 0) {
                removeViewLocked(index, true);
            }
        }
        throw e;
    }
}
```
而这个`addView`方法什么时候会调用呢？就是`WindowManagerImpl`。

就是刚才分析Dialog中`mWindowManager`对象的来历时，知道了它其实是`WindowManagerImpl`类的一个实例，WindowManagerImpl会通过`WindowManagerGlobal`的`removeView()`方法去实现removeView。同理，此处`WindowManagerGlobal`的`addView()`方法也是被WindowManagerImpl调用的。

我们在Dialog的源码中找一下`mWindowManager`对象调用`addView()`方法的地方，很让人惊喜，它竟然在Dialog的`show()`方法中出现了：

```java
public void show() {

	//...省略其余代码.....
    onStart();
    mDecor = mWindow.getDecorView();

    try {
        mWindowManager.addView(mDecor, l);
        mShowing = true;

        sendShowMessage();
    } finally {
    }
}
```
也就是说，Dialog的`show()`方法，会通过`mWindowManager.addView(mDecor, l);`创建一个`ViewRootImpl`的对象，这个对象会在创建的时候保存一个当前线程的Thread对象。也就是调用Dialog的`show()`方法的线程。

而在调用Dialog的`dismiss()`方法时，会首先把它抛到new Dialog的线程中执行，最后通过调用`mWindowManager.removeViewImmediate()`来销毁View，此时也就自然调用到了`ViewRootImpl`对象的`doDie()`方法，这个方法中会`checkThread();`，此时会检查当前线程（也就是调用new Dialog的线程）是不是创建`ViewRootImpl`的对象的线程（也就是Dialog的`show()`方法的线程）。



到这里，本文的bug根源也就找到了说通了。我们再来熟悉一下这个异常的场景。

- 创建Dialog：work子线程
- show()：ui主线程
- cancel()：work子线程
- dismiss()：因为crash没有执行到，未知（其实是抛到了work子线程）

现在就明确了，执行`show()`方法的时候`ViewRootImpl`没有`checkThread()`，所以不会出现crash。而在执行`dismiss()`的时候，它首先被抛到创建Dialog的线程中执行，而后真正销毁View时`ViewRootImpl`会`checkThread()`，保证addView的线程才能removeView。而在文章开头出错的例子中，Dialog的`show()`是在主线程执行，`new Dialog()`是在work子线程中执行的，所以抛出了`CalledFromWrongThreadException`的异常。



### 结论

1. Dialog的`dismiss()`会首先被抛到new Dialog的线程中执行。

2. 只要保证创建Dialog和`show()`方法在同一个线程中执行，无论是在放到ui线程还是work子线程都可以。

比如，把文章开头的例子中的`show()`方法同样放到work线程中，可以正常执行，输出log如下：

> 10-26 19:23:02.603 27689-27760/com.cuc.myandroidtest D/MainActivity test: Dialog create thread: [4213]
> 10-26 19:23:02.686 27689-27760/com.cuc.myandroidtest D/MainActivity test: Dialog show thread: [4213]
> 10-26 19:23:07.243 27689-27760/com.cuc.myandroidtest D/MainActivity test: Dialog onCancel thread: [4213]
> 10-26 19:23:07.243 27689-27760/com.cuc.myandroidtest D/MainActivity test: Dialog onDismiss thread: [4213]


### 版本差异

注意，本文的这个`CalledFromWrongThreadException`异常，是在4.4版本及以上才会出现的。具体区别可以参考这篇文章：[Android4.4DialogUI线程CalledFromWrongThreadExcection](https://my.oschina.net/qixiaobo025/blog/195396)

4.2中Dialog的dismissDialog和4.4中Dialog的dismissDialog区别如下：

```java
//4.2中Dialog的dismissDialog
try {
    mWindowManager.removeView(mDecor);
}
```

```java
//4.4中Dialog的dismissDialog
try {
    mWindowManager.removeViewImmediate(mDecor);
}
```



### 参考资料

- [Android4.4DialogUI线程CalledFromWrongThreadExcection](https://my.oschina.net/qixiaobo025/blog/195396)
- [Android异常：android.view.ViewRootImpl$CalledFromWrongThreadException: Only the original](http://blog.csdn.net/qq_32059827/article/details/51689309)
- [Activity WMS ViewRootImpl三者关系（Activity创建窗口 按键分发等）](http://blog.csdn.net/kc58236582/article/details/52088224)
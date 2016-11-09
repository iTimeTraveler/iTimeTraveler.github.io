---
title: 【Android】App应用崩溃(Crash-Force Close)之后如何让它自动重启？
layout: post
date: 2016-07-14 16:27
comments: true
tags: [Android]
categories: [Android]
keywords: Android
---

> 英文原文： [**Auto Restart application after Crash/Force Close in Android.**](http://chintanrathod.com/auto-restart-application-after-crash-forceclose-in-android/)


> 手机上的Android应用，经常会出现“Force Close”的错误，这种情况一般是因为代码中没有正确获取到Exceptions。那么如果想让App在出现这种错误崩溃Crash以后自动重启，我们该怎么办呢？


这篇教程我们将学到如何自动处理Exception，并且了解在App Crash以后如何自动重启。

其实方法很简单，这里我们需要用到 **Thread.setDefaultUncaughtExceptionHandler()**，当应用崩溃的时候代码就会自动调用 **uncaughtException()** 这个方法。

<!--more-->


操作步骤如下：

**Step 1**

像下面这样创建一个重启目标 Activity 的 Intent，并添加一些 Activity 启动的 Flags：

```java
Intent intent = new Intent(activity, RelaunchActivity.class);
intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP
				| Intent.FLAG_ACTIVITY_CLEAR_TASK
				| Intent.FLAG_ACTIVITY_NEW_TASK);
```
其中，

- Intent.FLAG_ACTIVITY_CLEAR_TOP ： 销毁目标Activity和它之上的所有Activity，重新创建目标Activity。

- Intent.FLAG_ACTIVITY_CLEAR_TASK ： 启动Activity时，清除之前已经存在的Activity实例所在的task，这自然也就清除了之前存在的Activity实例！

- Intent.FLAG_ACTIVITY_NEW_TASK ： 很少单独使用，通常与FLAG_ACTIVITY_CLEAR_TASK或FLAG_ACTIVITY_CLEAR_TOP联合使用。



**Step 2**

在 **uncaughtException()** 方法中，添加如下代码：

```java
PendingIntent pendingIntent = PendingIntent.getActivity(
        YourApplication.getInstance().getBaseContext(), 0,
                intent, intent.getFlags());
 
AlarmManager mgr = (AlarmManager) YourApplication.getInstance().getBaseContext()
                .getSystemService(Context.ALARM_SERVICE);
mgr.set(AlarmManager.RTC, System.currentTimeMillis() + 2000, pendingIntent);
 
activity.finish();
System.exit(2);
```
这里的 [PendingIntent](http://developer.android.com/reference/android/app/PendingIntent.html) 不同于常见的 Intent ，PendingIntent 是对 Intent 的一个包装，可以保存下来在将来某一刻执行。它存储了request code、intent 和 flags。

[AlarmManager](https://developer.android.com/reference/android/app/AlarmManager.html) 是为了设置一个计时器来延迟两秒再执行 pendingIntent 的，也就是重启我们的Activity的任务。


**Step 3**

最后，在 Activity 的 onCreate() 方法中调用如下代码：

```java
Thread.setDefaultUncaughtExceptionHandler(new DefaultExceptionHandler(this));
```





**【完整代码】**

- **YourApplication.java**
```java
import android.app.Application;
 
/**
 * This custom class is used to Application level things.
 *
 * @author Chintan Rathod (http://www.chintanrathod.com)
 */
public class YourApplication extends Application {
 
    private static Context mContext;
     
    public static YourApplication instace;
 
    @Override
    public void onCreate() {
        super.onCreate();
        mContext = getApplicationContext();
        instace = this;
    }
     
    @Override
    public Context getApplicationContext() {
        return super.getApplicationContext();
    }
 
    public static YourApplication getIntance() {
        return instace;
    }
}
```


- **DefaultExceptionHandler.java**

```java
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.lang.Thread.UncaughtExceptionHandler;
import java.text.SimpleDateFormat;
import java.util.Date;
 
import android.app.Activity;
import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Environment;
import android.util.Log;
 
/**
 * This custom class is used to handle exception.
 *
 * @author Chintan Rathod (http://www.chintanrathod.com)
 */
public class DefaultExceptionHandler implements UncaughtExceptionHandler {
 
    private UncaughtExceptionHandler defaultUEH;
    Activity activity;
 
    public DefaultExceptionHandler(Activity activity) {
        this.activity = activity;
    }
 
    @Override
    public void uncaughtException(Thread thread, Throwable ex) {
 
        try {
 
            Intent intent = new Intent(activity, RelaunchActivity.class);
 
            intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP
                    | Intent.FLAG_ACTIVITY_CLEAR_TASK
                    | Intent.FLAG_ACTIVITY_NEW_TASK);
 
            PendingIntent pendingIntent = PendingIntent.getActivity(
                    YourApplication.getInstance().getBaseContext(), 0, intent, intent.getFlags());
 
            //Following code will restart your application after 2 seconds
            AlarmManager mgr = (AlarmManager) YourApplication.getInstance().getBaseContext()
                    .getSystemService(Context.ALARM_SERVICE);
            mgr.set(AlarmManager.RTC, System.currentTimeMillis() + 1000,
                    pendingIntent);
 
            //This will finish your activity manually
            activity.finish();
 
            //This will stop your application and take out from it.
            System.exit(2);
 
        } catch (IOException e) {
            e.printStackTrace();
        }
    }
}
```



【参考资料】：

1、[Activity启动模式(二)之 Intent的Flag属性](http://wangkuiwu.github.io/2014/06/26/IntentFlag/)


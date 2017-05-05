---
title: 【Android】使用UncaughtExceptionHandler捕获全局异常
layout: post
date: 2017-04-20 14:10:55
comments: true
tags: 
    - Android
    - Exception
categories: [Android]
keywords: UncaughtExceptionHandler
description: 
photos:
    - /gallery/exception-handling.png
---




## **简介**
当程序崩溃（Crash）的时候，默认是不对异常信息做处理的。如果想要把异常信息保存到本地文件中，或上传的服务器。那么就要借助**`UncaughtExceptionHandler`**这个类。


<!-- more -->


## **使用方法**

### 一、实例化

```java
public class CrashLogCatch {
	public static final String THREAD_NAME_MAIN = "com.example.ABC";   //主线程名称
	public static final String THREAD_NAME_REMOTE = "com.example.ABC:remote_service";
	
	public static void initCrashLog(final Context context) {
		final Thread.UncaughtExceptionHandler oriHandler = Thread.getDefaultUncaughtExceptionHandler();
		Thread.setDefaultUncaughtExceptionHandler(new Thread.UncaughtExceptionHandler() {
			public void uncaughtException(Thread thread, Throwable e) {
				try {
					StringBuilder buffer = new StringBuilder();
					buffer.append(getCurProcessName(context) + "\n");
					buffer.append("uncaught exception at ")
							.append(new Date(System.currentTimeMillis()))
							.append("\n");
					buffer.append(ExceptionUtils.formatException(e));
	
					String log = HttpLogController.getInstance().makeCrashLog(buffer.toString());
					//发送崩溃日志
					sendExceptionLog(log);
					SdLog.dFileAlways("crash" + System.currentTimeMillis() + ".log", log);
					
					if (Global.DEBUG) {
						oriHandler.uncaughtException(thread, e);  //debug模式，默认抛出异常
					} else {
						String threadName = thread.getName();
						
						if (threadName.equals(THREAD_NAME_REMOTE)) {
							android.os.Process.killProcess(android.os.Process.myPid());  //如果是service直接kill掉
						} else if (threadName.equals(THREAD_NAME_MAIN)) {
							oriHandler.uncaughtException(thread, e);  //如果是主线程，抛出异常
						}
					}
				} catch (Exception ex) {}
			}
		});
	}
	
	/**
	* 获取当前进程名
	*/
	private static String getCurProcessName(Context context) {
		try {
			int pid = android.os.Process.myPid();
			ActivityManager mActivityManager = (ActivityManager)context.getSystemService(Context.ACTIVITY_SERVICE);
			for (ActivityManager.RunningAppProcessInfo appProcess : mActivityManager.getRunningAppProcesses()) {
				if (appProcess.pid == pid){
					return appProcess.processName;
				}
			} 
		} catch (Exception e) {
			e.printStackTrace();
		}
		return "";
	}
	
	/**
	* 发送崩溃日志
	*/
	private static void sendExceptionLog(String log) {
		try {
			JSONObject jsonObject = new JSONObject(log);
			Iterator keyIter = jsonObject.keys();
			String key;
			Object value;
			HashMap<String, Object> valueMap = new HashMap<String, Object>();
			while (keyIter.hasNext()) {
				key = (String) keyIter.next();
				value = jsonObject.get(key);
				valueMap.put(key, value);
			}
			// 把异常信息发送到服务器 
			ComponentHolder.getLogController().sendLog(valueMap, LogType.EXCEPTION);
		} catch (JSONException e) {
			e.printStackTrace();
		}
	}
}
```


### 二、调用

#### **1、对于整个Application**

只要在指定的Application类的onCreate()回调中，把UncaughtExceptionHandler和Application的实例绑定在一起就可以了。关键代码如下：

```java
public class MyApplication extends Application {

	@Override
	public void onCreate() {
		CrashLogCatch.initCrashLog(this);   //注意这里
		super.onCreate();
	}
}	
```

这样，如果程序崩溃，错误日志就会被上传到服务器。


#### **2、绑定Service 实例**

```java
public class MyService extends Service {

	@Override
	public void onCreate() {
	    Thread.currentThread().setName(CrashLogCatch.THREAD_NAME_REMOTE);  //线程名称
		CrashLogCatch.initCrashLog(this);   //注意这里
	}
}	
```

#### **3、绑定BroadcastReceiver实例**

```java
public class LaunchReceiver extends BroadcastReceiver {

	@Override
	public void onReceive(Context context, Intent intent) {
		Thread.currentThread().setName(CrashLogCatch.THREAD_NAME_REMOTE);  //线程名称
		CrashLogCatch.initCrashLog(context);   //注意这里
	}
}	
```



## **参考资料**

- [【移动开发】捕获异常信息_UncaughtExceptionHandler](http://blog.csdn.net/manoel/article/details/39479101)
- [Android使用UncaughtExceptionHandler捕获全局异常](http://blog.csdn.net/hehe9737/article/details/7662123)
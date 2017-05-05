---
title: 【Android】判断应用Application、Activity是否处于活动状态
layout: post
date: 2017-05-03 15:03:00
comments: true
tags: 
    - Android
categories: 
    - Android
keywords: 
description: 
photos:
   - /gallery/singleInstance.jpg
---


通过**`ActivityManager`**我们可以获得系统里正在运行的activities，包括进程(Process)等、应用程序/包、服务(Service)、任务(Task)信息。

## **1、判断应用App是否活动**

```java
/**
 * 判断应用是否已经启动
 * @param context 一个context
 * @param packageName 要判断应用的包名
 * @return boolean
 */
private boolean isAppAlive(Context context, String packageName){
   ActivityManager activityManager =
           (ActivityManager)context.getSystemService(Context.ACTIVITY_SERVICE);
   List<ActivityManager.RunningAppProcessInfo> processInfos
           = activityManager.getRunningAppProcesses();
   for(int i = 0; i < processInfos.size(); i++){
       if(processInfos.get(i).processName.equals(packageName)){
           Log.i("NotificationLaunch",
                   String.format("the %s is running, isAppAlive return true", packageName));
           return true;
       }
   }
   Log.i("NotificationLaunch",
           String.format("the %s is not running, isAppAlive return false", packageName));
   return false;
}
```

<!--more-->


## **2、判断Activity是否活动**

```java
/**
 * 判断MainActivity是否活动
 * @param context 一个context
 * @param activityName 要判断Activity
 * @return boolean
*/
private boolean isMainActivityAlive(Context context, String activityName){
   ActivityManager am = (ActivityManager)context.getSystemService(Context.ACTIVITY_SERVICE);
   List<ActivityManager.RunningTaskInfo> list = am.getRunningTasks(100);
   for (ActivityManager.RunningTaskInfo info : list) {
       if (info.topActivity.toString().equals(activityName) || info.baseActivity.toString().equals(activityName)) {
           Log.i(TAG,info.topActivity.getPackageName() + " info.baseActivity.getPackageName()="+info.baseActivity.getPackageName());
           return true;
       }
   }
   return false;
}
```


## **3、Activity是否显示在前台**

```java
/**
 * 检测某Activity是否在当前Task的栈顶
 */
private boolean isTopActivity(String activityName){
	ActivityManager manager = (ActivityManager) mContext.getSystemService(ACTIVITY_SERVICE);
	List<ActivityManager.RunningTaskInfo> runningTaskInfos = manager.getRunningTasks(1);
	String cmpNameTemp = null;
	if(runningTaskInfos != null){
		cmpNameTemp = runningTaskInfos.get(0).topActivity.toString();
	}
	if(cmpNameTemp == null){
		return false;
	}
	return cmpNameTemp.equals(activityName);
}
```

---

### 参考资料

1、[Android中ActivityManager的使用案例](http://blog.csdn.net/hp910315/article/details/49908203)
2、[Android实现点击通知栏后，先启动应用再打开目标Activity的一个小demo](https://github.com/slimhippo/androidcode/blob/master/NotificationLaunch/app/src/main/java/com/liangzili/notificationlaunch/SystemUtils.java)
3、[Android ActivityManager 检测Service与Activity是否正在运行](https://my.oschina.net/ososchina/blog/350498)
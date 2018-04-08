---
title: 【Android】App应用前后台切换的一种监听方法
layout: post
date: 2018-04-06 12:20:55
comments: true
tags: 
    - Android
categories: 
    - Android
keywords: 前后台
description: 
photos:
    - /gallery/android_common/20160811111853474.jpg
---





Android本身并没有提供监听App的前后台切换操作的方法。最近看到一种简单巧妙的方法来监听前后台，这里分享记录一下。

### 一、Activity生命周期

我们知道在Android中，两个Activity，分别为A和B。假设此时A在前台，当A启动B时，他们俩之间的生命周期关系如下，可以参考之前的这篇文章[【Android】Activity与Fragment的生命周期的关系](https://blog.csdn.net/u010983881/article/details/50036647)：

> A.onPause()  ->  B.onCreate()  ->  **B.onStart()**  ->  B.onResume()  ->  **A.onStop()**

也就是说B的onStart()方法是在A的onStop()方法之前执行的，我们可以根据这点来做文章。**在所有Activity的onStart()和onStop()方法中进行计数，计数变量为count，在onStart中将变量加1，onStop中减1。**



那么这个count在整个App的生命周期里的值就会像下面这样：

```
count
2|          _     _     _     _
1|     ____| |___| |___| |___| |____
0| ___|                             |___
 ===========================================> 时间
      a     b     c                 d
```

横轴表示时间，纵轴表示count的值。那么a、b、c、d四个时间点发生的事情如下：

1. a点就是启动了应用；
2. b点是**Activity_A**启动了另一个**Activity_B**；
3. c点是**Activity_B**启动了另一个**Activity_C**，后面以此类推；
4. d点是应用切换到了后台；

从上面的情况看出，可以通过对count计数为0，来判断应用被从前台切到了后台。同样的，从后台切到前台也是类似的道理。具体实现看后面的代码。



<!-- more -->



具体的实现中，我们可以实现一个BaseActivity，然后让其他所有Activity都继承自它，然后在生命周期函数中做相应的检测。还有更简单的方法，Android在API 14之后，在Application类中，提供了一个应用生命周期回调的注册方法，用来对应用的生命周期进行集中管理，这个接口叫`registerActivityLifecycleCallbacks()`，可以通过它注册自己的**ActivityLifeCycleCallback**，每一个Activity的生命周期都会回调到这里的对应方法。

```java
//源码位于Application类中
public interface ActivityLifecycleCallbacks {
    void onActivityCreated(Activity activity, Bundle savedInstanceState);
    void onActivityStarted(Activity activity);
    void onActivityResumed(Activity activity);
    void onActivityPaused(Activity activity);
    void onActivityStopped(Activity activity);
    void onActivitySaveInstanceState(Activity activity, Bundle outState);
    void onActivityDestroyed(Activity activity);
}
```

其实这个注册方法的本质和我们实现BaseActivity是一样的，只是将生命周期的管理移到了Activity本身的实现中。

### 二、实现

```java
public class TheApplication extends Application {

    private int mFinalCount;

    @Override
    public void onCreate() {
        super.onCreate();
        registerActivityLifecycleCallbacks(new ActivityLifecycleCallbacks() {
            @Override
            public void onActivityCreated(Activity activity, Bundle savedInstanceState) {

            }

            @Override
            public void onActivityStarted(Activity activity) {
                mFinalCount++;
                //如果mFinalCount ==1，说明是从后台到前台
                if (mFinalCount == 1){
                    //说明从后台回到了前台
                }
            }

            @Override
            public void onActivityResumed(Activity activity) {
            }

            @Override
            public void onActivityPaused(Activity activity) {
            }

            @Override
            public void onActivityStopped(Activity activity) {
                mFinalCount--;
                //如果mFinalCount == 0，说明是前台到后台
                if (mFinalCount == 0){
                    //说明从前台回到了后台
                }
            }

            @Override
            public void onActivitySaveInstanceState(Activity activity, Bundle outState) {
            }

            @Override
            public void onActivityDestroyed(Activity activity) {
            }
        });
    }
}
```





### 参考资料

- [判断Android程序前后台切换的几种方法](https://blog.csdn.net/trap1314/article/details/70739076)
- [Android应用前后台切换的判断](https://blog.csdn.net/goodlixueyong/article/details/50543627)
- [优雅的使用ActivityLifecycleCallbacks管理Activity和区分App前后台](https://blog.csdn.net/u010072711/article/details/77090313)
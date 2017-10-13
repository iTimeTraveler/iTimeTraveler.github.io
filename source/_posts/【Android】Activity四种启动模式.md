---
title: 【Android】Activity四种启动模式
layout: post
date: 2015-10-09 20:03:00
comments: true
tags: 
    - Android
categories: 
    - Android
keywords: 
description: 
photos:
   - /gallery/14936293919569.jpg
---




### Task栈

每个应用都有一个任务栈，是用来存放Activity的，功能类似于函数调用的栈，先后顺序代表了Activity的出现顺序；比如Activity1-->Activity2-->Activity3，则任务栈为：

![](/gallery/android_common/120721093646151.gif)


### 四种启动模式


启动模式简单地说就是Activity启动时的策略，在AndroidManifest.xml中的标签的android:launchMode属性设置；

启动模式有4种，分别为standard、singleTop、singleTask、singleInstance；


<!-- more -->

#### 1、standard

每次激活Activity时(startActivity)，都创建Activity实例，并放入任务栈；

![](/gallery/android_common/120721093646152.gif)



#### 2、singleTop（栈顶复用模式）

如果某个Activity自己激活自己，即任务栈栈顶就是该Activity，则不需要创建，其余情况都要创建Activity实例；

![](/gallery/android_common/120721093646153.gif)

singleTop模式分3种情况：

- 当前栈中已有该Activity的实例并且该实例位于栈顶时，不会新建实例，而是复用栈顶的实例，并且会将Intent对象传入，回调onNewIntent方法。
- 当前栈中已有该Activity的实例但是该实例不在栈顶时，其行为和standard启动模式一样，依然会创建一个新的实例
- 当前栈中不存在该Activity的实例时，其行为同standard启动模式。


#### 3、singleTask（栈内复用模式）

如果要激活的那个Activity在任务栈中存在该实例，则不需要创建，只需要把此Activity放入栈顶，并把该Activity以上的Activity实例都pop

![](/gallery/android_common/120721093646154.gif)

singleTask启动模式启动Activity时，首先会根据taskAffinity去寻找当前是否存在一个对应名字的任务栈 

- 如果不存在，则会创建一个新的Task，并创建新的Activity实例入栈到新创建的Task中去
- 如果存在，则得到该任务栈，查找该任务栈中是否存在该Activity实例 
    - 如果存在实例，则将它上面的Activity实例都出栈，然后回调启动的Activity实例的onNewIntent方法
    - 如果不存在该实例，则新建Activity，并入栈

#### 4、singleInstance（全局唯一模式）

如果应用1的任务栈中创建了MainActivity实例，如果应用2也要激活MainActivity，则不需要创建，两应用共享该Activity实例；

![](/gallery/android_common/120721093646155.gif)

该模式具备singleTask模式的所有特性外，与它的区别就是，这种模式下的Activity会单独占用一个Task栈，具有全局唯一性，即整个系统中就这么一个实例。以singleInstance模式启动的Activity在整个系统中是单例的，如果在启动这样的Activiyt时，已经存在了一个实例，那么会把它所在的任务调度到前台，重用这个实例。

根据上面的讲解，并且参考谷歌官方文档，singleInstance的特点可以归结为以下三条：

1. 以singleInstance模式启动的Activity具有全局唯一性，即整个系统中只会存在一个这样的实例
2. 以singleInstance模式启动的Activity具有独占性，即它会独自占用一个任务，被他开启的任何activity都会运行在其他任务中（官方文档上的描述为，singleInstance模式的Activity不允许其他Activity和它共存在一个任务中）
3. 被singleInstance模式的Activity开启的其他activity，能够开启一个新任务，但不一定开启新的任务，也可能在已有的一个任务中开启


### 参考资料

- [Android入门：Activity四种启动模式](http://www.cnblogs.com/meizixiong/archive/2013/07/03/3170591.html)
- [Android--Activity的启动模式](https://www.cnblogs.com/plokmju/p/android_ActivityLauncherMode.html)
- [基础总结篇之二：Activity的四种launchMode](http://blog.csdn.net/liuhe688/article/details/6754323)
- [Android中Activity四种启动模式和taskAffinity属性详解](http://blog.csdn.net/zhangjg_blog/article/details/10923643)
- [彻底弄懂Activity四大启动模式](http://blog.csdn.net/mynameishuangshuai/article/details/51491074)
- [Activity四种启动模式](http://blog.csdn.net/shinay/article/details/7898492/)
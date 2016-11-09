
---
title: 【Android】如何查看Activity Task栈的情况
layout: post
date: 2016-01-19 11:48
comments: true
tags: [Android]
categories: [Android]
keywords: Android
description: 我们都知道，每个Activity都有taskAffinity属性，这个属性指出了它希望进入的Task。
---

> 我们都知道，每个Activity都有taskAffinity属性，这个属性指出了它希望进入的Task。

如果一个Activity没有显式的指明该 Activity的taskAffinity，那么它的这个属性就等于Application指明的taskAffinity，如果 Application也没有指明，那么该taskAffinity的值就等于包名。而Task也有自己的affinity属性，它的值等于它的根 Activity的taskAffinity的值。 


**一、查看task栈情况**

在cmd命令行里或者Android Studio中的Terminal里敲入如下命令：
```bash
adb shell dumpsys activity
```
然后会出现很长一段详细信息，滚到中间的地方，会看到Task栈的状态如下：
![](http://img.blog.csdn.net/20160119120838863)

<!--more-->


此外，这些信息的最底部还可以看到当前显示在前台的Activity是哪一个，还有使用设备的分辨率等信息
![](http://img.blog.csdn.net/20160119114801794)
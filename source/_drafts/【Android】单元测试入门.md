---
title: 【Android】单元测试方法简介
layout: post
date: 2018-06-25 11:51:55
comments: true
tags: 
    - Android
categories: [Android]
keywords: 单元测试
description: 
photos:
    - /gallery/tinker.png
---



## 前言



## 基本单元测试框架

Java单元测试框架：**Junit、Mockito、Powermockito**等；

Android单元测试框架：**Robolectric、AndroidJUnitRunner、Espresso**等。

最开始建议先学习**Junit & Mockito**。这两款框架是java领域应用非常普及，使用简单，官网的说明也很清晰。junit运行在**jvm**上，所以只能测试纯java，若要测试依赖android库的代码，可以用mockito**隔离依赖**（下面会谈及）。

之后学习**AndroidJUnitRunner**，Google官方的android单元测试框架之一，使用跟**Junit**是一样的，只不过需要运行在android真机或模拟器环境。由于**mockito**只在**jvm**环境生效，而android是运行在**Dalvik**或**ART**，所以**AndroidJUnitRunner不能使用mockito**。

然后可以尝试**Robolectric & Espresso**。**Robolectric**运行在**jvm**上，但是框架本身引入了android依赖库，所以可以做android单元测试，运行速度比运行在真机or模拟器快。但Robolectric也有局限性，例如不支持加载so，测试代码也有点别扭。当然，robolectric可以配合junit、mockito使用。**Espresso**也是Google官方的android单元测试框架之一，强大就不用说了，测试代码非常简洁。Espresso本身运行在真机上，因此android任何代码都能运行，不像junit&mockito那样隔离依赖。缺点也是显而易见，由于运行在真机，不能避免**“慢”**。

 

 

 

 

 

### Junit

#### Junit测试顺序：@FixMethodOrder

参考[Junit单元测试 | 注解和执行顺序](https://www.jianshu.com/p/27107de9ab77)



### Powermockito

如何mock单例模式

[【Unit Test Hints】: How to mock a Singleton using PowerMock](https://roukou.org/2016/10/30/unit-test-hints-how-to-mock-a-singleton-using-powermock/)

### Robolectric

使用Robolectric时，你可能会遇到问题。因为Robolectric对于每一个测试组件都使用了一个新的拥有不同设置的ClassLoader。对于PowerMock也是一样，对于每一个基本组件，它都提供了一个ClassLoader，并且规定他们都为不可重用状态。

JVM有两个非常重要的相关限制:

1. 一个共享的库在一个进程中只能被加载一次.
2. ClassLoader不共享加载的库的信息

因此在测试运行中使用多个ClassLoader是非常有问题的。因为每一个Classloader实例都会尝试加载so，但是除了第一个会成功之外，其它的都会报Native library XXX already loaded in another classloader（已经在另一个classloader被加载过了)的异常.

避免这个的唯一方法是避免使用多个ClassLoader，如果必须使用新的ClassLoader，则使用fork进程的方式.

### Instrumentation

### Espresso





## 参考资料

- [Android单元测试 - 如何开始？](https://www.jianshu.com/p/bc99678b1d6e)
- [Android单元测试研究与实践](https://tech.meituan.com/Android_unit_test.html) - 美团点评技术团队
- [使用 PowerMock 以及 Mockito 实现单元测试](https://www.ibm.com/developerworks/cn/java/j-lo-powermock/index.html) - IBM DeveloperWorks
- [安卓单元测试(十一)：异步代码怎么测试](http://chriszou.com/2016/08/06/android-unit-testing-async.html)
- [Android单元测试之PowerMockito](https://www.jianshu.com/p/6631bd826677)
- [在单元测试中使用PowerMockito隔离static native method](https://juejin.im/entry/5a099858f265da4332271430)
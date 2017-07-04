---
title: 【Android】Monkey压力测试与停止
layout: post
date: 2016-07-19 11:09
comments: true
tags: [Android]
categories: [Android]
keywords: Android
description: Monkey测试是Android自动化测试的一种手段。该工具用于进行压力测试，就是模拟用户的按键输入，触摸屏输入，手势输入等，看设备多长时间会出异常。 然后开发人员结合monkey 打印的日志 和系统打印的日志，结局测试中出现的问题。
---


#### **一、Monkey 是什么？** 

Monkey测试是Android自动化测试的一种手段。该工具用于进行压力测试，就是模拟用户的按键输入，触摸屏输入，手势输入等，看设备多长时间会出异常。 然后开发人员结合monkey 打印的日志 和系统打印的日志，结局测试中出现的问题。



#### **二、Monkey命令**


1）. 标准的monkey 命令
[adb shell] monkey [options] < eventcount > , 例如：

> adb shell monkey -v 500

产生500次随机事件，作用在系统中所有activity（其实也不是所有的activity，而是包含  Intent.CATEGORY_LAUNCHER 或Intent.CATEGORY_MONKEY 的activity）。
上面只是一个简单的例子，实际情况中通常会有很多的options 选项.

2）. 四大类

> - 常用选项
> - 事件选项 
> - 约束选项 
> - 调试选项

具体的命令解释可以看这里：[android 压力测试命令monkey详解](http://www.jb51.net/article/48557.htm)

<!--more-->

**一个简单的Monkey命令如下：**

> adb shell monkey -p com.example.xystudy -s 500 -v 10000

工作中为了保证测试数量的完整进行，我们一般不会在发生错误时立刻退出压力测试。monkey 测试命令如下：

```bash
/**
 * monkey 作用的包：com.ckt.android.junit
 * 产生时间序列的种子值：500
 * 忽略程序崩溃、 忽略超时、 监视本地程序崩溃、 详细信息级别为2， 产生10000个事件 。
 */
adb shell monkey -p com.xy.android.junit -s 500 --ignore-crashes
--ignore-timeouts --monitor-native-crashes -v -v 10000 > E:\monkey_log\java_monkey_log.txt

```




#### **三、强制停止Monkey测试**

```bash
adb shell ps | awk '/com\.android\.commands\.monkey/ { system("adb shell kill " $2) }'  

```





#### 【参考资料】

1、[android 压力测试命令monkey详解](http://www.jb51.net/article/48557.htm)
2、[Monkey 的专项测试浅谈](http://www.testwo.com/article/402)
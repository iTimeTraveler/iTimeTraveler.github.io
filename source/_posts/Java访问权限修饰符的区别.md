---
title: Java访问权限修饰符的区别
layout: post
date: 2016-01-15 15:07:20
comments: true
tags: [Java]
categories: [Java]
keywords: Java
description: 
---


　　Java有四种访问权限，其中三种有访问权限修饰符，分别为private，public和protected，还有一种不带任何修饰符：

 1. **private:** Java语言中对访问权限限制的最窄的修饰符，一般称之为“私有的”。被其修饰的类、属性以及方法只能被该类的对象访问，其子类不能访问，更不能允许跨包访问。
 2. **default：**即不加任何访问修饰符，通常称为“默认访问模式“。该模式下，只允许在同一个包中进行访问。
 3. **protect:** 介于public 和 private 之间的一种访问修饰符，一般称之为“保护形”。被其修饰的类、属性以及方法只能被类本身的方法及子类访问，即使子类在不同的包中也可以访问。
 4. **public：** Java语言中访问限制最宽的修饰符，一般称之为“公共的”。被其修饰的类、属性以及方法不仅可以跨类访问，而且允许跨包（package）访问。


<!--more-->


下面用表格的形式来展示四种访问权限之间的异同点，这样会更加形象。注意其中protected和default的区别，表格如下所示：

> | 权限修饰符| 同一个类| 同一个包| 不同包的子类| 不同包的非子类|
|:-----:|:----:| :----:|:----:|:----:|
| Private   | √    | 
| Default    | √    |  √   | 
| Protected| √    |   √  |  √  |
| Public    | √   |   √  |  √  |  √  |


【参考资料】：
1、[java类的访问权限](http://www.cnblogs.com/xwdreamer/archive/2012/04/06/2434483.html)
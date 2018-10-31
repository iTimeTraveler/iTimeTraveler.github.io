---
title: 【Java】JVM之GC垃圾回收算法
layout: post
date: 2018-09-03 22:20:55
comments: true
tags: 
    - Java
categories: 
    - Java
keywords: GC
description: 
photos:
    - /gallery/java-common/20170531150958304.jpeg
---







**注意，Java堆可以处于物理上不连续的内存空间中，只要逻辑上是连续的即可。**而且，Java堆在实现时，既可以是固定大小的，也可以是可拓展的，并且主流虚拟机都是按可扩展来实现的（通过-Xmx(最大堆容量) 和 -Xms(最小堆容量)控制）。如果在堆中没有内存完成实例分配，并且堆也无法再拓展时，将会抛出 OutOfMemoryError 异常。 



### 参考资料

- [Java中的垃圾回收](https://imtangqi.com/2016/06/12/garbage-collection-in-java/)
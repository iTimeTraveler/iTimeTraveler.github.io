---
title: 【Java】不用循环语句如何输入打印数组元素
layout: post
date: 2015-12-09 13:58:20
comments: true
tags: [Java]
categories: [Java]
keywords: Java
description: 
---

Java中可以使用Arrays.toString()来输出数组，免了使用各种循环来挨个print的痛苦。

```java
package javacc.test;
import java.util.Arrays;
 
public class Test {
    public static void main(String[] args) {
        int[] array = {0,1,4,7,2,5,8,3,6,9};
        System.out.println(Arrays.toString(array));    //注意这里的 Arrays.toString()
    }
}

```
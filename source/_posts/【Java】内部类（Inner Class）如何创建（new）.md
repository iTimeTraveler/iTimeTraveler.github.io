---
title: 【Java】内部类（Inner Class）如何创建（new）
layout: post
date: 2016-01-02 21:13:20
comments: true
tags: [Java]
categories: [Java]
keywords: Java
description: 
---


> 简单来说，内部类（inner class）指那些类定义代码被置于其它类定义中的类；而对于一般的、类定义代码不嵌套在其它类定义中的类，称为顶层（top-level）类。对于一个内部类，包含其定义代码的类称为它的外部（outer）类。 

那么对于内部类，该如何去使用呢？


下面给出静态成员类（Static Member Class）和普通成员类（Member Class）使用的方式。

```java
package cuc;
import cuc.TestClass.Inner1;

public class Main {

	public static void main(String args[]) {
		//静态的内部类
		TestClass.Inner1 inner1 = new Inner1();   //和普通的顶层类new的方法一样
		inner1.report();
		
		//普通内部成员类
		TestClass tc = new TestClass();
		TestClass.Inner2 inner2 = tc.new Inner2();    //注意这里的使用方式
		inner2.report();
	}
}
```


<!--more-->


两种内部类的定义如下：

```java
package cuc;

public class TestClass {
	
	//静态成员类
	public static class Inner1{
		public void report(){
			System.out.println("This is a inner class. (NOT static)");
		}
	}
	
	//普通内部成员类
	public class Inner2{
		public void report(){
			System.out.println("This is a static inner class.");
		}
	}
}

```


【参考资料】：
[1、java - 内部类(Inner Class)详解](http://wenku.baidu.com/link?url=zbvP8SDSamMTgYJog90fWzKoVSP8adpooSWmALNQ1r-iQu4EWMVHnisLauozzBzkosy2Q4C3MneRrUUoUEzoS9Y0ZPoqZX_GMXo9gcejkL3)
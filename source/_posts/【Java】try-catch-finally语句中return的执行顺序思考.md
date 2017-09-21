---
title: 【Java】try-catch-finally语句中return的执行顺序思考
layout: post
date: 2017-09-20 22:30:55
comments: true
tags: 
    - Java
categories: 
    - Java
keywords: Sort
description: 
photos: 
---



### **实验**

对于try-catch-finally语句中return的执行顺序，我们都有知道，finally块中的内容会先于try中的return语句执行，如果finall语句块中也有return语句的话，那么直接从finally中返回了，这也是不建议在finally中return的原因。

下面通过实验来看这几种情况的执行顺序到底是什么。

#### **1、try中有return，finally中没有**

```java
public class TryCatchTest {

	public static void main(String[] args) {
		System.out.println("test()函数返回：" + test());
	}

	private static int test(){
		int i = 0;
		try {
			System.out.println("Try block executing: " + ++i);
			return i;
		}catch (Exception e){
			System.out.println("Catch Error executing: " + ++i);
			return -1;
		}finally {
			System.out.println("finally executing: " + ++i);
		}
	}
}
```

<!-- more -->


结果如下：

> Try block executing: 1
> finally executing: 2
> test()函数返回：1

**return的是对象时，看看在finally中改变对象属性，会不会影响try中的return结果。**

```java
public class TryCatchTest {
	public int vaule = 0;

	public static void main(String[] args) {
		System.out.println("test()函数返回：" + test().vaule);
	}

	private static TryCatchTest test(){
		TryCatchTest t = new TryCatchTest();
		try {
			t.vaule = 1;
			System.out.println("Try block executing: " + t.vaule);
			return t;
		}catch (Exception e){
			t.vaule = -1;
			System.out.println("Catch Error executing: " + t.vaule);
			return t;
		}finally {
			t.vaule = 3;
			System.out.println("finally executing: " + t.vaule);
		}
	}
}
```

> Try block executing: 1
> finally executing: 3
> test()函数返回：3


#### **2、try和finally中均有return**

```java
private static int test(){
	int i = 0;
	try {
		System.out.println("Try block executing: " + ++i);
		return i;
	}catch (Exception e){
		System.out.println("Catch Error executing: " + ++i);
		return -1;
	}finally {
		System.out.println("finally executing: " + ++i);
		return i;
	}
}
```

结果如下：

> Try block executing: 1
> finally executing: 2
> test()函数返回：2

#### **3、catch和finally中均有return**

```java
private static int test(){
	int i = 0;
	try {
		System.out.println("Try block executing: " + ++i);
		throw new Exception();
	}catch (Exception e){
		System.out.println("Catch Error executing: " + ++i);
		return -1;
	}finally {
		System.out.println("finally executing: " + ++i);
		return i;
	}
}
```

输出结果：

> Try block executing: 1
> Catch Error executing: 2
> finally executing: 3
> test()函数返回：3


### **总结**

1、不管有没有出现异常，finally块中代码都会执行；
2、当try和catch中有return时，finally仍然会执行；
3、finally是在return后面的**表达式运算**之后执行的；

对于含有return语句的情况，这里我们可以简单地总结如下：

> try语句在返回前，将其他所有的操作执行完，保留好要返回的值，而后转入执行finally中的语句，而后分为以下三种情况：

- **情况一**：如果finally中有return语句，则会将try中的return语句“覆盖”掉，直接执行finally中的return语句，得到返回值，这样便无法得到try之前保留好的返回值。

- **情况二**：如果finally中没有return语句，也没有改变要返回值，则执行完finally中的语句后，会接着执行try中的return语句，返回之前保留的值。

- **情况三**：如果finally中没有return语句，但是改变了要返回的值，这里有点类似与引用传递和值传递的区别，分以下两种情况：
  - 1）如果return的数据是基本数据类型或文本字符串，则在finally中对该基本数据的改变不起作用，try中的return语句依然会返回进入finally块之前保留的值。
  - 2）如果return的数据是引用数据类型，而在finally中对该引用数据类型的属性值的改变起作用，try中的return语句返回的就是在finally中改变后的该属性的值。


### 参考资料

- [有return的情况下try catch finally的执行顺序（最有说服力的总结）](http://blog.csdn.net/kavensu/article/details/8067850)
- [ Java中try catch finally语句中含有return语句的执行情况（总结版）](http://blog.csdn.net/ns_code/article/details/17485221)
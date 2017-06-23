---
title: 【面试题】Java String常量相等（==）问题
layout: post
date: 2017-06-15 16:51:55
comments: true
tags: 
    - Java
categories: [Java]
keywords: Java
description: 
photos:
    - /gallery/java-string-pool.png
---



# 问题

以下三个结果分别输出（true or false）？别小看它，很多程序员因为上面问题出过生产bug

```java
String s3 = "s";
String s4 = "s";
System.out.println(s3==s4);


---
String s5 = "hello";
String s6 = "he"+"llo";
System.out.println(s5==s6);


---
Integer i = 2017;
Integer j = 2017;
System.out.println(i==j);


---
String s1 = new String("s");
String s2 = new String("s");
System.out.println(s1==s2);
System.out.println(s1.intern()==s2.intern());
```

<!--more-->

真正执行结果如下：

```java
String s3 = "s";
String s4 = "s";
System.out.println(s3==s4);   //true


---
String s5 = "hello";
String s6 = "he"+"llo";
System.out.println(s5==s6);   //true


---
Integer i = 2017;
Integer j = 2017;
System.out.println(i==j);   //false


---
String s1 = new String("s");
String s2 = new String("s");
System.out.println(s1==s2);   //false
System.out.println(s1.intern()==s2.intern());   //true

```


# 解释

1. 看看Integer的源代码就知道Integer 把-128-127之间的每个值建立了缓存池，所以Integer i =127，Integer j =127，他们是true，超出就是false。

2. String s = "s" 是常量池中创建一个对象"s"，所以是true。而String s = new String（"s"）在堆上面分配内存创建一个String对象，栈放了对象引用。如下图：

![](http://img.blog.csdn.net/20170615170007540)

但在调用s.intern()方法的时候，会将共享池中的字符串与外部的字符串(s）进行比较,如果共享池存在，返回它，如果不同则将外部字符串放入共享池中，并返回其字符串的引用，这样做的好处就是能够节约空间。

String 的`intern()`方法的官方解释如下：

```java
/**
  * Returns an interned string equal to this string. The VM maintains an internal set of
  * unique strings. All string literals found in loaded classes'
  * constant pools are automatically interned. Manually-interned strings are only weakly
  * referenced, so calling {@code intern} won't lead to unwanted retention.
  *
  * <p>Interning is typically used because it guarantees that for interned strings
  * {@code a} and {@code b}, {@code a.equals(b)} can be simplified to
  * {@code a == b}. (This is not true of non-interned strings.)
  *
  * <p>Many applications find it simpler and more convenient to use an explicit
  * {@link java.util.HashMap} to implement their own pools.
  */
 public native String intern();
```
s.intern()作用还是很多，比如for循环创建String对象，因为代码事先不并不知道是否存在"hello"或者其他字符串的实例。这样可以节约很多内存空间。


参考资料：

1、[你遇到过哪些质量很高的 Java 面试？](https://www.zhihu.com/question/60949531/answer/182458705)
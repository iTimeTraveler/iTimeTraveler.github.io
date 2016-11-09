---
title: 【Java】HashMap 和 HashTable 的区别到底是什么？
layout: post
date: 2015-11-10 11:55:00
comments: true
tags: [Java]
categories: [Java]
keywords: Java
description: 
---


 - #### **第一、继承不同**
 
 第一个不同主要是历史原因。Hashtable是基于陈旧的Dictionary类的，HashMap是Java 1.2引进的Map接口的一个实现。
	
```java
	public class HashMap<K, V> extends AbstractMap<K, V> implements Cloneable, Serializable {...}
	public class Hashtable<K, V> extends Dictionary<K, V> implements Map<K, V>, Cloneable, Serializable {...}
```

而HashMap继承的抽象类AbstractMap实现了Map接口：

```java
	public abstract class AbstractMap<K, V> implements Map<K, V> {...}
```
 

<!--more-->

 - #### **第二、线程安全不一样**
 
 Hashtable 中的方法是同步的，而HashMap中的方法在默认情况下是非同步的。在多线程并发的环境下，可以直接使用Hashtable，但是要使用HashMap的话就要自己增加同步处理了。

```java
	//这是Hashtable的put()方法:
	/**
     * Associate the specified value with the specified key in this
     * {@code Hashtable}. If the key already exists, the old value is replaced.
     * The key and value cannot be null.
     *
     * @param key
     *            the key to add.
     * @param value
     *            the value to add.
     * @return the old value associated with the specified key, or {@code null}
     *         if the key did not exist.
     * @see #elements
     * @see #get
     * @see #keys
     * @see java.lang.Object#equals
     */
    public synchronized V put(K key, V value) {
        if (key == null) {
            throw new NullPointerException("key == null");
        } else if (value == null) {
            throw new NullPointerException("value == null");
        }
        int hash = Collections.secondaryHash(key);
        HashtableEntry<K, V>[] tab = table;
        int index = hash & (tab.length - 1);
        HashtableEntry<K, V> first = tab[index];
        for (HashtableEntry<K, V> e = first; e != null; e = e.next) {
            if (e.hash == hash && key.equals(e.key)) {
                V oldValue = e.value;
                e.value = value;
                return oldValue;
            }
        }
```
	
```java
	//这是HashMap的put()方法:
	/**
     * Maps the specified key to the specified value.
     *
     * @param key
     *            the key.
     * @param value
     *            the value.
     * @return the value of any previous mapping with the specified key or
     *         {@code null} if there was no such mapping.
     */
    @Override public V put(K key, V value) {
        if (key == null) {
            return putValueForNullKey(value);
        }

        int hash = Collections.secondaryHash(key);
        HashMapEntry<K, V>[] tab = table;
        int index = hash & (tab.length - 1);
        for (HashMapEntry<K, V> e = tab[index]; e != null; e = e.next) {
            if (e.hash == hash && key.equals(e.key)) {
                preModify(e);
                V oldValue = e.value;
                e.value = value;
                return oldValue;
            }
        }
```

从上面的源代码可以看到Hashtable的put()方法是synchronized的，而HashMap的put()方法却不是。


 - ####  **第三、允不允许null值**
 
 从上面的put()方法源码可以看到，Hashtable中，key和value都**不允许出现null值**，否则会抛出NullPointerException异常。
而在HashMap中，**null可以作为键**，这样的键只有一个；可以有一个或多个键所对应的值为null。当get()方法返回null值时，即可以表示 HashMap中没有该键，也可以表示该键所对应的值为null。因此，在HashMap中不能由get()方法来判断HashMap中是否存在某个键， 而应该用containsKey()方法来判断。


 - #### **第四、遍历方式的内部实现上不同**
 Hashtable、HashMap都使用了 Iterator。而由于历史原因，Hashtable还使用了Enumeration的方式 。

 - #### **第五、哈希值的使用不同**
 HashTable直接使用对象的hashCode。而HashMap重新计算hash值。
 

 - #### **第六、内部实现方式的数组的初始大小和扩容的方式不一样**
 HashTable中的hash数组初始大小是11，增加的方式是 old*2+1。HashMap中hash数组的默认大小是16，而且一定是2的指数。 
 



----------



#### 【总结】：

 |  |  |  |  |  |  |  |  |  | 
 |:-------:|:-------|:-------|:-------|:-------|:-------|:-------|:-------|
 | **HashMap** | 线程不安全 | 允许有null的键和值 | 效率高一点、 | 方法不是Synchronize的要提供外同步 | 有containsvalue和containsKey方法 | HashMap 是Java1.2 引进的Map interface 的一个实现 | HashMap是Hashtable的轻量级实现 | 
 | **Hashtable** | 线程安全 | 不允许有null的键和值 | 效率稍低、 | 方法是是Synchronize的 | 有contains方法方法 | Hashtable 继承于Dictionary 类 | Hashtable 比HashMap 要旧


#### 【建议】：

> 一些资料建议，当需要同步时，用Hashtable，反之用HashMap。但是，因为在需要时，HashMap可以被同步，HashMap的功能比Hashtable的功能更多，而且它不是基于一个陈旧的类的，所以有人认为，在各种情况下，HashMap都优先于Hashtable。


**【参考资料】：**

 1、Hashtable、HashMap源代码
 2、[Java的HashMap和HashTable](http://www.cnblogs.com/devinzhang/archive/2012/01/13/2321481.html)
 3、[HashMap与HashTable的区别](http://www.cnblogs.com/langtianya/archive/2013/03/19/2970273.html)

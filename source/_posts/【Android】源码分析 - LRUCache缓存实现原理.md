---
title: 【Android】源码分析 - LRUCache缓存实现原理
layout: post
date: 2018-01-12 22:20:55
comments: true
tags: 
    - Android
categories: 
    - Android
keywords: LinkedHashMap
description: 
photos:
    - https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/algorithms/lru.png
---



### 一、Android中的缓存策略

一般来说，缓存策略主要包含缓存的添加、获取和删除这三类操作。如何添加和获取缓存这个比较好理解，那么为什么还要删除缓存呢？这是因为不管是内存缓存还是硬盘缓存，它们的缓存大小都是有限的。当缓存满了之后，再想其添加缓存，这个时候就需要删除一些旧的缓存并添加新的缓存。

因此LRU(**Least Recently Used**)缓存算法便应运而生，LRU是近期最少使用的算法，它的核心思想是当缓存满时，会优先淘汰那些近期最少使用的缓存对象，有效的避免了OOM的出现。在Android中采用LRU算法的常用缓存有两种：[LruCache](https://developer.android.com/reference/android/util/LruCache.html)和DisLruCache，分别用于实现内存缓存和硬盘缓存，其核心思想都是LRU缓存算法。

其实LRU缓存的实现类似于一个特殊的栈，把访问过的元素放置到栈顶（若栈中存在，则更新至栈顶；若栈中不存在则直接入栈），然后如果栈中元素数量超过限定值，则删除栈底元素（即最近最少使用的元素）。如下图：

![](https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/algorithms/lru-timg.jpg)


### 二、LruCache的使用

`LruCache`是Android 3.1所提供的一个缓存类，所以在Android中可以直接使用LruCache实现内存缓存。而DisLruCache目前在Android 还不是Android SDK的一部分，但Android官方文档推荐使用该算法来实现硬盘缓存。

讲到`LruCache`不得不提一下`LinkedHashMap`，因为LruCache中Lru算法的实现就是通过`LinkedHashMap`来实现的。`LinkedHashMap`继承于`HashMap`，它使用了一个双向链表来存储Map中的Entry顺序关系，这种顺序有两种，一种是**LRU顺序**，一种是**插入顺序**，这可以由其构造函数`public LinkedHashMap(int initialCapacity,float loadFactor, boolean accessOrder)`的最后一个参数`accessOrder`来指定。所以，对于get、put、remove等操作，`LinkedHashMap`除了要做`HashMap`做的事情，还做些调整Entry顺序链表的工作。`LruCache`中将`LinkedHashMap`的顺序设置为LRU顺序来实现LRU缓存，每次调用get(也就是从内存缓存中取图片)，则将该对象移到链表的尾端。调用put插入新的对象也是存储在链表尾端，这样当内存缓存达到设定的最大值时，将链表头部的对象（近期最少用到的）移除。关于LinkedHashMap详解请前往：[理解LinkedHashMap](http://www.cnblogs.com/children/archive/2012/10/02/2710624.html)

![](https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/algorithms/lru-cache.png)

<!-- more -->

#### LruCache使用示例

LruCache的使用非常简单，我们就以图片缓存为例：

```java
int maxMemory = (int) (Runtime.getRuntime().totalMemory()/1024);
int cacheSize = maxMemory/8;
mMemoryCache = new LruCache<String,Bitmap>(cacheSize){
    @Override
    protected int sizeOf(String key, Bitmap value) {
        return value.getRowBytes()*value.getHeight()/1024;
    }
};
```

① 设置LruCache缓存的大小，一般为当前进程可用容量的1/8。
② 重写sizeOf方法，计算出要缓存的每张图片的大小。

**注意：**缓存的总容量和每个缓存对象的大小所用单位要一致。



#### LruCache的实现原理

LruCache的核心思想很好理解，就是要维护一个缓存对象列表，其中对象列表的排列方式是按照访问顺序实现的，即一直没访问的对象，将放在队尾，即将被淘汰。而最近访问的对象将放在队头，最后被淘汰。如下图所示：

![](https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/algorithms/3985563-33560a9500e72780.png)

那么这个队列到底是由谁来维护的，前面已经介绍了是由LinkedHashMap来维护。

而LinkedHashMap是由数组+双向链表的数据结构来实现的。其中双向链表的结构可以实现访问顺序和插入顺序，使得LinkedHashMap中的<key,value>对按照一定顺序排列起来。

通过下面构造函数来指定LinkedHashMap中双向链表的结构是访问顺序还是插入顺序。

```java
/**
 * Constructs a new {@code LinkedHashMap} instance with the specified
 * capacity, load factor and a flag specifying the ordering behavior.
 *
 * @param initialCapacity
 *            the initial capacity of this hash map.
 * @param loadFactor
 *            the initial load factor.
 * @param accessOrder
 *            {@code true} if the ordering should be done based on the last
 *            access (from least-recently accessed to most-recently
 *            accessed), and {@code false} if the ordering should be the
 *            order in which the entries were inserted.
 */
public LinkedHashMap(
        int initialCapacity, float loadFactor, boolean accessOrder) {
    super(initialCapacity, loadFactor);
    init();
    this.accessOrder = accessOrder;
}
```

其中`accessOrder`设置为true则为**访问顺序**，为false，则为**插入顺序**。

以具体例子解释，当设置为true时：

```java
public static final void main(String[] args) {
    LinkedHashMap<Integer, Integer> map = new LinkedHashMap<>(0, 0.75f, true);
    map.put(0, 0);
    map.put(1, 1);
    map.put(2, 2);
    map.put(3, 3);
    map.put(4, 4);
    map.put(5, 5);
    map.put(6, 6);
    map.get(1);		//访问1
    map.get(2);		//访问2

    for (Map.Entry<Integer, Integer> entry : map.entrySet()) {
        System.out.println(entry.getKey() + ":" + entry.getValue());
    }
}
```

输出结果如下：

> 0:0
> 3:3
> 4:4
> 5:5
> 6:6
> 1:1
> 2:2

即最近访问的对象会被放到队尾，然后最后输出，那么这就正好满足的LRU缓存算法的思想。**可见LruCache巧妙实现，就是利用了LinkedHashMap的这种数据结构。**

下面我们在LruCache源码中具体看看，怎么应用LinkedHashMap来实现缓存的添加，获得和删除的。



### LruCache源码分析

我们先看看成员变量有哪些：

```java
public class LruCache<K, V> {
    private final LinkedHashMap<K, V> map;

    /** Size of this cache in units. Not necessarily the number of elements. */
    private int size;	//当前cache的大小
    private int maxSize;	 //cache最大大小

    private int putCount;		//put的次数
    private int createCount;	//create的次数
    private int evictionCount;	//驱逐剔除的次数
    private int hitCount;		//命中的次数
    private int missCount;		//未命中次数

    //...省略...
}
```

构造函数如下，可以看到LruCache正是用了LinkedHashMap的`accessOrder=true`构造参数实现LRU访问顺序：

```java
public LruCache(int maxSize) {
    if (maxSize <= 0) {
        throw new IllegalArgumentException("maxSize <= 0");
    }
    this.maxSize = maxSize;
    //将LinkedHashMap的accessOrder设置为true来实现LRU顺序
    this.map = new LinkedHashMap<K, V>(0, 0.75f, true);
}
```

#### put方法

```java
public final V put(K key, V value) {
    //不可为空，否则抛出异常
    if (key == null || value == null) {
        throw new NullPointerException("key == null || value == null");
    }
  
    V previous;	//旧值
    synchronized (this) {
        putCount++;		//插入次数加1
        size += safeSizeOf(key, value);		//更新缓存的大小
        previous = map.put(key, value);
        //如果已有缓存对象，则缓存大小的值需要剔除这个旧的大小
        if (previous != null) {
            size -= safeSizeOf(key, previous);
        }
    }
  
    //entryRemoved()是个空方法，可以自行实现
    if (previous != null) {
        entryRemoved(false, key, previous, value);
    }
  
    //调整缓存大小(关键方法)
    trimToSize(maxSize);
    return previous;
}
```

可以看到put()方法并没有什么难点，重要的就是在添加过缓存对象后，调用`trimToSize()`方法，来判断缓存是否已满，如果满了就要删除近期最少使用的算法。

#### trimToSize方法

```java
public void trimToSize(int maxSize) {
    while (true) {
        K key;
        V value;
        synchronized (this) {
            //如果map为空并且缓存size不等于0或者缓存size小于0，抛出异常
            if (size < 0 || (map.isEmpty() && size != 0)) {
                throw new IllegalStateException(getClass().getName()
                        + ".sizeOf() is reporting inconsistent results!");
            }
          
            //如果缓存大小size小于最大缓存，或者map为空，则不需要再删除缓存对象，跳出循环
            if (size <= maxSize || map.isEmpty()) {
                break;
            }
          
            //迭代器获取第一个对象，即队头的元素，近期最少访问的元素
            Map.Entry<K, V> toEvict = map.entrySet().iterator().next();
            key = toEvict.getKey();
            value = toEvict.getValue();
            //删除该对象，并更新缓存大小
            map.remove(key);
            size -= safeSizeOf(key, value);
            evictionCount++;
        }
        entryRemoved(true, key, value, null);
    }
}
```

`trimToSize()`方法不断地删除`LinkedHashMap`中队头的元素，即近期最少访问的，直到缓存大小小于最大值。

当调用LruCache的`get()`方法获取集合中的缓存对象时，就代表访问了一次该元素，将会更新队列，保持整个队列是按照访问顺序排序。这个更新过程就是在`LinkedHashMap`中的`get()`方法中完成的。

我们先看LruCache的get()方法。

#### get方法

```java
//LruCache的get()方法
public final V get(K key) {
    if (key == null) {
        throw new NullPointerException("key == null");
    }

    V mapValue;
    synchronized (this) {
        //获取对应的缓存对象
        //LinkedHashMap的get()方法会实现将访问的元素更新到队列尾部的功能
        mapValue = map.get(key);
      
        //mapValue不为空表示命中，hitCount+1并返回mapValue对象
        if (mapValue != null) {
            hitCount++;
            return mapValue;
        }
        missCount++;	//未命中
    }

    /*
     * Attempt to create a value. This may take a long time, and the map
     * may be different when create() returns. If a conflicting value was
     * added to the map while create() was working, we leave that value in
     * the map and release the created value.
     * 如果未命中，则试图创建一个对象，这里create方法默认返回null,并没有实现创建对象的方法。
     * 如果需要事项创建对象的方法可以重写create方法。因为图片缓存时内存缓存没有命中会去
     * 文件缓存中去取或者从网络下载，所以并不需要创建，下面的就不用看了。
     */

    V createdValue = create(key);
    if (createdValue == null) {
        return null;
    }
	
    //假如创建了新的对象，则继续往下执行
    synchronized (this) {
        createCount++;
        //将createdValue加入到map中，并且将原来键为key的对象保存到mapValue
        mapValue = map.put(key, createdValue);

        if (mapValue != null) {
            // There was a conflict so undo that last put
            //如果mapValue不为空，则撤销上一步的put操作。
            map.put(key, mapValue);
        } else {
            //加入新创建的对象之后需要重新计算size大小
            size += safeSizeOf(key, createdValue);
        }
    }

    if (mapValue != null) {
        entryRemoved(false, key, createdValue, mapValue);
        return mapValue;
    } else {
        //每次新加入对象都需要调用trimToSize方法看是否需要回收
        trimToSize(maxSize);
        return createdValue;
    }
}
```

其中LinkedHashMap的get()方法如下：

```java
//LinkedHashMap中的get方法
public V get(Object key) {
    Node<K,V> e;
    if ((e = getNode(hash(key), key)) == null)
        return null;
    //实现排序的关键方法
    if (accessOrder)
        afterNodeAccess(e);
    return e.value;
}
```

调用的afterNodeAccess()方法将该元素移到队尾，保证最后才删除，如下：

```java
void afterNodeAccess(Node<K,V> e) { // move node to last
    LinkedHashMap.Entry<K,V> last;
    if (accessOrder && (last = tail) != e) {
        LinkedHashMap.Entry<K,V> p =
            (LinkedHashMap.Entry<K,V>)e, b = p.before, a = p.after;
        p.after = null;
        if (b == null)
            head = a;
        else
            b.after = a;
        if (a != null)
            a.before = b;
        else
            last = b;
        if (last == null)
            head = p;
        else {
            p.before = last;
            last.after = p;
        }
        //当前节点p移动到尾部之后，尾部指针指向当前节点
        tail = p;
        ++modCount;
    }
}
```

由此可见`LruCache`中维护了一个集合`LinkedHashMap`，该`LinkedHashMap`是以访问顺序排序的。当调用`put()`方法时，就会在结合中添加元素，并调用`trimToSize()`判断缓存是否已满，如果满了就用`LinkedHashMap`的迭代器删除队头元素，即近期最少访问的元素。当调用get()方法访问缓存对象时，就会调用`LinkedHashMap`的`get()`方法获得对应集合元素，同时会更新该元素到队尾。

以上便是LruCache实现的原理，理解了LinkedHashMap的数据结构就能理解整个原理。如果不懂，可以先看看LinkedHashMap的具体实现。



### 参考资料

- [内存缓存LruCache实现原理](http://www.cnblogs.com/liuling/p/2015-9-24-1.html)
- [彻底解析Android缓存机制——LruCache](https://www.jianshu.com/p/b49a111147ee)
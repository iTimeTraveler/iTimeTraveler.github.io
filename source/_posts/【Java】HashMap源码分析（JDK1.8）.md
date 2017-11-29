---
title: 【Java】HashMap源码分析（JDK1.8）
layout: post
date: 2017-11-25 22:20:55
comments: true
tags: 
    - Java
categories: 
    - Java
keywords: HashMap 
description: 
photos:
    - https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/java-common/java.util.map_class.png
---



### 前言

Java为数据结构中的映射定义了一个接口java.util.Map，此接口主要有四个常用的实现类，分别是`HashMap`、`Hashtable`、`LinkedHashMap`和`TreeMap`，类继承关系如下图所示：

![](https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/java-common/java.util.map_class.png)

下面针对各个实现类的特点做一些说明：

(1) **HashMap**：它根据键的hashCode值存储数据，大多数情况下可以直接定位到它的值，因而具有很快的访问速度，但遍历顺序却是不确定的。 HashMap最多只允许一条记录的键为null，允许多条记录的值为null。HashMap非线程安全，即任一时刻可以有多个线程同时写HashMap，可能会导致数据的不一致。如果需要满足线程安全，可以用 Collections的synchronizedMap方法使HashMap具有线程安全的能力，或者使用ConcurrentHashMap。

(2) **Hashtable**：Hashtable是遗留类，很多映射的常用功能与HashMap类似，不同的是它继承自Dictionary类，并且是线程安全的，任一时间只有一个线程能写Hashtable，并发性不如**ConcurrentHashMap**，因为ConcurrentHashMap引入了分段锁。Hashtable不建议在新代码中使用，不需要线程安全的场合可以用HashMap替换，需要线程安全的场合可以用ConcurrentHashMap替换。

(3) **LinkedHashMap**：LinkedHashMap是HashMap的一个子类，保存了记录的插入顺序，在用Iterator遍历LinkedHashMap时，先得到的记录肯定是先插入的，也可以在构造时带参数，按照访问次序排序。

(4) **TreeMap**：TreeMap实现SortedMap接口，能够把它保存的记录根据键排序，默认是按键值的升序排序，也可以指定排序的比较器，当用Iterator遍历TreeMap时，得到的记录是排过序的。如果使用排序的映射，建议使用TreeMap。在使用TreeMap时，key必须实现Comparable接口或者在构造TreeMap传入自定义的Comparator，否则会在运行时抛出java.lang.ClassCastException类型的异常。

对于上述四种Map类型的类，要求映射中的key是不可变对象。不可变对象是该对象在创建后它的哈希值不会被改变。如果对象的哈希值发生变化，Map对象很可能就定位不到映射的位置了。

通过上面的比较，我们知道了HashMap是Java的Map家族中一个普通成员，鉴于它可以满足大多数场景的使用条件，所以是使用频度最高的一个。下文我们主要结合源码，从存储结构、常用方法分析、扩容以及安全性等方面深入讲解HashMap的工作原理。

<!-- more -->

### 源码分析

HashMap是Java基本功，JDK1.8又对HashMap进行了优化。

#### 存储结构Node类

JDK 1.8 以前 HashMap 的实现是 数组+链表，即使哈希函数取得再好，也很难达到元素百分百均匀分布。当 HashMap 中有大量的元素都存放到同一个桶中时，这个桶下有一条长长的链表，这个时候 HashMap 就相当于一个单链表，假如单链表有 n 个元素，遍历的时间复杂度就是 O(n)，完全失去了它的优势。

针对这种情况，JDK 1.8 中引入了 红黑树（查找时间复杂度为 O(logn)）来优化这个问题。

![](https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/java-common/hashMap内存结构图.png)

从源码可知，HashMap类中有一个非常重要的字段，就是 Node[] table，即哈希桶数组，明显它是一个Node的数组。我们来看Node[JDK1.8]是何物。

```java
static class Node<K,V> implements Map.Entry<K,V> {
    final int hash;    //用来定位数组索引位置
    final K key;
    V value;
    Node<K,V> next;   //链表的下一个node

    Node(int hash, K key, V value, Node<K,V> next) {
        this.hash = hash;
        this.key = key;
        this.value = value;
        this.next = next;
    }

    public final K getKey()        { return key; }
    public final V getValue()      { return value; }
    public final String toString() { return key + "=" + value; }

    public final int hashCode() {
        return Objects.hashCode(key) ^ Objects.hashCode(value);
    }

    public final V setValue(V newValue) {
        V oldValue = value;
        value = newValue;
        return oldValue;
    }

    public final boolean equals(Object o) {
        if (o == this)
            return true;
        if (o instanceof Map.Entry) {
            Map.Entry<?,?> e = (Map.Entry<?,?>)o;
            if (Objects.equals(key, e.getKey()) &&
                Objects.equals(value, e.getValue()))
                return true;
        }
        return false;
    }
}
```

Node是HashMap的一个内部类，实现了Map.Entry接口，本质是就是一个映射(键值对)。上图中的每个黑色圆点就是一个Node对象。

红黑树TreeNode结构：

```java
static final class TreeNode<K,V> extends LinkedHashMap.Entry<K,V> {
    TreeNode<K,V> parent;  // red-black tree links
    TreeNode<K,V> left;
    TreeNode<K,V> right;
    TreeNode<K,V> prev;    // needed to unlink next upon deletion
    boolean red;
    TreeNode(int hash, K key, V val, Node<K,V> next) {
        super(hash, key, val, next);
    }
  
    //...省略其他代码...
}
```

HashMap就是这样一个Entry（包括Node和TreeNode）数组，Node对象中包含键、值和hash值，next指向下一个Entry，用来处理哈希冲突。TreeNode对象包含指向父节点、子节点和前一个节点（移除对象时使用）的指针，以及表示红黑节点颜色的boolean标识。

#### 常量定义

```java
/**
 * The default initial capacity - MUST be a power of two.
 */
static final int DEFAULT_INITIAL_CAPACITY = 1 << 4; // aka 16

/**
 * The maximum capacity, used if a higher value is implicitly specified
 * by either of the constructors with arguments.
 * MUST be a power of two <= 1<<30.
 */
static final int MAXIMUM_CAPACITY = 1 << 30;

/**
 * The load factor used when none specified in constructor.
 */
static final float DEFAULT_LOAD_FACTOR = 0.75f;

/**
 * The bin count threshold for using a tree rather than list for a
 * bin.  Bins are converted to trees when adding an element to a
 * bin with at least this many nodes. The value must be greater
 * than 2 and should be at least 8 to mesh with assumptions in
 * tree removal about conversion back to plain bins upon
 * shrinkage.
 */
static final int TREEIFY_THRESHOLD = 8;

/**
 * The bin count threshold for untreeifying a (split) bin during a
 * resize operation. Should be less than TREEIFY_THRESHOLD, and at
 * most 6 to mesh with shrinkage detection under removal.
 */
static final int UNTREEIFY_THRESHOLD = 6;

/**
 * The smallest table capacity for which bins may be treeified.
 * (Otherwise the table is resized if too many nodes in a bin.)
 * Should be at least 4 * TREEIFY_THRESHOLD to avoid conflicts
 * between resizing and treeification thresholds.
 */
static final int MIN_TREEIFY_CAPACITY = 64;
```



- **默认容量** - `DEFAULT_INITIAL_CAPACITY` ：默认初始化的容量为16，必须是2的幂。 
- **最大容量** - `MAXIMUM_CAPACITY`：最大容量是2^30 
- **装载因子** - `DEFAULT_LOAD_FACTOR`：默认的装载因子是0.75，用于判断是否需要扩容 
- **链表转换成树的阈值** - `TREEIFY_THRESHOLD`：一个桶中Entry（或称为Node）的存储方式由链表转换成树的阈值。即当桶中Entry的数量超过此值时使用红黑树来代替链表。默认值是8 
- **树转还原成链表的阈值** - `UNTREEIFY_THRESHOLD`：当执行resize操作时，当桶中Entry的数量少于此值时使用链表来代替树。默认值是6 
- **最小树形化容量** - `MIN_TREEIFY_CAPACITY`：当哈希表中的容量大于这个值时，表中的桶才能进行树形化。否则桶内元素太多时会扩容，而不是树形化。为了避免进行扩容、树形化选择的冲突，这个值不能小于` 4 * TREEIFY_THRESHOLD`



#### 属性

```java
transient Node<K,V>[] table; // 哈希桶数组bucket

transient Set<Map.Entry<K,V>> entrySet; // entry缓存Set

transient int size; // 元素个数

transient int modCount; // 修改次数

int threshold; // 阈值，等于装载因子*容量，当实际大小超过阈值则进行扩容

final float loadFactor; // 装载因子，默认值为0.75
```

其中loadFactor装载因子用来衡量HashMap满的程度。loadFactor的默认值为0.75f。计算HashMap的实时装载因子的方法为：`size/capacity`，**也就是HashMap所有Entry的总数量/HashMap中桶的数量**。而不是占用桶的数量去除以capacity。

- 若加载因子越大，填满的元素越多。好处是空间利用率高了。但是冲突的机会加大了。链表长度会越来越长,查找效率降低。
- 反之，加载因子越小，填满的元素越少。好处是冲突的机会减小了，但空间浪费多了。表中的数据将过于稀疏（很多空间还没用，就开始扩容了）

**冲突的机会越大，则查找的成本越高。**因此，必须在 "冲突的机会"与"空间利用率"之间寻找一种平衡与折衷。这种平衡与折衷本质上是数据结构中有名的"时间-空间"矛盾的平衡与折衷。如果机器内存足够，并且想要提高查询速度的话可以将加载因子设置小一点；相反如果机器内存紧张，并且对查询速度没有什么要求的话可以将加载因子设置大一点。不过一般我们都不用去设置它，让它取默认值0.75就好了。

#### 构造方法

```java
/**
 * 根据初始化容量和负载因子构建一个空的HashMap.
 */
public HashMap(int initialCapacity, float loadFactor) {
    if (initialCapacity < 0)
        throw new IllegalArgumentException("Illegal initial capacity: " +
                                           initialCapacity);
    if (initialCapacity > MAXIMUM_CAPACITY)
        initialCapacity = MAXIMUM_CAPACITY;
    if (loadFactor <= 0 || Float.isNaN(loadFactor))
        throw new IllegalArgumentException("Illegal load factor: " +
                                           loadFactor);
    this.loadFactor = loadFactor;
    //注意此处的tableSizeFor方法
    this.threshold = tableSizeFor(initialCapacity);
}

/**
 * 使用初始化容量和默认加载因子(0.75).
 */
public HashMap(int initialCapacity) {
    this(initialCapacity, DEFAULT_LOAD_FACTOR);
}

/**
 * 使用默认初始化大小(16)和默认加载因子(0.75).
 */
public HashMap() {
    this.loadFactor = DEFAULT_LOAD_FACTOR; // all other fields defaulted
}

/**
 * 用已有的Map构造一个新的HashMap.
 */
public HashMap(Map<? extends K, ? extends V> m) {
    this.loadFactor = DEFAULT_LOAD_FACTOR;
    putMapEntries(m, false);
}
```

通过重载方法HashMap传入两个参数：1. 初始化容量；2. 装载因子。那么就介绍下几个名词：

1. capacity：表示的是hashmap中桶的数量，初始化容量initCapacity为16，第一次扩容会扩到64，之后每次扩容都是之前容量的2倍，所以容量每次都是2的次幂。

2. loadFactor：装载因子，衡量hashmap一个满的程度，初始化为0.75

3. threshold：hashmap扩容的一个阈值标准，每当size大于这个阈值时就会进行扩容操作，threeshold等于`capacity*loadfactor`

#### tableSizeFor()方法

这个方法被调用的地方在上面构造函数中，当传入一个初始容量时，会调用`this.threshold = tableSizeFor(initialCapacity);`计算扩容阈值。那它是究竟干了什么的呢？tableSizeFor的功能（不考虑大于最大容量的情况）是返回**大于输入参数且最近的2的整数次幂的数**。比如10，则返回16。该算法源码如下：

```java
/**
 * Returns a power of two size for the given target capacity.
 */
static final int tableSizeFor(int cap) {
    int n = cap - 1;
    n |= n >>> 1;
    n |= n >>> 2;
    n |= n >>> 4;
    n |= n >>> 8;
    n |= n >>> 16;
    return (n < 0) ? 1 : (n >= MAXIMUM_CAPACITY) ? MAXIMUM_CAPACITY : n + 1;
}
```

我们来分析有关n位操作部分：先来假设n的二进制为01xxx...xxx。接着

> 对n右移1位：`001xx...xxx`，再位或：`011xx...xxx`
> 对n右移2为：`00011...xxx`，再位或：`01111...xxx`
> 此时前面已经有四个1了，再右移4位且位或可得8个1
> 同理，有8个1，右移8位肯定会让后八位也为1。
> 综上可得，该算法让最高位的1后面的位全变为1。
> 最后再让结果n+1，即得到了2的整数次幂的值了。

现在回来看看第一条语句：

```java
int n = cap - 1;
```

让cap-1再赋值给n的目的是另找到的目标值大于或**等于**原值。例如二进制1000，十进制数值为8。如果不对它减1而直接操作，将得到答案10000，即16。显然不是结果。减1后二进制为111，再进行操作则会得到原来的数值1000，即8。

举一个例子说明下吧。比如cap=10，则返回16。 

![](https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/java-common/20160408183651111.jpg)

由此可以看到，当在实例化HashMap实例时，如果给定了initialCapacity，由于HashMap的容量capacity都是2的幂，因此这个方法用于找到大于等于initialCapacity的最小的2的幂（initialCapacity如果就是2的幂，则返回的还是这个数）。 

#### put()方法

JDK1.8对哈希碰撞后的拉链算法进行了优化， 当链表上Entry数量太多（超过8个）时，将链表重构为红黑树。下面是源码相关的注释：

```java
public V put(K key, V value) {
    return putVal(hash(key), key, value, false, true);
}


/**
 * Implements Map.put and related methods
 *
 * @param hash hash for key
 * @param key the key
 * @param value the value to put
 * @param onlyIfAbsent if true, don't change existing value
 * @param evict if false, the table is in creation mode.
 * @return previous value, or null if none
 */
final V putVal(int hash, K key, V value, boolean onlyIfAbsent,
               boolean evict) {
    Node<K,V>[] tab; 
    Node<K,V> p; 
    int n, i;

    //步骤①：如果Table为空，初始化一个Table
    if ((tab = table) == null || (n = tab.length) == 0)
        n = (tab = resize()).length;

    //步骤②：如果该bucket位置没值，则直接存储到该bucket位置
    if ((p = tab[i = (n - 1) & hash]) == null)
        tab[i] = newNode(hash, key, value, null);
    else {
        Node<K,V> e; 
        K k;

        //步骤③：如果节点key存在，直接覆盖value
        if (p.hash == hash &&
            ((k = p.key) == key || (key != null && key.equals(k))))
            e = p;
        //步骤④：如果该bucket位置数据是TreeNode类型，则将新数据添加到红黑树中。
        else if (p instanceof TreeNode)
            e = ((TreeNode<K,V>)p).putTreeVal(this, tab, hash, key, value);
        else {	//步骤⑤：如果该链为链表
            for (int binCount = 0; ; ++binCount) {
                //添加到链表尾部
                if ((e = p.next) == null) {
                    p.next = newNode(hash, key, value, null);
                    if (binCount >= TREEIFY_THRESHOLD - 1) // -1 for 1st
                        treeifyBin(tab, hash);	//如果链表个数达到8个时，将链表修改为红黑树结构
                    break;
                }
                // key已经存在直接覆盖value
                if (e.hash == hash &&
                    ((k = e.key) == key || (key != null && key.equals(k))))
                    break;
                p = e;
            }
        }
        //更新键值，并返回旧值
        if (e != null) { // existing mapping for key
            V oldValue = e.value;
            if (!onlyIfAbsent || oldValue == null)
                e.value = value;
            afterNodeAccess(e);
            return oldValue;
        }
    }
    ++modCount;
    //步骤⑥：存储的数目超过最大容量阈值，就扩容
    if (++size > threshold)
        resize();
    afterNodeInsertion(evict);
    return null;
}
```

HashMap的put方法执行过程可以通过下图来理解。

![](https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/java-common/hashMapput方法执行流程图.png)

图中的步骤总结如下：

- ①. 判断键值对数组table[i]是否为空或为null，否则执行resize()进行扩容；

- ②. 根据键值key计算hash值得到插入的数组索引i，如果table[i]==null，直接新建节点添加，转向⑥，如果table[i]不为空，转向③；

- ③. 判断table[i]的首个元素是否和key一样，如果相同直接覆盖value，否则转向④，这里的相同指的是hashCode以及equals；

- ④. 判断table[i] 是否为treeNode，即table[i] 是否是红黑树，如果是红黑树，则直接在树中插入键值对，否则转向⑤；

- ⑤. 遍历table[i]，判断链表长度是否大于8，大于8的话把链表转换为红黑树，在红黑树中执行插入操作，否则进行链表的插入操作；遍历过程中若发现key已经存在直接覆盖value即可；

- ⑥. 插入成功后，判断实际存在的键值对数量size是否超多了最大容量threshold，如果超过，进行扩容。

#### get()方法

```java
public V get(Object key) {
    Node<K,V> e;
    return (e = getNode(hash(key), key)) == null ? null : e.value;
}


/**
 * Implements Map.get and related methods
 *
 * @param hash hash for key
 * @param key the key
 * @return the node, or null if none
 */
final Node<K,V> getNode(int hash, Object key) {
    Node<K,V>[] tab; 	//Table桶
    Node<K,V> first, e;
    int n; 
    K k;

    //table数组不为空且length大于0，并且key的hash对应的桶第一个元素不为空时，才去get
    if ((tab = table) != null && (n = tab.length) > 0 &&
        (first = tab[(n - 1) & hash]) != null) {

        //首先判断是不是key的hash对应的桶中的第一个元素
        if (first.hash == hash && // always check first node
            ((k = first.key) == key || (key != null && key.equals(k))))
            return first;

        if ((e = first.next) != null) {
            //如果该桶的存储结构是红黑树，从树中查找并返回
            if (first instanceof TreeNode)
                return ((TreeNode<K,V>)first).getTreeNode(hash, key);

            //否则，遍历链表并返回
            do {
                if (e.hash == hash &&
                    ((k = e.key) == key || (key != null && key.equals(k))))
                    return e;
            } while ((e = e.next) != null);
        }
    }
    return null;
}
```

get()方法就相对简单了，通过hash定位桶，然后根据该桶的存储结构决定是遍历红黑树还是遍历链表。

#### hash()方法

```java
//java 8中的散列值优化函数 
static final int hash(Object key) {
    int h;
    return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}

//java 7中的散列函数
static int hash(int h) {
    // This function ensures that hashCodes that differ only by
    // constant multiples at each bit position have a bounded
    // number of collisions (approximately 8 at default load factor).

    h ^= (h >>> 20) ^ (h >>> 12);
    return h ^ (h >>> 7) ^ (h >>> 4);
}
```

这段代码叫“**扰动函数**”。大家都知道上面代码里的**key.hashCode()**函数调用的是key键值类型自带的哈希函数，返回int型散列值。

理论上散列值是一个int型，如果直接拿散列值作为下标访问HashMap主数组的话，考虑到2进制32位带符号的int表值范围从**-2147483648**到**2147483648**。前后加起来大概40亿的映射空间。只要哈希函数映射得比较均匀松散，一般应用是很难出现碰撞的。但问题是一个40亿长度的数组，内存是放不下的。所以这个散列值是不能直接拿来用的。用之前还要先做对数组的长度取模运算，得到的余数才能用来访问数组下标。JDK1.8源码中模运算是这么完成的：`i = (length - 1) & hash`，而在JDK1.7中是在**indexFor( )**函数里完成的。

```java
bucketIndex = indexFor(hash, table.length);

static int indexFor(int h, int length) {
    return h & (length-1);
}
```

indexFor()的代码也很简单，就是把散列值和数组长度做一个**"与"**操作，就定位出了Key对应的桶，这个方法非常巧妙，它通过`h & (table.length -1)`来得到该对象的保存位，而HashMap底层数组的长度总是2的n次方，这是HashMap在速度上的优化。当length总是2的n次方时，`h& (length-1)`运算等价于对length取模，也就是`h%length`，但是位运算&比取模运算%具有更高的效率。

这也正好解释了为什么HashMap的数组长度要取2的整次幂。因为这样（数组长度-1）正好相当于一个“**低位掩码”。**“与”操作的结果就是散列值的高位全部归零，只保留低位值，用来做数组下标访问。以初始长度16为例，16-1=15。2进制表示是**00000000 00000000 00001111**。和某散列值做“与”操作如下，结果就是截取了最低的四位值。

```
    10100101 11000100 00100101
&	00000000 00000000 00001111
----------------------------------
	00000000 00000000 00000101    //高位全部归零，只保留末四位
```

但这时候问题就来了，这样就算我的散列值分布再松散，要是只取最后几位的话，碰撞也会很严重。更要命的是如果散列本身做得不好，分布上成等差数列的漏洞，恰好使最后几个低位呈现规律性重复，就无比蛋疼。

这时候“**扰动函数**”的价值就体现出来了，说到这里大家应该猜出来了。看下面这个图，

![](https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/java-common/hashMap哈希算法例图.png)

右位移16位，正好是32bit的一半，自己的高半区和低半区做异或，就是为了**混合原始哈希码的高位和低位，以此来加大低位的随机性**。而且混合后的低位掺杂了高位的部分特征，这样高位的信息也被变相保留下来。

在JDK1.8的实现中，优化了高位运算的算法，通过hashCode()的高16位异或低16位实现的：`(h = k.hashCode()) ^ (h >>> 16)`，主要是从速度、功效、质量来考虑的，这么做可以在数组table的length比较小的时候，也能保证考虑到高低Bit都参与到Hash的计算中，同时不会有太大的开销。

#### resize()扩容方法

扩容(resize)就是重新计算容量，向HashMap对象里不停的添加元素，而HashMap对象内部的数组无法装载更多的元素时，对象就需要扩大数组的长度，以便能装入更多的元素。当然Java里的数组是无法自动扩容的，方法是使用一个新的数组代替已有的容量小的数组。

```java
final Node<K,V>[] resize() {
    Node<K,V>[] oldTab = table;
    int oldCap = (oldTab == null) ? 0 : oldTab.length;
    int oldThr = threshold;
    int newCap, newThr = 0;
    if (oldCap > 0) {
        // 超过最大值就不再扩充了，就只好随你碰撞去吧
        if (oldCap >= MAXIMUM_CAPACITY) {
            threshold = Integer.MAX_VALUE;
            return oldTab;
        }
        // 没超过最大值，就扩充为原来的2倍
        else if ((newCap = oldCap << 1) < MAXIMUM_CAPACITY &&
                 oldCap >= DEFAULT_INITIAL_CAPACITY)
            newThr = oldThr << 1; // double threshold
    }
    else if (oldThr > 0) // initial capacity was placed in threshold
        newCap = oldThr;
    else {               // zero initial threshold signifies using defaults
        newCap = DEFAULT_INITIAL_CAPACITY;
        newThr = (int)(DEFAULT_LOAD_FACTOR * DEFAULT_INITIAL_CAPACITY);
    }
    // 设置新的resize上限
    if (newThr == 0) {

        float ft = (float)newCap * loadFactor;
        newThr = (newCap < MAXIMUM_CAPACITY && ft < (float)MAXIMUM_CAPACITY ?
                  (int)ft : Integer.MAX_VALUE);
    }
    threshold = newThr;
    @SuppressWarnings({"rawtypes"，"unchecked"})
        Node<K,V>[] newTab = (Node<K,V>[])new Node[newCap];
    table = newTab;
    if (oldTab != null) {
        // 把每个bucket都移动到新的buckets中
        for (int j = 0; j < oldCap; ++j) {
            Node<K,V> e;
            if ((e = oldTab[j]) != null) {
                oldTab[j] = null;
                if (e.next == null)  //如果该桶只有一个数据，则散列到当前位置或者（原位置+oldCap）位置
                    newTab[e.hash & (newCap - 1)] = e;
                else if (e instanceof TreeNode)  //红黑树重构
                    ((TreeNode<K,V>)e).split(this, newTab, j, oldCap);
                else { // 链表优化重hash的代码块
                    Node<K,V> loHead = null, loTail = null;
                    Node<K,V> hiHead = null, hiTail = null;
                    Node<K,V> next;
                    do {
                        next = e.next;
                        // 原索引
                        if ((e.hash & oldCap) == 0) {
                            if (loTail == null)
                                loHead = e;
                            else
                                loTail.next = e;
                            loTail = e;
                        } else {  // 原索引+oldCap
                            if (hiTail == null)
                                hiHead = e;
                            else
                                hiTail.next = e;
                            hiTail = e;
                        }
                    } while ((e = next) != null);
                    // 原索引放到bucket里
                    if (loTail != null) {
                        loTail.next = null;
                        newTab[j] = loHead;
                    }
                    // 原索引+oldCap放到bucket里
                    if (hiTail != null) {
                        hiTail.next = null;
                        newTab[j + oldCap] = hiHead;
                    }
                }
            }
        }
    }
    return newTab;
}
```



下面举个例子说明下扩容过程。假设了我们的hash算法就是简单的用key mod 一下表的大小（也就是数组的长度）。其中的哈希桶数组table的size=2， 所以key = 3、7、5，put顺序依次为 5、7、3。在mod 2以后都冲突在table[1]这里了。这里假设负载因子 loadFactor=1，即当Entry的实际数量size 大于桶table的实际数量时进行扩容。接下来的三个步骤是哈希桶数组 resize成4，然后所有的Node重新rehash的过程。

![](https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/java-common/jdk1.7扩容例图.png)

在JDK1.8中我们可以发现，我们使用的是2次幂的扩展(指长度扩为原来2倍)，所以，元素的位置要么是在原位置，要么是在原位置再移动2次幂的位置。看下图可以明白这句话的意思，n为table的长度，图（a）表示扩容前的key1和key2两种key确定索引位置的示例，图（b）表示扩容后key1和key2两种key确定索引位置的示例，其中hash1是key1对应的哈希与高位运算结果。

![](https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/java-common/hashMap1.8哈希算法例图1.png)

元素在重新计算hash之后，因为n变为2倍，那么n-1的mask范围在高位多1bit(红色)，因此新的index就会发生这样的变化：

![](https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/java-common/hashMap1.8哈希算法例图2.png)

因此，我们在扩充HashMap的时候，不需要像JDK1.7的实现那样重新计算hash，只需要看看原来的hash值新增的那个bit是1还是0就好了，是0的话索引没变，是1的话索引变成“**原索引+oldCap**”，可以看看下图为16扩充为32的resize示意图：

![](https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/java-common/jdk1.8hashMap扩容例图.png)

这个设计确实非常的巧妙，既省去了重新计算hash值的时间，而且同时，由于新增的1bit是0还是1可以认为是随机的，因此resize的过程，均匀的把之前的冲突的节点分散到新的bucket了。这一块就是JDK1.8新增的优化点。有一点注意区别，JDK1.7中rehash的时候，旧链表迁移新链表的时候，如果在新表的数组索引位置相同，则链表元素会倒置，但是从上图可以看出，JDK1.8不会倒置。下面是JDK1.7的扩容方法：

```java
/**
 * JDK 1.7中的resize()方法
 */
void resize(int newCapacity) {   //传入新的容量
    Entry[] oldTable = table;    //引用扩容前的Entry数组
    int oldCapacity = oldTable.length;         
    if (oldCapacity == MAXIMUM_CAPACITY) {  //扩容前的数组大小如果已经达到最大(2^30)了
        threshold = Integer.MAX_VALUE; //修改阈值为int的最大值(2^31-1)，这样以后就不会扩容了
        return;
    }
 
    Entry[] newTable = new Entry[newCapacity];  //初始化一个新的Entry数组
    transfer(newTable);                         //！！将数据转移到新的Entry数组里
    table = newTable;                           //HashMap的table属性引用新的Entry数组
    threshold = (int)(newCapacity * loadFactor);//修改阈值
}


//transfer()方法将原有Entry数组的元素拷贝到新的Entry数组里。
void transfer(Entry[] newTable) {
    Entry[] src = table;                   //src引用了旧的Entry数组
    int newCapacity = newTable.length;
    for (int j = 0; j < src.length; j++) { //遍历旧的Entry数组
        Entry<K,V> e = src[j];             //取得旧Entry数组的每个元素
        if (e != null) {
            src[j] = null;//释放旧Entry数组的对象引用（for循环后，旧的Entry数组不再引用任何对象）
            do {
                Entry<K,V> next = e.next;
                int i = indexFor(e.hash, newCapacity); //！！重新计算每个元素在数组中的位置
                e.next = newTable[i]; //标记[1]
                newTable[i] = e;      //将元素放在数组上
                e = next;             //访问下一个Entry链上的元素
            } while (e != null);
        }
    }
}
```

这里就是使用一个容量更大的数组来代替已有的容量小的数组，transfer()方法将原有Entry数组的元素拷贝到新的Entry数组里。newTable[i]的引用赋给了e.next，也就是使用了单链表的头插入方式，同一位置上新元素总会被放在链表的头部位置；这样先放在一个索引上的元素终会被放到Entry链的尾部(如果发生了hash冲突的话），这一点和Jdk1.8有区别，下文详解。在旧数组中同一条Entry链上的元素，通过重新计算索引位置后，有可能被放到了新数组的不同位置上。



#### 树形化方法treeifyBin()

在Java 8 中，如果一个桶中的链表元素个数超过 TREEIFY_THRESHOLD（默认是 8 ），就使用红黑树来替换链表，从而提高速度。这个替换的方法叫 treeifyBin() 即树形化。

```java
//将桶内所有的 链表节点 替换成 红黑树节点
final void treeifyBin(Node[] tab, int hash) {
    int n, index; Node e;
    //如果当前哈希表为空，或者哈希表中Entry元素总数量小于进行树形化的阈值(默认为 64)，就去新建/扩容
    if (tab == null || (n = tab.length) < MIN_TREEIFY_CAPACITY)
        resize();
    else if ((e = tab[index = (n - 1) & hash]) != null) {
        //如果哈希表中的元素个数超过了树形化阈值，进行树形化
        // e 是哈希表中指定位置桶里的链表节点，从第一个开始
        TreeNode hd = null, tl = null; //红黑树的头、尾节点
        do {
            //新建一个树形节点，内容和当前链表节点 e 一致
            TreeNode p = replacementTreeNode(e, null);
            if (tl == null) //确定树头节点
                hd = p;
            else {
                p.prev = tl;
                tl.next = p;
            }
            tl = p;
        } while ((e = e.next) != null);  
        //让桶的第一个元素指向新建的红黑树头结点，以后这个桶里的元素就是红黑树而不是链表了
        if ((tab[index] = hd) != null)
            hd.treeify(tab);
    }
}


TreeNode replacementTreeNode(Node p, Node next) {
    return new TreeNode<>(p.hash, p.key, p.value, next);
}
```

上述操作做了这些事:

- 根据哈希表中元素个数确定是扩容还是树形化
- 如果是树形化
  - 遍历桶中的元素，创建相同个数的树形节点，复制内容，建立起联系
  - 然后让桶第一个元素指向新建的树头结点，替换桶的链表内容为树形内容

但是我们发现，之前的操作并没有设置红黑树的颜色值，现在得到的只能算是个二叉树。在 最后调用树形root节点 `hd.treeify(tab) `方法进行塑造红黑树，来看看代码：

```java
final void treeify(Node<K,V>[] tab) {
    TreeNode<K,V> root = null;
    for (TreeNode<K,V> x = this, next; x != null; x = next) {
        next = (TreeNode<K,V>)x.next;
        x.left = x.right = null;
        if (root == null) {  //第一次进入循环，确定root根结点，为黑色
            x.parent = null;
            x.red = false;
            root = x;
        }
        else {   //非第一次进入循环，x指向树中的某个节点
            K k = x.key;
            int h = x.hash;
            Class<?> kc = null;
            //从根节点开始，遍历所有节点跟当前节点 x 比较，调整位置
            for (TreeNode<K,V> p = root;;) {
                int dir, ph;
                K pk = p.key;
                if ((ph = p.hash) > h)  //当比较节点p的哈希值比 x 大时， dir为-1
                    dir = -1;
                else if (ph < h)   //哈希值比 x 小时，dir为1
                    dir = 1;
                else if ((kc == null &&
                          (kc = comparableClassFor(k)) == null) ||
                         (dir = compareComparables(kc, k, pk)) == 0)
                    dir = tieBreakOrder(k, pk);

                //把当前节点p变成 x 的父亲
                TreeNode<K,V> xp = p;
                
                //如果当前比较节点p的哈希值比 x 大，x 就是左孩子，否则 x 是右孩子 
                if ((p = (dir <= 0) ? p.left : p.right) == null) {
                    x.parent = xp;
                    if (dir <= 0)
                        xp.left = x;
                    else
                        xp.right = x;
                    //平衡操作
                    root = balanceInsertion(root, x);
                    break;
                }
            }
        }
    }
    moveRootToFront(tab, root);
}
```

可以看到，将二叉树变为红黑树时，需要保证有序。这里有个双重循环，拿树中的所有节点和当前节点的哈希值进行对比(如果哈希值相等，就对比键，这里不用完全有序），然后根据比较结果确定在树中的位置。

#### remove()方法

```java
public V remove(Object key) {
    Node<K,V> e;
    return (e = removeNode(hash(key), key, null, false, true)) == null ?
        null : e.value;
}


final Node<K,V> removeNode(int hash, Object key, Object value,
                           boolean matchValue, boolean movable) {
    Node<K,V>[] tab; //所有的桶
    Node<K,V> p;   //对应桶的第一个元素
    int n, index;  //桶数量，对应桶的次序
    if ((tab = table) != null && (n = tab.length) > 0 &&
        (p = tab[index = (n - 1) & hash]) != null) {
        Node<K,V> node = null, e; 
        K k; 
        V v;
      
        //要删除的元素如果刚好匹配该桶中的第一个元素
        if (p.hash == hash &&
            ((k = p.key) == key || (key != null && key.equals(k))))
            node = p;
        //如果不是桶中的第一个元素，往下遍历
        else if ((e = p.next) != null) {
            if (p instanceof TreeNode)
                node = ((TreeNode<K,V>)p).getTreeNode(hash, key);
            else {
                do {
                    if (e.hash == hash &&
                        ((k = e.key) == key ||
                         (key != null && key.equals(k)))) {
                        node = e;
                        break;
                    }
                    p = e;
                } while ((e = e.next) != null);
            }
        }
        //找到要删除的元素之后，删除
        if (node != null && (!matchValue || (v = node.value) == value ||
                             (value != null && value.equals(v)))) {
            if (node instanceof TreeNode)  //红黑树中删除
                ((TreeNode<K,V>)node).removeTreeNode(this, tab, movable);
            else if (node == p)     //是该桶中链表首节点删除
                tab[index] = node.next;
            else
                p.next = node.next;
            ++modCount;
            --size;
            afterNodeRemoval(node);
            return node;
        }
    }
    return null;
}
```

remove()方法也很简单，这里就不展开讲了。`clear()`方法如下：

```java
//清空所有元素
public void clear() {
    Node<K,V>[] tab;
    modCount++;
    if ((tab = table) != null && size > 0) {
        size = 0;
        //仅清空桶数组的引用
        for (int i = 0; i < tab.length; ++i)
            tab[i] = null;   // 把哈希数组中所有位置都赋为null
    }
}
```



### **线程安全性**

一直以来只是知道HashMap是线程不安全的，但是到底HashMap为什么线程不安全，多线程并发的时候在什么情况下可能出现问题？

javadoc中关于hashmap的一段描述如下：

> **此实现不是同步的。**如果多个线程同时访问一个哈希映射，而其中至少一个线程从结构上修改了该映射，则它*必须* 保持外部同步。（结构上的修改是指添加或删除一个或多个映射关系的任何操作；仅改变与实例已经包含的键关联的值不是结构上的修改。）这一般通过对自然封装该映射的对象进行同步操作来完成。如果不存在这样的对象，则应该使用 `Collections.synchronizedMap()` 方法来“包装”该映射。最好在创建时完成这一操作，以防止对映射进行意外的非同步访问，如下所示：

```java
Map m = Collections.synchronizedMap(new HashMap(...));
```

1. **多线程put后可能导致get死循环**

   问题原因就是HashMap是非线程安全的，多个线程put的时候造成了某个key值Entry key List的死循环，问题就这么产生了。参考：[HashMap多线程并发问题分析](https://my.oschina.net/xianggao/blog/393990#OSC_h2_1)

2. **多线程put的时候可能导致元素丢失**

   如果两个线程都put()时，使用`p.next = newNode(hash, key, value, null);`同时取得了p，则他们下一个元素都是newNode，然后赋值给table元素的时候有一个成功有一个丢失。


> 注意：不合理使用HashMap导致出现的是死循环而不是死锁。







### 小结

到这里，你能回答出如下问题吗？  

1、哈希基本原理？（答：散列表、hash碰撞、链表、**红黑树**）
2、hashmap查询的时间复杂度， 影响因素和原理？ （答：最好O（1），最差O（n）， 如果是**红黑O（logn）**）
3、resize如何实现的， 记住已经没有rehash了！！！（答：拉链entry根据高位bit散列到当前位置i和size+i位置）
4、为什么获取下标时用按位与&，而不是取模%？ （答：不只是&速度更快哦，  我觉得你能答上来便真正理解hashmap了）



#### 说明

(1) 扩容是一个特别耗性能的操作，所以当程序员在使用HashMap的时候，估算map的大小，初始化的时候给一个大致的数值，避免map进行频繁的扩容。
(2) 负载因子是可以修改的，也可以大于1，但是建议不要轻易修改，除非情况非常特殊。
(3) HashMap是线程不安全的，不要在并发的环境中同时操作HashMap，建议使用ConcurrentHashMap。
(4) JDK1.8引入红黑树大程度优化了HashMap的性能。
(5) JDK1.7是新插入的节点放在链表的头部，但是JDK1.8是新插入的节点放到尾部



### 参考资料

- [面试旧敌之 HashMap : JDK 1.8 后它通过什么提升性能](https://juejin.im/entry/5839ad0661ff4b007ec7cc7a)
- [HashMap中capacity、loadFactor、threshold、size等概念的解释](http://blog.csdn.net/fan2012huan/article/details/51087722)
- [Java源码分析之HashMap(JDK1.8)](http://blog.csdn.net/u014026363/article/details/56342142)
- [HashMap源码分析（JDK1.8）- 你该知道的都在这里了](http://blog.csdn.net/brycegao321/article/details/52527236)
- [Java集合：HashMap源码剖析](http://www.cnblogs.com/ITtangtang/p/3948406.html)
- [Java 8系列之重新认识HashMap](https://tech.meituan.com/java-hashmap.html) - 美团点评技术团队
- [JDK源码中HashMap的hash方法原理是什么？](https://www.zhihu.com/question/20733617) - 知乎
- [HashMap源码之hash()函数分析（JDK 1.8）](http://blog.csdn.net/anxpp/article/details/51234835)
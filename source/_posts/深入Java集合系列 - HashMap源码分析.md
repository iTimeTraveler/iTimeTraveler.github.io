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
    - /gallery/java-common/map-interface.png
---



### 前言

Java为数据结构中的映射定义了一个接口java.util.Map，此接口主要有四个常用的实现类，分别是`HashMap`、`Hashtable`、`LinkedHashMap`和`TreeMap`，类继承关系如下图所示：

![](/gallery/java-common/java.util.map_class.png)

下面针对各个实现类的特点做一些说明：

(1) **HashMap**：它根据键的hashCode值存储数据，大多数情况下可以直接定位到它的值，因而具有很快的访问速度，但遍历顺序却是不确定的。 HashMap最多只允许一条记录的键为null，允许多条记录的值为null。HashMap非线程安全，即任一时刻可以有多个线程同时写HashMap，可能会导致数据的不一致。如果需要满足线程安全，可以用 Collections的synchronizedMap方法使HashMap具有线程安全的能力，或者使用ConcurrentHashMap。

(2) **Hashtable**：Hashtable是遗留类，很多映射的常用功能与HashMap类似，不同的是它继承自Dictionary类，并且是线程安全的，任一时间只有一个线程能写Hashtable，并发性不如**ConcurrentHashMap**，因为ConcurrentHashMap引入了分段锁。Hashtable不建议在新代码中使用，不需要线程安全的场合可以用HashMap替换，需要线程安全的场合可以用ConcurrentHashMap替换。

(3) **LinkedHashMap**：LinkedHashMap是HashMap的一个子类，保存了记录的插入顺序，在用Iterator遍历LinkedHashMap时，先得到的记录肯定是先插入的，也可以在构造时带参数，按照访问次序排序。

(4) **TreeMap**：TreeMap实现SortedMap接口，能够把它保存的记录根据键排序，默认是按键值的升序排序，也可以指定排序的比较器，当用Iterator遍历TreeMap时，得到的记录是排过序的。如果使用排序的映射，建议使用TreeMap。在使用TreeMap时，key必须实现Comparable接口或者在构造TreeMap传入自定义的Comparator，否则会在运行时抛出java.lang.ClassCastException类型的异常。

对于上述四种Map类型的类，要求映射中的key是不可变对象。不可变对象是该对象在创建后它的哈希值不会被改变。如果对象的哈希值发生变化，Map对象很可能就定位不到映射的位置了。

通过上面的比较，我们知道了HashMap是Java的Map家族中一个普通成员，鉴于它可以满足大多数场景的使用条件，所以是使用频度最高的一个。下文我们主要结合源码，从存储结构、常用方法分析、扩容以及安全性等方面深入讲解HashMap的工作原理。

<!-- more -->

### 源码分析

#### 存储结构Node类

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
}
```

HashMap就是这样一个Entry（包括Node和TreeNode）数组，Node对象中包含键、值和hash值，next指向下一个Entry，用来处理哈希冲突。TreeNode对象包含指向父节点、子节点和前一个节点（移除对象时使用）的指针，以及表示红黑节点的boolean标识。

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
- **树转换成链表的阈值** - `UNTREEIFY_THRESHOLD`：当执行resize操作时，当桶中Entry的数量少于此值时使用链表来代替树。默认值是6 
- `MIN_TREEIFY_CAPACITY`：当桶中的Entry被树化时最小的hash表容量。（如果没有达到这个阈值，即hash表容量小于MIN_TREEIFY_CAPACITY，当桶中Entry的数量太多时会执行resize扩容操作）这个MIN_TREEIFY_CAPACITY的值至少是TREEIFY_THRESHOLD的4倍。



#### 属性

```java
transient Node<K,V>[] table; // 哈希桶数组bucket

transient Set<Map.Entry<K,V>> entrySet; // entry缓存Set

transient int size; // 元素个数

transient int modCount; // 修改次数

int threshold; // 阈值，等于加载因子*容量，当实际大小超过阈值则进行扩容

final float loadFactor; // 加载因子，默认值为0.75
```



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

![](/gallery/java-common/hashMap put方法执行流程图.png)

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






#### hash()方法

```java
方法一：
static final int hash(Object key) {   //jdk1.8 & jdk1.7
     int h;
     // 第一步取hashCode值：h = key.hashCode()
     // 第二步高位参与运算：h ^ (h >>> 16)
     return (key == null) ? 0 : (h = key.hashCode()) ^ (h >>> 16);
}

方法二：
static int indexFor(int h, int length) {  //jdk1.7的源码，jdk1.8没有这个方法，但是实现原理一样的
     return h & (length-1);  //第三步 取模运算
}
```




#### resize()扩容方法







#### 树化方法treeifyBin()





#### 删除方法

```java
public V remove(Object key) {
    Node<K,V> e;
    return (e = removeNode(hash(key), key, null, false, true)) == null ?
        null : e.value;
}


final Node<K,V> removeNode(int hash, Object key, Object value,
                           boolean matchValue, boolean movable) {
    Node<K,V>[] tab; Node<K,V> p; int n, index;
    if ((tab = table) != null && (n = tab.length) > 0 &&
        (p = tab[index = (n - 1) & hash]) != null) {
        Node<K,V> node = null, e; K k; V v;
        if (p.hash == hash &&
            ((k = p.key) == key || (key != null && key.equals(k))))
            node = p;
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
        if (node != null && (!matchValue || (v = node.value) == value ||
                             (value != null && value.equals(v)))) {
            if (node instanceof TreeNode)
                ((TreeNode<K,V>)node).removeTreeNode(this, tab, movable);
            else if (node == p)
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


//清空所有元素
public void clear() {
    Node<K,V>[] tab;
    modCount++;
    if ((tab = table) != null && size > 0) {
        size = 0;
        for (int i = 0; i < tab.length; ++i)
            tab[i] = null;
    }
}
```









### **线程安全性**









### 总结

#### HashMap容量为什么是2的整数次幂？






ConcurrentHashMap
LinkedHashMap



### 参考资料

- [Java源码分析之HashMap(JDK1.8)](http://blog.csdn.net/u014026363/article/details/56342142)
- [HashMap源码分析（JDK1.8）- 你该知道的都在这里了](http://blog.csdn.net/brycegao321/article/details/52527236)
- [Java集合：HashMap源码剖析](http://www.cnblogs.com/ITtangtang/p/3948406.html)
- [Java 8系列之重新认识HashMap](https://tech.meituan.com/java-hashmap.html) - 美团点评技术团队
- [JDK源码中HashMap的hash方法原理是什么？](https://www.zhihu.com/question/20733617)
- [HashMap源码之hash()函数分析（JDK 1.8）](http://blog.csdn.net/anxpp/article/details/51234835)
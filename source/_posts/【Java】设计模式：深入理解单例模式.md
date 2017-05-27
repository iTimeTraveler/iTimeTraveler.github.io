---
title: 【Java】设计模式：深入理解单例模式
layout: post
date: 2016-09-08 14:18:20
comments: true
tags: [Design Pattern]
categories: 
    - Java
    - Design Pattern
keywords: Java
description: 
---


> 什么是设计模式？简单的理解就是前人留下来的一些经验总结而已，然后把这些经验起了个名字叫Design Pattern，翻译过来就是设计模式，通过使用设计模式可以让我们的代码复用性更高，可维护性更高，让你的代码写的更优雅。设计模式理论上有23种，今天就先来分享下最常用的单例模式。



### **引言**

对于单例模式，有工作经验的人基本上都使用过。面试的时候提到设计模式基本上都会提到单例模式，但是很多人对单例模式也是一知半解，当然也包括我哈哈哈=_=。所以我们有必要深入理解一下所谓的「单例模式」。


### **单例模式**

定义：**`保证一个类仅有一个实例，并提供一个访问它的全局访问点。`**

单例模式结构图： 

![](http://img.blog.csdn.net/20160908131425758)

使用单例的优点：

- 单例类只有一个实例
- 共享资源，全局使用
- 节省创建时间，提高性能


<!--more-->


### **它的七种写法**

单例模式有多种写法各有利弊，现在我们来看看各种模式写法。

#### **1、饿汉式**

```java
public class Singleton {  
     private static Singleton instance = new Singleton();  
     private Singleton (){
     }
     public static Singleton getInstance() {  
	     return instance;  
     }  
 }   
```

这种方式和名字很贴切，饥不择食，在类装载的时候就创建，不管你用不用，先创建了再说，如果一直没有被使用，便浪费了空间，典型的空间换时间，每次调用的时候，就不需要再判断，节省了运行时间。

Java Runtime就是使用这种方式，它的源代码如下：

```java
public class Runtime {
    private static Runtime currentRuntime = new Runtime();

    /**
     * Returns the runtime object associated with the current Java application.
     * Most of the methods of class <code>Runtime</code> are instance
     * methods and must be invoked with respect to the current runtime object.
     *
     * @return  the <code>Runtime</code> object associated with the current
     *          Java application.
     */
    public static Runtime getRuntime() {
        return currentRuntime;
    }

    /** Don't let anyone else instantiate this class */
    private Runtime() {}

	//以下代码省略
}
```

**总结：**「饿汉式」是最简单的实现方式，这种实现方式适合那些在初始化时就要用到单例的情况，这种方式简单粗暴，如果单例对象初始化非常快，而且占用内存非常小的时候这种方式是比较合适的，可以直接在应用启动时加载并初始化。

但是，如果单例初始化的操作耗时比较长而应用对于启动速度又有要求，或者单例的占用内存比较大，再或者单例只是在某个特定场景的情况下才会被使用，而一般情况下是不会使用时，使用「饿汉式」的单例模式就是不合适的，这时候就需要用到「懒汉式」的方式去按需延迟加载单例。


#### **2、懒汉式（非线程安全）**

```java
public class Singleton {  
      private static Singleton instance;  
      private Singleton (){
      }   
      public static Singleton getInstance() {  
	      if (instance == null) {  
	          instance = new Singleton();  
	      }  
	      return instance;  
      }  
 }  
```
懒汉模式申明了一个静态对象，在用户第一次调用时初始化，虽然节约了资源，但第一次加载时需要实例化，反映稍慢一些，而且**在多线程不能正常工作**。在多线程访问的时候，很可能会造成多次实例化，就不再是单例了。

「懒汉式」与「饿汉式」的最大区别就是将单例的初始化操作，延迟到需要的时候才进行，这样做在某些场合中有很大用处。比如某个单例用的次数不是很多，但是这个单例提供的功能又非常复杂，而且加载和初始化要消耗大量的资源，这个时候使用「懒汉式」就是非常不错的选择。


#### **3、懒汉式（线程安全）**

```java
public class Singleton {  
      private static Singleton instance;  
      private Singleton (){
      }
      public static synchronized Singleton getInstance() {  
	      if (instance == null) {  
	          instance = new Singleton();  
	      }  
	      return instance;  
      }  
 }
```

这两种「懒汉式」单例，名字起的也很贴切，一直等到对象实例化的时候才会创建，确实够懒，不用鞭子抽就不知道走了，典型的时间换空间，每次获取实例的时候才会判断，看是否需要创建，浪费判断时间，如果一直没有被使用，就不会被创建，节省空间。

因为这种方式在` getInstance()`方法上加了同步锁，所以在多线程情况下会造成线程阻塞，把大量的线程锁在外面，只有一个线程执行完毕才会执行下一个线程。

Android中的 `InputMethodManager` 使用了这种方式，我们看看它的源码：

```java
public final class InputMethodManager {

    static InputMethodManager sInstance;
    
     /**
     * Retrieve the global InputMethodManager instance, creating it if it
     * doesn't already exist.
     * @hide
     */
    public static InputMethodManager getInstance() {
        synchronized (InputMethodManager.class) {
            if (sInstance == null) {
                IBinder b = ServiceManager.getService(Context.INPUT_METHOD_SERVICE);
                IInputMethodManager service = IInputMethodManager.Stub.asInterface(b);
                sInstance = new InputMethodManager(service, Looper.getMainLooper());
            }
            return sInstance;
        }
    }
}
```

#### **4、双重校验锁（DCL）**

上面的方法「懒汉式（线程安全）」毫无疑问存在性能的问题 — **如果存在很多次getInstance()的调用，那性能问题就不得不考虑了！** 

让我们来分析一下，究竟是整个方法都必须加锁，还是仅仅其中某一句加锁就足够了？我们为什么要加锁呢？分析一下出现lazy loaded的那种情形的原因。原因就是检测null的操作和创建对象的操作分离了。如果这两个操作能够原子地进行，那么单例就已经保证了。于是，我们开始修改代码，就成了下面的双重校验锁（Double Check Lock）：

```java
public class Singleton {

	/**
     * 注意此处使用的关键字 volatile，
     * 被volatile修饰的变量的值，将不会被本地线程缓存，
     * 所有对该变量的读写都是直接操作共享内存，从而确保多个线程能正确的处理该变量。
     */
    private volatile static Singleton singleton;
    private Singleton() {
    }
    public static Singleton getInstance() {
        if (instance == null) {
            synchronized(Singleton.class) {
                if (instance == null) {
                    instance = new Singleton();
                }
            }
        }
        return singleton;
    }
}
```

这种写法在`getSingleton()`方法中对singleton进行了**两次判空**，第一次是为了不必要的同步，第二次是在singleton等于null的情况下才创建实例。在这里用到了volatile关键字，不了解volatile关键字的可以查看[ Java多线程（三）volatile域 ](http://blog.csdn.net/itachi85/article/details/50274169) 和 [java中volatile关键字的含义](http://www.cnblogs.com/aigongsi/archive/2012/04/01/2429166.html) 两篇文章，可以看到双重检查模式是正确使用volatile关键字的场景之一。 

「双重校验锁」：既可以达到线程安全，也可以使性能不受很大的影响，换句话说在保证线程安全的前提下，既节省空间也节省了时间，集合了「饿汉式」和两种「懒汉式」的优点，取其精华，去其槽粕。

> 对于volatile关键字，还是存在很多争议的。由于volatile关键字可能会屏蔽掉虚拟机中一些必要的代码优化，所以运行效率并不是很高。也就是说，**虽然可以使用“双重检查加锁”机制来实现线程安全的单例，但并不建议大量采用，可以根据情况来选用。**
>
> 还有就是在java1.4及以前版本中，很多JVM对于volatile关键字的实现的问题，会导致“双重检查加锁”的失败，因此“双重检查加锁”机制只只能用在java1.5及以上的版本。


#### **5、静态内部类**

另外，在很多情况下JVM已经为我们提供了同步控制，比如：

- 在` static {...} `区块中初始化的数据
- 访问final字段时

因为在JVM进行类加载的时候他会保证数据是同步的，我们可以这样实现：**采用内部类，在这个内部类里面去创建对象实例。**这样的话，只要应用中不使用内部类 JVM 就不会去加载这个单例类，也就不会创建单例对象，从而实现「懒汉式」的延迟加载和线程安全。

```java
public class Singleton { 
    private Singleton(){
    }
      public static Singleton getInstance(){  
        return SingletonHolder.sInstance;  
    }  
    private static class SingletonHolder {  
        private static final Singleton sInstance = new Singleton();  
    }  
} 
```
第一次加载Singleton类时并不会初始化sInstance，只有第一次调用getInstance方法时虚拟机加载SingletonHolder 并初始化sInstance ，这样不仅能确保线程安全也能保证Singleton类的唯一性，所以推荐使用静态内部类单例模式。

然而这还不是最简单的方式，《Effective Java》中作者推荐了一种更简洁方便的使用方式，就是使用「枚举」。

#### **6、枚举**

《Java与模式》中，作者这样写道，使用枚举来实现单实例控制会更加简洁，而且无偿地提供了序列化机制，并由JVM从根本上提供保障，绝对防止多次实例化，是更简洁、高效、安全的实现单例的方式。

```java
public enum Singleton {
	 //定义一个枚举的元素，它就是 Singleton 的一个实例
     INSTANCE;  
     
     public void doSomeThing() {  
	     // do something...
     }  
 } 
```

使用方法如下：

```java
public static void main(String args[]) {
	Singleton singleton = Singleton.instance;
	singleton.doSomeThing();
}
```

枚举单例的优点就是简单，但是大部分应用开发很少用枚举，可读性并不是很高，不建议用。

#### **7. 使用容器**

```java
public class SingletonManager { 
　　private static Map<String, Object> objMap = new HashMap<String,Object>();
　　private Singleton() { 
　　}
　　public static void registerService(String key, Objectinstance) {
　　　　if (!objMap.containsKey(key) ) {
　　　　　　objMap.put(key, instance) ;
　　　　}
　　}
　　public static ObjectgetService(String key) {
　　　　return objMap.get(key) ;
　　}
}
```
这种事用SingletonManager 将**多种单例类统一管理**，在使用时根据key获取对象对应类型的对象。这种方式使得我们可以管理多种类型的单例，并且在使用时可以通过统一的接口进行获取操作，降低了用户的使用成本，也对用户隐藏了具体实现，降低了耦合度。


### **总结**

对于以上七种单例，分别是「饿汉式」、「懒汉式(非线程安全)」、「懒汉式(线程安全)」、「双重校验锁」、「静态内部类」、「枚举」和「容器类管理」。很多时候取决人个人的喜好，虽然双重检查有一定的弊端和问题，但我就是钟爱双重检查，觉得这种方式可读性高、安全、优雅（个人观点）。所以代码里常常默写这样的单例，写的时候真感觉自己是个**伟大的建筑师**哈哈哈哈（真不要脸(￢_￢)（逃。

![嘻嘻嘻](http://img.blog.csdn.net/20160909190409989)




#### 【参考资料】：
1、[Android设计模式之单例模式](http://mp.weixin.qq.com/s?__biz=MzA4NTQwNDcyMA==&mid=403126596&idx=1&sn=101c6d4e363213bcdbe1879edeb08736&scene=0#wechat_redirect)
2、[十分钟认识单例模式的多种姿势](http://blog.csdn.net/pangpang123654/article/details/51829431)
3、[设计模式（二）单例模式的七种写法](http://blog.csdn.net/itachi85/article/details/50510124)
4、[深入Java单例模式](http://devbean.blog.51cto.com/448512/203501)
5、[java中volatile关键字的含义](http://www.cnblogs.com/aigongsi/archive/2012/04/01/2429166.html)
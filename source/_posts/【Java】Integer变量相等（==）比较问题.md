---
title: 【Java】Integer变量相等（==）比较问题
layout: post
date: 2017-07-11 12:30:55
comments: true
tags: 
    - Java
categories: [Java]
keywords: Integer
description: 
photos:
    - /gallery/14987336455200.jpg
---




### 题目

这是关于一段令人疑惑的Java代码:

```java
class TestIntegerCache {

    public static void main(String[] args){
        Integer i3 = 100;
        Integer i4 = 100;
        System.out.println(i3 == i4);

        Integer i5 = 1000;
        Integer i6 = 1000;
        System.out.println(i5 == i6);
    }
    
}
```

这么简单，执行结果是什么？

> true
> false

一个是true，一个是false！
这是为什么呢？为什么和大多数人心里想的不一样！


<!-- more -->

### 分析

根据Java编译机制，`.java`文件在编译以后会生成.class文件给JVM加载执行，于是找到.class文件，反编译看了一下，发现编译器在编译我们的代码时，很调皮（聪明的）的在我们声明的变量加上了`valueOf`方法 ，代码变成了如下：

```java

class TestIntegerCache {

    public static void main(String[] args){
        Integer i3 = Integer.valueOf(100);
        Integer i4 = Integer.valueOf(100);
        System.out.println(i3 == i4);

        Integer i5 = Integer.valueOf(1000);
        Integer i6 = Integer.valueOf(1000);
        System.out.println(i5 == i6);
    }
}
```

`valueOf()` 方法对它做了什么，我们看看源代码：

```java
/**
     * Returns an {@code Integer} instance representing the specified
     * {@code int} value.  If a new {@code Integer} instance is not
     * required, this method should generally be used in preference to
     * the constructor {@link #Integer(int)}, as this method is likely
     * to yield significantly better space and time performance by
     * caching frequently requested values.
     *
     * This method will always cache values in the range -128 to 127,
     * inclusive, and may cache other values outside of this range.
     *
     * @param  i an {@code int} value.
     * @return an {@code Integer} instance representing {@code i}.
     * @since  1.5
     */
public static Integer valueOf(int i) {
        if (i >= IntegerCache.low && i <= IntegerCache.high)    //我们看到这里有个缓存，在缓存区间就返回缓存里的
            return IntegerCache.cache[i + (-IntegerCache.low)];   //缓存数组相应的对象
        return new Integer(i);    //不在缓存数组区间就new一个对象
    }
```

我们发现，Integer的作者在写这个类时，为了避免重复创建对象，对Integer值做了缓存，如果这个值在缓存范围内，直接返回缓存好的对象，否则new一个新的对象返回，那究竟这个缓存到底缓存了哪些内容呢？看一下`IntegerCache`这个类：

```java
/**
     * Cache to support the object identity semantics of autoboxing for values between
     * -128 and 127 (inclusive) as required by JLS.
     *
     * The cache is initialized on first usage.  The size of the cache
     * may be controlled by the {@code -XX:AutoBoxCacheMax=<size>} option.
     * During VM initialization, java.lang.Integer.IntegerCache.high property
     * may be set and saved in the private system properties in the
     * sun.misc.VM class.
     */

    private static class IntegerCache {
        static final int low = -128;
        static final int high;
        static final Integer cache[];

        static {
	        //检查虚拟机里是否有缓存区间配置项，如果有就赋成该值，没有就默认[-128, 127]
            // high value may be configured by property
            int h = 127;
            String integerCacheHighPropValue =
                sun.misc.VM.getSavedProperty("java.lang.Integer.IntegerCache.high");
            if (integerCacheHighPropValue != null) {
                try {
                    int i = parseInt(integerCacheHighPropValue);
                    i = Math.max(i, 127);
                    // Maximum array size is Integer.MAX_VALUE
                    h = Math.min(i, Integer.MAX_VALUE - (-low) -1);
                } catch( NumberFormatException nfe) {
                    // If the property cannot be parsed into an int, ignore it.
                }
            }
            high = h;

			//创建缓存数组，并初始化（缓存值）
            cache = new Integer[(high - low) + 1];
            int j = low;
            for(int k = 0; k < cache.length; k++)
                cache[k] = new Integer(j++);

            // range [-128, 127] must be interned (JLS7 5.1.7)
            assert IntegerCache.high >= 127;
        }

        private IntegerCache() {}
    }
```

这是一个内部静态类，该类只能在Integer这个类的内部访问，这个类在初始化的时候，会去加载JVM的配置，如果有值，就用配置的值初始化缓存数组，否则就缓存**`-128`**到**`127`**之间的值。
再来看看我们之前的代码：

![](http://img.blog.csdn.net/20170711124934286)

看完这个，是不是明白了呢


### 参考资料

[让人疑惑的代码，竟成大多公司面试题热门！](http://mp.weixin.qq.com/s?__biz=MzAxMzQ3NzQ3Nw==&mid=2654250496&idx=1&sn=dad9b1ade6dca4b57020b1bc091df5fb&chksm=8061f50ab7167c1c2672456b1e9f9b4293f6cab49deb08970874f7ae03fd186461acad02e389&mpshare=1&scene=1&srcid=0711yYY7UjcX2zsrDcna3QVp#rd)
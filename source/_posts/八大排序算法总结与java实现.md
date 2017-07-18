---
title: 八大排序算法总结与java实现
layout: post
date: 2017-07-18 12:30:55
comments: true
tags: 
    - Java
    - Algorithm
categories: 
    - Algorithm
keywords: Sort
description: 
photos:
    - /gallery/sort-algorithms/big-o.png
---



### 概述

因为健忘，加上对各种排序算法理解不深刻，过段时间面对排序就蒙了。所以决定对我们常见的这几种排序算法进行统一总结，强行学习。常见的八大排序算法，他们之间关系如下：

![](/gallery/sort-algorithms/1156494-ab4cecff133d87b3.png)

- 直接插入排序
- 希尔排序
- 简单选择排序
- 堆排序
- 冒泡排序
- 快速排序
- 归并排序
- 基数排序

<!-- more -->

![](/gallery/sort-algorithms/2016-07-15_常用排序算法.png)


### 一、直接插入排序（Insertion Sort）

---

#### 1、基本思想

将数组中的所有元素依次跟前面已经排好的元素相比较，如果选择的元素比已排序的元素小，则交换，直到全部元素都比较过为止。

![使用插入排序为一列数字进行排序的过程](/gallery/sort-algorithms/Insertion-sort-example-300px.gif)

#### 2、算法描述

一般来说，插入排序都采用in-place在数组上实现。具体算法描述如下：

1. 从第一个元素开始，该元素可以认为已经被排序
2. 取出下一个元素，在已经排序的元素序列中从后向前扫描
3. 如果该元素（已排序）大于新元素，将该元素移到下一位置
4. 重复步骤3，直到找到已排序的元素小于或者等于新元素的位置
5. 将新元素插入到该位置后
6. 重复步骤2~5

![直接插入排序演示](/gallery/sort-algorithms/insert-sort.gif)

如果*比较操作*的代价比*交换操作*大的话，可以采用[二分查找法](https://zh.wikipedia.org/wiki/%E4%BA%8C%E5%88%86%E6%9F%A5%E6%89%BE%E6%B3%95)来减少*比较操作*的数目。该算法可以认为是**插入排序**的一个变种，称为[二分查找插入排序](https://zh.wikipedia.org/w/index.php?title=%E4%BA%8C%E5%88%86%E6%9F%A5%E6%89%BE%E6%8F%92%E5%85%A5%E6%8E%92%E5%BA%8F&action=edit&redlink=1)。

#### 3、代码实现

```java
	/**
     * 插入排序
     *
     * 1. 从第一个元素开始，该元素可以认为已经被排序
     * 2. 取出下一个元素，在已经排序的元素序列中从后向前扫描
     * 3. 如果该元素（已排序）大于新元素，将该元素移到下一位置
     * 4. 重复步骤3，直到找到已排序的元素小于或者等于新元素的位置
     * 5. 将新元素插入到该位置后
     * 6. 重复步骤2~5
     * @param arr  待排序数组
     */
    public static void insertionSort(int[] arr){
        for( int i=0; i<arr.length-1; i++ ) {
            for( int j=i+1; j>0; j-- ) {
                if( arr[j-1] <= arr[j] )
                    break;
                int temp = arr[j];		//交换操作
                arr[j] = arr[j-1];
                arr[j-1] = temp;
                System.out.println("Sorting:  " + Arrays.toString(arr));
            }
        }
    }
```

执行结果如下：

```java
Before: [5, 3, 9, 1, 6, 4, 10, 2, 8, 7]
Sorting:  [3, 5, 9, 1, 6, 4, 10, 2, 8, 7]
Sorting:  [3, 5, 1, 9, 6, 4, 10, 2, 8, 7]
Sorting:  [3, 1, 5, 9, 6, 4, 10, 2, 8, 7]
Sorting:  [1, 3, 5, 9, 6, 4, 10, 2, 8, 7]
Sorting:  [1, 3, 5, 6, 9, 4, 10, 2, 8, 7]
Sorting:  [1, 3, 5, 6, 4, 9, 10, 2, 8, 7]
Sorting:  [1, 3, 5, 4, 6, 9, 10, 2, 8, 7]
Sorting:  [1, 3, 4, 5, 6, 9, 10, 2, 8, 7]
Sorting:  [1, 3, 4, 5, 6, 9, 2, 10, 8, 7]
Sorting:  [1, 3, 4, 5, 6, 2, 9, 10, 8, 7]
Sorting:  [1, 3, 4, 5, 2, 6, 9, 10, 8, 7]
Sorting:  [1, 3, 4, 2, 5, 6, 9, 10, 8, 7]
Sorting:  [1, 3, 2, 4, 5, 6, 9, 10, 8, 7]
Sorting:  [1, 2, 3, 4, 5, 6, 9, 10, 8, 7]
Sorting:  [1, 2, 3, 4, 5, 6, 9, 8, 10, 7]
Sorting:  [1, 2, 3, 4, 5, 6, 8, 9, 10, 7]
Sorting:  [1, 2, 3, 4, 5, 6, 8, 9, 7, 10]
Sorting:  [1, 2, 3, 4, 5, 6, 8, 7, 9, 10]
Sorting:  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
After:  [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
```



###  二、希尔排序（Shell Sort）

---

{% pullquote right%}
第一个突破O(n^2)的排序算法；是简单插入排序的改进版；它与插入排序的不同之处在于，它会优先比较距离较远的元素。
{% endpullquote %}

希尔排序，也称**递减增量排序算法**，1959年Shell发明。是插入排序的一种高速而稳定的改进版本。

希尔排序是先将整个待排序的记录序列分割成为若干子序列分别进行直接插入排序，待整个序列中的记录“基本有序”时，再对全体记录进行依次直接插入排序。





#### 1、基本思想

![](/gallery/sort-algorithms/shell-sort.jpg)



将待排序数组按照步长gap进行分组，然后将每组的元素利用直接插入排序的方法进行排序；每次再将gap折半减小，循环上述操作；当gap=1时，利用直接插入，完成排序。

可以看到步长的选择是希尔排序的重要部分。只要最终步长为1任何步长序列都可以工作。一般来说最简单的步长取值是**初次取数组长度的一半**为增量，之后每次再减半，直到增量为1。更好的步长序列取值可以参考[维基百科](https://zh.wikipedia.org/wiki/%E5%B8%8C%E5%B0%94%E6%8E%92%E5%BA%8F#.E6.AD.A5.E9.95.BF.E5.BA.8F.E5.88.97)。

#### 2、算法描述

1. 选择一个增量序列t1，t2，…，tk，其中ti>tj，tk=1；（**一般初次取数组半长，之后每次再减半，直到增量为1**）
2. 按增量序列个数k，对序列进行k 趟排序；
3. 每趟排序，根据对应的增量ti，将待排序列分割成若干长度为m 的子序列，分别对各子表进行直接插入排序。仅增量因子为1 时，整个序列作为一个表来处理，表长度即为整个序列的长度。

#### 3、代码实现

以下是我自己的实现，可以看到实现很幼稚，但是好处是理解起来很简单。因为没有经过任何的优化，所以不建议大家直接使用。建议对比下方的维基百科官方实现代码，特别是步长取值策略部分。

```java
/**
 * 希尔排序
 *
 * 1. 选择一个增量序列t1，t2，…，tk，其中ti>tj，tk=1；（一般初次取数组半长，之后每次再减半，直到增量为1）
 * 2. 按增量序列个数k，对序列进行k 趟排序；
 * 3. 每趟排序，根据对应的增量ti，将待排序列分割成若干长度为m 的子序列，分别对各子表进行直接插入排序。
 *    仅增量因子为1 时，整个序列作为一个表来处理，表长度即为整个序列的长度。
 * @param arr  待排序数组
 */
public static void shellSort(int[] arr){
    int gap = arr.length / 2;
    for (; gap > 0; gap = gap/2) {      //不断缩小gap，直到1为止
        for (int j = 0; (j+gap) < arr.length; j++){     //使用每个gap进行遍历
            if(arr[j] > arr[j+gap]){
                int temp = arr[j+gap];      //交换操作
                arr[j+gap] = arr[j];
                arr[j] = temp;
                System.out.println("Gap=" + gap + ", Sorting:  " + Arrays.toString(arr));
            }
        }
        if(gap == 1){
            break;
        }
    }
}
```

下面是维基百科官方实现，大家注意gap步长取值部分：

```java
/**
 * 希尔排序（Wiki官方版）
 *
 * 1. 选择一个增量序列t1，t2，…，tk，其中ti>tj，tk=1；（注意此算法的gap取值）
 * 2. 按增量序列个数k，对序列进行k 趟排序；
 * 3. 每趟排序，根据对应的增量ti，将待排序列分割成若干长度为m 的子序列，分别对各子表进行直接插入排序。
 *    仅增量因子为1 时，整个序列作为一个表来处理，表长度即为整个序列的长度。
 * @param arr  待排序数组
 */
public static void shell_sort(int[] arr) {
    int gap = 1, i, j, len = arr.length;
    int temp;
    while (gap < len / 3)
        gap = gap * 3 + 1;      // <O(n^(3/2)) by Knuth,1973>: 1, 4, 13, 40, 121, ...
    for (; gap > 0; gap /= 3) {
        for (i = gap; i < len; i++) {
            temp = arr[i];
            for (j = i - gap; j >= 0 && arr[j] > temp; j -= gap)
                arr[j + gap] = arr[j];
            arr[j + gap] = temp;
        }
    }
}
```



###  三、简单选择排序（Selection Sort）

---

#### 1、基本思想


#### 2、算法描述


#### 3、代码实现


































###  四、堆排序（Heap Sort）

---

#### 1、基本思想


#### 2、算法描述


#### 3、代码实现




### 参考资料

- 数据结构可视化：[visualgo](https://visualgo.net/zh)
- [Sorting - 卡内基梅隆大学课件](https://www.cs.cmu.edu/~adamchik/15-121/lectures/Sorting%20Algorithms/sorting.html)
- [数据结构常见的八大排序算法（详细整理）](http://www.jianshu.com/p/7d037c332a9d)
- [必须知道的八大种排序算法【java实现】](http://www.jianshu.com/p/8c915179fd02)
- [十大经典排序算法](http://web.jobbole.com/87968/)
- [视觉直观感受 7 种常用的排序算法](http://blog.jobbole.com/11745/)
- [总结5种比较高效常用的排序算法](http://www.cnblogs.com/minkaihui/p/4077888.html)
- [常见排序算法C++总结](http://www.cnblogs.com/zyb428/p/5673738.html)
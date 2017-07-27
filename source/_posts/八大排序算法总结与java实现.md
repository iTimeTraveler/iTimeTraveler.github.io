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
    - /gallery/sort-algorithms/header.png
---



### 概述

因为健忘，加上对各种排序算法理解不深刻，过段时间面对排序就蒙了。所以决定对我们常见的这几种排序算法进行统一总结，强行学习。首先罗列一下常见的十大排序算法：

![](/gallery/sort-algorithms/big-o.png)



- 直接插入排序
- 希尔排序
- 简单选择排序
- 堆排序
- 冒泡排序
- 快速排序
- 归并排序
- 基数排序

<!-- more -->

其中我们讨论的这八大排序算法都属于内部排序，也就是只考虑数据量较小仅需要使用内存的排序算法，他们之间关系如下：



{% raw %}
$$
\begin{cases}
内部排序 

\begin{cases}
插入排序

\begin{cases}
直接插入排序\\
希尔排序
\end{cases}

\\
选择排序
\begin{cases}
简单选择排序\\
堆排序
\end{cases}
\\

交换排序
\begin{cases}
冒泡排序\\
快速排序 
\end{cases}

\\

归并排序\\
基数排序

\end{cases}

\\
外部排序 
\end{cases}
$$
{% endraw %}





### 一、直接插入排序（Insertion Sort）

---

#### 1、基本思想

将数组中的所有元素依次跟前面已经排好的元素相比较，如果选择的元素比已排序的元素小，则交换，直到全部元素都比较过为止。

![使用插入排序为一列数字进行排序的过程](/gallery/sort-algorithms/Insertion-sort-example-300px.gif)

#### 2、算法描述

一般来说，插入排序都采用in-place在数组上实现。具体算法描述如下：

①. 从第一个元素开始，该元素可以认为已经被排序
②. 取出下一个元素，在已经排序的元素序列中从后向前扫描
③. 如果该元素（已排序）大于新元素，将该元素移到下一位置
④. 重复步骤3，直到找到已排序的元素小于或者等于新元素的位置
⑤. 将新元素插入到该位置后
⑥. 重复步骤②~⑤

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
                int temp = arr[j];      //交换操作
                arr[j] = arr[j-1];
                arr[j-1] = temp;
                System.out.println("Sorting:  " + Arrays.toString(arr));
            }
        }
    }
```


#### 效率

时间复杂度：O（n^2）



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

①. 选择一个增量序列t1，t2，…，tk，其中ti>tj，tk=1；（**一般初次取数组半长，之后每次再减半，直到增量为1**）
②. 按增量序列个数k，对序列进行k 趟排序；
③. 每趟排序，根据对应的增量ti，将待排序列分割成若干长度为m 的子序列，分别对各子表进行直接插入排序。仅增量因子为1 时，整个序列作为一个表来处理，表长度即为整个序列的长度。

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
    for (; gap > 0; gap /= 2) {      //不断缩小gap，直到1为止
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

以下是希尔排序复杂度:


| 平均时间复杂度    | 最好情况       | 最坏情况       | 空间复杂度 |
| ---------- | ---------- | ---------- | ----- |
| O(nlog2 n) | O(nlog2 n) | O(nlog2 n) | O(1)  |



###  三、选择排序（Selection Sort）

---

{% pullquote right%}
![选择排序的示例动画。红色表示当前最小值，黄色表示已排序序列，蓝色表示当前位置。](/gallery/sort-algorithms/Selection-Sort-Animation.gif)
{% endpullquote %}


从算法逻辑上看，选择排序是一种简单直观的排序算法，在简单选择排序过程中，所需移动记录的次数比较少。

#### 1、基本思想

选择排序的基本思想：比较 + 交换。

在未排序序列中找到最小（大）元素，存放到未排序序列的起始位置。在所有的完全依靠交换去移动元素的排序方法中，选择排序属于非常好的一种。


#### 2、算法描述

①. 从待排序序列中，找到关键字最小的元素；
②. 如果最小元素不是待排序序列的第一个元素，将其和第一个元素互换；
③. 从余下的 N - 1 个元素中，找出关键字最小的元素，重复①、②步，直到排序结束。


#### 3、代码实现

选择排序比较简单，以下是我自己的实现，跟官方版差不多，所以完全可以参考。

```java
/**
 * 选择排序
 *
 * 1. 从待排序序列中，找到关键字最小的元素；
 * 2. 如果最小元素不是待排序序列的第一个元素，将其和第一个元素互换；
 * 3. 从余下的 N - 1 个元素中，找出关键字最小的元素，重复①、②步，直到排序结束。
 *    仅增量因子为1 时，整个序列作为一个表来处理，表长度即为整个序列的长度。
 * @param arr  待排序数组
 */
public static void selectionSort(int[] arr){
    for(int i = 0; i < arr.length-1; i++){
        int min = i;
        for(int j = i+1; j < arr.length; j++){    //选出之后待排序中值最小的位置
            if(arr[j] < arr[min]){
                min = j;
            }
        }
        if(min != i){
            int temp = arr[min];      //交换操作
            arr[min] = arr[i];
            arr[i] = temp;
            System.out.println("Sorting:  " + Arrays.toString(arr));
        }
    }
}
```


以下是选择排序复杂度:


| 平均时间复杂度 | 最好情况  | 最坏情况  | 空间复杂度 |
| ------- | ----- | ----- | ----- |
| O(n²)   | O(n²) | O(n²) | O(1)  |







###  四、堆排序（Heap Sort）

---

> 1991年的计算机先驱奖获得者、斯坦福大学计算机科学系教授罗伯特·弗洛伊德(Robert W．Floyd) 和威廉姆斯(J．Williams) 在1964年共同发明了著名的堆排序算法(Heap Sort).

堆的定义如下：$n$个元素的序列{% raw %}
$\left\{{k_1,k_2,···,k_n}\right\}$
{% endraw %}当且仅当满足下关系时，称之为堆。


{% raw %}
$$
\left\{
\begin{aligned}
k_i & \leqslant  k_{2i} \\
k_i & \leqslant  k_{2i+1} 
\end{aligned}
\right.
\quad  或  \quad
\left\{
\begin{aligned}
k_i & \geqslant  k_{2i} \\
k_i & \geqslant k_{2i+1} 
\end{aligned}
\right.
\quad (i = 1,2,···, \left \lfloor { \frac{n}{2} } \right \rfloor )


$$
{% endraw %}



把此序列对应的二维数组看成一个完全二叉树。那么堆的含义就是：**完全二叉树中任何一个非叶子节点的值均不大于（或不小于）其左，右孩子节点的值。**由上述性质可知大顶堆的堆顶的关键字肯定是所有关键字中最大的，小顶堆的堆顶的关键字是所有关键字中最小的。因此我们可使用大顶堆进行升序排序, 使用小顶堆进行降序排序。



#### 1、基本思想

此处以大顶堆为例，堆排序的过程就是将待排序的序列构造成一个堆，选出堆中最大的移走，再把剩余的元素调整成堆，找出最大的再移走，重复直至有序。


#### 2、算法描述

①. 先将初始序列$K[1..n]$建成一个大顶堆, 那么此时第一个元素$K_1$最大, 此堆为初始的无序区.
②. 再将关键字最大的记录$K_1$ (即堆顶, 第一个元素)和无序区的最后一个记录 $K_n$ 交换, 由此得到新的无序区$K[1..n-1]$和有序区$K[n]$, 且满足$K[1..n-1].keys \leqslant K[n].key$
③. 交换$K_1$ 和 $K_n$ 后, 堆顶可能违反堆性质, 因此需将$K[1..n-1]$调整为堆. 然后重复步骤②, 直到无序区只有一个元素时停止.

动图效果如下所示：

![堆排序过程](/gallery/sort-algorithms/heap_sort_gif.gif)

![堆排序算法的演示。首先，将元素进行重排，以匹配堆的条件。图中排序过程之前简单的绘出了堆树的结构。](/gallery/sort-algorithms/Sorting_heapsort_anim.gif)

#### 3、代码实现

从算法描述来看，堆排序需要两个过程，一是建立堆，二是堆顶与堆的最后一个元素交换位置。所以堆排序有两个函数组成。一是建堆函数，二是反复调用建堆函数以选择出剩余未排元素中最大的数来实现排序的函数。

总结起来就是定义了以下几种操作：

- 最大堆调整（Max_Heapify）：将堆的末端子节点作调整，使得子节点永远小于父节点
- 创建最大堆（Build_Max_Heap）：将堆所有数据重新排序
- 堆排序（HeapSort）：移除位在第一个数据的根节点，并做最大堆调整的递归运算

对于堆节点的访问：

- 父节点i的左子节点在位置：`(2*i+1)`;
- 父节点i的右子节点在位置：`(2*i+2)`;
- 子节点i的父节点在位置：`floor((i-1)/2)`;



```java
/**
 * 堆排序
 *
 * 1. 先将初始序列K[1..n]建成一个大顶堆, 那么此时第一个元素K1最大, 此堆为初始的无序区.
 * 2. 再将关键字最大的记录K1 (即堆顶, 第一个元素)和无序区的最后一个记录 Kn 交换, 由此得到新的无序区K[1..n−1]和有序区K[n], 且满足K[1..n−1].keys⩽K[n].key
 * 3. 交换K1 和 Kn 后, 堆顶可能违反堆性质, 因此需将K[1..n−1]调整为堆. 然后重复步骤②, 直到无序区只有一个元素时停止.
 * @param arr  待排序数组
 */
public static void heapSort(int[] arr){
    for(int i = arr.length; i > 0; i--){
        max_heapify(arr, i);

        int temp = arr[0];      //堆顶元素(第一个元素)与Kn交换
        arr[0] = arr[i-1];
        arr[i-1] = temp;
    }
}

private static void max_heapify(int[] arr, int limit){
    if(arr.length <= 0 || arr.length < limit) return;
    int parentIdx = limit / 2;

    for(; parentIdx >= 0; parentIdx--){
        if(parentIdx * 2 >= limit){
            continue;
        }
        int left = parentIdx * 2;       //左子节点位置
        int right = (left + 1) >= limit ? left : (left + 1);    //右子节点位置，如果没有右节点，默认为左节点位置

        int maxChildId = arr[left] >= arr[right] ? left : right;
        if(arr[maxChildId] > arr[parentIdx]){   //交换父节点与左右子节点中的最大值
            int temp = arr[parentIdx];
            arr[parentIdx] = arr[maxChildId];
            arr[maxChildId] = temp;
        }
    }
    System.out.println("Max_Heapify: " + Arrays.toString(arr));
}
```

以上,
①. 建立堆的过程, 从length/2 一直处理到0, 时间复杂度为O(n);
②. 调整堆的过程是沿着堆的父子节点进行调整, 执行次数为堆的深度, 时间复杂度为O(lgn);
③. 堆排序的过程由n次第②步完成, 时间复杂度为O(nlgn).


| 平均时间复杂度 | 最好情况  | 最坏情况  | 空间复杂度 |
| ------- | ----- | ----- | ----- |
| $O(n \log_{2}n)$   | $O(n \log_{2}n)$ | $O(n \log_{2}n)$ | O(1)  |

Tips: **由于堆排序中初始化堆的过程比较次数较多, 因此它不太适用于小序列.** 同时由于多次任意下标相互交换位置, 相同元素之间原本相对的顺序被破坏了, 因此, 它是不稳定的排序.




###  五、冒泡排序（Bubble Sort）

---

![冒泡排序的思想](/gallery/sort-algorithms/bubble-sort02.gif)


> 我想对于它每个学过C语言的都会了解，这可能是很多人接触的第一个排序算法。


#### 1、基本思想

冒泡排序（Bubble Sort）是一种简单的排序算法。它重复地走访过要排序的数列，一次比较两个元素，如果他们的顺序错误就把他们交换过来。走访数列的工作是重复地进行直到没有再需要交换，也就是说该数列已经排序完成。这个算法的名字由来是因为越小的元素会经由交换慢慢“浮”到数列的顶端。


![冒泡排序演示](/gallery/sort-algorithms/bubble-sort.gif)


#### 2、算法描述

冒泡排序算法的运作如下：

①. 比较相邻的元素。如果第一个比第二个大，就交换他们两个。
②. 对每一对相邻元素作同样的工作，从开始第一对到结尾的最后一对。这步做完后，最后的元素会是最大的数。
③. 针对所有的元素重复以上的步骤，除了最后一个。
④. 持续每次对越来越少的元素重复上面的步骤①~③，直到没有任何一对数字需要比较。

#### 3、代码实现


冒泡排序需要两个嵌套的循环. 其中, **外层循环**移动游标; **内层循环**遍历游标及之后(或之前)的元素, 通过两两交换的方式, 每次只确保该内循环结束位置排序正确, 然后内层循环周期结束, 交由外层循环往后(或前)移动游标, 随即开始下一轮内层循环, 以此类推, 直至循环结束.



```java
/**
 * 冒泡排序
 *
 * ①. 比较相邻的元素。如果第一个比第二个大，就交换他们两个。
 * ②. 对每一对相邻元素作同样的工作，从开始第一对到结尾的最后一对。这步做完后，最后的元素会是最大的数。
 * ③. 针对所有的元素重复以上的步骤，除了最后一个。
 * ④. 持续每次对越来越少的元素重复上面的步骤①~③，直到没有任何一对数字需要比较。
 * @param arr  待排序数组
 */
public static void bubbleSort(int[] arr){
    for (int i = arr.length; i > 0; i--) {      //外层循环移动游标
        for(int j = 0; j < i && (j+1) < i; j++){    //内层循环遍历游标及之后(或之前)的元素
            if(arr[j] > arr[j+1]){
                int temp = arr[j];
                arr[j] = arr[j+1];
                arr[j+1] = temp;
                System.out.println("Sorting: " + Arrays.toString(arr));
            }
        }
    }
}
```



以下是冒泡排序算法复杂度:


| 平均时间复杂度 | 最好情况  | 最坏情况  | 空间复杂度 |
| ------- | ----- | ----- | ----- |
|O(n²)  |  O(n)   |   O(n²)  |   O(1)  |

冒泡排序是最容易实现的排序, 最坏的情况是每次都需要交换, 共需遍历并交换将近n²/2次, 时间复杂度为O(n²). 最佳的情况是内循环遍历一次后发现排序是对的, 因此退出循环, 时间复杂度为O(n). 平均来讲, 时间复杂度为O(n²). 由于冒泡排序中只有缓存的temp变量需要内存空间, 因此空间复杂度为常量O(1).

Tips: 由于冒泡排序只在相邻元素大小不符合要求时才调换他们的位置, 它并不改变相同元素之间的相对顺序, 因此它是稳定的排序算法.




###  六、快速排序（Quick Sort）

---

快速排序（Quicksort）是对冒泡排序的一种改进。

#### 1、基本思想

#### 2、算法描述

#### 3、代码实现




























###  四、排序（Sort）

---

#### 1、基本思想

#### 2、算法描述

#### 3、代码实现

![](/gallery/sort-algorithms/2016-07-15_常用排序算法.png)



### 参考资料

- 数据结构可视化：[visualgo](https://visualgo.net/zh)
- 排序算法测试：[Lab 1: Sorting - 哥德堡大学课件（University of Gothenburg）](http://www.cse.chalmers.se/edu/course/DIT960/lab1-sorting.html)
- [Sorting - 卡内基梅隆大学课件](https://www.cs.cmu.edu/~adamchik/15-121/lectures/Sorting%20Algorithms/sorting.html)
- [数据结构常见的八大排序算法（详细整理）](http://www.jianshu.com/p/7d037c332a9d)
- [必须知道的八大种排序算法【java实现】](http://www.jianshu.com/p/8c915179fd02)
- [十大经典排序算法](http://web.jobbole.com/87968/)
- [视觉直观感受 7 种常用的排序算法](http://blog.jobbole.com/11745/)
- [JS中可能用得到的全部的排序算法](http://louiszhai.github.io/2016/12/23/sort/)
- [总结5种比较高效常用的排序算法](http://www.cnblogs.com/minkaihui/p/4077888.html)
- [常见排序算法C++总结](http://www.cnblogs.com/zyb428/p/5673738.html)
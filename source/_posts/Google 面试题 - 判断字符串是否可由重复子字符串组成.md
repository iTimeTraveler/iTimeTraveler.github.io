---
title: Google 面试题 | 判断字符串是否可由重复子字符串组成
layout: post
date: 2017-05-05 17:20:55
comments: true
tags: 
    - Google
categories: [Algorithm]
keywords: Algorithm
description: 
photos:
    - /gallery/george-booles-200th-birthday.gif
---


## **题目描述**

对于一个非空字符串，判断其是否可由一个子字符串重复多次组成。字符串只包含小写字母且长度不超过10000。

###  样例1
> - **输入**： "abab"
- **输出**： True
- **样例解释**： 输入可由"ab"重复两次组成

### 样例 2

> - **输入**： "aba"
- **输出**： False

### 样例 3

> - **输入**： "abcabcabcabc"
- **输出**： True
- **样例解释**：输入可由"abc"重复四次组成


<!--more-->

## **解题思路**

### **1. 一个简单的思路**
枚举子字符串的长度lenSub < len(len为原字符串长度)，将原字符串分成多个子字符串，每个子字符串长度为lenSub（由此可见，lenSub整除len），再判断这些子字符串是否全部相等，若全部相等，则返回True，如果对于所有lenSub均不满足该条件，则返回False。时间复杂度为O(len*v(len))，其中v(len)为len的因数个数（因为我们只需要对整除len的lenSub进行进一步判断）。


### **2. 下面再说一种神奇的方法**

由kmp算法中的next数组实现。

1. 字符串s的下标从0到n-1，n为字符串长度，记s(i)表示s的第i位字符，s(i,j)表示从s的第i位到第j位的子字符串，若i>j，则s(i,j)=””(空串）。

2. next数组的定义为：next(i)=p，表示p为小于i且满足s(0 , p) = s(i-p , i)的最大的p，如果不存在这样的p，则next(i) = -1，显然next(0) = -1。我们可以用O(n)的时间计算出next数组。假设我们已知next(0)，next(1)，……，next(i-1) ，现在要求next(i)，不妨设next(i-1) = j0，则由next数组定义可知s(0 , j0) = s(i-1-j0 , i-1)。

    - 若s(j0+1) = s(i)，则结合s(0 , j0) = s(i-1-j0 , i-1)可知s(0 , j0+1) = s(i - (j0+1) , i)，由此可知，next(i)=j0+1。

    - 若s(j0+1)!=s(i)但s(next(j0)+1)=s(i)，记j1=next(j0)，则s(j1+1)=s(i)，由next数组的定义，s(0 , j1) = s(j0 - j1 , j0) = s(i - 1 - j1 , i - 1)，即s(0，j1) = s(i - 1 - j1 , i - 1)，由假设s(j1+1) = s(i)，则s(0 , j1+1) = s(i - (j1+1) , i)，故next(i) = j1+1。

    - 同前两步的分析，如果我们能找到一个k，使得对于所有小于k的k0，s(j(k0)+1)!=s(i)，但有s(j(k)+1) = s(i)，则由next数组的定义可以得到next(i)=j(k)+1，否则需进一步考虑j(k+1) = next(j(k))，如果我们找不到这样的k，则next(i)=-1。

3. 对于字符串s，如果j满足，0<=j<=n-1，且s(0，j) = s(n-1-j，n-1)，令k=n-1-j，若k整除n，不妨设n=mk，则s(0，(m-1)k - 1) = s(k，mk - 1)，即s(0，k-1) = s(k，2k-1) = …… = s((m-1)k - 1，mk - 1)，即s满足题设条件。故要判断s是否为重复子串组成，只需找到满足上述条件的j，且k整除n，即说明s满足条件，否则不满足。

4. 利用已算出的next(n-1)，令k=n-1-next(n-1)，由c可知，若k整除n，且k < n，则s满足条件，否则不满足。上述算法的复杂度可证明为O(n)。


## **参考代码**

参考代码给出了利用next数组求解的代码。来自[**九章算法答案**](http://www.jiuzhang.com/solutions/repeated-substring-pattern/)

```java
public class Solution {
    public boolean repeatedSubstringPattern(String s) {
        int l = s.length();
        int[] next = new int[l];
        next[0] = -1;
        int i, j = -1;
        for (i = 1; i < l; i++) {
            while (j >= 0 && s.charAt(i) != s.charAt(j + 1)) {
                j = next[j];
            }
            if (s.charAt(i) == s.charAt(j + 1)) {
                j++;
            }
            next[i] = j;
        }
        int lenSub = l - 1 - next[l - 1];
        return lenSub != l && l % lenSub ==0;
    }
}
```

## **面试官角度分析**

这道题的第一种解法比较简单，考察穷举和字符串处理的能力，给出第一种方法并正确分析时间复杂度基本可以达到hire；如果面试者对KMP算法有了解，可以给出第二种next数组的算法可以达到strong hire。

本文来自九章算法公众号 [Google 面试题 | 重复子字符串模式](http://mp.weixin.qq.com/s?__biz=MzA5MzE4MjgyMw==&mid=2649457295&idx=1&sn=e2f9448ff2b83c36f2abc343936125b8&chksm=887eec87bf096591aa2ae39c12003e786e9ffbf738d2784d26f70f9db6fe1a57099eb5cb129d&mpshare=1&scene=1&srcid=05059UsS011ChQckeShTIQX4#rd)
---
title: 【Java】函数中的参数传递是“引用传递”还是“值传递”？
layout: post
date: 2015-11-02 15:33:20
comments: true
tags: [Java]
categories: [Java]
keywords: Java
description: 
---

> 问题引入：在一个快速排序的函数 private void quickSort(List<Integer> intList, int left, int right) 中，传进去的参数intList是对象传递还是引用传递呢？

先抛出结论：

 1. 将对象（对象的引用）作为参数传递时传递的是引用(相当于指针)。也就是说函数内对参数所做的修改会影响原来的对象。

 2. 当将基本类型或基本类型的包装集作为参数传递时，传递的是值。也就是说函数内对参数所做的修改不会影响原来的变量。
 
 3. 数组(数组引用)）作为参数传递时传递的是引用(相当于指针)。也就是说函数内对参数所做的修改会影响原来的数组。
 
 4. String类型(引用)作为参数传递时传递的是引用，只是对String做出任何修改时有一个新的String对象会产生，原来的String对象的值不会做任何修改。(但是可以将新的对象的       引用赋给原来的引用,这样给人的表面现象就是原来的对象变了，其实没有变，只是原来指向它的引用指向了新的对象)。


<!--more-->

----------

**举例一：**
```
public class Mainjava {
	String str=new String("good");
	char[] ch={'a','b','c'};
	Integer i = 0;
	int x = 0;
	Test t1 = new Test(); 
	Test t2 = new Test(); 
	
	public static void main(String args[]){
		Mainjava ex=new Mainjava();
		ex.change(ex.str,ex.ch, ex.x, ex.i, ex.t1, ex.t2);
		System.out.print(ex.str + " and ");
		System.out.print(String.valueOf(ex.ch) + " and ");
		System.out.print(ex.x + "," + ex.i + "," + ex.t1.getA() + "," + ex.t2.getA());
	}
	
	public void change(String str, char ch[], int x, Integer i, Test t1, Test t2){
		str="test ok";
		ch[0]='g';
		x = 2;
		i = 5;
		
		Test newT = new Test();
		newT.setA(99);
		t1 = newT;
		
		t2.setA(33);
	}
}

//Test类
public class Test {
	private int a = 0;
	
	public void setA(int a){
		this.a = a;
	}
	
	public int getA(){
		return a;
	}
}
```
输出结果是多少呢？

> good and gbc and 0,0,0,33


为什么不是"test ok and gbc and 2,5,99,33"呢？

因为str是引用数据类型String,而字符数组是基本数据类型,二者存放在内存中的机制是不一样的!
```
public void change(String str, char ch[], int x){
	str = "test ok";
	ch[0] = 'g';
	x = 2;
}
```
change()方法传入str,虽然把"test ok"强行赋给str,但是这里的str存放在新的栈内存中,和原来的str存放的地址不一样,所以你System.out.print(ex.str+"and");这里的输出还是调用原来内存中的str;
字符数组不一样,你声明一个字符数组之后,那个数组的位置就定死了,你调用change()之后,把原来的字符数组的第1个元素改为了g.这就是引用数据类型和基本数据类型的区别。

----------



**举例二：**

```
import java.util.ArrayList;
import java.util.List;

public class Mainjava {
	public static void main(String args[]){
		List<Integer> integerList = new ArrayList<Integer>();
        integerList.add(7);
        integerList.add(1);
        integerList.add(3);
        integerList.add(8);
        integerList.add(9);
        integerList.add(2);
        integerList.add(5);
        integerList.add(4);
        integerList.add(10);
        integerList.add(6);
        
        print(integerList);
        quickSort(integerList, 0, integerList.size()-1);
        print(integerList);  /*对比排序前后的integerList中的值，如果发生改变，说明是引用传递，即传递的是对象地址值*/
	}

	private static void quickSort(List<Integer> intList, int left, int right){
        if(left >= right) {
            return;
        }

        int i = left;
        int j = right;
        int key = intList.get(i);
        System.out.println("key:"+"intList.get("+i+")="+key);

        while(i < j){
            while(i < j && intList.get(j) >= key){
                j--;
            }
            intList.set(i, intList.get(j));

            while(i < j && intList.get(i) <= key){
                i++;
            }
            intList.set(j, intList.get(i));
        }
        intList.set(i, key);
        quickSort(intList, left, i - 1);
        quickSort(intList, i + 1, right);
    }

    private static void print(List<Integer> intList){
        for (int i = 0; i < intList.size(); i++) {
            System.out.print(intList.get(i)+", ");
        }
        System.out.println("");
    }
}
```
运行输出结果如下：

> 7, 1, 3, 8, 9, 2, 5, 4, 10, 6, 
key:intList.get(0)=7
key:intList.get(0)=6
key:intList.get(0)=2
key:intList.get(2)=3
key:intList.get(3)=4
key:intList.get(7)=9
1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 



----------


**结论：**

实验证明，Java中函数传递**对象**时，传递的是**[该对象的地址值](http://blog.csdn.net/yunzhongguwu005/article/details/9737215)**，即引用传递。
函数传递**基本类型数据**时，传递的是[**值**](http://zhidao.baidu.com/link?url=q-nDBrovT4jkLmdEilYuangnxwI23o2rLxW91yJJD9a0wC2LTcjN2ksUEgU2L6NR9cB68gBgj4jjWV3wms6iM_)，也就是说函数返回之后不会改变这个值。
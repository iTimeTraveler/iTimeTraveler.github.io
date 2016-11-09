---
title: 【Android】使用shape的同时，动态替换shape的颜色属性
layout: post
date: 2016-08-08 18:10:00
comments: true
tags: [Android]
categories: [Android]
keywords: Android
description: 在实现布局的时候，有些按钮形状相同，只是颜色有差异，如果使用自定义shape实现了其中一种按钮，有没有可能不需要再为其他每个颜色都写一个shape文件呢？
---


> 在实现布局的时候，有些按钮形状相同，只是颜色有差异，如果使用自定义shape实现了其中一种按钮，有没有可能不需要再为其他每个颜色都写一个shape文件呢？


#### **一、问题**
比如以下这三个按钮：

![三个样式相同的按钮](http://img.blog.csdn.net/20160808175543250)

为第一个灰色按钮自定义背景如下：
```xml
<?xml version="1.0" encoding="utf-8"?>
<shape
    xmlns:android="http://schemas.android.com/apk/res/android"
    android:shape="rectangle"
    android:color="@color/gray">

    <corners
        android:radius="60dip"/>
    <stroke
        android:width="0dp"
        android:color="@color/gray" />
    <solid
        android:color="@color/gray" />
</shape>
```
然后，如果再为每个颜色的按钮都写一个shape背景也太麻烦，重用性太差。

<!--more-->



#### **二、解决方法**

参考 [stackoverflow 这里](http://stackoverflow.com/questions/16775891/how-to-change-solid-color-from-the-code)， 在java代码里使用 GradientDrawable 动态设置
```java
GradientDrawable myGrad = (GradientDrawable)rectangle.getBackground();
myGrad.setColor(Color.BLACK);
```




【参考资料】
1、[How to change `solid color` from the code?](http://stackoverflow.com/questions/16775891/how-to-change-solid-color-from-the-code)
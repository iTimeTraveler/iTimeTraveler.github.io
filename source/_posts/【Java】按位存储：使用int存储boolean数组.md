---
title: 【Java】按位存储：使用int存储boolean数组
layout: post
date: 2016-06-02 11:55
comments: true
tags: [Java]
categories: [Java]
keywords: Java
description: 有一种场景，比如App设置页中会有一组开关选项，这个时候保存这些开关的状态，如果每个按钮都对应一个boolean值的话，太大材小用显得鸡肋，频繁读取SharedPreferences 存取效率自然快不过一次读取。
---

> 有一种场景，比如App设置页中会有一组开关选项，这个时候保存这些开关的状态，如果每个按钮都对应一个boolean值的话，太大材小用显得鸡肋，频繁读取SharedPreferences 存取效率自然快不过一次读取。


首先，敲定每个boolean值存储的位置
```java
	private int mBroadcastCustomValue = 0;   //用来存储的int值
	public static final int BROADCAST_TYPE_CUSTOM_BASE = 1;
	public static final int BROADCAST_TYPE_CUSTOM_TRAFFIC = 1 << 1;
	public static final int BROADCAST_TYPE_CUSTOM_CAMERA = 1 << 2;
	public static final int BROADCAST_TYPE_CUSTOM_SAFE = 1 << 3;
```


## **一、添加Add**

```java
private void addLevel(int level){
	mBroadcastCustomValue |= level;    //add
}

//调用方式如下
addLevel(BROADCAST_TYPE_CUSTOM_BASE);
```

<!--more-->


## **二、删除Delete**

```java
private void deleteLevel(int level){
	mBroadcastCustomValue ^= mBroadcastCustomValue & level;	    //delete
}

//调用方式如下
deleteLevel(BROADCAST_TYPE_CUSTOM_BASE);
```


## **三、读取Read**

```java
/**
 * 从value中读取level的设置值，level即是某个boolean值的位置
 */
private boolean isLevelAccess(int value, int level){
	if((value & level) == level){
		return true;
	}
	return false;
}

//调用方式如下
boolean a = isLevelAccess(mBroadcastCustomValue, BROADCAST_TYPE_CUSTOM_BASE);
```
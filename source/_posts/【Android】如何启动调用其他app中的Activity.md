---
title: 【Android】如何启动调用其他app中的Activity
layout: post
date: 2015-09-15 11:06
comments: true
tags: [Android]
categories: [Android]
keywords: Android
description: 最近项目正在将原系统拆分为小型App，所以需要在原Project中启动另一个新的App中的Activity。这样的话启动要用到ComponentName ，它就是用来打开其他应用程序中的Activity或服务的。
---


最近项目正在将原系统拆分为小型App，所以需要在原Project中启动另一个新的App中的Activity。这样的话启动要用到ComponentName ，它就是用来打开其他应用程序中的Activity或服务的。


用法其实很简单，像下面这样：

```java
//第一个参数是Activity所在的package包名，第二个参数是完整的Class类名（包括包路径）
ComponentName componetName = new ComponentName("com.cybo3d.cybox.miya", 			  
								"com.cybo3d.cybox.miya.MainActivity");
Intent intent = new Intent();
intent.setComponent(componetName);
startActivity(intent);

```

<!--more-->



我们来看源码中ComponentName的参数信息，pkg和cls均不能为null。此处特别注意第二个参数cls必须为  **完整的Class类名**。



```java
/**
     * Create a new component identifier.
     * 
     * @param pkg The name of the package that the component exists in.  Can
     * not be null.
     * @param cls The name of the class inside of <var>pkg</var> that
     * implements the component.  Can not be null.
     */
    public ComponentName(String pkg, String cls) {
        if (pkg == null) throw new NullPointerException("package name is null");
        if (cls == null) throw new NullPointerException("class name is null");
        mPackage = pkg;
        mClass = cls;
    }

    
```

 

> 另外，在调用的时候一定要保证在Manifest.xml中设置被启动Activity的**exported=true**，否则会报错Activity is not found.


![](http://img.blog.csdn.net/20150915124024829)

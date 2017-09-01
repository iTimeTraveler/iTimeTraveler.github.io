---
title: 【Gradle】Android Studio中Gradle重复依赖的问题
layout: post
date: 2017-02-23 13:03:00
comments: true
tags: 
    - Gradle
categories: 
    - Gradle
keywords: 
description: 
photos:
   - /gallery/gradle-as.png
---



## **问题**

项目中有个Module需要解析json所以选用了依赖Gson，但是编译时报错如下：

```
Error:Execution failed for task ':app:transformClassesWithJarMergingForAutoioDebug'.
> com.android.build.api.transform.TransformException: java.util.zip.ZipException: duplicate entry: com/google/gson/annotations/Expose.class
```


## **分析**

看到错误中的这个**duplicate**，第一反应和平常一样，难道是得先清理一下Clean project ? 反复试了几次都不行，上网查才发现是重复依赖Gson库的问题，导致项目中有了两个重复的`Expose.class` 类。

使用快捷键（Shift + Ctrl + T）查看项目中的`Expose.class` 类，发现是和passport-1.4.2.jar这个本地jar包冲突了，它也依赖了gson库所以导致了重复依赖。

![](http://img.blog.csdn.net/20170223114733531)

<!-- more -->

### 项目结构

在往下面分析之前，需要先根据项目结构说明一下问题的本质，就是Module

![](http://img.blog.csdn.net/20170223124701598)


### 踩过的坑

第一个查到的解决办法是这个[**Android Studio中如何解决重复依赖导致的app:transformClassesWithJarMergingForDebug**](http://blog.csdn.net/cx1229/article/details/52786168)，但是他的问题是依赖另外一个库retrofit，她用了下面的办法：

```gradle
compile ('com.squareup.retrofit2:converter-gson:2.1.0'){
	exclude group: 'com.google.code.gson'
}
```

所以我也尝试仿照他的方法，在我的Speech模块下的build.gradle文件里修改

```gradle
//注意：下面的方法是错的
dependencies {
    compile fileTree(include: '*.jar', dir: 'libs'){    //错的
        exclude group: 'com.google.code.gson', module: 'gson'
    }
}
```

报错如下，显然这么写是不对的，对于依赖本地jar文件这么写是不对的：

```
Error:Could not find method exclude() for arguments [{group=com.google.code.gson, module=gson}] on directory '{include=*.jar, dir=libs}' of type org.gradle.api.internal.file.collections.DefaultConfigurableFileTree.
```

但是，他们的解决思路是对的，就是**想办法屏蔽其中一个Gson库**。既然如此，我们可以多尝试各个引入它们的地方。


## **解决办法**

最后试来试去，才发现exclude需要写在App **主Module** 的build.gradle文件中才能生效，而且注意 project(':Speech') 外面那层括号：

```gradle
apply plugin: 'com.android.application'		//注意这是主Module

repositories {
    mavenCentral()
}

dependencies {
    // Module dependency
    compile project(':passportSDKLib')
    compile (project(':Speech')){
	    //解决Gson重复依赖问题，与passport-1.4.2.jar有冲突
        exclude group: 'com.google.code.gson', module: 'gson'       
    }
    compile project(':Skin')
    compile fileTree(include: '*.jar', dir: 'src/main/libs')
}
```

唉，世界终于清静了

---

## 参考资料

1、[**AndroidStudio中如何解决重复依赖导致的app:transformClassesWithJarMergingForDebug**](http://blog.csdn.net/cx1229/article/details/52786168)
2、[**AndroidStudio的Gradle添加重复依赖的问题**](http://blog.csdn.net/yisizhu/article/details/49952841)

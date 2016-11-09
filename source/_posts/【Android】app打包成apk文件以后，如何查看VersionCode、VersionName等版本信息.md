---
title: 【Android】app打包成apk文件以后，如何查看VersionCode、VersionName等版本信息
layout: post
date: 2015-12-25 10:57:55
comments: true
tags: [Android]
categories: [Android]
keywords: Android
description: 
---


> Android App打包成Apk后，其实是一个压缩文件，可以将后缀名apk改为zip然后用winrar打开也能看到里面的文件结构。还能看到AndroidManifest.xml。但是里面的内容经过编码显示为乱码，不方便查看。



**— aapt工具：**

&nbsp;&nbsp;这里我们可以使用**aapt工具**来查看。aapt.exe工具即Android Asset Packaging Tool，在SDK的build-tools目录下。

&nbsp;&nbsp;该工具可以查看，创建， 更新ZIP格式的文档附件(zip, jar, apk)。也可将资源文件编译成二进制文件，尽管你可能没有直接使用过aapt工具，但是build scripts和IDE插件会使用这个工具打包apk文件构成一个Android 应用程序。在使用aapt之前需要在环境变量里面配置SDK-tools路径，或者是路径+aapt的方式进入aapt。

<!--more-->

&nbsp;&nbsp;也就是说平时我们不会用这个东西，但是打包成Apk的时候其实是用到了的，只不过IDE替我们做了这一步，那么我们就用这个工具来查看VersionCode和VersionName。


**— 操作流程：**

1、首先找到aapt工具，在Android SDK文件夹下的build-tools包里，如下：

```bash
cd D:\Android\SDK\build-tools\23.0.0_rc3
```

2、然后使用aapt dump bading XXX.apk就能看到VersionCode等信息

```bash
aapt dump badging C:\Users\kuguan\Desktop\app-release_1.0.9.apk
```

![](http://img.blog.csdn.net/20151225105455337)
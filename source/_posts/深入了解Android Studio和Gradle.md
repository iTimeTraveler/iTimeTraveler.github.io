---
title: 深入了解Android Studio和Gradle
layout: post
date: 2016-10-18 17:08:00
comments: true
tags: 
    - Android
categories: 
    - Android
keywords: Android
description: 
---


> 原文链接： [**重新认识AndroidStudio和Gradle，这些都是我们应该知道的**](https://zhuanlan.zhihu.com/p/22990436)  — by [井方哥](https://www.zhihu.com/people/zeng-jing-fang)

## **前言**

主要从AndroidStudio的环境安装升级，Gradle，Eclipse转AS,多渠道配置，Maven私服，Action,Option，快捷键等几个方面出发，讲一些操作技巧以及我对AndroidStudio使用的一些理解与经验。本文较全面的讲述了我们在开发中必须要了解的，比较多而全，可能不能马上记住，目的在于大家看我之后能有一个认识，在需要使用的时候知道有这么个东西。希望对你的开发工作有所帮助，不足之处，请批评指正。

## **一、Install&Settings&Update**

### 1、Gradle

Gradle官方会不断更新，我们可以使用本地安装的方式，并配置path，我们就可以使用Terminal直接输入gradle命令执行构建任务。当然如果我们想快速更新，可以修改配置文件。 首先，修改`project\gradle\warpper\gradle-wapper.properties` 文件，其中distributionUrl的值：

```gradle
 distributionUrl=https\://services.gradle.org/distributions/gradle-2.4-all.zip
```

这里实际是从网络下载配置的版本，会自动检测，如果不是的就会下载。

然后修改 project的build.gradle

```gradle
dependencies {
    classpath 'com.android.tools.build:gradle:1.3.0'

    // NOTE: Do not place your application dependencies here; they belong
    // in the individual module build.gradle files
}
```

<!--more-->

注意：这两个配置是一一对应的，比如gradle-2.4-all对应的就是1.3.0。后者的意思是这个project配置的gradle构建版本为1.3.0，前者的意思是这个project使用的gradle的版本为2.4。我们会发现，如果我们修改前者，如果本地没有安装这个版本的gradle，会自动从gradle官网下载。但是，如果我们修改后者，它会自动从jcenter()仓库下载一些plugin之类的。

### 2、AS具体的安装和更新网上有许多的详细教程，我只想说以下三点。

 - Android Studio是Google官方基于IntelliJ IDEA开发的一款Android应用开发工具,绝逼比Eclipse强大，还没有转的尽快吧:

 - 关闭AndroidStudio的自检升级，如果准备好升级还是自己选择想升级的版本升级靠谱；

 - 升级前导出AndroidStudio的配置文件settings.jar(C:\Users\Administrator.AndroidStudio1.4\config目录下，或者操作File|Export Setings导出)，升级后导入Settings.jar，这样就不需要重新配置，有必要的话给自己备份一个，说不定老天无缘无故挂了重装很方便。

 - 具体细节的配置可以阅读，强烈建议直接打开AS的设置窗口，多转几次就熟悉了里边的各种配置啦。也可以参考这边文章，（1.4版本，有点旧了，差不多够用）[打造你的开发工具，settings必备](http://blog.csdn.net/JF_1994/article/details/50085825)


## **二、Gradle**

### 1 简述Groovy语言

Groovy是一种开发语言，是在Java平台上的，具有向Python，Ruby语言特性的灵活动态语言,Groovy保重了这些特性像Java语法一样被Java开发者使用。编译最终都会转成java的.class文件。他们的关系如下图。我想这大概也是Gradle构建系统为什么要选择Groovy的原因，它具有java语言的特性，开发者容易理解使用。一定要明白我们在build.gradle里边不是简单的配置，而是直接的逻辑开发。如果你熟练掌握Groovy，那么你在build.grale里边可以做任何你想做的事。

### 2 Gradle编程框架

Gradle是一个工具，同时它也是一个编程框架。使用这个工具可以完成app的编译打包等工作，也可以干别的工作！Gradle里边有许多不同的插件，对应不同的工程结构、打包方式和输出文件类型。我们经常使用到的便是maven\java\com.android.application\android-library等。当按照要求配置好gradle的环境后，执行gradle的task，便会自动编译打包输出你想要的.apk.aar.jar文件,如果你足够牛逼，你有gradle就够了，直接拿记事本开发；

**如下图，是Gradle的工作流程。**

 - Initializtion 初始化，执行settings.gradle(我们看到都是include",实际里边可深了）
 
 - Hook 通过API来添加，这中间我们可以自己编程干些自己想做的事情
 
 - Configuration 解析每个project的build.gradle，确定project以及内部Task关系，形成一个有向图
 
 - Execution 执行任务，输入命令 gradle xxx ,按照顺序执行该task的所有依赖以自己本身
 
### 3 关于gradle的task

每个构建由一个或者多个project构成，一个project代表一个jar，一个moudle等等。一个project包含若干个task，包含多少由插件决定，而每一个task就是更细的构建任务，比如创建一个jar、生成Javadoc、上传aar到maven仓库。我们可以通过执行如下命令查看所有的task:

```gradle
gradle tasks --all
```

当然，我们也可以在AS中可以看到所有的task，双击就可以执行单个的task.

当然，我们也可以在build.gradle中写自己的task。关于详细的task介绍可以查看网络资料进行学习，推荐[Gradle入门系列](http://blog.jobbole.com/71999/)，基本花上半天到一天的时候简单的过一遍就有一个大概的了解。

### 4 Gradle环境下Android的文件结构

>  - project-name
>    - gradle
>    - module-name
>      - build	//构建生成文件
>          - intermediates//构建打包的资源文件
>              - assets//资源文件
>              - exploded-aar//如果我们依赖了许多的aar或者依赖工程，最终都“copy"到了这个目录下
>              - mainfests//合并的mainfest
>          - outputs
>              - apk//输出我们需要的.apk文件
>              - lint-results.html//lint检查报告
>          - reports
>              - tests//单元测试报告
>          - ivy.xml//moudle的配置（task任务）、依赖关系等
>      - libs	//本地的依赖jar包等
>      - src	//本moudule所有的代码和资源文件
>          - androidTest	//需要android环境的单元测试，比如UI的单元测试
>          - Test	//普通的java单元测试
>          - main	//主渠道
>              - java	//java code
>              - jni //navtive jni so
>              - gen
>              - res
>              - assets
>              - AndroidManifest.xml +build.gradle //module
>    - build.gradle // for all module
>    - gradle.propeties //全局配置文件
>    - local.properties //SDK、NDK配置
>    - config.gradle//自定义的配置文件
>    - settings.gradle//module管理

### 6 关于几个buid.gradle、gradle.propeties文件

 - build.gradle文件(主工程的Top-level)

```gradle
apply from:"config.gradle"//可以给所有的moudle引入一个配置文件

buildscript {
     repositories {
     jcenter()
}
dependencies {
    classpath 'com.android.tools.build:gradle:1.3.0'
    // NOTE: Do not place your application dependencies here; they belong
     // in the individual module build.gradle files
    }
}

allprojects {
    repositories {
        jcenter()//引入远程仓库
        maven { url MAVEN_URL }//引入自己的私有maven仓库
    }
}
```

 - gradle.properties(全局配置文件）

```
# This can really make a significant difference if you are building a very complex project with many sub-module dependencies:
#sub-moudle并行构建
org.gradle.parallel=true
#后台进程构建
org.gradle.daemon=true
#私有maven仓库地址
MAVEN_URL= http://xxx.xx.1.147:8081/nexus/content/repositories/thirdparty/
```

 - build.gradle(module)
 

```gradle
apply plugin: 'com.android.application'//插件 决定是apk\aar\jar等

android {
compileSdkVersion 23
buildToolsVersion "24.0.0"

// 此处注释保持默认打开，关闭后可使不严格的图片可以通过编译,但会导致apk包变大
//aaptOptions.cruncherEnabled = false
//aaptOptions.useNewCruncher = false

 packagingOptions {
     exclude 'META-INF/NOTICE.txt'// 这里是具体的冲突文件全路径
     exclude 'META-INF/LICENSE.txt'
}
//默认配置
defaultConfig {
    applicationId "com.locove.meet"
    minSdkVersion 16
    targetSdkVersion 23
    versionCode 1
    versionName "1.0"
    multiDexEnabled=true//65536问题
}
sourceSets {
    main {
        jniLibs.srcDirs = ['libs']//重新配置路径
    }
}
buildTypes {
    release {
    // zipAlign优化
    zipAlignEnabled true
    // 移除无用的resource文件
    shrinkResources false
    // 混淆
    minifyEnabled false
    proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
    signingConfig signingConfigs.releaseConfig
    }
}
}

dependencies {
    compile fileTree(dir: 'libs', include: ['*.jar'])
    compile 'com.google.code.gson:gson:2.2.+'
    testCompile 'junit:junit:4.12'
}
```

### 7 gradle编译文件和缓存文件

 - gradle缓存文件：C:\Users\Administrator.gradle\caches\modules-2\files-2.1
 - idea缓存文件： C:\Users\Administrator.AndroidStudio1.4


## 三、构建过程简析

这里参考了QQ音乐技术团队Android构建过程分析 下图是文章末尾的一张构建流程图：

 - **解压合并资源**： 主要是assets目录，res目录，Androidmainfest.xml目录。其中合并的时候会涉及到优先级的问题，详情请查看该篇文章。

 - **AAPT(Android Asset Packaging Tool)打包**
     - R.java文件 资源ID
     - app.ap 压缩包
     - 对png图进行优化等

 - **源码编译**：  生成.class字节码，在这里可以进行删除无用类，字节码优化，重命名（包名），还有一点就是代码混淆。

 - **生成dex、打包签名、zipalign**

---
title: 【Android】如何加速 AndroidStudio 的编译效率
layout: post
date: 2016-08-26 15:20:00
comments: true
tags: [Android]
categories: [Android]
keywords: Android
---

### **引言**

如果你之前用eclipse开发过Android app的话，转到android studio的第一反应也许就是："**编译速度有点慢**"，表现的最明显的一点就是，每次android studio使用gradle编译，即便是更改的代码量很少，也会按照预先设置的task的顺序，依次走完编译的各项流程。这时候如果电脑CPU配置不高的时候，就会超级卡界面，更别说改代码了。

所以 这点就让人很痛苦， 然而问题总还是要被解决的，作者曾经亲眼看到过使用android studio仅仅用了2.5秒就编译完毕(在代码更改很少的情况下)。 现在把如何优化gradle编译速度的方法记录在此，希望可以 帮助到广大的同行们。


### **准备工作**

首先，保证项目使用的Gradle是最新的，我这里用的是2.10版本。因为Gradle 2.4之后在编译效率上面有了一个非常大的提高，看下图官方的速度对比。

![这是官方的速度对比，下一代编译速度更快](http://img.blog.csdn.net/20160826151929475)

<!--more-->


然后先在你的项目build.gradle文件内(不是app里面的gradle文件), 就是这里：

![配置文件在项目中的位置](http://img.blog.csdn.net/20160826151521755)

添加一个task， 代码如下:

```gradle
task wrapper(type: Wrapper) {
    gradleVersion = '2.10'  //你安装的最新Gradle版本
}
```

加进去以后是这个样子：


```gradle
// Top-level build file where you can add configuration options common to all sub-projects/modules.

// Running 'gradle wrapper' will generate gradlew - Getting gradle wrapper working and using it will save you a lot of pain.

task wrapper(type: Wrapper) {
    gradleVersion = '2.10'
}

buildscript {
    repositories {
        jcenter()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:2.1.0'
    }
    ext {
        compileSdkVersion = 21
        buildToolsVersion ="23.0.2"
        minSdkVersion = 18
        targetSdkVersion = 21

        sourceCompatibility = JavaVersion.VERSION_1_7
        targetCompatibility = JavaVersion.VERSION_1_7
    }
}
```


然后打开terminal, 输入`./gradlew wrapper`，Windows 下输入：

```bash
gradlew wrapper
```
然后gradle就会自动去下载2.4版本,这也是官方推荐的[**手动设置gradle的方法**](http://gradle.org/docs/current/userguide/gradle_wrapper.html)



### **守护进程，并行编译**

通过以上步骤,我们设置好了 Android Studio 使用最新的 Gradle 版本，下一步就是正式开启优化之路了。我们需要将gradle作为守护进程一直在后台运行，这样当我们需要编译的时候，gradle就会立即跑过来然后 吭哧吭哧的开始干活。除了设置gradle一直开启之外，当你的工作空间存在多个project的时候，还需要设置gradle对这些projects并行编译，而不是单线的依次进行编译操作。

说了那么多， 那么怎么设置守护进程和并行编译呢？其实非常简单，gradle本身已经有了相关的配置选项，在你电脑的GRADLE_HOME这个环境变量所指的那个文件夹内，有一个.gradle/gradle.properties文件。 在这个文件里，放入下面两句话就OK了:

```
org.gradle.daemon=true
org.gradle.parallel=true
```
有一个地方需要注意的是,android studio 本身在编译的时候,已经是使用守护进程中的gradle了,那么这里加上了org.gradle.daemon=true就是保证了你在使用命令行编译apk的时候也是使用的守护进程.

你也可以将上述的配置文件放到你project中的根目录下,以绝对确保在任何情况下,这个project都会使用守护进程进行编译.不过有些特殊的情况下也许你应该注意守护进程的使用,具体的细节参考官网[**When should I not use the Gradle Daemon?**](http://gradle.org/docs/current/userguide/gradle_daemon.html#when_should_i_not_use_the_gradle_daemon)

在使用并行编译的时候必须要注意的就是,你的各个project之间不要有依赖关系,否则的话,很可能因为你的Project A 依赖Project B, 而Project B还没有编译出来的时候,gradle就开始编译Project A 了.最终 导致编译失败.具体可以参考官网[**Multi-Project Building and Testing**](http://gradle.org/docs/current/userguide/multi_project_builds.html#sec:decoupled_projects)。

还有一些额外的gradle设置也许会引起你的兴趣,例如你想增加堆内存的空间,或者指定使用哪个jvm虚拟机等等(代码如下)

```
org.gradle.jvmargs=-Xmx768m
org.gradle.java.home=/path/to/jvm
```

如果你想详细的了解gradle的配置,请猛戳官网 [**Gradle User Guide**](http://gradle.org/docs/current/userguide/userguide_single.html#sec:gradle_configuration_properties)。




#### 【参考资料】：
1、[Boosting the performance for Gradle in your Android projects](https://medium.com/@erikhellman/boosting-the-performance-for-gradle-in-your-android-projects-6d5f9e4580b6#.xkvoyii8g)
2、[译文：优化android studio编译效率的方法](http://www.devtf.cn/?p=585)
3、[How/when to generate Gradle wrapper files?](http://stackoverflow.com/questions/25769536/how-when-to-generate-gradle-wrapper-files)
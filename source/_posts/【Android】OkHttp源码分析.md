---
title: 【Android】OkHttp源码分析
layout: post
date: 2018-01-25 22:20:55
comments: true
tags: 
    - Android
    - 源码分析
categories: 
    - Android
    - 源码分析
keywords: OkHttp
description: 
photos:
    - https://raw.githubusercontent.com/iTimeTraveler/iTimeTraveler.github.io/master/gallery/android_common/okhttp_interceptors.png
---



而OkHttp 是基于http协议封装的一套请求客户端，虽然它也可以开线程，但根本上它更偏向真正的请求，跟HttpClient, HttpUrlConnection的职责是一样的。





### 参考资料

- [拆轮子系列：拆OkHttp](https://blog.piasy.com/2016/07/11/Understand-OkHttp/)
- [OkHttp的初始化](http://blog.csdn.net/a109340/article/details/73887753)
- [Android主流网络请求开源库的对比（Android-Async-Http、Volley、OkHttp、Retrofit）](http://blog.csdn.net/carson_ho/article/details/52171976)
- [OkHttp, Retrofit, Volley应该选择哪一个？](https://www.jianshu.com/p/77d418e7b5d6)


---
title: 【Android】Picasso加载本地图片如何清理缓存cache？
layout: post
date: 2016-03-08 15:03
comments: true
tags: [Android]
categories: [Android]
keywords: Android
description: 使用Picasso加载SD卡图片的时候，Picasso也会对该图片进行缓存。所以如果该图片即使已经变了，Picasso在加载时会仍然使用缓存，而不更新图片。
---


> 使用Picasso加载SD卡图片的时候，Picasso也会对该图片进行缓存。所以如果该图片即使已经变了，Picasso在加载时会仍然使用缓存，而不更新图片。


### 1、**Picasso缓存策略**

我们都知道图片缓存使用的是Map键值对存储的，这里的Key就是加载的图片的Url，所以如果我们使用相同的ImageUrl去加载图片的话，如果使用了缓存，Picasso会直接读取缓存的内容，而不是从SD卡、或者网络Http中重新加载。


### 2、**Picasso如何跳过缓存**

试了很多网上推荐的方法均不见起效，最后使用了下面这种策略，也就是**`加载图片时直接跳过缓存`**

```
Picasso.with(getContext()).load(imageUrl).memoryPolicy(MemoryPolicy.NO_CACHE).into(image);
```

注意其中的*.memoryPolicy(MemoryPolicy.NO_CACHE)*即是关键代码，其中

 - MemoryPolicy.NO_CACHE：是指图片加载时放弃在内存缓存中查找。
 - MemoryPolicy.NO_STORE：是指图片加载完不缓存在内存中。

ps：**此处的方法并不是真正的清理缓存，而是跳过缓存直接从源头获取**。


网上有几种错误的方法如下，经验证均不起效：

1、`Picasso.with(getActivity()).invalidate(file);`
2、`Picasso.with(getActivity()).load(url).skipMemoryCache().into(image);`

最后还是在StackOverFlow的[Clear Cache memory of Picasso](http://stackoverflow.com/questions/27502659/clear-cache-memory-of-picasso)查到了如上的解决办法。


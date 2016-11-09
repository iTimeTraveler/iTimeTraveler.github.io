---
title: 【Android】获取View的截图
layout: post
date: 2016-08-30 10:32:00
comments: true
tags: [Android]
categories: [Android]
keywords: Android
description: 
---


### **引言**

 在Android应用开发过程中，可能会遇到需要对整个界面或者某一部分进行截图的需求。


Android中对View的截图也有以下两种方式，值得注意的是**两个方法都不适用于`SurfaceView`**：


### **使用DrawingCache**

如果使用DrawingCache，则对要截图的View有一个要求：View本身已经显示在界面上。如果View没有添加到界面上或者没有显示（绘制）过，则buildDrawingCache会失败。这种方式比较适合对应用界面或者某一部分的截图。步骤很简单：

```java
view.setDrawingCacheEnabled(true);  
view.buildDrawingCache();  		//启用DrawingCache并创建位图  

//创建一个DrawingCache的拷贝，因为DrawingCache得到的位图在禁用后会被回收  
Bitmap bitmap = Bitmap.createBitmap(view.getDrawingCache()); 
view.setDrawingCacheEnabled(false);  	//禁用DrawingCahce否则会影响性能  
```

<!--more-->

完整的截图功能函数如下：

```java
 /**
   * 获取一个 View 的缓存视图
   *
   * @param view
   * @return
   */
  private Bitmap getCacheBitmapFromView(View view) {
      final boolean drawingCacheEnabled = true;
      view.setDrawingCacheEnabled(drawingCacheEnabled);
      view.buildDrawingCache(drawingCacheEnabled);
      final Bitmap drawingCache = view.getDrawingCache();
      Bitmap bitmap;
      if (drawingCache != null) {
          bitmap = Bitmap.createBitmap(drawingCache);
          view.setDrawingCacheEnabled(false);
      } else {
          bitmap = null;
      }
      return bitmap;
  }
```


### **直接调用View.draw**

如果需要截图的View并没有添加到界面上，可能是通过java代码创建的或者inflate创建的，此时调用DrawingCache方法是获取不到位图的。因为View在添加到容器中之前并没有得到实际的大小（如果LayoutWidth是MatchParent，它还没有Parent…），所以首先需要指定View的大小：

```java
private void layoutView(View v, int width, int height) {  
    // validate view.width and view.height  
    v.layout(0, 0, width, height);  
    int measuredWidth = View.MeasureSpec.makeMeasureSpec(width, View.MeasureSpec.EXACTLY);  
    int measuredHeight = View.MeasureSpec.makeMeasureSpec(height, View.MeasureSpec.EXACTLY);  
    
    // validate view.measurewidth and view.measureheight  
    v.measure(measuredWidth, measuredHeight);  
    v.layout(0, 0, v.getMeasuredWidth(), v.getMeasuredHeight());i  
}  
```

使用方式如下：

```java
int viewWidth = webView.getMeasuredWidth();  
int viewHeight = webView.getMeasuredHeight();  
if (viewWidth > 0 && viewHeight > 0) {  
    b = Bitmap.createBitmap(viewWidth, viewHeight, Config.ARGB_8888);  
    Canvas cvs = new Canvas(b);  
    webView.draw(cvs);  
}  
```

对于WebView的截图有一点特殊，网页内容并不能在布局完成后立即渲染出来，大概需要300ms的时间（对于不同性能的设备、网页复杂程度和Webkit版本可能不同）。

如果创建后台的WebView需要截图的话，应该在创建时就对其进行布局操作，这样加载完成后大部分就已经渲染完毕了（除非有异步的js处理）。



【参考资料】：

1、[Android应用截图两种方法](http://blog.csdn.net/jokers_i/article/details/39549633)
2、[知乎和简书的夜间模式实现套路](http://geek.csdn.net/news/detail/97777)
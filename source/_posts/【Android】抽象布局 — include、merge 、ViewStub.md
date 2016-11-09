---
title: 【Android】抽象布局 — include、merge 、ViewStub
layout: post
date: 2016-09-19 11:47:00
comments: true
tags: [Android]
categories: [Android]
keywords: Android
description: 
---


在布局优化中，Androi的官方提到了这三种布局`<include/>`、`<merge />`、`<ViewStub />`，并介绍了这三种布局各有的优势，下面也是简单说一下他们的优势，以及怎么使用，记下来权当做笔记。

### **一、布局重用&lt;include/>**

&lt;include />标签能够重用布局文件，简单的使用如下：

```xml
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"  
    android:orientation="vertical"   
    android:layout_width=”match_parent”  
    android:layout_height=”match_parent”  
    android:background="@color/app_bg"  
    android:gravity="center_horizontal">  
  
    <include layout="@layout/titlebar"/>  
  
    <TextView android:layout_width=”match_parent”  
              android:layout_height="wrap_content"  
              android:text="@string/hello"  
              android:padding="10dp" />  
  
</LinearLayout>  
```

<!--more-->

- 1) &lt;include />标签必须使用单独的layout属性。

- 2) 可以使用其他属性。&lt;include />标签若指定了ID属性，而你的layout也定义了ID，则你的layout的ID会被覆盖。

- 3) 在include标签中所有的android:layout_*都是有效的，前提是必须要写layout_width和layout_height两个属性。

- 4) 布局中可以包含两个相同的include标签，引用时可以使用[**如下方法解决**](http://www.coboltforge.com/2012/05/tech-stuff-layout/)

比如这个布局文件：
```xml
<?xml version="1.0" encoding="utf-8"?>
<ScrollView xmlns:android="http://schemas.android.com/apk/res/android"
android:layout_width="fill_parent"
android:layout_height="fill_parent"
android:scrollbars="vertical" >

  <LinearLayout
  android:layout_width="fill_parent"
  android:layout_height="wrap_content"
  android:focusable="true"
  android:focusableInTouchMode="true"
  android:orientation="vertical"
  android:padding="10dip" >

    <include
    android:id="@+id/discovered_servers"
    layout="@layout/discovered_servers_element" />

    <include
    android:id="@+id/bookmarks"
    layout="@layout/bookmarks_element" />

	//注意以下这个include和上面的include
	<include android:id="@+id/bookmarks_favourite"
    layout="@layout/bookmarks_element" />

    <include
    android:id="@+id/new_conn"
    layout="@layout/new_conn_element" />

  </LinearLayout>

</ScrollView>
```

这里我们include了两次`res/layout/bookmarks_element.xml`，这个子布局内容如下：

```xml
<!-- res/layout/bookmarks_element.xml 布局 -->

<?xml version="1.0" encoding="utf-8"?>
<merge xmlns:android="http://schemas.android.com/apk/res/android" >

  <TextView
  android:layout_width="fill_parent"
  android:layout_height="wrap_content"
  android:paddingBottom="10dip"
  android:paddingTop="10dip"
  android:text="@string/bookmarks"
  android:textAppearance="?android:attr/textAppearanceLarge" />

  <LinearLayout
 android:id="@+id/bookmarks_list"
  android:layout_width="fill_parent"
  android:layout_height="wrap_content"
  android:orientation="vertical"
  android:padding="10dip" />

</merge>
```

如果向下面这样调用是**错的**，

```java
LinearLayout fav_bookmarks = findViewById(R.id.bookmarks_list); 	// WRONG!!!!
```

正确的方法是这样：

```java
View bookmarks_container_2 = findViewById(R.id.bookmarks_favourite); 

bookmarks_container_2.findViewById(R.id.bookmarks_list);
```

### **二、减少视图层级&lt;merge/>**

&lt;merge />标签用于减少View树的层次来优化Android的布局。先来用个例子演示一下：

首先主需要一个配置文件activity_main.xml

```xml
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
  xmlns:tools="http://schemas.android.com/tools"
  android:layout_width="match_parent"
  android:layout_height="match_parent" >

  <TextView
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="merge标签使用" />

</RelativeLayout>
```

再来一个最简单的Activity，文件名MainActivity.java

```java
package com.example.merge;

import android.app.Activity;
import android.os.Bundle;

public class MainActivity extends Activity {

     @Override
     protected void onCreate(Bundle savedInstanceState) {
          super.onCreate(savedInstanceState);
          setContentView(R.layout.activity_main);
     }
}
```

按着上面的代码创建工程，运行后使用“DDMS -> Dump View Hierarchy for UI Automator”工具，截图如下:

- merge 使用前：
![merge 使用前](http://img.blog.csdn.net/20160919112652311)

最下面两层`RelativeLayout`与`TextView`就是 **activity_main.xml** 布局中的内容，上面的`FrameLayout`是Activity setContentView添加的顶层视图。下面使用merge标签可以查看下区别。

布局文件 activity_main.xml 修改内容如下：

```xml
<merge xmlns:android="http://schemas.android.com/apk/res/android"
  xmlns:tools="http://schemas.android.com/tools"
  android:layout_width="match_parent"
  android:layout_height="match_parent" >

  <TextView
    android:layout_width="wrap_content"
    android:layout_height="wrap_content"
    android:text="merge标签使用" />

</merge>
```

使用“DDMS -> Dump View Hierarchy for UI Automator”工具，截图如下:

- merge 使用后
![merge使用后](http://img.blog.csdn.net/20160919112911484)

可以看到，`FrameLayout`下面直接就是`TextView`，与之前的相比**少了一层 RelativeLayout **而实现的效果相同。

 - 那么，什么情况考虑使用`<merge />`标签？
 
  - 一种是向上面的例子一样，子视图不需要指定任何针对父视图的布局属性，例子中TextView仅仅需要直接添加到父视图上用于显示就行。
  
  - 另外一种是假如需要在LinearLayout里面嵌入一个布局（或者视图），而恰恰这个布局（或者视图）的根节点也是LinearLayout，这样就多了一层没有用的嵌套，无疑这样只会拖慢程序速度。而这个时候如果我们使用merge根标签就可以避免那样的问题，官方文档 [Android Layout Tricks #3: Optimize by merging](http://android-developers.blogspot.com/2009/03/android-layout-tricks-3-optimize-by.html)  中的例子演示的就是这种情况。

 - `<merge />`标签有什么限制没？
  - &lt;merge />只能作为XML布局的根标签使用。
  - 当 Inflate 以&lt;merge />开头的布局文件时，必须指定一个父ViewGroup，并且必须设定attachToRoot为**`true`**。


### **三、需要时使用&lt;ViewStub />**

限于篇幅，这里只大概总结一下`ViewStub`的使用方法，详细介绍和使用写到后面的文章中。

&lt;ViewStub />标签最大的优点是当你需要时才会加载，使用他并不会影响UI初始化时的性能。各种不常用的布局想进度条、显示错误消息等可以使用&lt;ViewStub />标签，以减少内存使用量，加快渲染速度。&lt;ViewStub />是一个不可见的，大小为0的View。&lt;ViewStub />标签使用如下：

```xml
<ViewStub  
    android:id="@+id/stub_import"  
    android:inflatedId="@+id/panel_import"  
    android:layout="@layout/progress_overlay"  
    android:layout_width="fill_parent"  
    android:layout_height="wrap_content"  
    android:layout_gravity="bottom" />  
```

当你想加载布局时，可以使用下面其中一种方法：

```java
((ViewStub) findViewById(R.id.stub_import)).setVisibility(View.VISIBLE);  
```

or

```java
View importPanel = ((ViewStub) findViewById(R.id.stub_import)).inflate();  
```

当调用inflate()函数的时候，ViewStub被引用的资源替代，并且返回引用的view。 这样程序可以直接得到引用的view而不用再次调用函数findViewById()来查找了。

**注：ViewStub 目前有个缺陷就是还不支持 `<merge />` 标签。**

更多`<ViewStub />`标签介绍可以参考官网教程《[Android Layout Tricks #3: Optimize with stubs](http://android-developers.blogspot.com/2009/03/android-layout-tricks-3-optimize-with.html)》

【参考资料】：

1、[Android抽象布局 — include、merge 、ViewStub](http://blog.csdn.net/xyz_lmn/article/details/14524567)
2、[Tech Stuff: Android &lt;include/> layout pitfalls](http://www.coboltforge.com/2012/05/tech-stuff-layout/)
3、[Android 性能优化 四 布局优化merge标签的使用](http://www.tuicool.com/articles/jyyUV33)
4、[Android之merge布局](http://www.cnblogs.com/travelfromandroid/articles/2133206.html)
5、 [Android实战技巧：ViewStub的应用](http://blog.csdn.net/hitlion2008/article/details/6737537/)


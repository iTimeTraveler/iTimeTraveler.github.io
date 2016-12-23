---
title: 【Android 】TextView 局部文字变色
layout: post
date: 2016-09-07 15:02:45
comments: true
tags: [Android]
categories: [Android]
keywords: Android
description: 
---


> TextView 对于富文本效果的实现支持不支持呢？比如“局部文字颜色的变动”，“局部字体的变动”


### **一、需求效果**

![比如这个](http://img.blog.csdn.net/20161009150647271)


### **二、解决方案**

针对这类问题，Android提供了 [**`SpannableStringBuilder`**](https://developer.android.com/reference/android/text/SpannableStringBuilder.html)，方便我们自定义富文本的实现。

```java
  textView = (TextView) findViewById(R.id.textview);
  SpannableStringBuilder builder = new SpannableStringBuilder(textView.getText().toString());
  
  //ForegroundColorSpan 为文字前景色，BackgroundColorSpan为文字背景色
  ForegroundColorSpan redSpan = new ForegroundColorSpan(Color.RED);
  ForegroundColorSpan whiteSpan = new ForegroundColorSpan(Color.WHITE);
  ForegroundColorSpan blueSpan = new ForegroundColorSpan(Color.BLUE);
  ForegroundColorSpan greenSpan = new ForegroundColorSpan(Color.GREEN);
  ForegroundColorSpan yellowSpan = new ForegroundColorSpan(Color.YELLOW);
 
 
  builder.setSpan(redSpan, 0, 1, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
  builder.setSpan(whiteSpan, 1, 2, Spannable.SPAN_INCLUSIVE_INCLUSIVE);
  builder.setSpan(blueSpan, 2, 3, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
  builder.setSpan(greenSpan, 3, 4, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
  builder.setSpan(yellowSpan, 4,5, Spannable.SPAN_EXCLUSIVE_EXCLUSIVE);
  
  textView.setText(builder);
```

<!--more-->


除了上述代码中使用的 `ForegroundColorSpan` 和 `BackgroundColorSpan`之外，还有以下这些Span可以使用：

 - **AbsoluteSizeSpan(int size)** —— 设置字体大小，参数是绝对数值，相当于Word中的字体大小

 - **RelativeSizeSpan(float proportion)** —— 设置字体大小，参数是相对于默认字体大小的倍数，比如默认字体大小是x, 那么设置后的字体大小就是x*proportion，这个用起来比较灵活，proportion>1就是放大(zoom in), proportion<1就是缩小(zoom out)

 - **ScaleXSpan(float proportion)** —— 缩放字体，与上面的类似，默认为1,设置后就是原来的乘以proportion，大于1时放大(zoon in)，小于时缩小(zoom out)

 - **BackgroundColorSpan(int color)** —— 背景着色，参数是颜色数值，可以直接使用android.graphics.Color里面定义的常量，或是用Color.rgb(int, int, int)

 - **ForegroundColorSpan(int color)** —— 前景着色，也就是字的着色，参数与背景着色一致

 - **TypefaceSpan(String family)** —— 字体，参数是字体的名字比如“sans", "sans-serif"等

 - **StyleSpan(Typeface style)** —— 字体风格，比如粗体，斜体，参数是android.graphics.Typeface里面定义的常量，如Typeface.BOLD，Typeface.ITALIC等等。StrikethroughSpan----如果设置了此风格，会有一条线从中间穿过所有的字，就像被划掉一样





### **三、动手试试**

比如实现下图中TextView的样式

![](http://img.blog.csdn.net/20160907145042302)

然后代码如下：

```java
TextView tv = (TextView)view.findViewById(R.id.toast_text);

String str1 = "提交成功！\n积分";
String str2 = "+" + score1;
String str3 = "！审核通过后再";
String str4 = "+" + score2;

SpannableStringBuilder builder = new SpannableStringBuilder(str1 + str2 + str3 + str4 + "！");
builder.setSpan(new ForegroundColorSpan(Color.parseColor("#ffffa200")),
		str1.length(), (str1 + str2).length(), Spannable.SPAN_EXCLUSIVE_INCLUSIVE);
builder.setSpan(new ForegroundColorSpan(Color.parseColor("#ffffa200")),
		(str1 + str2 + str3).length(), (str1 + str2 + str3 + str4).length(), Spannable.SPAN_EXCLUSIVE_INCLUSIVE);

tv.setText(builder);
```



#### **参考资料：**

1、[Android-修改TextView中部分文字的颜色](http://blog.csdn.net/centralperk/article/details/8674599)
2、[Android TextView 设置部分文字背景色和文字颜色](http://www.cnblogs.com/kingsam/p/5643598.html)
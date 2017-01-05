---
title: 【Android】TextView中不同大小字体如何上下垂直居中？
layout: post
date: 2017-01-03 17:03:00
comments: true
tags: 
    - Android
categories: 
    - Android
keywords: Android
description: 
photos:
   - /gallery/Textview-vertical/FontMetricsInt.png
---



## **前言**

在客户端开发中，我们往往需要对一个TextView的文字的部分内容进行特殊化处理，比如加粗、改变颜色、加链接、下划线等。iOS为我们提供了`AttributedString`，而Android则提供了**`SpannableString`**。

在Android的android.text.style包下为我们提供了各种各样的span（可以[**参考这篇文章**](http://blog.csdn.net/u010983881/article/details/52383539)），例如：

- **AbsoluteSizeSpan(int size)** —— 设置字体大小，参数是绝对数值，相当于Word中的字体大小

- **RelativeSizeSpan(float proportion)** —— 设置字体大小，参数是相对于默认字体大小的倍数，比如默认字体大小是x, 那么设置后的字体大小就是x*proportion，这个用起来比较灵活，proportion>1就是放大(zoom in), proportion<1就是缩小(zoom out)

- **BackgroundColorSpan(int color)** —— 背景着色，参数是颜色数值，可以直接使用android.graphics.Color里面定义的常量，或是用Color.rgb(int, int, int)

- **ForegroundColorSpan(int color)** —— 前景着色，也就是字的着色，参数与背景着色一致


<!--more-->


## **问题**

网上已经有着很多使用这些span的教程了，所以没必要在这里继续探讨这些基础使用了。但是，如果使用了**`AbsoluteSizeSpan(int size)`** 在同一个TextView中定义了不同字体大小，就会默认显示成底部对齐的方式：

![](/gallery/Textview-vertical/not.png)

说到这里，第一反应肯定是`tv.setGravity(Gravity.CENTER_VERTICAL)`，但是很不幸，怎么试都不凑效。那么到底有没有办法使用Span让不同字体大小的垂直居中呢？

答案是：**当然可以，得用`ReplacementSpan`**



## **分析**

### **为何是ReplacementSpan？** 

它是系统提供给我们的一个抽象类。通过名字我们可以知道其实用于是用于替换。指示我们**可以把文本的某一部分替换成我们想要的内容**。这也许是我们想要的。

`Relpacement`的定义很简单：

```java
public abstract class ReplacementSpan extends MetricAffectingSpan {

    public abstract int getSize(Paint paint, CharSequence text, int start, int end, Paint.FontMetricsInt fm);
    public abstract void draw(Canvas canvas, CharSequence text, int start, int end, float x, int top, int y, int bottom, Paint paint);

    public void updateMeasureState(TextPaint p) { }

    public void updateDrawState(TextPaint ds) { }
}
```

我们在继承它的时候，需要实现两个方法`getSize()`和`draw()`。通过方法名，我们也许能够知道其作用：`getSize()`用于确定span的大小（实际上只是一个宽度），`draw()`用于绘制我们想要的内容。

但是问题来了，这些方法的传参是什么？**为何`getSize()`只返回了一个int值？**

了解了这两个问题，就基本弄懂了自定义span。来回答这两个问题前，我们首先要明确的一件事情是：span是用于`SpannableString`中，并且最终被用于`TextView`中。所以在定义span时，我们的大小、绘制内容都应该依赖于使用时的环境。我们假设自定义span使用的环境为A,那么A将包换一些信息，例如：`baseline`、`Paint`、`FontMetricsInt`等信息。

那我们现在来看看`getSize()`方法。`getSize()`的返回值是int，其实这个值指的是自定义span的宽度，那它的高度呢？其实高度是已知的，那就是外界环境A带来的字的高度。但我某些情况我们希望改变span的高度，我们该怎么做呢？ 如果对Android上字体绘制有一定了解的同学会知道，一个字的高度取决于绘制这个子的**`Paint.FontMetricsInt`**


### **什么是 Paint.FontMetrics**

它表示绘制字体时的度量标准。google的官方api文档对它的字段说明如下：

| Type			| Fields 		|
| ------------- |:------------- | 
| public float	| **ascent** - The recommended distance above the baseline for singled spaced text. |
| public float	| **bottom** - The maximum distance below the baseline for the lowest glyph in the font at a given text size.| 
| public float	| **descent** - The recommended distance below the baseline for singled spaced text. | 
| public float	| **leading** - The recommended additional space to add between lines of text. | 
| public float	| **top** - The maximum distance above the baseline for the tallest glyph in the font at a given text size. | 


其中：

- **ascent** : 字体最上端到基线的距离，为负值。
- **descent**：字体最下端到基线的距离，为正值。

![](/gallery/Textview-vertical/FontMetricsInt.png)

如上图，中间那条线（Baseline）就是基线，基线到上面那条线的距离就是`ascent`，基线到下面那条线的距离就是`descent`。

回到我们的主题， 我们发现`getSize()`方法的参数中有`Paint.FontMetricsInt`，那我们是否就可以通过改变传入的Paint.FontMetricsInt的`asent`和`desent`来达到改变高度的目的呢？答案是可行的。




## **解决方法**

按照上面的分析，我们继承`ReplacementSpan` 自定义一个Span

```java
/**
 * 使TextView中不同大小字体垂直居中
 */
public class CustomVerticalCenterSpan extends ReplacementSpan {
	private int fontSizeSp;    //字体大小sp

	public CustomVerticalCenterSpan(int fontSizeSp){
		this.fontSizeSp = fontSizeSp;
	}

	@Override
	public int getSize(Paint paint, CharSequence text, int start, int end, Paint.FontMetricsInt fm) {
		text = text.subSequence(start, end);
		Paint p = getCustomTextPaint(paint);
		return (int) p.measureText(text.toString());
	}

	@Override
	public void draw(Canvas canvas, CharSequence text, int start, int end, float x, int top, int y, int bottom, Paint paint) {
		text = text.subSequence(start, end);
		Paint p = getCustomTextPaint(paint);
		Paint.FontMetricsInt fm = p.getFontMetricsInt();
		canvas.drawText(text.toString(), x, y - ((y + fm.descent + y + fm.ascent) / 2 - (bottom + top) / 2), p);    //此处重新计算y坐标，使字体居中
	}

	private TextPaint getCustomTextPaint(Paint srcPaint) {
		TextPaint paint = new TextPaint(srcPaint);
		paint.setTextSize(ViewUtils.getSpPixel(mContext, fontSizeSp));   //设定字体大小, sp转换为px
		return paint;
	}
}
```

解释下形参：

- **x**：要绘制的image的左边框到textview左边框的距离。
- **y**：要替换的文字的基线（Baseline）的纵坐标。
- **top**：替换行的最顶部位置。
- **bottom**：替换行的最底部位置。注意，textview中两行之间的行间距是属于上一行的，所以这里bottom是指行间隔的底部位置。
- **paint**：画笔，包含了要绘制字体的度量信息。

所以就有：

- `y + fm.descent`：得到字体的`descent`线坐标；
   `y + fm.ascent`：得到字体的`ascent`线坐标；

`(y + fm.descent + y + fm.ascent) / 2` 也就是字体中间线的纵坐标

`((y + fm.descent + y + fm.ascent) / 2 - (bottom + top) / 2)` 就是字体需要向上调整的距离


### **使用方式**

```java
SpannableString ss = new SpannableString(disStr + unitString);

ss.setSpan(new AbsoluteSizeSpan(40, true), 0, disStr.length(), Spannable.SPAN_EXCLUSIVE_INCLUSIVE);
//垂直居中显示文字
ss.setSpan(new CustomVerticalCenterSpan(23), disStr.length(), ss.length(), Spannable.SPAN_EXCLUSIVE_INCLUSIVE);
```

看看效果：

![](/gallery/Textview-vertical/ok1.png)

![](/gallery/Textview-vertical/ok2.png)



-----


### **【参考资料】**

1. [How to make RelativeSizeSpan align to top？](http://stackoverflow.com/questions/36964034/how-to-make-relativesizespan-align-to-top) 

 ![](http://img.blog.csdn.net/20170103153457771?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvdTAxMDk4Mzg4MQ==/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast)

2. [How to create vertically aligned superscript and subscript in TextView](http://stackoverflow.com/questions/23990381/how-to-create-vertically-aligned-superscript-and-subscript-in-textview)

 ![](http://img.blog.csdn.net/20170103153252987?watermark/2/text/aHR0cDovL2Jsb2cuY3Nkbi5uZXQvdTAxMDk4Mzg4MQ==/font/5a6L5L2T/fontsize/400/fill/I0JBQkFCMA==/dissolve/70/gravity/SouthEast)

3. [教你自定义android中span](http://blog.cgsdream.org/2016/07/06/custom-android-span/)

4. [Android ImageSpan与TextView中的text居中对齐问题解决（无论TextView设置行距与否）](http://www.cnblogs.com/withwind318/p/5541267.html)
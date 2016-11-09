---
title: 【Android】dip和px之间到底如何转换
layout: post
date: 2016-07-22 12:02
comments: true
tags: [Android]
categories: [Android]
keywords: Android
description: 在Android xml布局文件中，我们既可以设置px，也可以设置dp（或者dip）。一般情况下，我们都会选择使用dp，这样可以保证不同屏幕分辨率的机器上布局一致。
---

{% asset_img 01.jpg %}

> 在Android xml布局文件中，我们既可以设置px，也可以设置dp（或者dip）。一般情况下，我们都会选择使用dp，这样可以保证不同屏幕分辨率的机器上布局一致。

> 但是在代码中，如何处理呢？很多控件的方法中都只提供了设置px的方法，例如setPadding，并没有提供设置dp的方法。这个时候，如果需要设置dp的话，就要将dp转换成px了。





#### **一、名词介绍**

1.  **PPI** = Pixels per inch，每英寸上的像素数,即 "像素密度"
&nbsp;&nbsp;&nbsp;&nbsp; ● xhdpi: 2.0
&nbsp;&nbsp;&nbsp;&nbsp; ● hdpi: 1.5
&nbsp;&nbsp;&nbsp;&nbsp; ● mdpi: 1.0 (baseline)
&nbsp;&nbsp;&nbsp;&nbsp; ● ldpi: 0.75
下图是Android官网dpi的定义（其实在计算机中dpi就是ppi。**注意，是dpi，不是dip，dpi是现实概念，dip是人为抽象概念。还是不明白可以看看这里 [dpi与ppi区别](http://zhidao.baidu.com/link?url=vPAxK6EdTCzBfQy8xUCnHcZS6M45oijy87YKvW7UlM4W7majdUf7Af3tL8S8CvCX8Thswwf2SU-uKSwpdLQ-6a)**）：
![官方dpi定义](http://img.blog.csdn.net/20160722113144430)

2. **dp** = 也就是dip（device independent pixels），设备独立像素。以160PPI屏幕为标准，则1dp=1px，在不同的像素密度的设备上会自动适配，比如:
&nbsp;&nbsp;&nbsp;&nbsp; ● 在320x480分辨率，像素密度为160，1dp=1px
&nbsp;&nbsp;&nbsp;&nbsp; ● 在480x800分辨率，像素密度为240，1dp=1.5px
&nbsp;&nbsp;&nbsp;&nbsp; > 计算公式：1dp*像素密度/160 = 实际像素数

3. **sp** = Scale-independent pixels，它是安卓的字体单位

<!--more-->



#### **二、换算公式**

 1. PPI 的运算方式是：
PPI = √（长度像素数² + 宽度像素数²） / 屏幕对角线英寸数

 2.  dp和px的换算公式 ：
dp*ppi/160 = px。比如1dp x 320ppi/160 = 2px。

 3. sp 与 px 的换算公式：sp*ppi/160 = px



#### **三、总结**

px = dp*ppi/160
dp = px / (ppi / 160)

px = sp*ppi/160
sp = px / (ppi / 160)

dp = sp? 





#### **四、转换代码**
 为了方便进行px和dp之间的转换，可以使用以下代码。

```java
import android.content.Context;  
  
public class DensityUtil {  
  
    /** 
     * 根据手机的分辨率从 dp 的单位 转成为 px(像素) 
     */  
    public static int dip2px(Context context, float dpValue) {  
        final float scale = context.getResources().getDisplayMetrics().density;  
        return (int) (dpValue * scale + 0.5f);  
    }  
  
    /** 
     * 根据手机的分辨率从 px(像素) 的单位 转成为 dp 
     */  
    public static int px2dip(Context context, float pxValue) {  
        final float scale = context.getResources().getDisplayMetrics().density;  
        return (int) (pxValue / scale + 0.5f);  
    }  
}  
```



#### 【参考资料】
1、[px 与 dp, sp换算公式](http://www.cnblogs.com/bluestorm/p/3640786.html)
2、[dp、sp、px傻傻分不清楚\[完整\]](https://zhuanlan.zhihu.com/p/19565895)
---
title: 如何删除多行首字母，Sublime Text多行编辑运用
layout: post
date: 2014-05-15 11:55:00
comments: true
tags: []
categories: []
keywords: 
description: 
---

#### **一、问题描述：**

问答区有个问题是这样问的：[**如何在eclipse中删除多行首字母？**](http://ask.csdn.net/questions/29687)

题主的问题是代码中每行都有序号，这些序号一行一行地删太麻烦，如何进行批量删除？我们在进行代码重用的时候时常会出现行号同时被复制的情况，比如下面的这点代码：

```java
155.     @Override  
156.     public boolean onKeyDown(int keyCode, KeyEvent event)   
157.     {   
158.         Log.d("onKeyDown:", " keyCode=" + keyCode + " KeyEvent=" + event);   
159.         switch (keyCode)   
160.         {   
161.             case KeyEvent.KEYCODE_DPAD_UP:   
162.   
163.             break;   
164.             case KeyEvent.KEYCODE_DPAD_DOWN:   
165.   
166.             break;   
167.             case KeyEvent.KEYCODE_DPAD_LEFT:   
168.                 //右左按键可以控制第一进度的增减   
169.                 pb.setProgress( pb.getProgress()-5 );   
170.             break;   
171.             case KeyEvent.KEYCODE_DPAD_RIGHT:   
172.                 pb.setProgress( pb.getProgress()+5 );   
173.             break;   
174.             case KeyEvent.KEYCODE_DPAD_CENTER:   
175.   
176.             break;   
177.             case KeyEvent.KEYCODE_0:   
178.             break;   
179.         }   
180.         return super.onKeyDown(keyCode, event);   
181.     }   
182. }  
```

<!--more-->

 这是博主从别处摘来的代码粘贴在Eclipse中的，很明显行号也被复制了进来。
 对于这样的问题，如果代码行数真的多到可以用来数绵羊了，还用Delete键一行一行地解决可真就轻而易举地抑郁了哭  #其实我有特别的患抑郁症技巧#


#### **二、解决办法：**
解决办法就是利用**Sublime Text**的多行编辑功能删除掉行首的序号。
在Sublime Text中打开或者粘贴你想清理的代码，然后选中所有行

- 选中需要清理的所有行
- 按下***Ctrl + Shift + L***（Command + Shift + L）--------- 可以同时编辑这些行
- 用左右方向键把光标移动到行首，然后按下 Delete键 或者 Backspace退格键 来删除行号。

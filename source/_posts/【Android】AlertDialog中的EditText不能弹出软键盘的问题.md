---
title: 【Android】AlertDialog中的EditText不能弹出软键盘的问题
layout: post
date: 2017-01-20 11:03:00
comments: true
tags: 
    - Android
categories: 
    - Android
keywords: Android
description: 
photos:
   - /gallery/android_m_marshmallow.jpg
---





## **摘要**

AlertDialog中加入EditText但是不弹出软键盘等问题网上有很多不管用的解决方案，有的方案是**强制弹出软键盘**，然而即使弹出来，也是显示在AlertDialog的后面，被Dialog遮挡。


## **解决方案**

Dialog的官方文档：http://developer.android.com/reference/android/app/Dialog.html ，其中有一段：

> **Note:** Activities provide a facility to manage the creation, saving and restoring of dialogs. See [onCreateDialog(int)](https://developer.android.com/reference/android/app/Activity.html#onCreateDialog%28int%29), [onPrepareDialog(int, Dialog)](https://developer.android.com/reference/android/app/Activity.html#onPrepareDialog%28int,%20android.app.Dialog%29), [showDialog(int)](https://developer.android.com/reference/android/app/Activity.html#showDialog%28int%29), and [dismissDialog(int)](https://developer.android.com/reference/android/app/Activity.html#dismissDialog%28int%29). If these methods are used, [getOwnerActivity()](https://developer.android.com/reference/android/app/Dialog.html#getOwnerActivity%28%29) will return the Activity that managed this dialog.

<!--more-->

> Often you will want to have a Dialog display on top of the current input method, because there is no reason for it to accept text. You can do this by setting the [WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM](https://developer.android.com/reference/android/view/WindowManager.LayoutParams.html#FLAG_ALT_FOCUSABLE_IM) window flag (assuming your Dialog takes input focus, as it the default) with the following code:
```java
getWindow().setFlags(WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM,
         WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM);
```

这段话的大概意思是说，WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM  这个参数会让Dialog遮挡住软键盘，显示在软键盘的前面。

这是默认情况下隐藏软键盘的方法，要重新显示软键盘，要执行下面这段代码：

```java
alertDialog.getWindow().clearFlags(WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM);
```

我是把它写在了setOnFocusChangeListener里，起效了

```java
editText.setOnFocusChangeListener(new View.OnFocusChangeListener() {
    @Override
    public void onFocusChange(View view, boolean focused) {
        if (focused) {
	         //dialog弹出软键盘
	         alertDialog.getWindow()
			       .clearFlags(WindowManager.LayoutParams.FLAG_ALT_FOCUSABLE_IM);   
        }
    }
});
```

AlertDialog.setView()则不会出现以上问题。


### **另外**

为了防止弹出输入法时把后面的背景挤变形，可以在Manifest里的相应Activity添加：

```xml
android:windowSoftInputMode="adjustPan|stateHidden"
```

像这样：

```xml
<activity
    android:name=".MainActivity"
    android:windowSoftInputMode="adjustPan|stateHidden"
    android:label="@string/app_name">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
</activity>
```

----

## **【参考资料】**

1、[关于AlertDialog中EditText不能弹出输入法解决方法](http://blog.csdn.net/wurensen/article/details/21018115)
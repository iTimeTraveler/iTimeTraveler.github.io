---
title: 【Android】onActivityResult()和onResume()的调用顺序问题
layout: post
date: 2015-09-18 17:16:55
comments: true
tags: [Android]
categories: [Android]
keywords: Android
description: 
---

> 在Android生命周期中，如果使用到startActivityForResult()，则在新Activity被finish掉之后，onActivityResult()和onResume()到底是哪一个先调用的呢？

我们来看官方源码：

```java
/**
 * Called when an activity you launched exits, giving you the requestCode
 * you started it with, the resultCode it returned, and any additional
 * data from it.  The <var>resultCode</var> will be
 * {@link #RESULT_CANCELED} if the activity explicitly returned that,
 * didn't return any result, or crashed during its operation.
 *
 * <p>You will receive this call immediately before onResume() when your
 * activity is re-starting.
 *
 * <p>This method is never invoked if your activity sets
 * {@link android.R.styleable#AndroidManifestActivity_noHistory noHistory} to
 * <code>true</code>.
 *
 * @param requestCode The integer request code originally supplied to
 *                    startActivityForResult(), allowing you to identify who this
 *                    result came from.
 * @param resultCode The integer result code returned by the child activity
 *                   through its setResult().
 * @param data An Intent, which can return result data to the caller
 *               (various data can be attached to Intent "extras").
 *
 * @see #startActivityForResult
 * @see #createPendingResult
 * @see #setResult(int)
 */
protected void onActivityResult(int requestCode, int resultCode, Intent data) {
}
```

<!--more-->


&#160; &#160; &#160; &#160;从上面的源码注释第二段可以看到：You will receive this call immediately before onResume() when your activity is re-starting. 所以很明显，在activity重新恢复启动的时候，**onActivityResult()会在onResume()之前调用完毕。**

&#160; &#160; &#160; &#160;而且，onActivityResult()还会在onStart()之前调用完毕。经过断点调试，发现它们三者的调用顺序如下：

 - **onActivityResult()  -> onStart() -> onResume()**


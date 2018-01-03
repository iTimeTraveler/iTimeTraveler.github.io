---
title: 【Android】长按连续触发事件的实现方法
layout: post
date: 2015-11-19 14:35:55
comments: true
tags: [Android]
categories: [Android]
keywords: Android
description: 
---

> 项目中需要实现一个类似购物车数量的小组件，需要单击时增加数量，长按时可以连续增大，之前的代码实现效果不理想，google后得到一个解决方法,测试可以完美实现。

实现效果大致如图：
![](http://img.blog.csdn.net/20151119142521160)


#### **【原理说明】**

 - 大致原理是,如果手指按在view上，则使用ScheduledExecutorService对象执行scheduleWithFixedDelay()方法，每隔一个间隔不停地向Handler发送Message，此处Message里的信息是View id，然后由Handler在handlemessage的时候处理需要触发的事件。

<!--more-->



#### **【实现】**

1、首先,让对应的View设置一个OnTouchListener，在手指按下时触发不停的发送消息,手指抬起时停止发送。

```java
subtractButton.setOnTouchListener(new OnTouchListener() {
            @Override
            public boolean onTouch(View v, MotionEvent event) {
                if(event.getAction() == MotionEvent.ACTION_DOWN){
                    updateAddOrSubtract(v.getId());    //手指按下时触发不停的发送消息
                }else if(event.getAction() == MotionEvent.ACTION_UP){
                    stopAddOrSubtract();    //手指抬起时停止发送
                }
                return true;
            }
        });
```

2、发送消息与终止方法：先定义一个ScheduledExecutorService对象，然后调用scheduleWithFixedDelay()方法

```java
private ScheduledExecutorService scheduledExecutor;
private void updateAddOrSubtract(int viewId) {
        final int vid = viewId;
        scheduledExecutor = Executors.newSingleThreadScheduledExecutor();
        scheduledExecutor.scheduleWithFixedDelay(new Runnable() {
            @Override
            public void run() {
                Message msg = new Message();
                msg.what = vid;
                handler.sendMessage(msg);
            }
        }, 0, 100, TimeUnit.MILLISECONDS);    //每间隔100ms发送Message
    }

    private void stopAddOrSubtract() {
        if (scheduledExecutor != null) {
            scheduledExecutor.shutdownNow();
            scheduledExecutor = null;
        }
    }
```

3、用来处理Touch事件的Handler定义如下：
```java
private Handler handler = new Handler(){
        @Override
        public void handleMessage(Message msg) {
            int viewId = msg.what;
            switch (viewId){
                case R.id.custom_number_picker_subtract_button:
                    setValue(value - rangeability);    //减小操作
                    break;
                case R.id.custom_number_picker_add_button:
                    setValue(value + rangeability);    //增大操作
                    break;
            }
        }
    };
```
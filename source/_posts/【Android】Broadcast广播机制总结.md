---
title: 【Android】Broadcast广播机制总结
layout: post
date: 2016-10-25 16:06:00
comments: true
tags: 
    - Broadcast
categories: [Android]
keywords: Broadcast
description: 
photos:
    - /gallery/newyorkcity.jpg
---



> 原文链接： [**Android总结篇系列：Android广播机制**](http://www.cnblogs.com/lwbqqyumidi/p/4168017.html)

## **1. Android广播机制概述**

Android广播分为两个方面：广播发送者和广播接收者，通常情况下，BroadcastReceiver指的就是广播接收者（广播接收器）。广播作为Android组件间的通信方式，可以使用的场景如下：

1. 同一app内部的同一组件内的消息通信（单个或多个线程之间）；

2. 同一app内部的不同组件之间的消息通信（单个进程）；

3. 同一app具有多个进程的不同组件之间的消息通信；

4. 不同app之间的组件之间消息通信；

5. Android系统在特定情况下与App之间的消息通信。

从实现原理看上，Android中的广播使用了观察者模式，基于消息的发布/订阅事件模型。因此，从实现的角度来看，Android中的广播将广播的发送者和接受者极大程度上解耦，使得系统能够方便集成，更易扩展。具体实现流程要点粗略概括如下：

<!--more-->

1. 广播接收者BroadcastReceiver通过Binder机制向AMS(Activity Manager Service)进行注册；

2. 广播发送者通过binder机制向AMS发送广播；

3. AMS查找符合相应条件（IntentFilter/Permission等）的BroadcastReceiver，将广播发送到BroadcastReceiver（一般情况下是Activity）相应的消息循环队列中；

4. 消息循环执行拿到此广播，回调BroadcastReceiver中的onReceive()方法。

对于不同的广播类型，以及不同的BroadcastReceiver注册方式，具体实现上会有不同。但总体流程大致如上。

由此看来，广播发送者和广播接收者分别属于观察者模式中的消息发布和订阅两端，AMS属于中间的处理中心。广播发送者和广播接收者的执行是异步的，发出去的广播不会关心有无接收者接收，也不确定接收者到底是何时才能接收到。显然，整体流程与EventBus非常类似。

在上文说列举的广播机制具体可以使用的场景中，现分析实际应用中的**适用性**：

 - **第一种情形**：同一app内部的同一组件内的消息通信（单个或多个线程之间），实际应用中肯定是不会用到广播机制的（虽然可以用），无论是使用扩展变量作用域、基于接口的回调还是Handler-post/Handler-Message等方式，都可以直接处理此类问题，若适用广播机制，显然有些“杀鸡牛刀”的感觉，会显太“重”；

 - **第二种情形**：同一app内部的不同组件之间的消息通信（单个进程），对于此类需求，在有些教复杂的情况下单纯的依靠基于接口的回调等方式不好处理，此时可以直接使用EventBus等，相对而言，EventBus由于是针对统一进程，用于处理此类需求非常适合，且轻松解耦。可以参见文件[《Android各组件/控件间通信利器之EventBus》](http://www.cnblogs.com/lwbqqyumidi/p/4041455.html)。

 - **第三、四、五情形**：由于涉及不同进程间的消息通信，此时根据实际业务使用广播机制会显得非常适宜。下面主要针对Android广播中的具体知识点进行总结。


## **2. BroadcastReceiver**

### 自定义BroadcastReceiver

自定义广播接收器需要继承基类BroadcastReceivre，并实现抽象方法onReceive(context, intent)方法。广播接收器接收到相应广播后，会自动回到onReceive(..)方法。默认情况下，广播接收器也是运行在UI线程，因此，onReceive方法中不能执行太耗时的操作。否则将因此ANR。一般情况下，根据实际业务需求，onReceive方法中都会涉及到与其他组件之间的交互，如发送Notification、启动service等。
下面代码片段是一个简单的广播接收器的自定义：

```java
public class MyBroadcastReceiver extends BroadcastReceiver {
    public static final String TAG = "MyBroadcastReceiver";
    public static int m = 1;

    @Override
    public void onReceive(Context context, Intent intent) {
        Log.w(TAG, "intent:" + intent);
        String name = intent.getStringExtra("name");
        Log.w(TAG, "name:" + name + " m=" + m);
        m++;
        
        Bundle bundle = intent.getExtras();
        
    }
}
```

### BroadcastReceiver注册类型

BroadcastReceiver总体上可以分为两种注册类型：静态注册和动态注册。

#### 1). 静态注册：

直接在AndroidManifest.xml文件中进行注册。规则如下：

```xml
<receiver android:enabled=["true" | "false"]
android:exported=["true" | "false"]
android:icon="drawable resource"
android:label="string resource"
android:name="string"
android:permission="string"
android:process="string" >
. . .
</receiver>
```

其中，需要注意的属性

 - android:exported  — 此broadcastReceiver能否接收其他App的发出的广播，这个属性默认值有点意思，其默认值是由receiver中有无intent-filter决定的，如果有intent-filter，默认值为true，否则为false。（同样的，activity/service中的此属性默认值一样遵循此规则）同时，需要注意的是，这个值的设定是以application或者application user id为界的，而非进程为界（一个应用中可能含有多个进程）；

 - android:name  — 此broadcastReceiver类名；

 - android:permission  — 如果设置，具有相应权限的广播发送方发送的广播才能被此broadcastReceiver所接收；

 - android:process — broadcastReceiver运行所处的进程。默认为app的进程。可以指定独立的进程（Android四大基本组件都可以通过此属性指定自己的独立进程）

常见的注册形式有:

```xml
<receiver android:name=".MyBroadcastReceiver" >
    <intent-filter>
        <action android:name="android.net.conn.CONNECTIVITY_CHANGE" />
    </intent-filter>
    <intent-filter>
        <action android:name="android.intent.action.BOOT_COMPLETED" />
    </intent-filter>
</receiver>
```

其中，intent-filter由于指定此广播接收器将用于接收特定的广播类型。本示例中给出的是用于接收网络状态改变或开启启动时系统自身所发出的广播。当此App首次启动时，系统会自动实例化MyBroadcastReceiver，并注册到系统中。

之前常说：**静态注册的广播接收器即使app已经退出，主要有相应的广播发出，依然可以接收到，但此种描述自Android 3.1开始有可能不再成立。**具体分析详见本文后面部分。

#### 2). 动态注册：

动态注册时，无须在AndroidManifest中注册<receiver/>组件。直接在代码中通过调用Context的registerReceiver函数，可以在程序中动态注册BroadcastReceiver。registerReceiver的定义形式如下：

```java
registerReceiver(BroadcastReceiver receiver, IntentFilter filter)

registerReceiver(BroadcastReceiver receiver, IntentFilter filter, String broadcastPermission, Handler scheduler)
```

典型的写法示例如下：

```java
public class MainActivity extends Activity {
    public static final String BROADCAST_ACTION = "com.example.corn";
    private BroadcastReceiver mBroadcastReceiver;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        mBroadcastReceiver = new MyBroadcastReceiver();
        IntentFilter intentFilter = new IntentFilter();
        intentFilter.addAction(BROADCAST_ACTION);
        registerReceiver(mBroadcastReceiver, intentFilter);
    }
    
    @Override
    protected void onDestroy() {
        super.onDestroy();
        unregisterReceiver(mBroadcastReceiver);
    }

}
```

注：Android中所有与观察者模式有关的设计中，一旦涉及到register，必定在相应的时机需要unregister。因此，上例在onDestroy()回到中需要unregisterReceiver(mBroadcastReceiver)。

**当此Activity实例化时，会动态将MyBroadcastReceiver注册到系统中。当此Activity销毁时，动态注册的MyBroadcastReceiver将不再接收到相应的广播。**


## **3. 广播发送及广播类型**

经常说”发送广播“和”接收“，表面上看广播作为Android广播机制中的实体，实际上这一实体本身是并不是以所谓的”广播“对象存在的，而是以”意图“（Intent）去表示。定义广播的定义过程，实际就是相应广播”意图“的定义过程，然后通过广播发送者将此”意图“发送出去。被相应的BroadcastReceiver接收后将会回调onReceive()函数。

下段代码片段显示的是一个普通广播的定义过程，并发送出去。其中setAction(..)对应于BroadcastReceiver中的intentFilter中的action。

```java
Intent intent = new Intent();
intent.setAction(BROADCAST_ACTION);
intent.putExtra("name", "qqyumidi");
sendBroadcast(intent);
```

根据广播的发送方式，可以将其分为以下几种类型：
 
1. **Normal Broadcast**：普通广播

2. **System Broadcast** : 系统广播

3. **Ordered broadcast**：有序广播

4. **Sticky Broadcast**：粘性广播(在 android 5.0/api 21中deprecated,不再推荐使用，相应的还有粘性有序广播，同样已经deprecated)

5. **Local Broadcast**：App应用内广播

下面分别总结下各种类型的发送方式及其特点。

### 1). Normal Broadcast：普通广播

此处将普通广播界定为：开发者自己定义的intent，以context.sendBroadcast_"AsUser"(intent, ...)形式。具体可以使用的方法有：
sendBroadcast(intent)/sendBroadcast(intent, receiverPermission)/sendBroadcastAsUser(intent, userHandler)/sendBroadcastAsUser(intent, userHandler,receiverPermission)。
普通广播会被注册了的相应的感兴趣（intent-filter匹配）接收，且顺序是无序的。如果发送广播时有相应的权限要求，BroadCastReceiver如果想要接收此广播，也需要有相应的权限。

### 2). System Broadcast: 系统广播

Android系统中内置了多个系统广播，只要涉及到手机的基本操作，基本上都会发出相应的系统广播。如：开启启动，网络状态改变，拍照，屏幕关闭与开启，点亮不足等等。每个系统广播都具有特定的intent-filter，其中主要包括具体的action，系统广播发出后，将被相应的BroadcastReceiver接收。系统广播在系统内部当特定事件发生时，有系统自动发出。

### 3). Ordered broadcast：有序广播

有序广播的有序广播中的“有序”是针对广播接收者而言的，指的是发送出去的广播被BroadcastReceiver按照先后循序接收。有序广播的定义过程与普通广播无异，只是其的主要发送方式变为：sendOrderedBroadcast(intent, receiverPermission, ...)。

对于有序广播，其主要特点总结如下：

 - a. 多个具当前已经注册且有效的BroadcastReceiver接收有序广播时，是按照先后顺序接收的，先后顺序判定标准遵循为：将当前系统中所有有效的动态注册和静态注册的BroadcastReceiver按照priority属性值从大到小排序，对于具有相同的priority的动态广播和静态广播，动态广播会排在前面。

 - b. 先接收的BroadcastReceiver可以对此有序广播进行截断，使后面的BroadcastReceiver不再接收到此广播，也可以对广播进行修改，使后面的BroadcastReceiver接收到广播后解析得到错误的参数值。当然，一般情况下，不建议对有序广播进行此类操作，尤其是针对系统中的有序广播。

### 4)Sticky Broadcast：粘性广播
**在 android 5.0/api 21中deprecated,不再推荐使用，相应的还有粘性有序广播，同样已经deprecated**。既然已经deprecated，此处不再多做总结。

### 5)Local Broadcast：App应用内广播（此处的App应用以App应用进程为界）

由前文阐述可知，Android中的广播可以跨进程甚至跨App直接通信，且注册是exported对于有intent-filter的情况下默认值是true，由此将可能出现安全隐患如下：

1. 其他App可能会针对性的发出与当前App intent-filter相匹配的广播，由此导致当前App不断接收到广播并处理；

2. 其他App可以注册与当前App一致的intent-filter用于接收广播，获取广播具体信息。

无论哪种情形，这些安全隐患都确实是存在的。由此，最常见的增加安全性的方案是：

1. 对于同一App内部发送和接收广播，将exported属性人为设置成false，使得非本App内部发出的此广播不被接收；

2. 在广播发送和接收时，都增加上相应的permission，用于权限验证；

3. 发送广播时，指定特定广播接收器所在的包名，具体是通过intent.setPackage(packageName)指定在，这样此广播将只会发送到此包中的App内与之相匹配的有效广播接收器中。

App应用内广播可以理解成一种局部广播的形式，广播的发送者和接收者都同属于一个App。实际的业务需求中，App应用内广播确实可能需要用到。同时，之所以使用应用内广播时，而不是使用全局广播的形式，更多的考虑到的是Android广播机制中的安全性问题。

相比于全局广播，App应用内广播优势体现在：

1. 安全性更高；

2. 更加高效。

为此，Android v4兼容包中给出了封装好的LocalBroadcastManager类，用于统一处理App应用内的广播问题，使用方式上与通常的全局广播几乎相同，只是注册/取消注册广播接收器和发送广播时将主调context变成了LocalBroadcastManager的单一实例。

代码片段如下：

```java
//registerReceiver(mBroadcastReceiver, intentFilter);
//注册应用内广播接收器
localBroadcastManager = LocalBroadcastManager.getInstance(this);
localBroadcastManager.registerReceiver(mBroadcastReceiver, intentFilter);
        
//unregisterReceiver(mBroadcastReceiver);
//取消注册应用内广播接收器
localBroadcastManager.unregisterReceiver(mBroadcastReceiver);

Intent intent = new Intent();
intent.setAction(BROADCAST_ACTION);
intent.putExtra("name", "qqyumidi");
//sendBroadcast(intent);
//发送应用内广播
localBroadcastManager.sendBroadcast(intent);
```


## **4. 不同注册方式的广播接收器回调onReceive(context, intent)中的context具体类型**

 - 1). 对于静态注册的ContextReceiver，回调onReceive(context, intent)中的context具体指的是ReceiverRestrictedContext；

 - 2). 对于全局广播的动态注册的ContextReceiver，回调onReceive(context, intent)中的context具体指的是Activity Context；

 - 3). 对于通过LocalBroadcastManager动态注册的ContextReceiver，回调onReceive(context, intent)中的context具体指的是Application Context。

注：对于LocalBroadcastManager方式发送的应用内广播，只能通过LocalBroadcastManager动态注册的ContextReceiver才有可能接收到（静态注册或其他方式动态注册的ContextReceiver是接收不到的）。


## **5. 不同Android API版本中广播机制相关API重要变迁**

1). Android5.0/API level 21开始粘滞广播和有序粘滞广播过期，以后不再建议使用；

2). ”静态注册的广播接收器即使app已经退出，主要有相应的广播发出，依然可以接收到，但此种描述自Android 3.1开始有可能不再成立“

Android 3.1开始系统在Intent与广播相关的flag增加了参数，分别是FLAG_INCLUDE_STOPPED_PACKAGES和FLAG_EXCLUDE_STOPPED_PACKAGES。

 - FLAG_INCLUDE_STOPPED_PACKAGES：包含已经停止的包（停止：即包所在的进程已经退出）

 - FLAG_EXCLUDE_STOPPED_PACKAGES：不包含已经停止的包

主要原因如下：

自Android3.1开始，系统本身则增加了对所有app当前是否处于运行状态的跟踪。在发送广播时，不管是什么广播类型，系统默认直接增加了值为FLAG_EXCLUDE_STOPPED_PACKAGES的flag，导致即使是静态注册的广播接收器，对于其所在进程已经退出的app，同样无法接收到广播。

详情参加Android官方文档：http://developer.android.com/about/versions/android-3.1.html#launchcontrols

由此，对于系统广播，由于是系统内部直接发出，无法更改此intent flag值，因此，3.1开始对于静态注册的接收系统广播的BroadcastReceiver，如果App进程已经退出，将不能接收到广播。

但是对于自定义的广播，可以通过复写此flag为FLAG_INCLUDE_STOPPED_PACKAGES，使得静态注册的BroadcastReceiver，即使所在App进程已经退出，也能能接收到广播，并会启动应用进程，但此时的BroadcastReceiver是重新新建的。

```java
Intent intent = new Intent();
intent.setAction(BROADCAST_ACTION);
intent.addFlags(Intent.FLAG_INCLUDE_STOPPED_PACKAGES);
intent.putExtra("name", "qqyumidi");
sendBroadcast(intent);
```

注1：对于动态注册类型的BroadcastReceiver，由于此注册和取消注册实在其他组件（如Activity）中进行，因此，不受此改变影响。

注2：在3.1以前，相信不少app可能通过静态注册方式监听各种系统广播，以此进行一些业务上的处理（如即时app已经退出，仍然能接收到，可以启动service等..）,3.1后，静态注册接受广播方式的改变，将直接导致此类方案不再可行。于是，通过将Service与App本身设置成不同的进程已经成为实现此类需求的可行替代方案。
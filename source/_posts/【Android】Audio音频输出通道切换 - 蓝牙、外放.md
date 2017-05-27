---
title: 【Android】Audio音频输出通道切换 - 蓝牙、外放
layout: post
date: 2017-05-18 11:40:00
comments: true
tags: 
    - Android
    - Audio
categories: 
    - Android
keywords: 
description: 
photos:
   - /gallery/round_trip_on_device.png
---




手机音频的输出有外放（Speaker）、听筒（Telephone Receiver）、有线耳机（WiredHeadset）、蓝牙音箱（Bluetooth A2DP）等输出设备。在平时，电话免提、插拔耳机、连接断开蓝牙设备等操作系统都会自动切换Audio音频到相应的输出设备上。比如电话免提就是从听筒切换到外放扬声器，插入耳机就是从外放切换到耳机。

## **场景需求**

Android系统自动切换的这些策略，并不能全部满足我们的产品需求，比如音乐App需要对听歌时拔出耳机的操作进行阻止（暂停播放），防止突然切换到外放导致尴尬。

最近项目需求希望**`即使在连接蓝牙音箱的情况下，仍旧使用手机外放播放音频`**。这就需要强制切换Audio输出通道，打破系统原有的策略。

查阅资料，看到了Android中可以通过`AudioManager`查询、切换当前Audio输出通道，并且在Audio输出发生变化时，捕获并处理这种变化。

<!-- more -->

首先提醒下大家，使用下面的方法时，需要添加权限：

```xml
<uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
```

## **Audio输出状态查询**



AudioManager 提供的下列方法可以用来查询当前Audio输出的状态：

- **`isBluetoothA2dpOn()`**：检查A2DPAudio音频输出是否通过蓝牙耳机；

- **`isSpeakerphoneOn()`**：检查扬声器是否打开；

- **`isWiredHeadsetOn()`**：检查线控耳机是否连着；注意这个方法只是用来判断耳机是否是插入状态，并不能用它的结果来判定当前的Audio是通过耳机输出的，这还依赖于其他条件。

- **`setSpeakerphoneOn(boolean on)`**：直接选择外放扬声器发声；

- **`setBluetoothScoOn(boolean on)`**：要求使用蓝牙SCO耳机进行通讯；


此处[根据这篇文章](http://blog.csdn.net/ec_boy_hl/article/details/45112493)简单地介绍一下蓝牙耳机的两种链路，A2DP及SCO。android的api表明：

- **A2DP**：是一种单向的高品质音频数据传输链路，**通常用于播放立体声音乐**；
- **SCO**： 则是一种双向的音频数据的传输链路，该链路只支持8K及16K单声道的音频数据，**只能用于普通语音的传输**，若用于播放音乐那就只能呵呵了。

两者的主要区别是：**A2DP只能播放，默认是打开的，而SCO既能录音也能播放，默认是关闭的。** 如果要录音肯定要打开sco啦，因此调用上面的`setBluetoothScoOn(boolean on)`就可以通过蓝牙耳机录音、播放音频了，录完、播放完记得要关闭。

另外，在Android系统中通过`AudioManager.setMode()`方法来管理播放模式。在`setMode()`方法中有以下几种对应不同的播放模式:

- `MODE_NORMAL` : 普通模式，既不是铃声模式也不是通话模式
- `MODE_RINGTONE` : 铃声模式
- `MODE_IN_CALL` : 通话模式
- `MODE_IN_COMMUNICATION` : 通信模式，包括音/视频,VoIP通话.(3.0加入的，与通话模式类似)

在设置播放模式的时候，需要考虑流类型，我在这里使用的流类型是 `STREAM_MUSIC` ，所以切换播放设备的时候就需要设置为**`MODE_IN_COMMUNICATION`** 模式而不是 `MODE_NORMAL` 模式。可以参考[**这个问题**](http://stackoverflow.com/questions/31871328/android-5-0-audiomanager-setmode-not-working)。



## **解决问题**

使用以下方法切换音频Audio输出，参考[Android : Switching audio between Bluetooth and Phone Speaker is inconsistent](http://stackoverflow.com/questions/22770321/android-switching-audio-between-bluetooth-and-phone-speaker-is-inconsistent)：

```java
AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);

/**
 * 切换到外放
 */
public void changeToSpeaker(){
	//注意此处，蓝牙未断开时使用MODE_IN_COMMUNICATION而不是MODE_NORMAL
    mAudioManager.setMode(bluetoothIsConnected ? AudioManager.MODE_IN_COMMUNICATION : AudioManager.MODE_NORMAL);    
	mAudioManager.stopBluetoothSco();
	mAudioManager.setBluetoothScoOn(false);
	mAudioManager.setSpeakerphoneOn(true);
}

/**
 * 切换到蓝牙音箱
 */
public void changeToHeadset(){
    mAudioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
	mAudioManager.startBluetoothSco();
	mAudioManager.setBluetoothScoOn(true);
	mAudioManager.setSpeakerphoneOn(false);
}

/************************************************************/
//注意：以下两个方法还未验证
/************************************************************/

/**
 * 切换到耳机模式
 */
public void changeToHeadset(){
    mAudioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
	mAudioManager.stopBluetoothSco();
	mAudioManager.setBluetoothScoOn(false);
	mAudioManager.setSpeakerphoneOn(false);
}

/**
 * 切换到听筒
 */
public void changeToReceiver(){
    audioManager.setSpeakerphoneOn(false);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.HONEYCOMB){
        audioManager.setMode(AudioManager.MODE_IN_COMMUNICATION);
    } else {
        audioManager.setMode(AudioManager.MODE_IN_CALL);
    }
}
```
直接切换输出通道的方法我们已经知道了。剩下需要解决的问题是，**当蓝牙设备断开、连接的时候，我们希望可以自动切换到用户原本设置的输出通道上**，比如在蓝牙未连接时，用户设置的是希望通过蓝牙播报，所以应该在蓝牙一旦连接以后，就把音频切换到蓝牙设备上。

下面我们就看看如何监听蓝牙设备的连接状态。


## **监听蓝牙连接状态**

首先注意使用前需要以下权限：

```xml
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
<uses-permission android:name="android.permission.BLUETOOTH" />
```


根据[这篇文章](http://blog.csdn.net/l627859442/article/details/7918597)，我们发现可以使用 [`AudioManager.ACTION_AUDIO_BECOMING_NOISY`](https://developer.android.com/reference/android/media/AudioManager.html#ACTION_AUDIO_BECOMING_NOISY) 这个Intent Action来监听蓝牙断开、耳机插拔的广播，但是测试发现，它也只能收到蓝牙断开的广播，无法接收到蓝牙连接的广播，所以不是我们想要的。


进一步找到这篇文章：[关于蓝牙开发，必须注意的广播](http://blog.csdn.net/xiaoqiaozhongcai/article/details/52857910)，总结了以下蓝牙广播。

```java
/**
 * 有注释的广播，蓝牙连接时都会用到
 */
intentFilter.addAction(BluetoothDevice.ACTION_FOUND); //搜索蓝压设备，每搜到一个设备发送一条广播
intentFilter.addAction(BluetoothDevice.ACTION_BOND_STATE_CHANGED); //配对开始时，配对成功时
intentFilter.addAction(BluetoothDevice.ACTION_ACL_CONNECTED); //配对时，发起连接
intentFilter.addAction(BluetoothDevice.ACTION_ACL_DISCONNECT_REQUESTED);
intentFilter.addAction(BluetoothDevice.ACTION_ACL_DISCONNECTED); //配对结束时，断开连接
intentFilter.addAction(PAIRING_REQUEST); //配对请求（Android.bluetooth.device.action.PAIRING_REQUEST）

intentFilter.addAction(BluetoothAdapter.ACTION_DISCOVERY_STARTED); //开始搜索
intentFilter.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED); //搜索结束。重新搜索时，会先终止搜索
intentFilter.addAction(BluetoothAdapter.ACTION_REQUEST_DISCOVERABLE);
intentFilter.addAction(BluetoothAdapter.ACTION_STATE_CHANGED); //本机开启、关闭蓝牙开关 
intentFilter.addAction(BluetoothAdapter.ACTION_CONNECTION_STATE_CHANGED); //蓝牙设备连接或断开
intentFilter.addAction(BluetoothAdapter.ACTION_LOCAL_NAME_CHANGED); //更改蓝牙名称，打开蓝牙时，可能会调用多次
intentFilter.addAction(BluetoothAdapter.ACTION_REQUEST_DISCOVERABLE);
intentFilter.addAction(BluetoothAdapter.ACTION_REQUEST_ENABLE);
intentFilter.addAction(BluetoothAdapter.ACTION_SCAN_MODE_CHANGED); //搜索模式改变
```


我们发现了[`BluetoothAdapter.ACTION_CONNECTION_STATE_CHANGED`](https://developer.android.com/reference/android/bluetooth/BluetoothAdapter.html#ACTION_CONNECTION_STATE_CHANGED) 和 [`BluetoothAdapter.ACTION_STATE_CHANGED`](https://developer.android.com/reference/android/bluetooth/BluetoothAdapter.html#ACTION_STATE_CHANGED) 这两个Intent广播。

那么这两个广播Intent的区别是什么呢？只用其中一个可以吗？查看Google文档发现

- **`BluetoothAdapter.ACTION_CONNECTION_STATE_CHANGED`** ：指的是本地蓝牙适配器的**连接状态**的发生改变（比如没有关闭本机蓝牙开关时，另外一个配对设备自己把连接断开）

- **`BluetoothAdapter.ACTION_STATE_CHANGED`** ：指的是本地蓝牙适配器的**状态**已更改。 例如，蓝牙开关打开或关闭。

换句话说，一个是用于连接状态的变化，另一个用于蓝牙适配器本身的状态变化。经过测试发现，如果只使用`BluetoothAdapter.ACTION_CONNECTION_STATE_CHANGED` 监听广播，则会接收不到“主动关闭本机蓝牙开关”的广播事件。但只是用`BluetoothAdapter.ACTION_STATE_CHANGED` 的话，很明显这时候蓝牙设备并未真正配对。




动态注册蓝牙连接、断开广播的方式如下：


- 动态注册广播

```java
public class BluetoothConnectionReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(Context context, Intent intent){
        if (BluetoothAdapter.ACTION_CONNECTION_STATE_CHANGED.equals(intent.getAction())) {		//蓝牙连接状态
			int state = intent.getIntExtra(BluetoothAdapter.EXTRA_CONNECTION_STATE, -1);
			if (state == BluetoothAdapter.STATE_CONNECTED || state == BluetoothAdapter.STATE_DISCONNECTED) {
				//连接或失联，切换音频输出（到蓝牙、或者强制仍然扬声器外放）
			}
		} else if (BluetoothAdapter.ACTION_STATE_CHANGED.equals(intent.getAction())){	//本地蓝牙打开或关闭
			int state = intent.getIntExtra(BluetoothAdapter.EXTRA_STATE, -1);
			if (state == BluetoothAdapter.STATE_OFF || state == BluetoothAdapter.STATE_TURNING_OFF) {
				 //断开，切换音频输出
			}
		}

    }
}
```



```java
BluetoothConnectionReceiver audioNoisyReceiver = new BluetoothConnectionReceiver();

//蓝牙状态广播监听
IntentFilter audioFilter = new IntentFilter();
audioFilter.addAction(BluetoothAdapter.ACTION_CONNECTION_STATE_CHANGED);
audioFilter.addAction(BluetoothAdapter.ACTION_STATE_CHANGED);
mContext.registerReceiver(audioNoisyReceiver, audioFilter);
```

之后，我们就可以根据上面切换音频输出通道的代码来实现蓝牙设备连接、断开以后**强制打破操作系统原有的输出通道切换策略**，来实现我们自己想要的切换功能了。









### 参考资料：

1、[Android中的Audio播放：控制Audio输出通道切换 ](http://blog.csdn.net/l627859442/article/details/7918597)
2、[Android音乐播放模式切换-外放、听筒、耳机](http://www.devwiki.net/2015/09/20/Android-Music-Play-Mode/)
3、[Android : Switching audio between Bluetooth and Phone Speaker is inconsistent](http://stackoverflow.com/questions/22770321/android-switching-audio-between-bluetooth-and-phone-speaker-is-inconsistent)
4、[Listening to bluetooth connections](http://www.b2cloud.com.au/tutorial/listening-to-bluetooth-connections/)
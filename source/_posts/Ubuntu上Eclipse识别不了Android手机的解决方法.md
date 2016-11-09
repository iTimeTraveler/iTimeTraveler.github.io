---
title: Ubuntu上Eclipse识别不了Android手机的解决方法
layout: post
date: 2013-10-20 16:46:00
comments: true
tags: [Android]
categories: [Android]
keywords: 
description: 
---


> 转载链接：    http://www.cnblogs.com/AndroidManifest/archive/2011/12/09/2281635.html

google官方开发向导里对Android手机已经设置了允许安装非market程序，并且处于usb调试模式，但是仍然在usb连接电脑后无法被识别的问题作了解释。官方网址：http://developer.android.com/guide/developing/device.html


#### **操作步骤：**

如果是windows平台下，需要安装一个为adb准备的usb驱动。如果是Ubuntu Linux需要添加一个rules文件，里面包含了每一个想要调试的设备的usb配置信息。以HTC手机为例实现步骤如下：

1、在终端输入 :

```shell
sudo gedit /etc/udev/rules.d/51-android.rules
```

<!--more-->


2、在打开的文件里加入   **`SUBSYSTEM=="usb", ATTR{idVendor}=="0bb4", MODE="0666"`**

3、保存退出后在终端执行 :

```shell
sudo chmod a+r /etc/udev/rules.d/51-android.rules
```

重新将手机连接到电脑后HTC手机就可以被正常识别了。注意：如果按步骤操作仍不能识别的，检查 **`ATTR{idVendor}`** 值里的字母是否是**小写**。


如果是别的厂家的手机，需要在步骤2更改**`ATTR{idVendor}`**的值。如果要添加多个厂家的手机，重复步骤2。其他usb供应商的ID如下：

|  Company	| USB Vendor ID  |
| ------------- |:-------------|
| Acer |	0502
| ASUS |	0B05
| Dell |	413C
| Foxconn |	0489
| Garmin-Asus |	091E
| Google |	18D1
| HTC |	0BB4
| Huawei |	12D1
| K-Touch |	24E3
| KT Tech |	2116
| Kyocera |	0482
| Lenevo |	17EF
| LG |	1004
| Motorola |	22B8
| NEC |	0409
| Nook |	2080
| Nvidia |	0955
| OTGV |	2257
| Pantech |	10A9
| Pegatron |	1D4D
| Philips |	0471
| PMC-Sierra |	04DA
| Qualcomm |	05C6
| SK Telesys |	1F53
| Samsung |	04E8
| Sharp |	04DD
| Sony Ericsson |	0FCE
| Toshiba |	0930
| ZTE |	19D2


**注意**：如果按步骤操作仍不能识别的，检查 `ATTR{idVendor}` 值里的字母是否是**`小写`**。

---
title: 【Android】 加解密算法 HMAC 的使用
layout: post
date: 2015-12-31 15:30
comments: true
tags: [Android]
categories: [Android]
keywords: Android
description: HMAC是密钥相关的哈希运算消息认证码（Hash-based Message Authentication Code）,HMAC运算利用哈希算法，以一个密钥和一个消息为输入，生成一个消息摘要作为输出。
---

**1、HMAC算法**

&nbsp;&nbsp; HMAC是密钥相关的哈希运算消息认证码（Hash-based Message Authentication Code）,HMAC运算利用哈希算法，以一个密钥和一个消息为输入，生成一个消息摘要作为输出。

&nbsp;&nbsp;简而言之，HMAC就是含有密钥散列函数算法，兼容了MD和SHA算法的特性，并在此基础上加上了密钥。因此MAC算法也经常被称作HMAC算法。关于hmac算法的详情可以参看RFC 2104(http://www.ietf.org/rfc/rfc2104.txt)，这里包含了HmacMD5算法的C语言实现。


<!--more-->

**2、代码实现（Android）**
```java
//这是HMAC的Android代码
//之所以不是Java是因为代码中的Base64使用的是android.util包下的Base64类，而不是Java自带的Base64类。

public class HMACTest {
	private static final String LOG_TAG = "HMACTest";
	private static final String REGISTER_HMAC_KEY = "12a9cc3f-1fd9-48a3-1fd9-1fd9d027ac2";
	
	private String stringToSign(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA1");
            SecretKeySpec secret = new SecretKeySpec(
                    REGISTER_HMAC_KEY.getBytes("UTF-8"), mac.getAlgorithm());
            mac.init(secret);
            return Base64.encodeToString(mac.doFinal(data.getBytes()), Base64.NO_WRAP);
        } catch (NoSuchAlgorithmException e) {
            Log.e(LOG_TAG, "Hash algorithm SHA-1 is not supported", e);
        } catch (UnsupportedEncodingException e) {
            Log.e(LOG_TAG, "Encoding UTF-8 is not supported", e);
        } catch (InvalidKeyException e) {
            Log.e(LOG_TAG, "Invalid key", e);
        }
        return "";
    }
	
	/*
	 * 测试函数
	 */
	public static void test() {
		HMACTest hmac = new HMACTest();
		String str = "Bello, Miss.Seven";
		System.out.println("加密前：" + str);
		System.out.println("加密后：" + hmac.stringToSign(str));
	}
}
```


【参考资料】：
1、[消息摘要算法-HMAC算法](http://blog.csdn.net/feiyangxiaomi/article/details/34445005)
2、[Java 加解密技术系列之 HMAC](http://blog.csdn.net/happylee6688/article/details/43968549)
---
title: HTTPS原理与证书生成
layout: post
date: 2018-10-30 11:08:00
comments: true
tags: 
    - HTTPS
categories: 
    - Web
keywords: HTTPS
description: 
photos:
   - /gallery/common/https-banner.png
---



## HTTPS

HTTPS与HTTP是什么关系呢？我们可以对比下HTTP与HTTPS的请求过程：

![HTTP请求过程](/gallery/common/http-state.png)

HTTPS 在 TCP 和 HTTP 之间增加了 TLS（Transport Layer Security，传输层安全），提供了**内容加密**、**身份认证**和**数据完整性**三大功能。

![HTTPS请求过程](/gallery/common/https-state.png)

<!-- more -->

HTTPS也就是HTTP over SSL/TLS，所有的http数据都是在SSL/TLS协议封装之上传输的。Https协议在Http协议的基础上，添加了SSL/TLS握手以及数据加密传输，也属于应用层协议。所以，研究Https协议原理，最终其实是研究SSL/TLS协议。

![](/gallery/common/diagram5-session-resumption.png)

可以看到，假设服务端和客户端之间单次传输耗时 28ms，那么客户端需要等到 168ms 之后才能开始发送 HTTP 请求报文，这还没把客户端和服务端处理时间算进去。光是 TLS 握手就需要消耗两个 RTT（Round-Trip Time，往返时间），这就是造成 HTTPS 更慢的主要原因。当然，HTTPS 要求数据加密传输，加解密相比 HTTP 也会带来额外的开销，不过对称加密本来就很快，加上硬件性能越来越好，所以这部分开销还好。

### TLS历史

传输层安全协议（Transport Layer Security，缩写：TLS），及其前身安全套接层（Secure Sockets Layer，缩写：SSL）是一种安全协议，目的是为互联网通信提供安全及数据完整性保障。

![](/gallery/common/hpbn_0401.png)

SSL包含记录层（Record Layer）和传输层，记录层协议确定了传输层数据的封装格式。传输层安全协议使用X.509认证，之后利用非对称加密演算来对通信方做身份认证，之后交换对称密钥作为会谈密钥（Session key）。这个会谈密钥是用来将通信两方交换的数据做加密，保证两个应用间通信的保密性和可靠性，使客户与服务器应用之间的通信不被攻击者窃听。

> 1994年早期，NetScape公司设计了SSL协议（Secure Sockets Layer）的1.0版，但是未发布。
> 1994年11月，NetScape公司发布SSL 2.0版，很快发现有严重漏洞。
> 1996年11月，SSL 3.0版问世，得到大规模应用。
> 1999年1月，互联网标准化组织ISOC接替NetScape公司，发布了SSL的升级版[TLS 1.0版](https://www.ietf.org/rfc/rfc2246.txt)。
> 2006年4月和2008年8月，TLS进行了两次升级，分别为[TLS 1.1](https://tools.ietf.org/html/rfc4346)版和[TLS 1.2](https://tools.ietf.org/html/rfc5246)版。最新的变动是2011年TLS 1.2的修订版。
> 现在正在制定 [tls 1.3](https://github.com/tlswg/tls13-spec)。

## TLS握手过程



TLS的握手阶段是发生在TCP握手之后。握手实际上是一种协商的过程，对协议所必需的一些参数进行协商。TLS握手过程如下：

![](/gallery/common/TLS-handshake-protocol.png)

如上图所示，简述如下：

- ClientHello：客户端生成一个随机数 `random-client`，传到服务器端（Say Hello)
- ServerHello：服务器端生成一个随机数 `random-server`，和着公钥，一起回馈给客户端（I got it)
- 客户端收到的东西原封不动，加上 `premaster secret`（通过 `random-client`、`random-server` 经过一定算法生成的东西），再一次送给服务器端，这次传过去的东西会使用公钥加密
- 服务器端先使用私钥解密，拿到 `premaster secret`，此时客户端和服务器端都拥有了三个要素：`random-client`、`random-server` 和 `premaster secret`
- 此时安全通道已经建立，以后的交流都会校检上面的三个要素通过算法算出的 `session key`

### Client Hello =>

在TLS握手阶段，客户端首先要告知服务端，自己支持哪些加密算法，所以客户端需要将本地支持的加密套件(Cipher Suite)的列表传送给服务端。除此之外，客户端还要产生一个随机数，传送给服务端，客户端的随机数需要跟服务端产生的随机数结合起来产生后面要讲到的Master Secret。即ClientHello主要包含以下信息：

> 1. 支持的协议版本，比如 TLS 1.2
> 2. 一个客户端⽣成的随机数，稍后用于生成"对话密钥"
> 3. 支持的加密方法，⽐如 RSA 公钥加密。
> 4. 支持的压缩方法。

### Server Hello <=

上图中，从Server Hello到Server Done，有些服务端的实现是每条单独发送，有服务端实现是合并到一起发送。Sever Hello和Server Done都是只有头没有内容的数据。

服务端在接收到客户端的Client Hello之后，服务端需要将自己的证书发送给客户端。证书是需要申请，并由专门的数字证书认证机构(CA)通过非常严格的审核之后颁发的电子证书。颁发证书的同时会产生一个私钥和公钥。私钥由服务端自己保存，不可泄漏。公钥则是附带在证书的信息中，可以公开。证书本身也附带一个证书电子签名，这个签名用来验证证书的完整性和真实性，可以防止证书被篡改。另外，证书还有有效期。

在服务端向客户端发送的证书中没有提供足够的信息的时候，还可以向客户端发送一个Server Key Exchange。

此外，对于非常重要的保密数据，服务端还需要对客户端进行验证，以保证数据传送给了安全的合法的客户端。服务端可以向客户端发出Cerficate Request消息，要求客户端发送证书对客户端的合法性进行验证。

跟客户端一样，服务端也需要产生一个随机数发送给客户端。客户端和服务端都需要使用这两个随机数来产生Master Secret。最后服务端会发送一个Server Hello Done消息给客户端，表示Server Hello消息结束了。

> 1. 确认使⽤的加密通信协议版本，⽐如 TLS 1.0 版本。如果浏览器与服务器⽀持的版本不一致，服务器关闭加密通信。
> 2. 一个服务器⽣成的随机数，稍后用于生成"对话密钥"。
> 3. 确认使用的加密方法，⽐如 RSA 公钥加密。
> 4. 服务器证书

### Client Key Exchange =>

如果服务端需要对客户端进行验证，在客户端收到服务端的Server Hello消息之后，首先需要向服务端发送客户端的证书，让服务端来验证客户端的合法性。

在此之前的所有TLS握手信息都是明文传送的。在收到服务端的证书等信息之后，客户端会使用一些加密算法(例如：RSA, Diffie-Hellman)产生一个48个字节的随机数Key，这个Key叫PreMaster Secret，很多材料上也被称作`PreMaster Key`。这是整个TLS握手期间的第三个随机数。最终通过`Master secret`生成`session secret`， `session secret`就是用来对应用数据进行加解密的会话秘钥。为什么需要`PreMaster secret`这第三个随机数的Key呢？因为前两个随机数Client Random和Server Random都是明文传输的。中间人可能早已监听到了。如果只使用这两个随机数计算最终的会话秘钥中间人也可以生成。所以`PreMaster secret`使用RSA非对称加密的方式，使用服务端传过来的公钥进行加密，然后传给服务端。

接着，客户端需要对服务端的证书进行检查，检查证书的完整性以及证书跟服务端域名是否吻合。

ChangeCipherSpec是一个独立的协议，体现在数据包中就是一个字节的数据，用于告知服务端，客户端已经切换到之前协商好的加密套件的状态，准备使用之前协商好的加密套件加密数据并传输了。

在ChangecipherSpec传输完毕之后，客户端会使用之前协商好的加密套件和session secret加密一段Finish的数据传送给服务端，此数据是为了在正式传输应用数据之前对刚刚握手建立起来的加解密通道进行验证。

> 1. 一个随机数`PreMaster Key`。该随机数用服务器公钥加密，防⽌被窃听。
> 2. 编码改变通知，表示随后的信息都将⽤双⽅商定的加密⽅法和密钥发送。
> 3. 客户端握⼿结束通知，表示客户端的握⼿阶段已经结束。这⼀项同时也是前⾯发送的所有内容的 hash 值，⽤来供服务器校验。

### Server Finish <=

服务端在接收到客户端传过来的PreMaster加密数据之后，使用私钥对这段加密数据进行解密，并对数据进行验证，也会使用跟客户端同样的方式生成`session secret`，一切准备好之后，会给客户端发送一个ChangeCipherSpec，告知客户端已经切换到协商过的加密套件状态，准备使用加密套件和`session secret`加密数据了。之后，服务端也会使用`session secret`加密后一段Finish消息发送给客户端，以验证之前通过握手建立起来的加解密通道是否成功。

> 1. 编码改变通知，表示随后的信息都将⽤双方商定的加密⽅法和密钥发送。
> 2. 服务器握⼿结束通知，表示服务器的握⼿阶段已经结束。这⼀项同时也是前⾯发送的所有内容的 hash 值，⽤来供客户端校验。

### 应用数据传输

在所有的握手阶段都完成之后，就可以开始传送应用数据了。应用数据在传输之前，首先要附加上MAC secret，然后再对这个数据包使用write encryption key进行加密。在服务端收到密文之后，使用Client write encryption key进行解密，客户端收到服务端的数据之后使用Server write encryption key进行解密，然后使用各自的write MAC key对数据的完整性包括是否被串改进行验证。

## 几个名词

在详述过程之前，我们需要了解一下，在过程中会出现的内容。

- `session key`: 这是 TLS/SSL 最后协商的结果，用来进行对称加密。
- `client random`: 是一个 32B 的序列值，每次连接来时，都会动态生成，即，每次连接生成的值都不会一样。因为，他包含了 4B 的时间戳和 28B 的随机数。
- `server random`: 和 `client random` 一样，只是由 server 端生成。
- `premaster secret`: 这是 48B 的 blob 数据。它能和 client & server random 通过 `pseudorandom` (PRF) 一起生成 session key。
- `cipher suite`: 用来定义 TLS 连接用到的算法。通常有 4 部分：
  - 非对称加密 (ECDH 或 RSA)
  - 证书验证 (证书的类型)
  - 保密性 (对称加密算法)
  - 数据完整性 (产生 hash 的函数) 比如`AES128-SHA`代表着：
    - RSA 算法进行非对称加密
    - RSA 进行证书验证
    - 128bit AES 对称加密
    - 160bit SHA 数据加密算法
  - 比如`ECDHE-ECDSA-AES256-GCM-SHA384`代表着
    - ECDHE 算法进行非对称加密
    - ECDSA 进行证书验证
    - 265bit AES 对称加密
    - 384bit SHA 数据加密算法

上面主要是根据 RSA 加密方式来讲解的。因为 RSA 才会在 TLS/SSL 过程中，将 pre-master secret 显示的进行传输，这样的结果有可能造成，hacker 拿到了 private key 那么他也可以生成一模一样的 sessionKey。即，该次连接的安全性就没了。

接下来，我们主要讲解一下另外一种加密方式 DH。它和 RSA 的主要区别就是，到底传不传 pre-master secret。RSA 传而 DH 不传。根据 [cloudflare](https://blog.cloudflare.com/keyless-ssl-the-nitty-gritty-technical-details/nwmm4058zw/%E5%B1%8F%E5%B9%95%E5%BF%AB%E7%85%A7%202016-10-16%2022.38.38.png) 的讲解可以清楚的了解到两者的区别：

这是 RSA 的传输方式，基本过程如上述。

![使用RSA加密算法的TLS握手过程](/gallery/common/https_handshake.png)

而 DH 具体区别在下图：

![使用DH加密算法的TLS握手过程](/gallery/common/ssl_handshake_diffie_hellman.jpg)

这里先补充一下 DH 算法的知识。因为，PreMaster secret 就是根据这个生成的。DH 基本过程也不算太难，详情可以参考 [wiki](https://en.wikipedia.org/wiki/Diffie%E2%80%93Hellman_key_exchange#Description)。 它主要运用到的公式就是:

![](/gallery/common/7b09ebb75344061a3bd483c1369b31a45adad94f.svg)

为了防止在 DH 参数交换时，数据过大，DH 使用的是取模数的方式，这样就能限制传输的值永远在 [1,p-1]。这里，先说明一下 DH 算法的基本条件：

- 公共条件： p 和 g 都是已知，并且公开。即，第三方也可以随便获取到。
- 私有条件： a 和 b 是两端自己生成的，第三方获取不到。

基本流程就是：

![DH算法流程](/gallery/common/屏幕快照 2016-10-17 11.24.41.png)

我们只要把上图的 DH parameter 替换为相对应的 X/Y 即可。而最后的 Z 就是我们想要的 Premaster secret。 之后，就和 RSA 加密算法一致，加上两边的 random-num 生成 sessionKey。通过，我们常常称 DH 也叫作 `Ephemeral Diffie-Hellman handshake`。 因为，他每次一的 sessionKey 都是不同的。

而 RSA 和 DH 两者之间的具体的区别就在于：RSA 会将 premaster secret 显示的传输，这样有可能会造成私钥泄露引起的安全问题。而 DH 不会将 premaster secret 显示的传输。

## 实际抓包

通过 Wireshark 抓包可以清楚地看到完整 TLS 握手过程所需的两个 RTT，如下图（来自：[TLS 握手优化详解](https://imququ.com/post/optimize-tls-handshake.html)）：

![](/gallery/common/wireshake-tls-full-handshake.png)

## 私钥的作用

握手阶段有三点需要注意。

> （1）生成对话密钥一共需要三个随机数。
>
> （2）握手之后的对话使用"对话密钥"加密（对称加密），服务器的公钥和私钥只用于加密和解密"对话密钥"（非对称加密），无其他作用。
>
> （3）服务器公钥放在服务器的数字证书之中。

从上面第二点可知，整个对话过程中（握手阶段和其后的对话），服务器的公钥和私钥只需要用到一次。这就是CloudFlare能够提供Keyless服务的根本原因。

某些客户（比如银行）想要使用外部CDN，加快自家网站的访问速度，但是出于安全考虑，不能把私钥交给CDN服务商。这时，完全可以把私钥留在自家服务器，只用来解密对话密钥，其他步骤都让CDN服务商去完成。

![](/gallery/common/bg2014092006.png)

上图中，银行的服务器只参与第四步，后面的对话都不再会用到私钥了。



## 证书生成

证书是HTTPS实现加密的必要途径，一般的HTTPS服务都是单向认证的过程，单向认证就是对服务器的认证，保证服务器的可靠性，正确的生成证书的方式是服务器（也就是https服务的提供者）产生私钥和公钥对，然后将公钥交给CA（就是证书颁发结构）,CA会给用户的公钥进行签名生成证书，然后将证书颁发给服务端，这样用户访问https服务的时候，就能获得服务端的证书，由于是第三方可靠的CA进行签名过的证书，客户端就会信任HTTPS网站，并且不做安全提醒，如果证书不是由第三方受信任的CA机构颁发，客户端就会提示服务器危险信息。

HTTPS也有双向认证，双向认证需要客户端也生成证书，客户端检查服务器的证书，服务器检查客户端的证书，一般都不做客户端的检查认证，所以基本都是单向认证。

### 自签名证书

什么叫自签名呢？就是自己通过keytool去生成一个证书，然后使用，并不是CA机构去颁发的。生成的思路是先生成CA证书，在用生成的CA证书签发自己的证书。使用自签名证书的网站，大家在使用浏览器访问的时候，一般都是报风险警告，比如之前的12306就是这么干的，https://kyfw.12306.cn/otn/ ，点击进入12306的购票页面就能看到了。当然现在我重新试了一下已经不是这样了。

![](/gallery/common/1440987432776078.png)

### 服务端生成自签证书

Golang服务端可以参考这里：https://gist.github.com/denji/12b3a568f092ab951456 和 [Generate ssl certificates with Subject Alt Names on OSX](https://gist.github.com/croxton/ebfb5f3ac143cd86542788f972434c96)

#### 生成服务端私钥 Generate private key (.key)

```bash
# Key considerations for algorithm "RSA" ≥ 2048-bit
openssl genrsa -out server.key 2048

# Key considerations for algorithm "ECDSA" ≥ secp384r1
# List ECDSA the supported curves (openssl ecparam -list_curves)
openssl ecparam -genkey -name secp384r1 -out server.key
```

#### 生成服务端自签名证书 Generation of self-signed(x509) public key (PEM-encodings `.pem`|`.crt`) based on the private (`.key`)

```bash
openssl req -new -x509 -sha256 -key server.key -out server.crt -days 3650
```

在这里需要大家填写资料（有些地方可以空着）

>  Country Name (2 letter code) [AU]:CN
>  State or Province Name (full name) [Some-State]:Guangdong
>  Locality Name (eg, city) []:FoShan
>  Organization Name (eg, company) [Internet Widgits Pty Ltd]:TestCA
>  Organizational Unit Name (eg, section) []:
>  Common Name (e.g. server FQDN or YOUR name) []:localhost
>  Email Address []:

这里有点要注意， `Common Name (e.g. server FQDN or YOUR name) []:` 这一项，是最后可以访问的域名，我这里为了方便测试，写成 localhost ，如果是为了给网站生成证书，需要写成 xxxx.com 。

#### Simple Golang HTTPS/TLS Server

```go
package main

import (
    // "fmt"
    // "io"
    "net/http"
    "log"
)

func HelloServer(w http.ResponseWriter, req *http.Request) {
    w.Header().Set("Content-Type", "text/plain")
    w.Write([]byte("This is an example server.\n"))
    // fmt.Fprintf(w, "This is an example server.\n")
    // io.WriteString(w, "This is an example server.\n")
}

func main() {
    http.HandleFunc("/hello", HelloServer)
    err := http.ListenAndServeTLS(":443", "server.crt", "server.key", nil)
    if err != nil {
        log.Fatal("ListenAndServe: ", err)
    }
}
```

### 客户端访问（Android）

当大家使用Android 中的OkHttp访问一个使用自签名的HTTPS的站点，它会抛出一个`SSLHandshakeException`的异常。

```java
javax.net.ssl.SSLHandshakeException: java.security.cert.CertPathValidatorException: Trust anchor for certification path not found.
    at com.android.org.conscrypt.OpenSSLSocketImpl.startHandshake(OpenSSLSocketImpl.java:322)
    at com.android.okhttp.Connection.upgradeToTls(Connection.java:201)
    at com.android.okhttp.Connection.connect(Connection.java:155)
    at com.android.okhttp.internal.http.HttpEngine.connect(HttpEngine.java:276)
    at com.android.okhttp.internal.http.HttpEngine.sendRequest(HttpEngine.java:211)
    at com.android.okhttp.internal.http.HttpURLConnectionImpl.execute(HttpURLConnectionImpl.java:382)
    at com.android.okhttp.internal.http.HttpURLConnectionImpl.getResponse(HttpURLConnectionImpl.java:332)
    at com.android.okhttp.internal.http.HttpURLConnectionImpl.getInputStream(HttpURLConnectionImpl.java:199)
    at com.android.okhttp.internal.http.DelegatingHttpsURLConnection.getInputStream(DelegatingHttpsURLConnection.java:210)
    at com.android.okhttp.internal.http.HttpsURLConnectionImpl.getInputStream(HttpsURLConnectionImpl.java:25)
    at me.longerian.abcandroid.datetimepicker.TestDateTimePickerActivity$1.run(TestDateTimePickerActivity.java:236)
Caused by: java.security.cert.CertificateException: java.security.cert.CertPathValidatorException: Trust anchor for certification path not found.
    at com.android.org.conscrypt.TrustManagerImpl.checkTrusted(TrustManagerImpl.java:318)
    at com.android.org.conscrypt.TrustManagerImpl.checkServerTrusted(TrustManagerImpl.java:219)
    at com.android.org.conscrypt.Platform.checkServerTrusted(Platform.java:114)
    at com.android.org.conscrypt.OpenSSLSocketImpl.verifyCertificateChain(OpenSSLSocketImpl.java:550)
    at com.android.org.conscrypt.NativeCrypto.SSL_do_handshake(Native Method)
    at com.android.org.conscrypt.OpenSSLSocketImpl.startHandshake(OpenSSLSocketImpl.java:318)
 ... 10 more
Caused by: java.security.cert.CertPathValidatorException: Trust anchor for certification path not found.
 ... 16 more
```

这是因为Android 手机有一套共享证书的机制，如果目标 URL 服务器下发的证书不在已信任的证书列表里，或者该证书是自签名的，不是由权威机构颁发，那么会出异常。我们可以通过自定义的验证机制让证书通过验证。解决方案大家可以移步这里：[Android App 安全的HTTPS 通信](http://pingguohe.net/2016/02/26/Android-App-secure-ssl.html)

## 参考资料

- [SSL/TLS协议运行机制的概述](http://www.ruanyifeng.com/blog/2014/02/ssl_tls.html) - 阮一峰
- [HTTPS证书生成原理和部署细节](https://www.barretlee.com/blog/2015/10/05/how-to-build-a-https-server/)
- [TLS 握手优化详解](https://imququ.com/post/optimize-tls-handshake.html)
- [TLS & SSL 快速进阶](https://www.villainhr.com/page/2016/10/26/TLS%20&%20SSL%20%E5%BF%AB%E9%80%9F%E8%BF%9B%E9%98%B6)
- [Android App 安全的HTTPS 通信](http://pingguohe.net/2016/02/26/Android-App-secure-ssl.html)
- [使用Go实现TLS 服务器和客户端](https://colobu.com/2016/06/07/simple-golang-tls-examples/)
- [Generate ssl certificates with Subject Alt Names on OSX](https://gist.github.com/croxton/ebfb5f3ac143cd86542788f972434c96)
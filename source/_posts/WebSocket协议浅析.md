---
title: WebSocket协议浅析
layout: post
date: 2018-10-27 11:08:00
comments: true
tags: 
    - WebSocket
categories: 
    - Web
keywords: WebSocket
description: 
photos:
   - /gallery/common/websocket_banner.jpg
---

## HTTP协议的缺点

![HTTP协议的缺点](/gallery/common/http-protocol-drawback.jpg)

1. 单向请求：只能是客户端发起，服务端处理并响应
2. 请求/响应模式
3. 无状态协议
4. 半双工协议

这种单向请求的特点，注定了如果服务器有连续的状态变化，客户端要获知就非常麻烦。我们只能使用轮询：每隔一段时候，就发出一个询问，了解服务器有没有新的信息。轮询的效率低，非常浪费资源。WebSocket就可以解决这些问题。

<!-- more -->

## WebSocket是什么

WebSocket是HTML5新增的协议，目的是在浏览器和服务器间建立一个不受限的**全双工通信**的通道。

![](/gallery/common/websocket-model.png)

其特点包括：

（1）建立在 TCP 协议之上，服务器端的实现比较容易。

（2）与 HTTP 协议有着良好的兼容性。默认端口也是80和443，并且握手阶段采用 HTTP 协议，因此握手时不容易屏蔽，能通过各种 HTTP 代理服务器。

（3）数据格式比较轻量，性能开销小，通信高效。

（4）可以发送文本，也可以发送二进制数据。

（5）没有同源限制，客户端可以与任意服务器通信。

（6）协议标识符是`ws`（如果加密，则为`wss`）。地址比如`ws://example.com:80/some/path`

## 协议概览

协议分为两部分：“握手” 和 “数据传输”。

### 握手协议

客户端发出的握手信息类似：

```http
GET /chat HTTP/1.1
Host: server.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Origin: http://example.com
Sec-WebSocket-Protocol: chat, superchat
Sec-WebSocket-Version: 13
```

服务端回应的握手信息类式：

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
Sec-WebSocket-Protocol: chat
```

WebSocket连接必须由客户端发起握手信息。握手内容包括了 HTTP 升级请求和一些必选以及可选的头字段。握手的细节如下：

- 握手必须是一个有效的 HTTP 请求
- 请求的方法必须是 GET，并且 HTTP 的版本必须至少是 1.1
- 请求的 Request-URI 部分可使相对路径或者绝对路径
- 请求必须有一个 |Host| 头字段，它的值是 host 主机名称加上 port 端口名称（默认端口不必指明）
- 请求必须有一个 |Upgrade| 头字段，它的值必须是 websocket 这个关键字
- 请求必须有一个 |Connection| 头字段，它的值必须是 Upgrade 这个标记
- 请求必须有一个 |Sec-WebSocket-Key| 头字段，它的值是一个噪音值。每个连接的噪音必须不同且随机。
- 如果连接来自浏览器客户端，那么 |Origin| 字段就是必须的。如果连接不是来自于一个浏览器客户端，那么这个值就是可选的。这个值表示的是发起连接的代码在运行时所属的源。关于源是由哪些部分组成的，见 [RFC6454](https://link.jianshu.com/?t=https://tools.ietf.org/html/rfc6454)。
- 请求必须有一个 |Sec-WebSocket-Version| 头字段，它的值必须是 13
- 请求可以有一个可选的头字段 |Sec-WebSocket-Protocol|。如果包含了这个头字段，它的值表示的是客户端希望使用的子协议，按子协议的名称使用逗号分隔。每个以逗号分隔的元素之间必须相互不重复。
- 请求可以有一个可选的头字段 |Sec-WebSocket-Extensions|。如果包含了这个字段，它的值表示的是客户端希望使用的协议级别的扩展。
- 请求可以包含其他可选的头字段，比如 cookies，或者认证相关的头字段，比如 |Authorization| 。


## 参考资料

- [WebSocket协议原文：RFC6455](https://tools.ietf.org/html/rfc6455)
- [WebSocket 协议 1~4 节](https://www.jianshu.com/p/867274a5e054)
- [WebSocket 教程 - 阮一峰](http://www.ruanyifeng.com/blog/2017/05/websocket.html)

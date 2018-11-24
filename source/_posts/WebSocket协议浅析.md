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

半双工数据传输指数据可以在一个信号载体的两个方向上传输，但是不能同时传输。HTTP协议这种单向请求的特点，注定了如果服务器有连续的状态变化，客户端要获知就非常麻烦。我们只能使用轮询：每隔一段时候，就发出一个询问，了解服务器有没有新的信息。轮询的效率低，非常浪费资源。WebSocket就可以解决这些问题。

<!-- more -->

## WebSocket是什么

WebSocket是HTML5新增的协议，目的是在浏览器和服务器间建立一个不受限的**全双工通信**的通道。这就使得浏览器具备了实时双向通信的能力。

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

握手部分的设计目的就是兼容现有的基于 HTTP 的服务端组件（web 服务器软件）或者中间件（代理服务器软件）。这样一个端口就可以同时接受普通的 HTTP 请求或则 WebSocket 请求了。为了这个目的，WebSocket 客户端的握手是一个 HTTP 升级版的请求（HTTP Upgrade request）。

#### 客户端：申请协议升级

所以，WebSocket连接必须由客户端发起，因为握手协议是一个标准的HTTP Upgrade请求。客户端发出的握手信息类似如下：

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

WebSocket的发起握手内容包括了 HTTP 升级请求和一些必选以及可选的头字段。握手的细节如下：

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

重点请求首部意义如下：

- `Connection: Upgrade`：表示要升级协议
- `Upgrade: websocket`：表示要升级到 websocket 协议。
- `Sec-WebSocket-Version: 13`：表示 websocket 的版本。如果服务端不支持该版本，需要返回一个`Sec-WebSocket-Version` header，里面包含服务端支持的版本号。
- `Sec-WebSocket-Key`：与后面服务端响应首部的`Sec-WebSocket-Accept`是配套的，提供基本的防护，比如恶意的连接，或者无意的连接。
- `Sec-WebSocket-Protocol`: 它可以指出让服务端选择使用哪些协议。客户端需要验证服务端选择的子协议，是否是其当初的握手请求中的 `Sec-WebSocket-Protocol`中的一个。

注意，上面的请求示例省略了部分非重点请求首部。由于是标准的 HTTP 请求，类似 Host、Origin、Cookie 等请求首部会照常发送。在握手阶段，可以通过相关请求首部进行 安全限制、权限校验等。

#### 服务端：响应协议升级

服务端回应的握手信息类似如下：

```http
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
Sec-WebSocket-Protocol: chat
```

服务端返回内容如下，状态代码`101`表示协议切换。任何其他的非 `101` 表示 WebSocket 握手还没有结束，客户端需要使用原有的 HTTP 的方式去响应那些状态码。到此完成协议升级，后续的数据交互都按照新的协议来。

客户端的握手请求由 请求行 (Request-Line) 开始。客户端的回应由 状态行 (Status-Line) 开始。首行之后的部分，都是没有顺序要求的 HTTP Headers。其中的一些 HTTP头 的意思稍后将会介绍，不过也可包括例子中没有提及的头信息，比如 Cookies 信息

#### Sec-WebSocket-Key 与 Sec-WebSocket-Accept

服务端为了告知客户端它已经接收到了客户端的握手请求，服务端需要返回一个包含`Sec-WebSocket-Accept`的握手响应。这个值的信息来自于客户端的握手请求中的 `Sec-WebSocket-Key` 头字段：

- 客户端握手中的 Sec-WebSocket-Key 头字段的值是采用 base64 编码的16字节随机数。
- 服务端需将该值和固定的 GUID 字符串（ 258EAFA5-E914-47DA-95CA-C5AB0DC85B11）拼接后使用 SHA-1 进行哈希，并采用 base64 编码后，作为响应握手的 |Sec-WebSocket-Accept| 值返回。
- 客户端也必须按照服务端生成 |Sec-WebSocket-Accept| 的方式生成字符串，与服务端回传的进行对比，如果不同就标记连接为失败。

也就是说，服务端返回的 Header 字段 `Sec-WebSocket-Accept` 是根据客户端请求 Header 中的`Sec-WebSocket-Key`计算出来。 

计算公式为：

1. 将`Sec-WebSocket-Key`跟该固定字符串`258EAFA5-E914-47DA-95CA-C5AB0DC85B11`拼接。
2. 通过 SHA1 计算出摘要，并转成 base64 字符串。

`Sec-WebSocket-Key/Sec-WebSocket-Accept`在主要作用在于提供基础的防护，减少恶意连接、意外连接。作用大致归纳如下：

1. 避免服务端收到非法的 websocket 连接（比如 http 客户端不小心请求连接 websocket 服务，此时服务端可以直接拒绝连接）
2. 确保服务端理解 websocket 连接。因为 ws 握手阶段采用的是 http 协议，因此可能 ws 连接是被一个 http 服务器处理并返回的，此时客户端可以通过 Sec-WebSocket-Key 来确保服务端认识 ws 协议。（并非百分百保险，比如总是存在那么些无聊的 http 服务器，光处理 Sec-WebSocket-Key，但并没有实现 ws 协议。。。）
3. 用浏览器里发起 ajax 请求，设置 header 时，Sec-WebSocket-Key 以及其他相关的 header 是被禁止的。这样可以避免客户端发送 ajax 请求时，意外请求协议升级（websocket upgrade）
4. 可以防止反向代理（不理解 ws 协议）返回错误的数据。比如反向代理前后收到两次 ws 连接的升级请求，反向代理把第一次请求的返回给 cache 住，然后第二次请求到来时直接把 cache 住的请求给返回（无意义的返回）。
5. Sec-WebSocket-Key 主要目的并不是确保数据的安全性，因为 Sec-WebSocket-Key、Sec-WebSocket-Accept 的转换计算公式是公开的，而且非常简单，最主要的作用是预防一些常见的意外情况（非故意的）。

强调：Sec-WebSocket-Key/Sec-WebSocket-Accept 的换算，只能带来基本的保障，但连接是否安全、数据是否安全、客户端 / 服务端是否合法的 ws 客户端、ws 服务端，其实并没有实际性的保证。

### 数据帧协议

握手完成之后，双方传输数据的协议格式如下：

![](/gallery/common/websocket-protocol-form.png)

- **FIN**:  1 bit

  标记这个帧是不是消息中的最后一帧。第一个帧也可是最后一帧。

- **RSV1, RSV2, RSV3**:  1 bit each

  必须是0，除非有扩展赋予了这些位非0值的意义。

- **Opcode**:  4 bits

  定义了如何解释 “有效负荷数据 Payload data”。如果接收到一个未知的操作码，接收端必须标记 WebSocket 为失败。定义了如下的操作码：

  *  `%x0`     表示这是一个继续帧（continuation frame）
  *  `%x1`      表示这是一个文本帧 （text frame）
  *  `%x2`      表示这是一个二进制帧 （binary frame）
  *  `%x3-7`    为将来的非控制帧（non-control frame）而保留的
  *  `%x8`      表示这是一个连接关闭帧 （connection close）
  *  `%x9`      表示这是一个 ping 帧
  *  `%xA`      表示这是一个 pong 帧
  *  `%xB-F`    为将来的控制帧（control frame）而保留的

- **Mask**:  1 bit

  表示是否要对数据载荷进行掩码操作。所有的由客户端发往服务端的帧都必须设置为 1。如果被设置为 1，那么在 Masking-Key 部分将有一个掩码key，服务端需要使用它将 “有效载荷数据” 进行反掩码操作。从客户端向服务端发送数据时，需要对数据进行掩码操作；从服务端向客户端发送数据时，不需要对数据进行掩码操作。如果服务端接收到的数据没有进行过掩码操作，服务端需要断开连接。
  ​      
  如果 Mask 是 1，那么在 Masking-key 中会定义一个掩码键（masking key），并用这个掩码键来对数据载荷进行反掩码。所有客户端发送到服务端的数据帧，Mask 都是 1。

- **Payload length**:  7 bits, 7+16 bits, or 7+64 bits

  * 如果是 0-125，那么就直接表示了负荷长度。
  * 如果是 126，那么接下来的两个字节表示(16位)负荷长度。
  * 如果是 127，则接下来的 8 个字节表示(64位)负荷长度。

- **Masking-Key**:  1 bit

  所有从客户端传送到服务端的数据帧，数据载荷都进行了掩码操作，Mask 为 1，且携带了 4 字节的 Masking-key。如果 Mask 为 0，则没有 Masking-key。

#### 客户端到服务端掩码

掩码键（Masking-key）是由客户端挑选出来的 32 位的随机数。掩码操作不会影响数据载荷的长度。掩码、反掩码操作都采用如下算法：

首先，假设：

- `original-octet-i`：为原始数据的第 i 字节。
- `transformed-octet-i`：为转换后的数据的第 i 字节。
- `j`：为`i mod 4`的结果。
- `masking-key-octet-j`：为 mask key 第 j 字节。

则生成方式是通过原始数据的第 i 字节 （original-octet-i）与Masking-Key中的第 j 个字节 （masking-key-octet-j） 进行异或（XOR）操作：

```java
j = i MOD 4
transformed-octet-i = original-octet-i XOR masking-key-octet-j
```

在WebSocket 协议中，数据掩码的作用是增强协议的安全性。但数据掩码并不是为了保护数据本身，因为算法本身是公开的，运算也不复杂。除了加密通道本身，似乎没有太多有效的保护通信安全的办法。

那么为什么还要引入掩码计算呢，除了增加计算机器的运算量外似乎并没有太多的收益（这也是不少同学疑惑的点）。

答案还是两个字：**安全**。但并不是为了防止数据泄密，而是**为了防止早期版本的协议中存在的代理缓存污染攻击（proxy cache poisoning attacks）**等问题。关于代理缓存污染攻击的原理可以参考[WebSocket协议深入探究](http://www.infoq.com/cn/articles/deep-in-websocket-protocol)。

#### 数据分片

数据分片的目的就是允许发送那些在发送时不知道其缓冲的长度的消息。如果消息不能被碎片化，那么一端就必须将消息整个地载入内存缓冲，这样在发送消息前才可以计算出消息的字节长度。有了碎片化的机制，服务端或者中间件就可以选取其适用的内存缓冲长度，然后当缓冲满了之后就发送一个消息碎片。

碎片机制带来的另一个好处就是可以方便实现多路复用。没有多路复用的话，就需要将一整个大的消息放在一个逻辑通道中发送，这样会占用整个输出通道。多路复用需要可以将消息分割成小的碎片，使这些小的碎片可以共享输出通道。（注意多路复用的扩展在这片文档中并没有进行描述）

WebSocket 的每条消息可能被切分成多个数据帧。当 WebSocket 的接收方收到一个数据帧时，会根据`FIN`的值来判断，是否已经收到消息的最后一个数据帧。

FIN=1 表示当前数据帧为消息的最后一个数据帧，此时接收方已经收到完整的消息，可以对消息进行处理。FIN=0 则接收方还需要继续监听接收其余的数据帧。

此外，`opcode`在数据交换的场景下，表示的是数据的类型。`0x01`表示文本，`0x02`表示二进制。而`0x00`比较特殊，表示延续帧（continuation frame），顾名思义，就是完整消息对应的数据帧还没接收完。下面的例子演示了碎片化是如何工作的。

**例子：第一条消息**

> FIN=1, 表示是当前消息的最后一个数据帧。服务端收到当前数据帧后，可以处理消息。opcode=0x1，表示客户端发送的是文本类型。

**例子：第二条消息**

> 1. FIN=0，opcode=0x1，表示发送的是文本类型，且消息还没发送完成，还有后续的数据帧。
> 2. FIN=0，opcode=0x0，表示消息还没发送完成，还有后续的数据帧，当前的数据帧需要接在上一条数据帧之后。
> 3. FIN=1，opcode=0x0，表示消息已经发送完成，没有后续的数据帧，当前的数据帧需要接在上一条数据帧之后。服务端可以将关联的数据帧组装成完整的消息。

#### 连接保持 + 心跳

WebSocket协议为了保持客户端、服务端的实时双向通信，需要确保客户端、服务端之间的 TCP 通道保持连接没有断开。然而，对于长时间没有数据往来的连接，如果依旧长时间保持着，可能会浪费包括的连接资源。

但不排除有些场景，客户端、服务端虽然长时间没有数据往来，但仍需要保持连接。这个时候，可以采用WebSocket数据帧的心跳字段来实现。

- 发送方 -> 接收方：ping
- 接收方 -> 发送方：pong

ping、pong 的操作，对应的是 WebSocket 的两个控制帧，`Opcode`分别是`0x9`、`0xA`。



## WebSocket与TCP、HTTP的关系

WebSocket 协议的设计理念就是提供极小的帧结构（帧结构存在的目的就是使得协议是基于帧的，而不是基于流的，同时帧可以区分 Unicode 文本和二进制的数据）。它期望可以在应用层中使得元数据可以被放置到 WebSocket 层上，也就是说，给应用层提供一个将数据直接放在 TCP 层上的机会，再简单的说就可以给浏览器脚本提供一个使用受限的 Raw TCP 的机会。

从概念上来说，WebSocket 只是一个建立于 TCP 之上的层，它提供了下面的功能：

- 给浏览器提供了一个基于源的安全模型（origin-based security model）
- 给协议提供了一个选址的机制，使得在同一个端口上可以创立多个服务，并且将多个域名关联到同一个 IP
- 在 TCP 层之上提供了一个类似 TCP 中的帧的机制，但是没有长度的限制
- 提供了关闭握手的方式，以适应存在中间件的情况

从概念上将，就只有上述的几个用处。不过 WebSocket 可以很好的和 HTTP 协议一同协作，并且可以充分的利用现有的 web 基础设施，比如代理。WebSocket 的目的就是让简单的事情变得更加的简单。

协议被设计成可扩展的，将来的版本中将很可能会添加关于多路复用的概念。（也就是说**目前的WebSocket协议还未支持多路复用**）

WebSocket 是一个独立的基于 TCP 的协议，它与 HTTP 之间的唯一关系就是它的握手请求可以作为一个升级请求（Upgrade request）经由 HTTP 服务器解释（也就是可以使用 Nginx 反向代理一个 WebSocket）。

默认情况下，WebSocket 协议使用 80 端口作为一般请求的端口，端口 443 作为基于传输加密层连接（TLS）的端口。

## WebSocket协议缺点

1. WebSocket协议很容易发生队首阻塞的情况（IM等APP使用UDP协议而不是TCP？）
2. WebSocket协议不支持多路复用（但支持扩展）

## 参考资料

- [WebSocket协议原文：RFC6455](https://tools.ietf.org/html/rfc6455)
- [WebSocket 协议 1~4 节](https://www.jianshu.com/p/867274a5e054)
- [WebSocket协议深入探究](http://www.infoq.com/cn/articles/deep-in-websocket-protocol)
- [WebSocket 教程 - 阮一峰](http://www.ruanyifeng.com/blog/2017/05/websocket.html)
- [Golang实现：gorilla/websocket](https://github.com/gorilla/websocket)

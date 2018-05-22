---
title: 【Java】NIO的原理与浅析
layout: post
date: 2018-05-15 22:20:55
comments: true
tags: 
    - Java
categories: 
    - Java
keywords: 线程池
description: 
photos:
    - /gallery/java-common/nio-selector-model.png
---



## 几个概念

### 用户空间与内核空间

现在操作系统都是采用虚拟存储器，那么对32位操作系统而言，它的寻址空间（虚拟存储空间）为4G（2的32次方）。操作系统的核心是内核，独立于普通的应用程序，可以访问受保护的内存空间，也有访问底层硬件设备的所有权限。为了保证用户进程不能直接操作内核（kernel），保证内核的安全，操心系统将虚拟空间划分为两部分，一部分为内核空间，一部分为用户空间。针对linux操作系统而言，将最高的1G字节（从虚拟地址0xC0000000到0xFFFFFFFF），供内核使用，称为内核空间，而将较低的3G字节（从虚拟地址0x00000000到0xBFFFFFFF），供各个进程使用，称为用户空间。

在Linux世界，进程不能直接访问硬件设备，当进程需要访问硬件设备(比如读取磁盘文件，接收网络数据等等)时，必须由用户态模式切换至内核态模式，通过系统调用访问硬件设备。

### 文件描述符fd

文件描述符（File descriptor）是计算机科学中的一个术语，是一个用于表述指向文件的引用的抽象化概念。

文件描述符在形式上是一个非负整数。实际上，它是一个索引值，指向内核为每一个进程所维护的该进程打开文件的记录表。当程序打开一个现有文件或者创建一个新文件时，内核向进程返回一个文件描述符。在程序设计中，一些涉及底层的程序编写往往会围绕着文件描述符展开。但是文件描述符这一概念往往只适用于UNIX、Linux这样的操作系统。

<!-- more -->

##  IO - 同步、异步、阻塞、非阻塞

本文讨论的背景是Linux环境下的network IO。同步（Synchronous） IO和异步（Asynchronous） IO，阻塞（Blocking） IO和非阻塞（Non-Blocking）IO分别是什么，到底有什么区别？ 我们可以参考下这篇文章：[IO - 同步，异步，阻塞，非阻塞 （亡羊补牢篇）](https://blog.csdn.net/historyasamirror/article/details/5778378)

本文最重要的参考文献是Richard Stevens的“**UNIX® Network Programming Volume 1, Third Edition: The Sockets Networking** ”，6.2节“**I/O Models** ”，Stevens在这节中详细说明了各种IO的特点和区别。

Stevens在文章中一共比较了五种IO Model：

- [1] blocking IO - 阻塞IO
- [2] nonblocking IO - 非阻塞IO
- [3] IO multiplexing - IO多路复用
- [4] signal driven IO - 信号驱动IO
- [5] asynchronous IO - 异步IO

其中前面4种IO都可以归类为synchronous IO - 同步IO。由于signal driven IO在实际中并不常用，所以我这只提及剩下的四种IO Model。

下面以network IO中的read读操作为切入点，来讲述同步（synchronous） IO和异步（asynchronous） IO、阻塞（blocking） IO和非阻塞（non-blocking）IO的异同。一般情况下，一次网络IO读操作会涉及两个系统对象：(1) 用户进程(线程)Process；(2)内核对象kernel，两个处理阶段：

```javascript
[1] Waiting for the data to be ready - 等待数据准备好
[2] Copying the data from the kernel to the process - 将数据从内核空间的buffer拷贝到用户空间进程的buffer
```

IO模型的异同点就是区分在这两个系统对象、两个处理阶段的不同上。

### 1. 同步IO 之 Blocking IO

![](/gallery/java-common/blocking-io.png)

当用户进程调用了recvfrom这个系统调用，kernel就开始了IO的第一个阶段：准备数据（对于网络IO来说，很多时候数据在一开始还没有到达。比如，还没有收到一个完整的UDP包。这个时候kernel就要等待足够的数据到来）。这个过程需要等待，也就是说数据被拷贝到操作系统内核的缓冲区中是需要一个过程的。而在用户进程这边，整个进程会被阻塞。当kernel一直等到数据准备好了，它就会将数据从kernel中拷贝到用户内存，然后kernel返回结果，用户进程才解除block的状态，重新运行起来。

> 所以，blocking IO的特点就是在IO执行的两个阶段都被block了。

### 2. 同步IO 之 NonBlocking IO

![](/gallery/java-common/nonblocking-io.png)

从图中可以看出，process在NonBlocking IO读recvfrom操作的第一个阶段是不会block等待的，如果kernel数据还没准备好，那么recvfrom会立刻返回一个EWOULDBLOCK错误。当kernel准备好数据后，进入处理的第二阶段的时候，process会等待kernel将数据copy到自己的buffer，在kernel完成数据的copy后process才会从recvfrom系统调用中返回。

> 所以，nonblocking IO的特点是用户进程需要**不断的主动询问**kernel数据好了没有。

### 3. 同步IO 之 IO multiplexing

IO多路复用，就是我们熟知的select、poll、epoll模型。从下图可见，在IO多路复用的时候，process在两个处理阶段都是block住等待的。初看好像IO多路复用没什么用，其实select、poll、epoll的优势在于可以以较少的代价来同时监听处理多个IO。在于使用单个process就可以同时处理多个网络连接的IO。它的基本原理就是select，poll，epoll这个function会不断的轮询所负责的所有socket，当某个socket有数据到达了，就通知用户进程

![](/gallery/java-common/io-multiplexing.png)

`当用户进程调用了select，那么整个进程会被block`，而同时，kernel会“监视”所有select负责的socket，当任何一个socket中的数据准备好了，select就会返回。这个时候用户进程再调用read操作，将数据从kernel拷贝到用户进程。。

> 所以，I/O 多路复用的特点是通过一种机制一个进程能同时等待多个文件描述符，而这些文件描述符（套接字描述符）其中的任意一个进入读就绪状态，select()函数就可以返回。

这个图和blocking IO的图其实并没有太大的不同，事实上，还更差一些。因为这里需要使用两个system call (**select** 和 **recvfrom**)，而blocking IO只调用了一个system call (**recvfrom**)。但是，用select的优势在于它可以同时处理多个connection。

所以，如果处理的连接数不是很高的话，使用select/epoll的web server不一定比使用multi-threading + blocking IO的web server性能更好，可能延迟还更大。select/epoll的优势并不是对于单个连接能处理得更快，而是在于能处理更多的连接。）

在IO multiplexing Model中，实际中，对于每一个socket，一般都设置成为non-blocking，但是，如上图所示，整个用户的process其实是一直被block的。只不过process是被select这个函数block，而不是被socket IO给block。

### 4. 异步IO

![](/gallery/java-common/asynchronus-io.png)

从上图看出，异步IO要求用户进程在**aio_read**操作的两个处理阶段上都不能等待，也就是用户进程调用aio_read后立刻返回，kernel自行去准备好数据并将数据从kernel的buffer中copy到用户进程的buffer在通知用户进程读操作完成了，然后会发送一个signal通知用户进程去继续处理。遗憾的是，linux的网络IO中是不存在异步IO的，linux的网络IO处理的第二阶段总是阻塞等待数据copy完成的。真正意义上的网络异步IO是Windows下的IOCP（IO完成端口）模型。

> 所以，asynchronous IO的特点就是在IO执行的两个阶段都**不会被block**。

各个IO Model的比较如图所示：

![](/gallery/java-common/compare.png)

很多时候，我们比较容易混淆non-blocking IO和asynchronous IO，认为是一样的。但是通过上图，几种IO模型的比较，会发现non-blocking IO和asynchronous IO的区别还是很明显的，non-blocking IO仅仅要求处理的第一阶段不block即可，但是它仍然要求进程去主动的check，并且当数据准备完成以后，也需要进程主动的再次调用recvfrom来将数据拷贝到用户内存。而asynchronous IO要求两个阶段都不能block住。用户进程将整个IO操作交给了kernel系统调用去完成，然后kernel做完后发信号通知。在此期间，用户进程不需要去检查IO操作的状态，也不需要主动的去拷贝数据。

## I/O 多路复用之select、poll、epoll详解

select，poll，epoll三个都是Linux的IO多路复用的机制，可以监视多个描述符的读/写等事件，一旦某个描述符就绪（一般是读或者写事件发生了），就能够将发生的事件通知给关心的应用程序去处理该事件。但本质上，`select`、`poll`、`epoll`本质上都是同步I/O。因为他们都需要在读写事件就绪后自己负责进行读写，也就是说这个读写过程是阻塞的，而异步I/O则无需自己负责进行读写，异步I/O的实现会负责把数据从内核拷贝到用户空间。参考文章：[Linux IO模式及 select、poll、epoll详解](https://segmentfault.com/a/1190000003063859)

### select

```C
int select (int n, fd_set *readfds, fd_set *writefds, fd_set *exceptfds, struct timeval *timeout);
```

select 函数监视的文件描述符分3类，分别是writefds、readfds、和exceptfds。调用后select函数会阻塞，直到有描述符就绪（有数据可读、可写、或者有except），或者超时（timeout指定等待时间，如果立即返回设为null即可），函数返回。当select函数返回后，可以 通过遍历fdset，来找到就绪的描述符。

select目前几乎在所有的平台上支持，其良好跨平台支持也是它的一个优点。**select的一个缺点在于单个进程能够监视的文件描述符的数量存在最大限制，在Linux上一般为1024**，可以通过修改宏定义甚至重新编译内核的方式提升这一限制，但是这样也会造成效率的降低。

select的本质是采用32个整数的32位，即32\*32=1024来标识，fd值为1-1024。当fd的值超过1024限制时，就必须修改`FD_SETSIZE`的大小。这个时候就可以标识32\*max值范围的fd。

伪代码如下：

```java
while true {
    select(streams[])
    for i in streams[] {
        if i has data
        read until unavailable
    }
}
```

于是，如果没有I/O事件产生，我们的程序就会阻塞在select处。但是我们从select那里仅仅知道了，有I/O事件发生了，但却并不知道是那几个流（可能有一个，多个，甚至全部），我们只能无差别轮询所有流，找出能读出数据，或者写入数据的流，对他们进行操作。这里我们有O(n)的无差别轮询复杂度，同时处理的流越多，每一次无差别轮询时间就越长。

### poll

```C
int poll (struct pollfd *fds, unsigned int nfds, int timeout);
```

不同与select使用三个位图来表示三个fdset的方式，poll使用一个 pollfd的指针实现。

```C
struct pollfd {
    int fd; /* file descriptor */
    short events; /* requested events to watch */
    short revents; /* returned events witnessed */
};
```

pollfd结构包含了要监视的event和发生的event，不再使用select“参数-值”传递的方式。同时，pollfd并没有最大数量限制（但是数量过大后性能也是会下降）。 和select函数一样，poll返回后，需要轮询pollfd来获取就绪的描述符。

poll与select不同，通过一个pollfd数组向内核传递需要关注的事件，故没有描述符个数的限制，pollfd中的events字段和revents分别用于标示关注的事件和发生的事件，故pollfd数组只需要被初始化一次。

> 从上面看，select和poll都需要在返回后，`通过遍历文件描述符来获取已经就绪的socket`。事实上，同时连接的大量客户端在一时刻可能只有很少的处于就绪状态，因此随着监视的描述符数量的增长，其效率也会线性下降。

### epoll

epoll是在2.6内核中提出的，是之前的select和poll的增强版本。相对于select和poll来说，epoll更加灵活，没有描述符限制。epoll使用一个文件描述符管理多个描述符，将用户关心的文件描述符的事件存放到内核的一个事件表中，这样在用户空间和内核空间的copy只需一次。

#### epoll操作过程

epoll操作过程需要三个接口，分别如下：

```C
int epoll_create(int size)；//创建一个epoll的fd句柄，size用来告诉内核这个监听的数目一共有多大
int epoll_ctl(int epfd, int op, int fd, struct epoll_event *event)；
int epoll_wait(int epfd, struct epoll_event * events, int maxevents, int timeout);
```

**1. int epoll_create(int size);**

创建一个epoll的fd文件描述符句柄，size用来告诉内核这个监听的数目一共有多大，这个参数不同于select()中的第一个参数，给出最大监听的fd+1的值，**参数size并不是限制了epoll所能监听的描述符最大个数，只是对内核初始分配内部数据结构的一个建议**。因为在linux 2.6.8之前的内核，epoll使用hash来组织fds集合，于是在创建epoll fd的时候，epoll需要初始化hash的大小。于是`epoll_create(int size)`有一个参数size，以便内核根据size的大小来分配hash的大小。在linux 2.6.8以后的内核中，epoll使用红黑树来组织监控的fds集合，于是`epoll_create(int size)`的参数size实际上已经没有意义了。
当创建好epoll句柄后，它就会占用一个fd值，在linux下如果查看`/proc/进程id/fd/`，是能够看到这个fd的，所以在使用完epoll后，必须调用`close()`关闭，否则可能导致fd被耗尽。

**2. int epoll_ctl(int epfd, int op, int fd, struct epoll_event \*event)；**

函数是对指定描述符fd执行op操作。
\- epfd：是epoll_create()的返回值。
\- op：表示op操作，用三个宏来表示：添加EPOLL_CTL_ADD，删除EPOLL_CTL_DEL，修改EPOLL_CTL_MOD。分别添加、删除和修改对fd的监听事件。
\- fd：是需要监听的fd（文件描述符）
\- epoll_event：是告诉内核需要监听什么事，struct epoll_event结构如下：

```C
struct epoll_event {
  __uint32_t events;  /* Epoll events */
  epoll_data_t data;  /* User data variable */
};

//events可以是以下几个宏的集合：
EPOLLIN ：表示对应的文件描述符可以读（包括对端SOCKET正常关闭）；
EPOLLOUT：表示对应的文件描述符可以写；
EPOLLPRI：表示对应的文件描述符有紧急的数据可读（这里应该表示有带外数据到来）；
EPOLLERR：表示对应的文件描述符发生错误；
EPOLLHUP：表示对应的文件描述符被挂断；
EPOLLET： 将EPOLL设为边缘触发(Edge Triggered)模式，这是相对于水平触发(Level Triggered)来说的。
EPOLLONESHOT：只监听一次事件，当监听完这次事件之后，如果还需要继续监听这个socket的话，需要再次把这个socket加入到EPOLL队列里
```

**3. int epoll_wait(int epfd, struct epoll_event \* events, int maxevents, int timeout);**

等待epfd上的io事件，最多返回maxevents个事件。
参数events用来从内核得到事件的集合，maxevents告知内核最多返回的events要几个，这个maxevents的值不能大于创建epoll_create()时的size，参数timeout是超时时间（毫秒，0会立即返回，-1将不确定，也有说法说是永久阻塞）。该函数返回需要处理的事件数目，如返回0表示已超时。



伪代码如下：

```java
while true {
    active_stream[] = epoll_wait(epollfd)
    for i in active_stream[] {
        read or write till
    }
}
```

epoll可以理解为event poll，不同于忙轮询和无差别轮询，epoll之会把哪个流发生了怎样的I/O事件通知我们。此时我们对这些流的操作都是有意义的。（复杂度降低到了O(1)或者O(k)）

epoll是poll的一种优化，返回后不需要对所有的fd进行遍历，在内核中维持了fd的列表。select和poll是将这个内核列表维持在用户态，然后传递到内核中。与poll/select不同，epoll不再是一个单独的系统调用，而是由epoll_create / epoll_ctl / epoll_wait三个系统调用组成，后面将会看到这样做的好处。epoll在2.6以后的内核才支持。

## NIO的概念

我们平常说的普通的Java IO就是阻塞I/O模式，一个线程只能处理一个流的I/O事件。如果想要同时处理多个流，要么多进程(fork)，要么多线程(pthread_create)，很不幸这两种方法效率都不高。

自从JDK 1.4版本以来，JDK发布了全新的I/O类库，简称NIO（New I/O），是一种同步非阻塞的I/O模型，也是I/O多路复用的基础，已经被越来越多地应用到大型应用服务器，成为解决高并发与大量连接、I/O处理问题的有效方式。

![](/gallery/java-common/200901051231133411250.jpg)

NIO的包中主要包含了这样几种抽象数据类型： 

- **Buffer**：包含数据且用于读写的线形表结构。其中还提供了一个特殊类用于内存映射文件的I/O操作。
- **Charset**：它提供Unicode字符串影射到字节序列以及逆映射的操作。
- **Channels**：包含socket，file和pipe三种管道，都是全双工的通道。
- **Selector**：多个异步I/O操作集中到一个或多个线程中（可以被看成是Unix中select()函数的面向对象版本）。



![](/gallery/java-common/Nio_Selector.png)









## 源码分析

### 简单了解Channel和Buffer

![](/gallery/java-common/nio-buffer.png)

### Channel

> A channel represents an open connection to an entity such as a hardware device, a file, a network socket, or a program component that is capable of performing one or more distinct I/O operations, for example reading or writing.

NIO把它支持的I/O对象抽象为Channel，Channel又称“通道”，类似于原I/O中的流（Stream），但有所区别：
1、流是单向的，通道是双向的，可读可写。
2、流读写是阻塞的，通道可以异步读写。
3、流中的数据可以选择性的先读到缓存中，通道的数据总是要先读到一个缓存中，或从缓存中写入，如下所示：

![](/gallery/java-common/2184951-bd19826b2e3f7c26.png)

目前已知Channel的实现类有：

- FileChannel
- DatagramChannel
- SocketChannel
- ServerSocketChannel

### 深入理解Selector

之前进行socket编程时，accept方法会一直阻塞，直到有客户端请求的到来，并返回socket进行相应的处理。整个过程是流水线的，处理完一个请求，才能去获取并处理后面的请求，当然也可以把获取socket和处理socket的过程分开，一个线程负责accept，一个线程池负责处理请求。

但NIO提供了更好的解决方案，采用选择器（Selector）返回已经准备好的socket，并按顺序处理，基于通道（Channel）和缓冲区（Buffer）来进行数据的传输。

在这里，这个人就相当Selector，每个鸡笼相当于一个SocketChannel，每个线程通过一个Selector可以管理多个SocketChannel。

![](/gallery/java-common/java-nio-selector.png)

为了实现Selector管理多个SocketChannel，必须将具体的SocketChannel对象注册到Selector，并声明需要监听的事件（这样Selector才知道需要记录什么数据），一共有4种事件：

1、**connect**：客户端连接服务端事件，对应值为SelectionKey.OP_CONNECT(8)
2、**accept**：服务端接收客户端连接事件，对应值为SelectionKey.OP_ACCEPT(16)
3、**read**：读事件，对应值为SelectionKey.OP_READ(1)
4、**write**：写事件，对应值为SelectionKey.OP_WRITE(4)

这个很好理解，每次请求到达服务器，都是从connect开始，connect成功后，服务端开始准备accept，准备就绪，开始读数据，并处理，最后写回数据返回。

所以，当SocketChannel有对应的事件发生时，Selector都可以观察到，并进行相应的处理。

#### 服务端代码

为了更好的理解，先看一段服务端的示例代码

```java
ServerSocketChannel serverChannel = ServerSocketChannel.open();
//Channel设置为非阻塞
serverChannel.configureBlocking(false);
serverChannel.socket().bind(new InetSocketAddress(port));
Selector selector = Selector.open();
//Channel注册到Selector中
serverChannel.register(selector, SelectionKey.OP_ACCEPT);
while(true){
    int n = selector.select();
    if (n == 0) continue;
    Iterator ite = this.selector.selectedKeys().iterator();
    while(ite.hasNext()){
        SelectionKey key = (SelectionKey)ite.next();
        if (key.isAcceptable()){
            SocketChannel clntChan = ((ServerSocketChannel) key.channel()).accept();
            clntChan.configureBlocking(false);
            //将选择器注册到连接到的客户端信道，
            //并指定该信道key值的属性为OP_READ，
            //同时为该信道指定关联的附件
            clntChan.register(key.selector(), SelectionKey.OP_READ, ByteBuffer.allocate(bufSize));
        }
        if (key.isReadable()){
            handleRead(key);
        }
        if (key.isWritable() && key.isValid()){
            handleWrite(key);
        }
        if (key.isConnectable()){
            System.out.println("isConnectable = true");
        }
      ite.remove();
    }
}
```

服务端操作过程如下：

1. 创建ServerSocketChannel实例，并绑定指定端口；
2. 创建Selector实例；
3. 将serverSocketChannel注册到selector，并指定事件OP_ACCEPT，最底层的socket通过channel和selector建立关联；
4. 如果没有准备好的socket，select方法会被阻塞一段时间并返回0；
5. 如果底层有socket已经准备好，selector的select方法会返回socket的个数，而且selectedKeys方法会返回socket对应的事件（connect、accept、read or write）；
6. 根据事件类型，进行不同的处理逻辑；

#### Selector实现原理

SocketChannel、ServerSocketChannel和Selector的实例初始化都通过SelectorProvider类实现，其中Selector是整个NIO Socket的核心实现。

```java
public static SelectorProvider provider() {
    synchronized (lock) {
        if (provider != null)
            return provider;
        return AccessController.doPrivileged(
            new PrivilegedAction<SelectorProvider>() {
                public SelectorProvider run() {
                        if (loadProviderFromProperty())
                            return provider;
                        if (loadProviderAsService())
                            return provider;
                        provider = sun.nio.ch.DefaultSelectorProvider.create();
                        return provider;
                    }
                });
    }
}
```

SelectorProvider在windows和linux下有不同的实现，provider方法会返回对应的实现。其中`provider = sun.nio.ch.DefaultSelectorProvider.create();`会根据操作系统来返回不同的实现类，windows平台就返回WindowsSelectorProvider；

![](/gallery/java-common/WX20180517-182153@2xjietu.png)



#### Selector.wakeup()

##### 主要作用

解除阻塞在Selector.select()/select(long)上的线程，立即返回。

两次成功的select之间多次调用wakeup等价于一次调用。

如果当前没有阻塞在select上，则本次wakeup调用将作用于下一次select——“记忆”作用。

为什么要唤醒？

注册了新的channel或者事件。

channel关闭，取消注册。

优先级更高的事件触发（如定时器事件），希望及时处理。

##### 原理

Linux上利用pipe调用创建一个管道，Windows上则是一个loopback的tcp连接。这是因为win32的管道无法加入select的fd set，将管道或者TCP连接加入select fd set。

wakeup往管道或者连接写入一个字节，阻塞的select因为有I/O事件就绪，立即返回。可见，wakeup的调用开销不可忽视。

## BIO, NIO, AIO

BIO同步阻塞IO，适用于连接数目比较小且固定的架构，这种方式对服务器资源要求比较高，并发局限于应用中，JDK1.4以前的唯一选择，但程序直观简单易理解。

NIO同步非阻塞IO，适用于连接数目多且连接比较短（轻操作）的架构，比如聊天服务器，并发局限于应用中，编程比较复杂，JDK1.4开始支持。

AIO异步非阻塞IO，AIO方式适用于连接数目多且连接比较长（重操作）的架构，比如相册服务器，充分调用OS参与并发操作，编程比较复杂，JDK7开始支持。

## 总结

select，poll实现需要自己不断轮询所有fd集合，直到设备就绪，期间可能要睡眠和唤醒多次交替。而epoll其实也需要调用epoll_wait不断轮询就绪链表，期间也可能多次睡眠和唤醒交替，但是它是设备就绪时，调用回调函数，把就绪fd放入就绪链表中，并唤醒在epoll_wait中进入睡眠的进程。虽然都要睡眠和交替，但是select和poll在“醒着”的时候要遍历整个fd集合，而epoll在“醒着”的时候只要判断一下就绪链表是否为空就行了，这节省了大量的CPU时间。这就是回调机制带来的性能提升。

NIO主要使用了Channel和Selector来实现，Java的Selector类似Winsock的Select模式，是一种基于事件驱动的，整个处理方法使用了轮训的状态机，好处就是单线程更节省系统开销，NIO的好处可以很好的处理并发，对于Android网游开发来说比较关键，对于多点Socket连接而言使用NIO可以大大减少线程使用，降低了线程死锁的概率。

NIO作为一种中高负载的I/O模型，相对于传统的BIO (Blocking I/O)来说有了很大的提高，处理并发不用太多的线程，省去了创建销毁的时间，如果线程过多调度是问题，同时很多线程可能处于空闲状态，大大浪费了CPU时间，同时过多的线程可能是性能大幅下降，一般的解决方案中可能使用线程池来管理调度但这种方法治标不治本。使用NIO可以使并发的效率大大提高。当然NIO和JDK 7中的AIO还存在一些区别，AIO作为一种更新的当然这是对于Java而言，如果你开发过Winsock服务器，那么IOCP这样的I/O完成端口可以解决更高级的负载

## 几个问题

### blocking和non-blocking的区别

调用blocking IO会一直block住对应的进程直到操作完成，而non-blocking IO在kernel还准备数据的情况下会立刻返回。

### synchronous IO和asynchronous IO的区别

在说明synchronous IO和asynchronous IO的区别之前，需要先给出两者的定义。POSIX的定义是这样子的：
\- A synchronous I/O operation causes the requesting process to be blocked until that I/O operation completes;
\- An asynchronous I/O operation does not cause the requesting process to be blocked;

两者的区别就在于synchronous IO做”IO operation”的时候会将process阻塞。按照这个定义，之前所述的blocking IO，non-blocking IO，IO multiplexing都属于synchronous IO。

有人会说，non-blocking IO并没有被block啊。这里有个非常“狡猾”的地方，定义中所指的”IO operation”是指真实的IO操作，就是例子中的recvfrom这个system call。non-blocking IO在执行recvfrom这个system call的时候，如果kernel的数据没有准备好，这时候不会block进程。但是，当kernel中数据准备好的时候，recvfrom会将数据从kernel拷贝到用户内存中，这个时候进程是被block了，在这段时间内，进程是被block的。

而asynchronous IO则不一样，当进程发起IO 操作之后，就直接返回再也不理睬了，直到kernel发送一个信号，告诉进程说IO完成。在这整个过程中，进程完全没有被block。

> 2. [IO多路复用（比如epoll）到底是不是异步的？](https://www.zhihu.com/question/59975081)

Java NIO是同步非阻塞io。简单来说同步和异步需要说明针对哪一个通信层次来讨论，异步编程框架是说框架内的业务代码与框架的接口是异步的，而框架与操作系统的接口是同步非阻塞。

## 参考资料

- [IO - 同步，异步，阻塞，非阻塞 （亡羊补牢篇）](https://blog.csdn.net/historyasamirror/article/details/5778378)
- [Java NIO浅析 - 美团点评技术团队](https://tech.meituan.com/nio.html)
- [深入浅出NIO之Selector实现原理 - 占小狼](https://www.jianshu.com/p/0d497fe5484a)
- [Java NIO——Selector机制解析三（源码分析）](http://goon.iteye.com/blog/1775421)
- [Java NIO类库Selector机制解析（上）—— 陈皓](https://blog.csdn.net/haoel/article/details/2224055)
- [Java NIO类库Selector机制解析（下）—— 陈皓](https://yq.aliyun.com/articles/466889)
- [Linux下I/O多路转接之epoll(绝对经典)](http://www.cnblogs.com/melons/p/5791788.html)
- [epoll 或者 kqueue 的原理是什么？- 知乎](https://www.zhihu.com/question/20122137)
- [大话 Select、Poll、Epoll](https://cloud.tencent.com/developer/article/1005481)
- [linux内核epoll实现分析](https://blog.csdn.net/wangpeihuixyz/article/details/41732127)
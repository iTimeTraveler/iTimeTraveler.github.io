---
title: Chrome自带的开发者工具进阶技巧
layout: post
date: 2016-09-28 18:50:00
comments: true
tags: [WebDevelopment]
categories: []
keywords: WebDevelopment
description: 
---


> 原文链接： [**Things you probably didn't know you could do with Chrome's Developer Console**](https://medium.freecodecamp.com/10-tips-to-maximize-your-javascript-debugging-experience-b69a75859329#.iu8wnwr86)
> 作者：[Swagat Kumar Swain](https://medium.freecodecamp.com/@swagatswain)


Chrome自带开发者工具。它的功能十分丰富，包括元素、网络、安全等等。今天我们主要介绍**JavaScript控制台**部分的功能。

我最早写代码的时候，也就是在JS控制台里输出一些服务器返回的内容，或者一些变量的值。但是后来通过一些深入的学习和了解，我发现Chrome的JS控制台原来还有这么多神奇的功能。

在这里我总结了一些特别有用的功能。要是你凑巧在Chrome里浏览这篇文章的话，现在就打开开发者工具，跟着随手试试吧！


### **1.选取DOM元素**

要是你用过两天jQuery的话，一定对 `$('.className')` 或者 `$('#id')` 这种选择器不会陌生。上面这俩货分别是jQuery的`类选择器`和`ID选择器`。

在一个网页没有引入jQuery的情况下，在控制台里你也可以通过类似的方法选取DOM.

不管 `$('tagName')` `$('.class')` `$('#id')` 还是 `$('.class #id')` 等类似的选择器，都相当于原生JS的`document.querySelector('')` 方法。这个方法返回第一个匹配选择规则的DOM元素。

在Chrome的控制台里，你可以通过 `$$('tagName')` 或者 `$$('.className')` 记得是两个\$\$符号来选择所有匹配规则的DOM元素。选择返回的结果是一个数组，可以通过数组的方法来访问其中的单个元素。

举个栗子 `$$('className')` 会返回给你所有包含 className 类属性的元素，之后你可以通过 `$$('className')[0]` 和`$$('className')[1]` 来访问其中的某个元素。

![](http://img.blog.csdn.net/20160928183251857)

<!--more-->


### **2.一秒钟让Chrome变成所见即所得的编辑器**

你可能经常会困惑你到底能不能直接在浏览器里更改网页的文本内容。答案是肯定的，你可以只通过一行简单的指令把Chrome变成所见即所得的编辑器，直接在网页上随心所欲地删改文字。

你不需要再傻傻地右键审查元素，编辑源代码了。打开Chrome的开发者控制台，输入

```js
document.body.contentEditable=true
```

然后奇迹就发生啦，你竟然可以在网页里直接编辑，或者随意拖动图片的位置了！要是你正在用Chrome现在就可以试试！

![](http://img.blog.csdn.net/20160928183416388)


### **3.获取某个DOM元素绑定的事件**

在调试的时候，你肯定需要知道某个元素上面绑定了什么触发事件。Chrome的开发者控制台可以让你很轻松地找到它们。

`getEventListeners($('selector'))` 方法以数组对象的格式返回某个元素绑定的所有事件。你可以在控制台里展开对象查看详细的内容。

![](http://img.blog.csdn.net/20160928183613844)

要是你需要选择其中的某个事件，可以通过下面的方法来访问：

```js
getEventListeners($('selector')).eventName[0].listener
```

这里的 eventName 表示某种事件类型，例如：

```js
getEventListeners($('#firstName')).click[0].listener
```

上面的例子会返回ID为 firstName 元素绑定的click事件。



### **4.监测事件**

当你需要监视某个DOM触发的事件时，也可以用到控制台。例如下面这些方法：

 - `monitorEvents($('selector'))` 会监测某个元素上绑定的所有事件，一旦该元素的某个事件被触发就会在控制台里显示出来。

 - `monitorEvents($('selector'),'eventName')` 可以监听某个元素上绑定的具体事件。第二个参数代表事件类型的名称。例如 `monitorEvents($('#firstName'),'click')` 只监测ID为firstName的元素上的click事件。

 - `monitorEvents($('selector'),['eventName1','eventName3',….])` 同上。可以同时检测具体指定的多个事件类型。

 - `unmonitorEvents($('selector'))` 用来停止对某个元素的事件监测。



### **5.用计时器来获取某段代码块的运行时间**

通过 console.time('labelName') 来设定一个计时器，其中的 labelName 是计时器的名称。通过console.timeEnd('labelName') 方法来停止并输出某个计时器的时间。例如：

```js
console.time('myTime'); //设定计时器开始 - myTime
console.timeEnd('mytime'); //结束并输出计时时长 - myTime

//输出: myTime:123.00 ms
```

再举一个通过计时器来计算代码块运行时间的例子：

```js
console.time('myTime'); //开始计时 - myTime

for(var i=0; i < 100000; i++){
  2+4+5;
}

console.timeEnd('mytime'); //结束并输出计时时长 - myTime

//输出 - myTime:12345.00 ms
```


### **6.以表格的形式输出数组**

假设我们有一个像下面这样的数组：

```js
var myArray=[{a:1,b:2,c:3},{a:1,b:2,c:3,d:4},{k:11,f:22},{a:1,b:2,c:3}]
```

要是你直接在控制台里输入数组的名称，Chrome会以文本的形式返回一个数组对象。但你完全可以通过`console.table(variableName)` 方法来以表格的形式输出每个元素的值。例如下图：

![](http://img.blog.csdn.net/20160928184410011)


### **7.通过控制台方法来检查元素**

你可以直接在控制台里输入下面的方法来检查元素

 - `inspect($('selector'))` 会检查所有匹配选择器的DOM元素，并返回所有选择器选择的DOM对象。例如

 - `inspect($('#firstName'))` 选择所有ID是 firstName 的元素，`inspect($('a')[3])` 检查并返回页面上第四个 p元素。
  \$0, \$1, \$2等等会返回你最近检查过的几个元素，例如 \$0 会返回你最后检查的元素，\$1 则返回倒数第二个。

![](http://img.blog.csdn.net/20160928184610441)



### **8.列出某个元素的所有属性**

你也可以通过控制台列出某个元素的所有属性：

dir($('selector')) 会返回匹配选择器的DOM元素的所有属性，你可以展开输出的结果查看详细内容。

![](http://img.blog.csdn.net/20160928184731077)


### **9.获取最后计算结果的值**

你可以把控制台当作计算器使用。当你在Chrome控制台里进行计算时，可以通过$_来获取最后的计算结果值，还是直接看例子吧：

```js
2+3+4
9 //- The Answer of the SUM is 9

$_
9 // Gives the last Result

$_ * $_
81  // As the last Result was 9

Math.sqrt($_)
9 // As the last Result was 81

$_
9 // As the Last Result is 9
```

![](http://img.blog.csdn.net/20160928184825129)


### **10.清空控制台输出**

当你需要这么做的时候，只需要输入 `clear()` 然后回车就好啦！

Chrome开发者工具的强大远远超出你的想象！这只是其中的一部分小技巧而已，希望能够帮到你！



### 参考资料

- [CHROME开发者工具的小技巧 - CoolShell](https://coolshell.cn/articles/17634.html)


---
title: 【Linux】执行shell脚本出现异常：bad interpreter- No such file or directory如何解决
layout: post
date: 2016-04-29 11:37:09
comments: true
tags: [Linux]
categories: [Linux]
keywords: Linux
description: 
---

> 在Linux中执行.sh脚本，异常/bin/bash^M: bad interpreter: No such file or directory.
> ![](http://img.blog.csdn.net/20160429114707846)



## **一、分析**

这是不同系统编码格式引起的：在windows系统中编辑的.sh文件可能有不可见字符，所以在Linux系统下执行会报以上异常信息。 


## **二、解决**

1）在windows下转换： 
利用一些编辑器如UltraEdit或EditPlus等工具先将脚本编码转换，再放到Linux中执行。转换方式如下（UltraEdit）：File-->Conversions-->DOS->UNIX即可。 

<!--more-->

2）直接在Linux中转换（**推荐做法**）：
 
首先要确保文件有可执行权限 

```
#sh> chmod a+x filename 
```

然后修改文件格式 

```
#sh> vi filename 
```

利用如下命令查看文件格式 

```
:set ff 或 :set fileformat 
```

可以看到如下信息 

> fileformat=dos 或 fileformat=unix

利用如下命令修改文件格式 

```
:set ff=unix 或 :set fileformat=unix 
:wq (存盘退出) 
```

最后再执行文件 

```
#sh>./filename
```
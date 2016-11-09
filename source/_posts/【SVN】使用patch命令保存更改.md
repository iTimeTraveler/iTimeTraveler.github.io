---
title: 【SVN】使用patch命令保存更改
layout: post
date: 2016-06-12 11:06
comments: true
tags: [SVN]
categories: [SVN]
keywords: SVN
description: 使用svn管理工程代码时，有些时候的更改尚未整理好，需要暂时搁置，转而进行下一个任务，此时就需要将当前的更改（diff）暂时保存下来，忙完其他的任务之后再继续进行。但是如果不进行commit，怎么保存当前的更改呢？答案是使用 patch 命令！
---


> 使用svn管理工程代码时，有些时候的更改尚未整理好，需要暂时搁置，转而进行下一个任务，此时就需要将当前的更改（diff）暂时保存下来，忙完其他的任务之后再继续进行。但是如果不进行commit，怎么保存当前的更改呢？答案是使用 patch 命令！

 
#### **一、生成patch文件**

```shell
svn diff > patchFile 			// 整个工程的变动生成patch
svn diff FILE_NAME > patchFile 	// 某个文件单独变动的patch
```

 
 
#### **二、svn回滚**

```shell
svn revert FILE 				// 单个文件回滚
svn revert DIR --depth=infinity // 整个目录进行递归回滚
svn revert . --depth=infinity 	// 当前目录进行递归回滚
```

<!--more-->

  
#### **三、打patch**

```shell
patch -p0 < test.patch 	// -p0 选项要从当前目录查找目的文件（夹）
patch -p1 < test.patch 	// -p1 选项要从当前目录查找目的文件，不包含patch中的最上级目录（夹）
```
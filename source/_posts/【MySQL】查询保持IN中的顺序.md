---
title: 【MySQL】查询保持IN中的顺序
layout: post
date: 2016-04-29 15:36:00
comments: true
tags: [MySQL]
categories: [MySQL]
keywords: MySQL
description: select * from table_name where id in ()的时候，MySQL会自动按主键自增排序，要是按IN中给定的顺序来取，如何实现呢？
---

> select * from table_name where id in ()的时候，MySQL会自动按主键自增排序，要是按IN中给定的顺序来取，如何实现呢？

比如下面这个查询结果，mysql会默认使用主键id的ASC自增排序结果集：
![](http://img.blog.csdn.net/20160429152929904)

<!--more-->


那么，如果我们想维持查询语句中IN(26613,26612,26611,26610,26609,26608,26607)的顺序可以么？当然可以，像下面这样，使用Order by field()：

```
SELECT * from `models` where `id` in (26612,26611,26610) order by field(id,26612,26611,26610);
```
![](http://img.blog.csdn.net/20160429153535569)
这样读取出来的顺序就是IN（）语句中的顺序。
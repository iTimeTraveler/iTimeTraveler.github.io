---
title: 基于社区发现算法和图分析Neo4j解读《权力的游戏》
layout: post
date: 2016-11-21 11:08:00
comments: true
tags: 
    - Neo4j
categories: 
    - Web
keywords: Neo4j
description: 
photos:
   - /gallery/Game-of-Thrones.jpg
---


## 导读

几个月前，数学家 Andrew Beveridge 和Jie Shan在数学杂志上发表[**《权力的网络》**](http://www.maa.org/sites/default/files/pdf/Mathhorizons/NetworkofThrones.pdf)，主要分析畅销小说《冰与火之歌》第三部《冰雨的风暴》中人物关系，其已经拍成电视剧《权力的游戏》系列。他们在论文中介绍了如何通过文本分析和实体提取构建人物关系的网络。紧接着，使用社交网络分析算法对人物关系网络分析找出最重要的角色；应用社区发现算法来找到人物聚类。

其中的分析和可视化是用Gephi做的，Gephi是非常流行的图分析工具。但作者觉得使用Neo4j来实现更有趣。


## 导入原始数据到Neo4j


原始数据可[从网络上下载](https://www.macalester.edu/~abeverid/data/stormofswords.csv)，格式如下：


```json
Source,Target,Weight
Aemon,Grenn,5
Aemon,Samwell,31
Aerys,Jaime,18
...
```

<!--more-->


上面是人物关系的之邻接表以及关系权重。作者使用简单的数据模型：

```cypher
(:Character {name})-[:INTERACTS]->(:Character {name})
```

带有标签Character的节点代表小说中的角色，用单向关系类型INTERACTS代表小说中的角色有过接触。节点属性会存储角色的名字name，两角色间接触的次数作为关系的属性：权重（weight）。

首先创建节点c，并做唯一限制性约束，c.name唯一，保证schema的完整性：


```cypher
CREATE CONSTRAINT ON (c:Character) ASSERT c.name IS UNIQUE;
```

一旦约束创建即相应的创建索引，这将有助于通过角色的名字查询的性能。作者使用Neo4j的Cypher（Cypher是一种声明式图查询语言，能表达高效查询和更新图数据库）LOAD CSV语句导入数据：

```cypher
LOAD CSV WITH HEADERS FROM "https://www.macalester.edu/~abeverid/data/stormofswords.csv" AS row
MERGE (src:Character {name: row.Source})
MERGE (tgt:Character {name: row.Target})
MERGE (src)-[r:INTERACTS]->(tgt)
SET r.weight = toInt(row.Weight)
```

这样得到一个简单的数据模型：

```cypher
CALL apoc.meta.graph()
```


![图1 ：《权力的游戏》模型的图。Character角色节点由INTERACTS关系联结](/gallery/game/1.png)


我们能可视化整个图形，但是这并不能给我们很多信息，比如哪些是最重要的人物，以及他们相互接触的信息：

```cypher
MATCH p=(:Character)-[:INTERACTS]-(:Character)
RETURN p
```

![图2](/gallery/game/2.jpg)


## 人物网络分析

作者使用Neo4j的图查询语言Cypher来做《权力的游戏》图分析，应用到了网络分析的一些工具，具体见《网络，人群和市场：关于高度连接的世界》。

### 人物数量

万事以简单开始。先看看上图上由有多少人物：

```SQL
MATCH (c:Character) RETURN count(c)
```

|  count(c) |
|:----:|
|   107   |


### 概要统计

统计每个角色接触的其它角色的数目：

```
MATCH (c:Character)-[:INTERACTS]->()
WITH c, count(*) AS num
RETURN min(num) AS min, max(num) AS max, avg(num) AS avg_characters, stdev(num) AS stdev
```

| min  | max  | avg_characters |	stdev  |
|:----:|:----:|:---------------------------:|:----:|
| 1    | 24   | 4.957746478873241 |	6.227672391875085 |


### 图（网络）的直径
网络的直径或者测底线或者最长最短路径：

```
// Find maximum diameter of network
// maximum shortest path between two nodes
MATCH (a:Character), (b:Character) WHERE id(a) > id(b)
MATCH p=shortestPath((a)-[:INTERACTS*]-(b))
RETURN length(p) AS len, extract(x IN nodes(p) | x.name) AS path
ORDER BY len DESC LIMIT 4
```

| len  | path                                     |
|:----:| ---------------------------------------- |
| 6    | [Illyrio, Belwas, Daenerys, Robert, Tywin, Oberyn, Amory] |
| 6    | [Illyrio, Belwas, Daenerys, Robert, Sansa, Bran, Jojen] |
| 6    | [Illyrio, Belwas, Daenerys, Robert, Stannis, Davos, Shireen] |
| 6    | [Illyrio, Belwas, Daenerys, Robert, Sansa, Bran, Luwin] |


我们能看到网络中有许多长度为6的路径。

### 最短路径

作者使用Cypher 的shortestPath函数找到图中任意两个角色之间的最短路径。让我们找出凯特琳·史塔克（Catelyn Stark ）和卓戈·卡奥（Kahl Drogo）之间的最短路径：

```
// Shortest path from Catelyn Stark to Khal Drogo
MATCH (catelyn:Character {name: "Catelyn"}), (drogo:Character {name: "Drogo"})
MATCH p=shortestPath((catelyn)-[INTERACTS*]-(drogo))
RETURN p
```

![图3](/gallery/game/3.jpg)



### 所有最短路径

联结凯特琳·史塔克（Catelyn Stark ）和卓戈·卡奥（Kahl Drogo）之间的最短路径可能还有其它路径，我们可以使用Cypher的allShortestPaths函数来查找：

```
// All shortest paths from Catelyn Stark to Khal Drogo
MATCH (catelyn:Character {name: "Catelyn"}), (drogo:Character {name: "Drogo"})
MATCH p=allShortestPaths((catelyn)-[INTERACTS*]-(drogo))
RETURN p
```

![图4](/gallery/game/4.jpg)



### 关键节点

在网络中，如果一个节点位于其它两个节点所有的最短路径上，即称为关键节点。下面我们找出网络中所有的关键节点：

```
// Find all pivotal nodes in network
MATCH (a:Character), (b:Character)
MATCH p=allShortestPaths((a)-[:INTERACTS*]-(b)) WITH collect(p) AS paths, a, b
MATCH (c:Character) WHERE all(x IN paths WHERE c IN nodes(x)) AND NOT c IN [a,b]
RETURN a.name, b.name, c.name AS PivotalNode SKIP 490 LIMIT 10
```

| a.name  | b.name  | PivotalNode |
| :-----: | :-----: | :---------: |
|  Aegon  | Thoros  |  Daenerys   |
|  Aegon  | Thoros  |   Robert    |
|  Drogo  | Ramsay  |    Robb     |
|  Styr   | Daario  |  Daenerys   |
|  Styr   | Daario  |     Jon     |
|  Styr   | Daario  |   Robert    |
| Qhorin  | Podrick |     Jon     |
| Qhorin  | Podrick |    Sansa    |
|  Orell  |  Theon  |     Jon     |
| Illyrio |  Bronn  |   Belwas    |


从结果表格中我们可以看出有趣的结果：罗柏·史塔克（Robb）是卓戈·卡奥（Drogo）和拉姆塞·波顿（Ramsay）的关键节点。这意味着，所有联结卓戈·卡奥（Drogo）和拉姆塞·波顿（Ramsay）的最短路径都要经过罗柏·史塔克（Robb）。我们可以通过可视化卓戈·卡奥（Drogo）和拉姆塞·波顿（Ramsay）之间的所有最短路径来验证：

```
MATCH (a:Character {name: "Drogo"}), (b:Character {name: "Ramsay"})
MATCH p=allShortestPaths((a)-[:INTERACTS*]-(b))
RETURN p
```

![图5](/gallery/game/5.jpg)



### 节点中心度

节点中心度给出网络中节点的重要性的相对度量。有许多不同的方式来度量中心度，每种方式都代表不同类型的“重要性”。


### 度中心性(Degree Centrality)

度中心性是最简单度量，即为某个节点在网络中的联结数。在《权力的游戏》的图中，某个角色的度中心性是指该角色接触的其他角色数。作者使用Cypher计算度中心性：

```
MATCH (c:Character)-[:INTERACTS]-()
RETURN c.name AS character, count(*) AS degree ORDER BY degree DESC
```

| character | degree |
| :-------: | :----: |
|  Tyrion   |   36   |
|    Jon    |   26   |
|   Sansa   |   26   |
|   Robb    |   25   |
|   Jaime   |   24   |
|   Tywin   |   22   |
|  Cersei   |   20   |
|   Arya    |   19   |
|  Joffrey  |   18   |
|  Robert   |   18   |


从上面可以发现，在《权力的游戏》网络中提利昂·兰尼斯特（Tyrion）和最多的角色有接触。鉴于他的心计，我们觉得这是有道理的。

### 加权度中心性（Weighted Degree Centrality）

作者存储一对角色接触的次数作为INTERACTS关系的weight属性。对该角色的INTERACTS关系的所有weight相加得到加权度中心性。作者使用Cypher计算所有角色的这个度量：

```
MATCH (c:Character)-[r:INTERACTS]-()
RETURN c.name AS character, sum(r.weight) AS weightedDegree ORDER BY weightedDegree DESC
```

| character | weightedDegree |
| :-------: | :------------: |
|  Tyrion   |      551       |
|    Jon    |      442       |
|   Sansa   |      383       |
|   Jaime   |      372       |
|   Bran    |      344       |
|   Robb    |      342       |
|  Samwell  |      282       |
|   Arya    |      269       |
|  Joffrey  |      255       |
| Daenerys  |      232       |


### 介数中心性（Betweenness Centrality）

介数中心性：在网络中，一个节点的介数中心性是指其它两个节点的所有最短路径都经过这个节点，则这些所有最短路径数即为此节点的介数中心性。介数中心性是一种重要的度量，因为它可以鉴别出网络中的“信息中间人”或者网络聚类后的联结点。

![图6中红色节点是具有高的介数中心性，网络聚类的联结点。](/gallery/game/6.jpg)



为了计算介数中心性，作者使用Neo4j 3.x或者apoc库。安装apoc后能用Cypher调用其170+的程序：

```
MATCH (c:Character)
WITH collect(c) AS characters
CALL apoc.algo.betweenness(['INTERACTS'], characters, 'BOTH') YIELD node, score
SET node.betweenness = score
RETURN node.name AS name, score ORDER BY score DESC
```

|   name   |       score        |
| :------: | :----------------: |
|   Jon    | 1279.7533534055322 |
|  Robert  | 1165.6025171231624 |
|  Tyrion  | 1101.3849724234349 |
| Daenerys | 874.8372110508583  |
|   Robb   | 706.5572832464792  |
|  Sansa   | 705.1985623519137  |
| Stannis  | 571.5247305125714  |
|  Jaime   | 556.1852522889822  |
|   Arya   | 443.01358430043337 |
|  Tywin   | 364.7212195528086  |


### 紧度中心性（Closeness centrality）

紧度中心性是指到网络中所有其他角色的平均距离的倒数。在图中，具有高紧度中心性的节点在聚类社区之间被高度联结，但在社区之外不一定是高度联结的。

![图7 ：网络中具有高紧度中心性的节点被其它节点高度联结](/gallery/game/7.png)



```
MATCH (c:Character)
WITH collect(c) AS characters
CALL apoc.algo.closeness(['INTERACTS'], characters, 'BOTH') YIELD node, score
RETURN node.name AS name, score ORDER BY score DESC
```

|  name   |         score         |
| :-----: | :-------------------: |
| Tyrion  | 0.004830917874396135  |
|  Sansa  | 0.004807692307692308  |
| Robert  | 0.0047169811320754715 |
|  Robb   | 0.004608294930875576  |
|  Arya   | 0.0045871559633027525 |
|  Jaime  | 0.004524886877828055  |
| Stannis | 0.004524886877828055  |
|   Jon   | 0.004524886877828055  |
|  Tywin  | 0.004424778761061947  |
| Eddard  | 0.004347826086956522  |


## 使用python-igraph

Neo4j与其它工具（比如，R和Python数据科学工具）完美结合。我们继续使用apoc运行 PageRank和社区发现（community detection）算法。这里接着使用python-igraph计算分析。Python-igraph移植自R的igraph图形分析库。 使用pip install python-igraph安装它。

### 从Neo4j构建一个igraph实例

为了在《权力的游戏》的数据的图分析中使用igraph，首先需要从Neo4j拉取数据，用Python建立igraph实例。作者使用 Neo4j 的Python驱动库py2neo。我们能直接传入Py2neo查询结果对象到igraph的TupleList构造器，创建igraph实例：

```python
from py2neo import Graphfrom igraph import Graph as IGraph
graph = Graph()

query = '''
MATCH (c1:Character)-[r:INTERACTS]->(c2:Character)
RETURN c1.name, c2.name, r.weight AS weight
'''ig = IGraph.TupleList(graph.run(query), weights=True)
```

现在有了igraph对象，可以运行igraph实现的各种图算法来。

### PageRank

作者使用igraph运行的第一个算法是PageRank。PageRank算法源自Google的网页排名。它是一种特征向量中心性(eigenvector centrality)算法。

在igraph实例中运行PageRank算法，然后把结果写回Neo4j，在角色节点创建一个pagerank属性存储igraph计算的值：

```python
pg = ig.pagerank()
pgvs = []for p in zip(ig.vs, pg):
    print(p)
    pgvs.append({"name": p[0]["name"], "pg": p[1]})
pgvs

write_clusters_query = '''
UNWIND {nodes} AS n
MATCH (c:Character) WHERE c.name = n.name
SET c.pagerank = n.pg
'''graph.run(write_clusters_query, nodes=pgvs)
```

现在可以在Neo4j的图中查询最高PageRank值的节点：

```
MATCH (n:Character)
RETURN n.name AS name, n.pagerank AS pagerank ORDER BY pagerank DESC LIMIT 10
```

|   name   |       pagerank       |
| :------: | :------------------: |
|  Tyrion  | 0.042884981999963316 |
|   Jon    | 0.03582869669163558  |
|   Robb   | 0.03017114665594764  |
|  Sansa   | 0.030009716660108578 |
| Daenerys | 0.02881425425830273  |
|  Jaime   | 0.028727587587471206 |
|  Tywin   | 0.02570016262642541  |
|  Robert  | 0.022292016521362864 |
|  Cersei  | 0.022287327589773507 |
|   Arya   | 0.022050209663844467 |


![](/gallery/game/8.jpg)



社区发现算法用来找出图中的社区聚类。作者使用igraph实现的随机游走算法（ walktrap）来找到在社区中频繁有接触的角色社区，在社区之外角色不怎么接触。

在igraph中运行随机游走的社区发现算法，然后把社区发现的结果导入Neo4j，其中每个角色所属的社区用一个整数来表示：

```python
clusters = IGraph.community_walktrap(ig, weights="weight").as_clustering()

nodes = [{"name": node["name"]} for node in ig.vs]for node in nodes:
    idx = ig.vs.find(name=node["name"]).index
    node["community"] = clusters.membership[idx]

write_clusters_query = '''
UNWIND {nodes} AS n
MATCH (c:Character) WHERE c.name = n.name
SET c.community = toInt(n.community)
'''graph.run(write_clusters_query, nodes=nodes)
```

我们能在Neo4j中查询有多少个社区以及每个社区的成员数：

```
MATCH (c:Character)
WITH c.community AS cluster, collect(c.name) AS  members
RETURN cluster, members ORDER BY cluster ASC
```

| cluster |                 members                  |
| :-----: | :--------------------------------------: |
|    0    | [Aemon, Alliser, Craster, Eddison, Gilly, Janos, Jon, Mance, Rattleshirt, Samwell, Val, Ygritte, Grenn, Karl, Bowen, Dalla, Orell, Qhorin, Styr] |
|    1    | [Aerys, Amory, Balon, Brienne, Bronn, Cersei, Gregor, Jaime, Joffrey, Jon Arryn, Kevan, Loras, Lysa, Meryn, Myrcella, Oberyn, Podrick, Renly, Robert, Robert Arryn, Sansa, Shae, Tommen, Tyrion, Tywin, Varys, Walton, Petyr, Elia, Ilyn, Pycelle, Qyburn, Margaery, Olenna, Marillion, Ellaria, Mace, Chataya, Doran] |
|    2    | [Arya, Beric, Eddard, Gendry, Sandor, Anguy, Thoros] |
|    3    | [Brynden, Catelyn, Edmure, Hoster, Lothar, Rickard, Robb, Roose, Walder, Jeyne, Roslin, Ramsay] |
|    4    | [Bran, Hodor, Jojen, Luwin, Meera, Rickon, Nan, Theon] |
|    5    | [Belwas, Daario, Daenerys, Irri, Jorah, Missandei, Rhaegar, Viserys, Barristan, Illyrio, Drogo, Aegon, Kraznys, Rakharo, Worm] |
|    6    | [Davos, Melisandre, Shireen, Stannis, Cressen, Salladhor] |
|    7    |                 [Lancel]                 |


### 角色“大合影”

《权力的游戏》的权力图。节点的大小正比于介数中心性，颜色表示社区（由随机游走算法获得），边的厚度正比于两节点接触的次数。
现在已经计算好这些图的分析数据，让我们对其进行可视化，让数据看起来更有意义。

Neo4j自带浏览器可以对Cypher查询的结果进行很好的可视化，但如果我们想把可视化好的图嵌入到其它应用中，可以使用Javascript可视化库Vis.js。从Neo4j拉取数据，用Vis.js的neovis.js构建可视化图。Neovis.js提供简单的API配置，例如：


```js
var config = {
  container_id: "viz",
  server_url: "localhost",
  labels: {    "Character": "name"
  },
  label_size: {    "Character": "betweenness"
  },
  relationships: {    "INTERACTS": null
  },
  relationship_thickness: {    "INTERACTS": "weight"
  },
  cluster_labels: {    "Character": "community"
  }
};

var viz = new NeoVis(config);
viz.render();
```

其中：

- 节点带有标签Character，属性name；
- 节点的大小正比于betweenness属性；
- 可视化中包括INTERACTS关系；
- 关系的厚度正比于weight属性；
- 节点的颜色是根据网络中社区community属性决定；
- 从本地服务器localhost拉取Neo4j的数据；
- 在一个id为viz的DOM元素中展示可视化。




------

> 侠天，专注于大数据、机器学习和数学相关的内容，并有个人公众号：`bigdata_ny`分享相关技术文章。
若发现以上文章有任何不妥，请联系我。
> 
> ![](http://mmbiz.qpic.cn/mmbiz/JYFaO3kM0gmBsjv6JrxuibQLTibrPC3hyNHBbfwJbxRjNxeOKIQWQ08KLkCyic59icaCdaPxHqiaraibeibmcRMRpCIibA/0?wx_fmt=jpeg?0.036568912301853995)


------

【参考资料】

- [基于社区发现算法和图分析Neo4j解读《权力的游戏》上篇](http://mp.weixin.qq.com/s?__biz=MzI0MDIxMDM0MQ==&mid=2247483702&idx=2&sn=7a1abd6d129b87150e890b7ae11791aa&3rd=MzA3MDU4NTYzMw==&scene=6#rd)
- [基于社区发现算法和图分析Neo4j解读《权力的游戏》下篇](http://www.hizher.com/pageContent-1148688-51394.html)
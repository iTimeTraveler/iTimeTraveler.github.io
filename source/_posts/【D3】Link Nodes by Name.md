---
title: 【D3】Link Nodes by Name
layout: post
date: 2016-11-16 16:08:00
comments: true
tags: [D3]
categories: [D3.js]
keywords: D3.js
photos:
  - /gallery/d3_link-node-by-name.png
---

Source : http://bl.ocks.org/mbostock/533daf20348023dfdd76

This example shows how to link nodes in a [**force-directed graph**](http://bl.ocks.org/mbostock/4062045) using a named identifier rather than a numeric index.

<!--more-->

## # index.html

```js
<!DOCTYPE html>
<meta charset="utf-8">
<style>

.node {
  stroke: #000;
  stroke-width: 1.5px;
}

.link {
  stroke: #999;
  stroke-width: 1.5px;
}

</style>
<svg width="960" height="500"></svg>
<script src="//d3js.org/d3.v4.min.js"></script>
<script>

var svg = d3.select("svg"),
    width = +svg.attr("width"),
    height = +svg.attr("height");

var simulation = d3.forceSimulation()
    .force("charge", d3.forceManyBody().strength(-200))
    .force("link", d3.forceLink().id(function(d) { return d.id; }).distance(40))
    .force("x", d3.forceX(width / 2))
    .force("y", d3.forceY(height / 2))
    .on("tick", ticked);

var link = svg.selectAll(".link"),
    node = svg.selectAll(".node");

d3.json("graph.json", function(error, graph) {
  if (error) throw error;

  simulation.nodes(graph.nodes);
  simulation.force("link").links(graph.links);

  link = link
    .data(graph.links)
    .enter().append("line")
      .attr("class", "link");

  node = node
    .data(graph.nodes)
    .enter().append("circle")
      .attr("class", "node")
      .attr("r", 6)
      .style("fill", function(d) { return d.id; });
});

function ticked() {
  link.attr("x1", function(d) { return d.source.x; })
      .attr("y1", function(d) { return d.source.y; })
      .attr("x2", function(d) { return d.target.x; })
      .attr("y2", function(d) { return d.target.y; });

  node.attr("cx", function(d) { return d.x; })
      .attr("cy", function(d) { return d.y; });
}

</script>
```


## # graph.json

```json
{
  "nodes": [
    {"id": "red"},
    {"id": "orange"},
    {"id": "yellow"},
    {"id": "green"},
    {"id": "blue"},
    {"id": "violet"}
  ],
  "links": [
    {"source": "red", "target": "yellow"},
    {"source": "red", "target": "blue"},
    {"source": "red", "target": "green"}
  ]
}
```


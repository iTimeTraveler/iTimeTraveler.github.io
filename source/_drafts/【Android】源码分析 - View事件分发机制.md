### 前言

View的点击事件规则



#### 1.2 MotionEvent 主要分为以下几个事件类型：

1. ACTION_DOWN 手指开始触摸到屏幕的那一刻响应的是DOWN事件
2. ACTION_MOVE 接着手指在屏幕上移动响应的是MOVE事件
3. ACTION_UP 手指从屏幕上松开的那一刻响应的是UP事件

所以事件顺序是： ACTION_DOWN -> ACTION_MOVE -> ACTION_UP





## 参考资料

- [公共技术点之 View 事件传递](http://a.codekk.com/detail/Android/Trinea/%E5%85%AC%E5%85%B1%E6%8A%80%E6%9C%AF%E7%82%B9%E4%B9%8B%20View%20%E4%BA%8B%E4%BB%B6%E4%BC%A0%E9%80%92)
- [Android事件分发完全解析之为什么是她](http://blog.csdn.net/aigestudio/article/details/44260301)
- [Android ViewGroup/View 事件分发机制详解](http://blog.csdn.net/wallezhe/article/details/51737034)


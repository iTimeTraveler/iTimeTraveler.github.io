








现在新版的EventBus，订阅者已经没有固定的处理事件的方法了，onEvent、onEventMainThread、onEventBackgroundThread、onEventAsync都没有了，现在支持处理事件的方法名自定义，但必须public，只有一个参数，然后使用注解Subscribe来标记该方法为处理事件的方法，ThreadMode和priority也通过该注解来定义。在subscriberMethodFinder中，通过反射的方式寻找事件方法。使用注解，用起来才更爽。[嘻嘻]




### 参考资料

- [老司机教你 “飙” EventBus 3](https://segmentfault.com/a/1190000005089229)
- [EventBus3.0源码解析](http://yydcdut.com/2016/03/07/eventbus3-code-analyse/)
- [EventBus 3.0 源代码分析](http://skykai521.github.io/2016/02/20/EventBus-3-0%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90/)
- [EventBus 源码解析](http://a.codekk.com/detail/Android/Trinea/EventBus%20%E6%BA%90%E7%A0%81%E8%A7%A3%E6%9E%90)



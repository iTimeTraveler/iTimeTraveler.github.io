

## CocurrentHashMap的操作

- Segment的get操作是不需要加锁的。因为volatile修饰的变量保证了线程之间的可见性
- Segment的put操作是需要加锁的，在插入时会先判断Segment里的HashEntry数组是否会超过容量(threshold),如果超过需要对数组扩容，翻一倍。然后在新的数组中重新hash，为了高效，CocurrentHashMap只会对需要扩容的单个Segment进行扩容
- CocurrentHashMap的size操作在获取size的时候要统计Segments中的HashEntry的和，如果不对他们都加锁的话，无法避免数据的修改造成的错误，但是如果都加锁的话，效率又很低。所以CoccurentHashMap在实现的时候，巧妙地利用了在累加过程中发生变化的几率很小的客观条件，在获取count时，不加锁的计算两次，如果两次不相同，在采用加锁的计算方法。采用了一个高效率的剪枝防止很大概率地减少了不必要额加锁。



### 参考资料

- [Java集合---ConcurrentHashMap原理分析](http://www.cnblogs.com/ITtangtang/p/3948786.html)
- [Java并发容器(一) CocurrentHashMap的应用及实现](http://blog.csdn.net/qq_24451605/article/details/51125946)
- [解析ConcurrentHashMapp](http://lvshen9.coding.me/2017/09/13/%E8%A7%A3%E6%9E%90ConcurrentHashMapp/)
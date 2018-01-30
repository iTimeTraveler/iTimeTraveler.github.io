

在runWorker中，每一个Worker getTask成功之后都要获取Worker的锁之后运行，也就是说运行中的Worker不会中断。因为核心线程一般在空闲的时候会一直阻塞在获取Task上，也只有中断才可能导致其退出。这些阻塞着的Worker就是空闲的线程（当然，非核心线程，并且阻塞的也是空闲线程）



如果设置了keepAliveTime>0，那非核心线程会在空闲状态下等待keepAliveTime之后销毁，直到最终的线程数量等于corePoolSize





## 参考资料

- [线程池，这一篇或许就够了](https://liuzho.github.io/2017/04/17/%E7%BA%BF%E7%A8%8B%E6%B1%A0%EF%BC%8C%E8%BF%99%E4%B8%80%E7%AF%87%E6%88%96%E8%AE%B8%E5%B0%B1%E5%A4%9F%E4%BA%86/)
  -[线程池的介绍及简单实现](https://www.ibm.com/developerworks/cn/java/l-threadPool/)
- [深入分析java线程池的实现原理](https://www.jianshu.com/p/87bff5cc8d8c)
- [Java线程池(ThreadPoolExecutor)原理分析与使用](http://blog.csdn.net/fuyuwei2015/article/details/72758179)
- [Java线程池原理分析ThreadPoolExecutor篇](https://www.jianshu.com/p/9d03bf5ed5cd)
- [并发新特性—Executor 框架与线程池](http://wiki.jikexueyuan.com/project/java-concurrency/executor.html)
- [深入理解Java之线程池](http://www.importnew.com/19011.html)
- [java线程池大小为何会大多被设置成CPU核心数+1？](https://www.zhihu.com/question/38128980)


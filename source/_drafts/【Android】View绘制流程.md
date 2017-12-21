





**总结：**

View绘制分三个步骤，顺序是：onMeasure，onLayout，onDraw。经代码亲测，log输出显示：调用invalidate方法只会执行onDraw方法；调用requestLayout方法只会执行onMeasure方法和onLayout方法，并不会执行onDraw方法。

所以当我们进行View更新时，若仅View的显示内容发生改变且新显示内容不影响View的大小、位置，则只需调用invalidate方法；若View宽高、位置发生改变且显示内容不变，只需调用requestLayout方法；若两者均发生改变，则需调用两者，按照View的绘制流程，推荐先调用requestLayout方法再调用invalidate方法。



1）ViewGroup默认情况下，会被设置成WILL_NOT_DRAW，这是从性能考虑，这样一来，onDraw就不会被调用了。

2）如果我们要重要一个ViweGroup的onDraw方法，有两种方法：

​        1，在构造函数里面，给其设置一个颜色，如#00000000。

​        2，在构造函数里面，调用setWillNotDraw(false)，去掉其WILL_NOT_DRAW flag。



**相关知识点：**

1.invalidate和postInvalidate：invalidate方法只能用于UI线程中，在非UI线程中，可直接使用postInvalidate方法，这样就省去使用handler的烦恼。




- [公共技术点之 View 绘制流程](http://a.codekk.com/detail/Android/lightSky/%E5%85%AC%E5%85%B1%E6%8A%80%E6%9C%AF%E7%82%B9%E4%B9%8B%20View%20%E7%BB%98%E5%88%B6%E6%B5%81%E7%A8%8B)
- [Android View框架的measure机制](http://www.cnblogs.com/xyhuangjinfu/p/5435201.html)
- [Android中mesure过程详解](http://www.cnblogs.com/xilinch/archive/2012/10/24/2737178.html)
- [从ViewRootImpl类分析View绘制的流程](http://blog.csdn.net/feiduclear_up/article/details/46772477)
- [ViewGroup为什么不会调用onDraw](http://blog.csdn.net/leehong2005/article/details/7299471)


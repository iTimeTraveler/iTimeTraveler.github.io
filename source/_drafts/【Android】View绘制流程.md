





**总结：**

View绘制分三个步骤，顺序是：onMeasure，onLayout，onDraw。经代码亲测，log输出显示：调用invalidate方法只会执行onDraw方法；调用requestLayout方法只会执行onMeasure方法和onLayout方法，并不会执行onDraw方法。

所以当我们进行View更新时，若仅View的显示内容发生改变且新显示内容不影响View的大小、位置，则只需调用invalidate方法；若View宽高、位置发生改变且显示内容不变，只需调用requestLayout方法；若两者均发生改变，则需调用两者，按照View的绘制流程，推荐先调用requestLayout方法再调用invalidate方法。

**相关知识点：**

1.invalidate和postInvalidate：invalidate方法只能用于UI线程中，在非UI线程中，可直接使用postInvalidate方法，这样就省去使用handler的烦恼。




- [公共技术点之 View 绘制流程](http://a.codekk.com/detail/Android/lightSky/%E5%85%AC%E5%85%B1%E6%8A%80%E6%9C%AF%E7%82%B9%E4%B9%8B%20View%20%E7%BB%98%E5%88%B6%E6%B5%81%E7%A8%8B)
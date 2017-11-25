---
title: 【Android】View事件分发机制
layout: post
date: 2017-11-18 22:20:55
comments: true
tags: 
    - Android
categories: 
    - Android
keywords: View事件分发
description: 
photos:
    - /gallery/android_common/Circuit-Splash-1024x853.png
---




### 事件分发对象

（1）所有 Touch 事件都被封装成了 MotionEvent 对象，包括 Touch 的位置、时间、历史记录以及第几个手指(多指触摸)等。

（2）事件类型分为 `ACTION_DOWN`， `ACTION_UP`，`ACTION_MOVE`，`ACTION_POINTER_DOWN`，`ACTION_POINTER_UP`， `ACTION_CANCEL`，每个事件都是以 `ACTION_DOWN` 开始 `ACTION_UP` 结束。

主要发生的Touch事件有如下四种：

- MotionEvent.ACTION_DOWN：按下View（所有事件的开始）
- MotionEvent.ACTION_MOVE：滑动View
- MotionEvent.ACTION_CANCEL：非人为原因结束本次事件
- MotionEvent.ACTION_UP：抬起View（与DOWN对应）

事件列：从手指接触屏幕至手指离开屏幕，这个过程产生的一系列事件 
任何事件列都是以DOWN事件开始，UP事件结束，中间有无数的MOVE事件，如下图： 

![](/gallery/android-view/944365-79b1e86793514e99.png)

即当一个点击事件发生后，系统需要将这个事件传递给一个具体的View去处理。这个事件传递的过程就是分发过程。

（3）对事件的处理包括三类，分别：

- 传递——dispatchTouchEvent()函数；

- 拦截——onInterceptTouchEvent()函数

- 消费——onTouchEvent()函数和 OnTouchListener

<!-- more -->


### 源码跟踪

触摸事件发生后，在Activity内最先接收到事件的是Activity自身的dispatchTouchEven接着Window传递给最顶端的View，也就是DecorView。接下来才是我们熟悉的触摸事件流程：首先是最顶端的ViewGroup(这边便是DecorView)的dispatchTouchEvent接收到事件。并通过onInterceptTouchEvent判断是否需要拦截。如果拦截则分配到ViewGroup自身的onTouchEvent，如果不拦截则查找位于点击区域的子View(当事件是ACTION_DOWN的时候，会做一次查找并根据查找到的子View设定一个TouchTarget，有了TouchTarget以后，后续的对应id的事件如果不被拦截都会分发给这一个TouchTarget)。查找到子View以后则调用dispatchTransformedTouchEvent把MotionEvent的坐标转换到子View的坐标空间，这不仅仅是x，y的偏移，还包括根据子View自身矩阵的逆矩阵对坐标进行变换(这就是使用setTranslationX,setScaleX等方法调用后，子View的点击区域还能保持和自身绘制内容一致的原因。使用Animation做变换点击区域不同步是因为Animation使用的是Canvas的矩阵而不是View自身的矩阵来做变换)。



#### 事件分发的源头

触摸事件发生后，在Activity内最先接收到事件的是Activity自身的`dispatchTouchEvent()`，然后Activity传递给Activity的Window：

```java
public boolean dispatchTouchEvent(MotionEvent ev) {
    if (ev.getAction() == MotionEvent.ACTION_DOWN) {
        onUserInteraction();
    }
    if (getWindow().superDispatchTouchEvent(ev)) {
        return true;
    }
    return onTouchEvent(ev);
}
```

其中的这个`getWindow()`得到的就是Activity的`mWindow`对象，它是在`attach()`方法中初始化的：

```java
final void attach(Context context, ActivityThread aThread,
            Instrumentation instr, IBinder token, int ident,
            Application application, Intent intent, ActivityInfo info,
            CharSequence title, Activity parent, String id,
            NonConfigurationInstances lastNonConfigurationInstances,
            Configuration config, IVoiceInteractor voiceInteractor) {

    //创建一个Window对象        
    mWindow = PolicyManager.makeNewWindow(this);
    mWindow.setCallback(this);
    mWindow.setOnWindowDismissedCallback(this);
    mWindow.getLayoutInflater().setPrivateFactory(this);
    

    mWindow.setWindowManager(
            (WindowManager)context.getSystemService(Context.WINDOW_SERVICE),
            mToken, mComponent.flattenToString(),
            (info.flags & ActivityInfo.FLAG_HARDWARE_ACCELERATED) != 0);
    mWindowManager = mWindow.getWindowManager();

    //...省略其他代码...
}
```

调用了PolicyManager的`makeNewWindow()`方法创建的Window对象。我们跟进去`PolicyManager`这个类（这个类在Android 6.0之后源码中删除了，下面是我找的5.1的源码）：

```java
public final class PolicyManager {
    private static final String POLICY_IMPL_CLASS_NAME =
        "com.android.internal.policy.impl.Policy";

    private static final IPolicy sPolicy;

    static {
        // Pull in the actual implementation of the policy at run-time
        try {
            Class policyClass = Class.forName(POLICY_IMPL_CLASS_NAME);
            sPolicy = (IPolicy)policyClass.newInstance();
        } catch (ClassNotFoundException ex) {
            throw new RuntimeException(
                    POLICY_IMPL_CLASS_NAME + " could not be loaded", ex);
        } catch (InstantiationException ex) {
            throw new RuntimeException(
                    POLICY_IMPL_CLASS_NAME + " could not be instantiated", ex);
        } catch (IllegalAccessException ex) {
            throw new RuntimeException(
                    POLICY_IMPL_CLASS_NAME + " could not be instantiated", ex);
        }
    }

    // Cannot instantiate this class
    private PolicyManager() {}

    // The static methods to spawn new policy-specific objects
    public static Window makeNewWindow(Context context) {
        return sPolicy.makeNewWindow(context);
    }

    public static LayoutInflater makeNewLayoutInflater(Context context) {
        return sPolicy.makeNewLayoutInflater(context);
    }

    public static WindowManagerPolicy makeNewWindowManager() {
        return sPolicy.makeNewWindowManager();
    }

    public static FallbackEventHandler makeNewFallbackEventHandler(Context context) {
        return sPolicy.makeNewFallbackEventHandler(context);
    }
}
```

可以看到实际上调用了`Policy`类的`makeNewWindow()`方法：

```java
public class Policy implements IPolicy {
    private static final String TAG = "PhonePolicy";

    private static final String[] preload_classes = {
        "com.android.internal.policy.impl.PhoneLayoutInflater",
        "com.android.internal.policy.impl.PhoneWindow",
        "com.android.internal.policy.impl.PhoneWindow$1",
        "com.android.internal.policy.impl.PhoneWindow$DialogMenuCallback",
        "com.android.internal.policy.impl.PhoneWindow$DecorView",
        "com.android.internal.policy.impl.PhoneWindow$PanelFeatureState",
        "com.android.internal.policy.impl.PhoneWindow$PanelFeatureState$SavedState",
    };

    static {
        // For performance reasons, preload some policy specific classes when
        // the policy gets loaded.
        for (String s : preload_classes) {
            try {
                Class.forName(s);
            } catch (ClassNotFoundException ex) {
                Log.e(TAG, "Could not preload class for phone policy: " + s);
            }
        }
    }

    public Window makeNewWindow(Context context) {
        return new PhoneWindow(context);
    }

    public LayoutInflater makeNewLayoutInflater(Context context) {
        return new PhoneLayoutInflater(context);
    }

    public WindowManagerPolicy makeNewWindowManager() {
        return new PhoneWindowManager();
    }

    public FallbackEventHandler makeNewFallbackEventHandler(Context context) {
        return new PhoneFallbackEventHandler(context);
    }
}
```

原来是一个`PhoneWindow`对象，我们赶紧看看它的`superDispatchTouchEvent`方法，原来是继续调用了`DecorView`的`superDispatchTouchEvent()`方法：

```java
// This is the top-level view of the window, containing the window decor.
private DecorView mDecor;


@Override
public boolean superDispatchTouchEvent(MotionEvent event) {
    return mDecor.superDispatchTouchEvent(event);
}
```

这个`DecorView`是`PhoneWindow`的一个内部类，它继承了FrameLayout：

```java
private final class DecorView extends FrameLayout implements RootViewSurfaceTaker {

    public boolean superDispatchTouchEvent(MotionEvent event) {
        return super.dispatchTouchEvent(event);
    }
  
    //...省略其他代码... 
}
```

而FrameLayout本身没有实现`dispatchTouchEvent()`这个方法，它继承了ViewGroup：

```java
public class FrameLayout extends ViewGroup {...}
```

下面我们来看一下ViewGroup的`dispatchTouchEvent()`方法源码。

#### ViewGroup开始分发

```java
public boolean dispatchTouchEvent(MotionEvent ev) {
    ...

    boolean handled = false;
    if (onFilterTouchEventForSecurity(ev)) {
        final int action = ev.getAction();
        final int actionMasked = action & MotionEvent.ACTION_MASK;

        if (actionMasked == MotionEvent.ACTION_DOWN) {
            // 触摸事件流开始，重置触摸相关的状态
            cancelAndClearTouchTargets(ev);
            resetTouchState();
        }

        // 关键点1： 检测当前是否需要拦截事件
        final boolean intercepted;
        if (actionMasked == MotionEvent.ACTION_DOWN
                || mFirstTouchTarget != null) {
          
            // 处理调用requestDisallowInterceptTouchEvent()来决定是否允许ViewGroup拦截事件
            final boolean disallowIntercept = (mGroupFlags & FLAG_DISALLOW_INTERCEPT) != 0;
            if (!disallowIntercept) {
                intercepted = onInterceptTouchEvent(ev);
                ev.setAction(action); 
            } else {
                intercepted = false;
            }
        } else {
            // 当前没有TouchTarget也不是事件流的起始的话，则直接默认拦截，不通过onInterceptTouchEvent判断。
            intercepted = true;
        }

        final boolean canceled = resetCancelNextUpFlag(this)
                || actionMasked == MotionEvent.ACTION_CANCEL;

        // 检测是否需要把多点触摸事件分配给不同的子View
        final boolean split = (mGroupFlags & FLAG_SPLIT_MOTION_EVENTS) != 0;
      
        // 当前事件流对应的TouchTarget对象
        TouchTarget newTouchTarget = null;
        boolean alreadyDispatchedToNewTouchTarget = false;
        if (!canceled && !intercepted) {

            View childWithAccessibilityFocus = ev.isTargetAccessibilityFocus()
                    ? findChildWithAccessibilityFocus() : null;

            if (actionMasked == MotionEvent.ACTION_DOWN
                    || (split && actionMasked == MotionEvent.ACTION_POINTER_DOWN)
                    || actionMasked == MotionEvent.ACTION_HOVER_MOVE) {
                final int actionIndex = ev.getActionIndex(); // always 0 for down
                final int idBitsToAssign = split ? 1 << ev.getPointerId(actionIndex)
                        : TouchTarget.ALL_POINTER_IDS;

                // 当前事件是事件流的初始事件(包括多点触摸时第二、第三点灯的DOWN事件)，清除之前相应的TouchTarget的状态
                removePointersFromTouchTargets(idBitsToAssign);

                final int childrenCount = mChildrenCount;
                if (newTouchTarget == null && childrenCount != 0) {
                    final float x = ev.getX(actionIndex);
                    final float y = ev.getY(actionIndex);
                    final ArrayList<View> preorderedList = buildTouchDispatchChildList();
                    final boolean customOrder = preorderedList == null
                            && isChildrenDrawingOrderEnabled();
                    final View[] children = mChildren;
                  
                    //通过for循环，遍历了当前ViewGroup下的所有子View
                    for (int i = childrenCount - 1; i >= 0; i--) {
                        final int childIndex = getAndVerifyPreorderedIndex(
                                childrenCount, i, customOrder);
                        final View child = getAndVerifyPreorderedView(
                                preorderedList, children, childIndex);

                        // 关键点2： 判断当前遍历到的子View能否接受事件，如果不能则直接continue进入下一次循环
                        if (!canViewReceivePointerEvents(child)
                                || !isTransformedTouchPointInView(x, y, child, null)) {
                            ev.setTargetAccessibilityFocus(false);
                            continue;
                        }

                        // 当前子View能接收事件，为子View创建TouchTarget
                        newTouchTarget = getTouchTarget(child);
                        if (newTouchTarget != null) {
                            newTouchTarget.pointerIdBits |= idBitsToAssign;
                            break;
                        }

                        resetCancelNextUpFlag(child);
                        // 调用dispatchTransformedTouchEvent把事件分配给子View
                        if (dispatchTransformedTouchEvent(ev, false, child, idBitsToAssign)) {
                            mLastTouchDownTime = ev.getDownTime();
                            if (preorderedList != null) {
                                for (int j = 0; j < childrenCount; j++) {
                                    if (children[childIndex] == mChildren[j]) {
                                        mLastTouchDownIndex = j;
                                        break;
                                    }
                                }
                            } else {
                                mLastTouchDownIndex = childIndex;
                            }
                            mLastTouchDownX = ev.getX();
                            mLastTouchDownY = ev.getY();
                            
                            // 把TouchTarget添加到TouchTarget列表的第一位
                            newTouchTarget = addTouchTarget(child, idBitsToAssign);
                            alreadyDispatchedToNewTouchTarget = true;
                            break;
                        }

                        ev.setTargetAccessibilityFocus(false);
                    }
                    if (preorderedList != null) preorderedList.clear();
                }

                if (newTouchTarget == null && mFirstTouchTarget != null) {
                    newTouchTarget = mFirstTouchTarget;
                    while (newTouchTarget.next != null) {
                        newTouchTarget = newTouchTarget.next;
                    }
                    newTouchTarget.pointerIdBits |= idBitsToAssign;
                }
            }
        }

        if (mFirstTouchTarget == null) {
            // 目前没有任何TouchTarget，所以直接传null给dispatchTransformedTouchEvent
            handled = dispatchTransformedTouchEvent(ev, canceled, null,
                    TouchTarget.ALL_POINTER_IDS);
        } else {
            // 把事件根据pointer id分发给TouchTarget列表内的所有TouchTarget，用来处理多点触摸的情况
            TouchTarget predecessor = null;
            TouchTarget target = mFirstTouchTarget;
            // 遍历TouchTarget列表
            while (target != null) {
                final TouchTarget next = target.next;
                if (alreadyDispatchedToNewTouchTarget && target == newTouchTarget) {
                    handled = true;
                } else {
                    final boolean cancelChild = resetCancelNextUpFlag(target.child)
                            || intercepted;
                  
                    // 根据TouchTarget的pointerIdBits来执行dispatchTransformedTouchEvent
                    if (dispatchTransformedTouchEvent(ev, cancelChild,
                            target.child, target.pointerIdBits)) {
                        handled = true;
                    }
                    if (cancelChild) {
                        if (predecessor == null) {
                            mFirstTouchTarget = next;
                        } else {
                            predecessor.next = next;
                        }
                        target.recycle();
                        target = next;
                        continue;
                    }
                }
                predecessor = target;
                target = next;
            }
        }

        // 处理CANCEL和UP事件的情况
        if (canceled
                || actionMasked == MotionEvent.ACTION_UP
                || actionMasked == MotionEvent.ACTION_HOVER_MOVE) {
            resetTouchState();
        } else if (split && actionMasked == MotionEvent.ACTION_POINTER_UP) {
            final int actionIndex = ev.getActionIndex();
            final int idBitsToRemove = 1 << ev.getPointerId(actionIndex);
            removePointersFromTouchTargets(idBitsToRemove);
        }
    }

    if (!handled && mInputEventConsistencyVerifier != null) {
        mInputEventConsistencyVerifier.onUnhandledEvent(ev, 1);
    }
    return handled;
}
```

上面的代码比较长，先不用细看。下面一张图来简化对照着理解一下：

![](/gallery/android-view/viewgroup_touchevent.png)

- **关键点1**：只有`ACTION_DOWN`事件或者`mFirstTouchTarget`为空时，并且没有调用过`requestDisallowInterceptTouchEvent()`去阻止该ViewGroup拦截事件的话，才可能执行拦截方法`onInterceptTouchEvent()`

- **关键点2**：判断当前遍历到的子View能否接受事件主要由两点来衡量：子元素是否在播动画（`canViewReceivePointerEvents（）`方法）；点击事件坐标是否落在子元素区域内（``）。

```java
//子元素是否在播动画
private static boolean canViewReceivePointerEvents(View child) {
    return (child.mViewFlags & VISIBILITY_MASK) == VISIBLE
            || child.getAnimation() != null;
}
```

```java
//点击事件坐标是否落在子元素区域内
protected boolean isTransformedTouchPointInView(float x, float y, View child,
            PointF outLocalPoint) {
    float localX = x + mScrollX - child.mLeft;
    float localY = y + mScrollY - child.mTop;
    if (! child.hasIdentityMatrix() && mAttachInfo != null) {
        final float[] localXY = mAttachInfo.mTmpTransformLocation;
        localXY[0] = localX;
        localXY[1] = localY;
        child.getInverseMatrix().mapPoints(localXY);
        localX = localXY[0];
        localY = localXY[1];
    }

    //检测坐标是否在child区域内
    final boolean isInView = child.pointInView(localX, localY);
    if (isInView && outLocalPoint != null) {
        outLocalPoint.set(localX, localY);
    }
    return isInView;
}
```

当子View满足这两个条件之后，ViewGroup就会调用`dispatchTransformedMotionEvent()`方法去交给子元素处理：

```java
private boolean dispatchTransformedTouchEvent(MotionEvent event, boolean cancel,
            View child, int desiredPointerIdBits) {
    final boolean handled;

    final int oldAction = event.getAction();
    // 处理CANCEL的情况，直接把MotionEvent的原始数据分发给子View或者自身的onTouchEvent
		// (这边调用View.dispatchTouchEvent，而View.dispatchTouchEvent会再调用onTouchEvent方法，把MotionEvent传入)
    if (cancel || oldAction == MotionEvent.ACTION_CANCEL) {
        event.setAction(MotionEvent.ACTION_CANCEL);
        if (child == null) {
            handled = super.dispatchTouchEvent(event);
        } else {
            handled = child.dispatchTouchEvent(event);
        }
        event.setAction(oldAction);
        return handled;
    }

    // 对MotionEvent自身的pointer id和当前我们需要处理的pointer id做按位与，得到共有的pointer id
    final int oldPointerIdBits = event.getPointerIdBits();
    final int newPointerIdBits = oldPointerIdBits & desiredPointerIdBits;

    // 没有pointer id需要处理，直接返回
    if (newPointerIdBits == 0) {
        return false;
    }

    final MotionEvent transformedEvent;
    if (newPointerIdBits == oldPointerIdBits) {
        if (child == null || child.hasIdentityMatrix()) {
            if (child == null) {
                // 关键点1： 子View为空，直接交还给自身的onTouchEvent处理
                handled = super.dispatchTouchEvent(event);
            } else {
                final float offsetX = mScrollX - child.mLeft;
                final float offsetY = mScrollY - child.mTop;
                event.offsetLocation(offsetX, offsetY);

                // 关键点2：交给子view的dispatchTouchEvent()方法去处理
                handled = child.dispatchTouchEvent(event);
                event.offsetLocation(-offsetX, -offsetY);
            }
            return handled;
        }
        transformedEvent = MotionEvent.obtain(event);
    } else {
        // MotionEvent自身的pointer id和当前需要处理的pointer id不同，把不需要处理的pointer id相关的信息剔除掉。
        transformedEvent = event.split(newPointerIdBits);
    }

    if (child == null) {
        // 子View为空，直接交还给自身的onTouchEvent处理
        handled = super.dispatchTouchEvent(transformedEvent);
    } else {
        // 根据当前的scrollX、scrollY和子View的left、top对MotionEvent的触摸坐标x、y进行偏移
        final float offsetX = mScrollX - child.mLeft;
        final float offsetY = mScrollY - child.mTop;
        transformedEvent.offsetLocation(offsetX, offsetY);
        if (! child.hasIdentityMatrix()) {
            // 获取子View自身矩阵的逆矩阵，并对MotionEvent的坐标相关信息进行矩阵变换
            transformedEvent.transform(child.getInverseMatrix());
        }
      
        // 把经过偏移以及矩阵变换的事件传递给子View处理
        handled = child.dispatchTouchEvent(transformedEvent);
    }

    transformedEvent.recycle();
    return handled;
}
```

#### 子View消费事件

然后我们看看View的`dispatchTouchEvent()`方法：

```java
public boolean dispatchTouchEvent(MotionEvent event) {
    boolean result = false;

    if (mInputEventConsistencyVerifier != null) {
        mInputEventConsistencyVerifier.onTouchEvent(event, 0);
    }

    final int actionMasked = event.getActionMasked();
    if (actionMasked == MotionEvent.ACTION_DOWN) {
        // Defensive cleanup for new gesture
        stopNestedScroll();
    }

    if (onFilterTouchEventForSecurity(event)) {
        // 如果存在mOnTouchListener，直接交给它消费Touch事件
        ListenerInfo li = mListenerInfo;
        if (li != null && li.mOnTouchListener != null
                && (mViewFlags & ENABLED_MASK) == ENABLED
                && li.mOnTouchListener.onTouch(this, event)) {
            result = true;
        }

        // 交给onTouchEvent()方法消费Touch事件
        if (!result && onTouchEvent(event)) {
            result = true;
        }
    }

    if (!result && mInputEventConsistencyVerifier != null) {
        mInputEventConsistencyVerifier.onUnhandledEvent(event, 0);
    }

    // Clean up after nested scrolls if this is the end of a gesture;
    // also cancel it if we tried an ACTION_DOWN but we didn't want the rest
    // of the gesture.
    if (actionMasked == MotionEvent.ACTION_UP ||
            actionMasked == MotionEvent.ACTION_CANCEL ||
            (actionMasked == MotionEvent.ACTION_DOWN && !result)) {
        stopNestedScroll();
    }

    return result;
}
```

注意这里View的`mOnTouchListener.onTouch(this, event)`和`onTouchEvent(event)`都是放在if判断条件里的，也就是说他们的返回值会影响事件是否继续往下传递。如果`mOnTouchListener.onTouch(this, event)`返回true的话，就不会再执行此子View的`onTouchEvent(event)`方法了。

最后我们再看下View的`onTouchEvent()`方法是如何消费事件的呢？

```java
public boolean onTouchEvent(MotionEvent event) {
    final float x = event.getX();
    final float y = event.getY();
    final int viewFlags = mViewFlags;

    if ((viewFlags & ENABLED_MASK) == DISABLED) {
        if (event.getAction() == MotionEvent.ACTION_UP && (mPrivateFlags & PFLAG_PRESSED) != 0) {
            setPressed(false);
        }
        // A disabled view that is clickable still consumes the touch
        // events, it just doesn't respond to them.
        return (((viewFlags & CLICKABLE) == CLICKABLE ||
                (viewFlags & LONG_CLICKABLE) == LONG_CLICKABLE));
    }

    if (mTouchDelegate != null) {
        if (mTouchDelegate.onTouchEvent(event)) {
            return true;
        }
    }

    if (((viewFlags & CLICKABLE) == CLICKABLE ||
            (viewFlags & LONG_CLICKABLE) == LONG_CLICKABLE)) {
        switch (event.getAction()) {
            case MotionEvent.ACTION_UP:
                boolean prepressed = (mPrivateFlags & PFLAG_PREPRESSED) != 0;
                if ((mPrivateFlags & PFLAG_PRESSED) != 0 || prepressed) {
                    // take focus if we don't have it already and we should in
                    // touch mode.
                    boolean focusTaken = false;
                    if (isFocusable() && isFocusableInTouchMode() && !isFocused()) {
                        focusTaken = requestFocus();
                    }

                    if (prepressed) {
                        // The button is being released before we actually
                        // showed it as pressed.  Make it show the pressed
                        // state now (before scheduling the click) to ensure
                        // the user sees it.
                        setPressed(true, x, y);
                   }

                    if (!mHasPerformedLongPress) {
                        // This is a tap, so remove the longpress check
                        removeLongPressCallback();

                        // Only perform take click actions if we were in the pressed state
                        if (!focusTaken) {
                            // Use a Runnable and post this rather than calling
                            // performClick directly. This lets other visual state
                            // of the view update before click actions start.
                            if (mPerformClick == null) {
                                mPerformClick = new PerformClick();
                            }
                            if (!post(mPerformClick)) {
                            	//关键点
                                performClick();
                            }
                        }
                    }

                    if (mUnsetPressedState == null) {
                        mUnsetPressedState = new UnsetPressedState();
                    }

                    if (prepressed) {
                        postDelayed(mUnsetPressedState,
                                ViewConfiguration.getPressedStateDuration());
                    } else if (!post(mUnsetPressedState)) {
                        // If the post failed, unpress right now
                        mUnsetPressedState.run();
                    }

                    removeTapCallback();
                }
                break;

            case MotionEvent.ACTION_DOWN:
                mHasPerformedLongPress = false;

                if (performButtonActionOnTouchDown(event)) {
                    break;
                }

                // Walk up the hierarchy to determine if we're inside a scrolling container.
                boolean isInScrollingContainer = isInScrollingContainer();

                // For views inside a scrolling container, delay the pressed feedback for
                // a short period in case this is a scroll.
                if (isInScrollingContainer) {
                    mPrivateFlags |= PFLAG_PREPRESSED;
                    if (mPendingCheckForTap == null) {
                        mPendingCheckForTap = new CheckForTap();
                    }
                    mPendingCheckForTap.x = event.getX();
                    mPendingCheckForTap.y = event.getY();
                    postDelayed(mPendingCheckForTap, ViewConfiguration.getTapTimeout());
                } else {
                    // Not inside a scrolling container, so show the feedback right away
                    setPressed(true, x, y);
                    checkForLongClick(0);
                }
                break;

            case MotionEvent.ACTION_CANCEL:
                setPressed(false);
                removeTapCallback();
                removeLongPressCallback();
                break;

            case MotionEvent.ACTION_MOVE:
                drawableHotspotChanged(x, y);

                // Be lenient about moving outside of buttons
                if (!pointInView(x, y, mTouchSlop)) {
                    // Outside button
                    removeTapCallback();
                    if ((mPrivateFlags & PFLAG_PRESSED) != 0) {
                        // Remove any future long press/tap checks
                        removeLongPressCallback();

                        setPressed(false);
                    }
                }
                break;
        }

        return true;
    }

    return false;
}
```

我们这里只注意一下在这个View接收到`ACTION_UP`事件之后，会调用到`performClick()`方法：

```java
public boolean performClick() {
    final boolean result;
    final ListenerInfo li = mListenerInfo;
    if (li != null && li.mOnClickListener != null) {
        playSoundEffect(SoundEffectConstants.CLICK);
        //通知回调mOnClickListener的onClick方法
        li.mOnClickListener.onClick(this);
        result = true;
    } else {
        result = false;
    }

    sendAccessibilityEvent(AccessibilityEvent.TYPE_VIEW_CLICKED);
    return result;
}
```

这里能说明View的`OnClickListener`的`onClick()`事件的执行时机是在整个TouchEvent事件列的最后才会执行。



### Touch案例分析

![](/gallery/android-view/journey-of-an-event-the-android-touch-marco-cova-facebook-9-638.jpg)



> **问题**：当ViewGroup的`onInterceptTouchEvent()`函数分别返回true和false时，这个ViewGroup和View1分别能接收到DOWN、MOVE、UP中的什么事件？



| ViewGroup的`onInterceptTouchEvent()`方法 |  ViewGroup  |  View1  |
| :-----------------------------------: | :---------: | :-----: |
|              return true              | 仅能接收到DOWN事件 | 什么都接收不到 |
|             return false              |   三种都能接收到   | 三种都能接收到 |

另一个案例可以参考这篇文章：[Android 编程下 Touch 事件的分发和消费机制](https://www.cnblogs.com/sunzn/archive/2013/05/10/3064129.html)

### 总结

![](/gallery/android-view/1520093523-0.png)

- Touch事件分发中只有两个主角:ViewGroup和View。ViewGroup包含onInterceptTouchEvent、dispatchTouchEvent、onTouchEvent三个相关事件。View包含dispatchTouchEvent、onTouchEvent两个相关事件。其中ViewGroup又继承于View。


- （1）事件从 Activity.dispatchTouchEvent()开始传递，只要没有被停止或拦截，从最上层的 ViewGroup开始一直往下(子View)传递。子View可以通过 `onTouchEvent()`对事件进行处理。
- （2）事件由ViewGroup传递给子 View，ViewGroup 可以通过 `onInterceptTouchEvent()`对事件做拦截，停止其往下传递。
- （3）如果事件从上往下传递过程中一直没有被停止，且最底层子 View 没有消费事件，事件会反向往上传递，这时父 View(ViewGroup)可以进行消费，如果还是没有被消费的话，最后会到 Activity 的 onTouchEvent()函数。
- （4） 如果 View 没有对 ACTION_DOWN 进行消费，之后的其他事件不会传递过来。
- （5）OnTouchListener 优先于 onTouchEvent()对事件进行消费。
- 当Acitivty接收到Touch事件时，将遍历子View进行Down事件的分发。ViewGroup的遍历可以看成是递归的。分发的目的是为了找到第一个真正要处理本次完整触摸事件的View，这个View会在onTouchuEvent结果返回true。
- 当某个子View返回true时，会中止Down事件的分发，同时在ViewGroup中记录该子View。接下去的Move和Up事件将由该子View直接进行处理。由于子View是保存在ViewGroup中的，多层ViewGroup的节点结构时，上级ViewGroup保存的会是真实处理事件的View所在的ViewGroup对象:如ViewGroup0-ViewGroup1-TextView的结构中，TextView返回了true，它将被保存在ViewGroup1中，而ViewGroup1也会返回true，被保存在ViewGroup0中。当Move和UP事件来时，会先从ViewGroup0传递至ViewGroup1，再由ViewGroup1传递至TextView。
- 当ViewGroup中所有子View都不捕获Down事件时，将触发ViewGroup自身的onTouch事件。触发的方式是调用super.dispatchTouchEvent函数，即父类View的dispatchTouchEvent方法。在所有子View都不处理的情况下，触发Acitivity的onTouchEvent方法。
- ViewGroup默认不拦截任何事件。源码中的ViewGroup的`onInterceptTouchEvent()`方法默认返回false。
- View没有`onInterceptTouchEvent()`方法。一旦点击事件传递给它，就会调用它的`onTouchEvent`方法
- 我们可以发现ViewGroup没有onTouchEvent事件，说明他的处理逻辑和View是一样的。 
- 子view如果消耗了事件，那么ViewGroup就不会在接受到事件了。






### 参考资料

- [Android:30分钟弄明白Touch事件分发机制](http://www.cnblogs.com/linjzong/p/4191891.html)
- [公共技术点之 View 事件传递](http://a.codekk.com/detail/Android/Trinea/%E5%85%AC%E5%85%B1%E6%8A%80%E6%9C%AF%E7%82%B9%E4%B9%8B%20View%20%E4%BA%8B%E4%BB%B6%E4%BC%A0%E9%80%92)
- [Android事件分发完全解析之为什么是她](http://blog.csdn.net/aigestudio/article/details/44260301)
- [Android ViewGroup/View 事件分发机制详解](http://blog.csdn.net/wallezhe/article/details/51737034)
- [Android事件分发机制详解：史上最全面、最易懂](http://blog.csdn.net/carson_ho/article/details/54136311)
- [Android 编程下 Touch 事件的分发和消费机制](https://www.cnblogs.com/sunzn/archive/2013/05/10/3064129.html)
- [ViewGroup 源码解析](https://github.com/LittleFriendsGroup/AndroidSdkSourceAnalysis/blob/master/article/ViewGroup%20%E6%BA%90%E7%A0%81%E8%A7%A3%E6%9E%90.md)
- [ViewGroup源码解读](http://blog.csdn.net/sw950729/article/details/77744545)


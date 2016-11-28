---
title: 【Android】Activity与Fragment的生命周期的关系
layout: post
date: 2015-11-25 14:31:55
comments: true
tags: [Android]
categories: [Android]
keywords: Android
description: 
---

## **一、问题描述：**
> 假设有两个Activity（1和2）,每个Activity拥有一个Fragment，并分别有一个Button，点击Button1可以start Activity2，然后点击Button2可以finish掉自己（即Activity2）,然后返回到Activity1。根据这个简单模型描述一下Activity和Fragment的生命周期之间的依赖关系？

![](http://img.blog.csdn.net/20151125142250638)


----------

<!--more-->


## **二、生命周期知识**

Activity和Fragment的生命周期图谱可以参考我的另外一篇博客：[**【Android】Fragment的生命周期详解**](http://blog.csdn.net/u010983881/article/details/50034805)，他们的关系大致如下图：

![](http://img.blog.csdn.net/20151125114550996)


----------



## **三、代码验证**

  MainActivity和SecondActivity的布局是这样的，里面各添加了一个Fragment：
  
   ![](http://img.blog.csdn.net/20160122171224773) ![](http://img.blog.csdn.net/20160122171401607)

```xml
/**
  * MainActivity布局xml文件
  */

<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:orientation="vertical" android:layout_width="fill_parent"
    android:layout_height="fill_parent">

    <Button
        android:id="@+id/button"
        android:text="开启第二个Activity"
        android:layout_gravity="center"
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"></Button>

    <LinearLayout
        android:id="@+id/linearlayout"
        android:layout_width="match_parent"
        android:layout_height="match_parent"
        android:orientation="vertical"
        android:background="#339999">
    </LinearLayout>

</LinearLayout>

```

---------


```java
/**
  * MainActivity.java代码，SecondActivity的代码与之类似，这里就不贴那么多了
  */
public class MainActivity extends Activity {
    private static final String LOG_TAG = "MainActivity";
    private Button mButton;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        Log.w(LOG_TAG, "==============onCreate()");

        FragmentManager fragmentManager = getFragmentManager();
        FragmentTransaction fragmentTransaction = fragmentManager.beginTransaction();

        FirstFragment firstFragment = new FirstFragment();
        fragmentTransaction.add(R.id.linearlayout, firstFragment);
        fragmentTransaction.commit();

        mButton = (Button) findViewById(R.id.button);
        mButton.setOnClickListener(new View.OnClickListener() {

            @Override
            public void onClick(View v) {
                Log.w(LOG_TAG, "------------------mButton onClick-------------------");
                startActivity(new Intent(MainActivity.this, SecondActivity.class));
            }
        });
    }

    @Override
    protected void onStart() {
        super.onStart();
        Log.w(LOG_TAG, "==============onStart()");
    }

    @Override
    protected void onRestart() {
        super.onRestart();
        Log.w(LOG_TAG, "==============onRestart()");
    }

    @Override
    protected void onResume() {
        super.onResume();
        Log.w(LOG_TAG, "==============onResume()");
    }

    @Override
    protected void onPause() {
        super.onPause();
        Log.w(LOG_TAG, "==============onPause()");
    }

    @Override
    protected void onStop() {
        super.onStop();
        Log.w(LOG_TAG, "==============onStop()");
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        Log.w(LOG_TAG, "==============onDestroy()");
    }
}
```

---------



```java
/**
  * FirstFragment.java代码， SecondFragment和它差不多一样
  */
public class FirstFragment extends Fragment {
    private static final String LOG_TAG = "FirstFragment";
    private static final String ARG_PARAM1 = "param1";
    private static final String ARG_PARAM2 = "param2";

    private String mParam1;
    private String mParam2;

    public FirstFragment() {
    }

    @Override
    public void onAttach(Activity activity) {
        super.onAttach(activity);
        Log.w(LOG_TAG, "onAttach...");
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Log.w(LOG_TAG, "onCreate...");
        if (getArguments() != null) {
            mParam1 = getArguments().getString(ARG_PARAM1);
            mParam2 = getArguments().getString(ARG_PARAM2);
        }
    }

    @Override
    public View onCreateView(LayoutInflater inflater, ViewGroup container,
                             Bundle savedInstanceState) {
        Log.w(LOG_TAG, "onCreateView...");
        return inflater.inflate(R.layout.fragment_first, container, false);
    }


    @Override
    public void onActivityCreated(Bundle savedInstanceState) {
        super.onActivityCreated(savedInstanceState);
        Log.w(LOG_TAG, "onActivityCreated...");
    }

    @Override
    public void onStart() {
        super.onStart();
        Log.w(LOG_TAG, "onStart...");
    }


    @Override
    public void onResume() {
        super.onResume();
        Log.w(LOG_TAG, "onResume...");
    }

    @Override
    public void onPause() {
        super.onPause();
        Log.w(LOG_TAG, "onPause...");
    }

    @Override
    public void onStop() {
        super.onStop();
        Log.w(LOG_TAG, "onStop...");
    }

    @Override
    public void onDestroyView() {
        super.onDestroyView();
        Log.w(LOG_TAG, "onDestroyView...");
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        Log.w(LOG_TAG, "onDestroy...");
    }

    @Override
    public void onDetach() {
        super.onDetach();
        Log.w(LOG_TAG, "onDetach...");
    }

}
```

----------



## **四、运行结果**

1、第一次打开以后：

```bash
com.example.kuguan.anlearning W/MainActivity﹕ ==============onCreate()
com.example.kuguan.anlearning W/FirstFragment﹕ onAttach...
com.example.kuguan.anlearning W/FirstFragment﹕ onCreate...
com.example.kuguan.anlearning W/FirstFragment﹕ onCreateView...
com.example.kuguan.anlearning W/FirstFragment﹕ onActivityCreated...
com.example.kuguan.anlearning W/MainActivity﹕ ==============onStart()
com.example.kuguan.anlearning W/FirstFragment﹕ onStart...
com.example.kuguan.anlearning W/MainActivity﹕ ==============onResume()
com.example.kuguan.anlearning W/FirstFragment﹕ onResume...
```



2、点击MainActivity中的按钮“打开第二个Activity”以后：

```console
com.example.kuguan.anlearning W/MainActivity﹕ ----------------mButton onClick-----------------
com.example.kuguan.anlearning W/FirstFragment﹕ onPause...
com.example.kuguan.anlearning W/MainActivity﹕ ==============onPause()
com.example.kuguan.anlearning W/SecondFragment﹕ onAttach...
com.example.kuguan.anlearning W/SecondFragment﹕ onCreate...
com.example.kuguan.anlearning W/SecondFragment﹕ onCreateView...
com.example.kuguan.anlearning W/SecondFragment﹕ onActivityCreated...
com.example.kuguan.anlearning W/SecondActivity﹕ ==============onStart()
com.example.kuguan.anlearning W/SecondFragment﹕ onStart...
com.example.kuguan.anlearning W/SecondActivity﹕ ==============onResume()
com.example.kuguan.anlearning W/SecondFragment﹕ onResume...
com.example.kuguan.anlearning W/FirstFragment﹕ onStop...
com.example.kuguan.anlearning W/MainActivity﹕ ==============onStop()
```

3、点击SecondActivity的按钮“finish”之后：

```bash
com.example.kuguan.anlearning W/SecondActivity﹕ -----------------mButton onClick------------------
com.example.kuguan.anlearning W/SecondFragment﹕ onPause...
com.example.kuguan.anlearning W/SecondActivity﹕ ==============onPause()
com.example.kuguan.anlearning W/MainActivity﹕ ==============onRestart()
com.example.kuguan.anlearning W/MainActivity﹕ ==============onStart()
com.example.kuguan.anlearning W/FirstFragment﹕ onStart...
com.example.kuguan.anlearning W/MainActivity﹕ ==============onResume()
com.example.kuguan.anlearning W/FirstFragment﹕ onResume...
com.example.kuguan.anlearning W/SecondFragment﹕ onStop...
com.example.kuguan.anlearning W/SecondActivity﹕ ==============onStop()
com.example.kuguan.anlearning W/SecondFragment﹕ onDestroyView...
com.example.kuguan.anlearning W/SecondFragment﹕ onDestroy...
com.example.kuguan.anlearning W/SecondFragment﹕ onDetach...
com.example.kuguan.anlearning W/SecondActivity﹕ ==============onDestroy()
```
4、点击back键使MainActivity退到后台：

```bash
com.example.kuguan.anlearning W/FirstFragment﹕ onPause...
com.example.kuguan.anlearning W/MainActivity﹕ ==============onPause()
com.example.kuguan.anlearning W/FirstFragment﹕ onStop...
com.example.kuguan.anlearning W/MainActivity﹕ ==============onStop()
com.example.kuguan.anlearning W/FirstFragment﹕ onDestroyView...
com.example.kuguan.anlearning W/FirstFragment﹕ onDestroy...
com.example.kuguan.anlearning W/FirstFragment﹕ onDetach...
com.example.kuguan.anlearning W/MainActivity﹕ ==============onDestroy()
```

5、在MianActivity显示的时候，按HOME键：

```shell
com.example.kuguan.anlearning W/FirstFragment﹕ onPause...
com.example.kuguan.anlearning W/MainActivity﹕ ==============onPause()
com.example.kuguan.anlearning W/FirstFragment﹕ onStop...
com.example.kuguan.anlearning W/MainActivity﹕ ==============onStop()
```
6、然后再点击Icon打开：

```shell
com.example.kuguan.anlearning W/MainActivity﹕ ==============onRestart()
com.example.kuguan.anlearning W/MainActivity﹕ ==============onStart()
com.example.kuguan.anlearning W/FirstFragment﹕ onStart...
com.example.kuguan.anlearning W/MainActivity﹕ ==============onResume()
com.example.kuguan.anlearning W/FirstFragment﹕ onResume...
```




## 【参考资料】：
1、[Fragment和Activity](http://www.cnblogs.com/mengdd/archive/2013/01/11/2856374.html)


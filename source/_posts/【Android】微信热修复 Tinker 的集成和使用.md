---
title: 【Android】微信热修复 Tinker 的集成和使用
layout: post
date: 2016-11-17 11:51:55
comments: true
tags: 
    - Tinker
    - hotfix
categories: [Android]
keywords: Tinker
description: 
photos:
    - /gallery/tinker.png
---


## **简介**

 **`Tinker`**： n.   〈英〉小炉匠，补锅匠，修补匠

[**Tinker**](https://github.com/Tencent/tinker) 是微信官方开源的 Android 热修复框架，支持在无需升级APK的前提下更新 `dex`, `library` and `resources` 文件。它也就是今年9月24才刚刚开源，几天功夫star数就超过3000，可见在开发者中的影响力有多大，也说明这是一个刚需。

Tinker GitHub: https://github.com/Tencent/tinker


## **使用步骤**

### 一个小坑

很多人遇到的第一个错误就是提示 `tinkerId is not set` ，这个在tinker-sample-android的`app/build.gradle` 中默认设置为Git的提交版本号，如下

```groovy
def getTinkerIdValue() {
    return hasProperty("TINKER_ID") ? TINKER_ID : gitSha()
}
```

如果不是通过git clone方式下载的就可能出现这个错误，其实可以简单粗暴的方式解决，那就是在app/build.gradle中把tinker id写死：

```groovy
def getTinkerIdValue() {
    return hasProperty("TINKER_ID") ? TINKER_ID : "tinker_id_2333"
}
```

下面介绍一下如何一步步的把Tinker集成到自己的项目中，以及会遇到哪些问题该如何解决。

<!--more-->

### **一、工程根目录的build.gradle中添加依赖**

在项目的build.gradle中，添加`tinker-patch-gradle-plugin`的依赖

```groovy
buildscript {
    dependencies {
        classpath ('com.tencent.tinker:tinker-patch-gradle-plugin:1.7.3')
    }
}
```

此时如果gradle Sync不成功可能是因为没有加入 **jcenter仓库**

```groovy
buildscript {
    repositories {
        mavenLocal()
        jcenter()    //注意这里，因为maven仓库里没有
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:2.2.2'
        classpath "com.tencent.tinker:tinker-patch-gradle-plugin:${TINKER_VERSION}"
    }
    // default values for all sub projects
}
```

### **二、在app/build.gradle中的dependencies节点添加依赖**

```groovy
dependencies {
    //可选，用于生成application类 
    provided('com.tencent.tinker:tinker-android-anno:1.7.3')
    //tinker的核心库
    compile('com.tencent.tinker:tinker-android-lib:1.7.3') 
}
```

### **三、复制官方sample工程app/build.gradle中的其他相关配置**

把官方 tinker-sample-android 工程中的`app/build.gradle`复制到自己的app/build.gradle中，特别是最下面的task 代码块，否则无法生成patch。

### **四、替换自己的Application类**

这一块需要特殊说明一下，tinker为了达到修改应用自己的Application的目的，使用代码框架封装继承`DefaultApplicationLike`的方式来实现对Application的修改，主要为了减少反射的使用和提高兼容性，具体说明参考 [**Tinker Wiki：自定义Application类**](https://github.com/Tencent/tinker/wiki/Tinker-%E8%87%AA%E5%AE%9A%E4%B9%89%E6%89%A9%E5%B1%95)。

> 在替换更改之前，强烈建议先把项目中的Application类做个备份。因为需要采用Annotation自动生成Application，**原来的Application类需要删掉**。

然后我们修改项目的 Application ，使之继承`DefaultApplicationLike`; 这块的确有点奇葩,这个`DefaultApplicationLike`不是继承自Application，需要用注解来设置项目中真正的Application，**Tinker插件会自动生成真正的Application**。

```java
@DefaultLifeCycle(application = "com.cuc.android.aps.MyApplication",//通过注解，由tinker自动生成MyApplication
        flags = ShareConstants.TINKER_ENABLE_ALL,                 //tinkerFlags
        loaderClass = "com.tencent.tinker.loader.TinkerLoader",   //loaderClassName, 我们这里使用默认
        loadVerifyFlag = false)
        
public class ApplicationFromTinkerLike extends DefaultApplicationLike {
    public ApplicationFromTinkerLike(Application application, int tinkerFlags, boolean tinkerLoadVerifyFlag, long applicationStartElapsedTime, long applicationStartMillisTime, Intent tinkerResultIntent, Resources[] resources, ClassLoader[] classLoader, AssetManager[] assetManager) {
        super(application, tinkerFlags, tinkerLoadVerifyFlag, applicationStartElapsedTime, applicationStartMillisTime, tinkerResultIntent, resources, classLoader, assetManager);
    }
}
```

上边的**`com.cuc.android.aps.MyApplication`**就是真正的Application,不用我们自己写,是自动生成的。然后修改manifest.xml将application指向`com.cuc.android.aps.MyApplication`就行，开始会报错，build一下项目就好了。

### **五、在刚改好的 ApplicationFromTinkerLike 中重载onBaseContextAttached方法**

并在该方法中增加以下代码调用初始化tinker

```java
@Override
public void onBaseContextAttached(Context base) {
    super.onBaseContextAttached(base);
    
    //you must install multiDex whatever tinker is installed!
    MultiDex.install(base);
    TinkerInstaller.install(this);
}
```

**或者**，我们可以直接将Sample工程中的文件（特别是Utils包下的）拷贝到我们自己的工程中，就像我一样，方便后期使用。比如SampleResultService、TinkerManager这几个类

![](http://img.blog.csdn.net/20161117111013179)

然后重载onBaseContextAttached方法，可以像我一样写成下面这样

```java
@Override
public void onBaseContextAttached(Context base) {
    super.onBaseContextAttached(base);
    //you must install multiDex whatever tinker is installed!
    MultiDex.install(base);

    MyApplicationContext.application = (MyApplication) getApplication();
    MyApplicationContext.context = getApplication();
    TinkerManager.setTinkerApplicationLike(this);
    TinkerManager.initFastCrashProtect();
    //should set before tinker is installed
    TinkerManager.setUpgradeRetryEnable(true);

    //optional set logIml, or you can use default debug log
    TinkerInstaller.setLogIml(new MyLogImp());

    //installTinker after load multiDex
    //or you can put com.tencent.tinker.** to main dex
    TinkerManager.installTinker(this);
}
```

至此，自定义Application，也就是将Application中的实现移动到SampleApplicationLike中已经完成。

### **六、可以开始写测试patch的代码啦**

使用下面代码来load patch

```java
TinkerInstaller.onReceiveUpgradePatch(this.getApplication(), Environment.getExternalStorageDirectory().getAbsolutePath() + "/patch_signed_7zip.apk");
```

在自己的工程中增加两个按钮，其中一个按钮用来显示EditText中的内容，另一个按钮用来加载补丁，在加载补丁按钮点击事件中执行加载patch的操作，为后期修复代码bug做准备，代码为：
```java
Button toastInfo = (Button) top.findViewById(R.id.toastInfo);
toastInfo.setOnClickListener(new View.OnClickListener() {
    @Override
    public void onClick(View v) {
        //清除补丁
        Toast.makeText(SysUtils.getApp(),"clean patch!",Toast.LENGTH_LONG).show();
        Tinker.with(SysUtils.getApp()).cleanPatch();
    }
});
Button loadPatchButton = (Button) top.findViewById(R.id.loadPatch);
loadPatchButton.setOnClickListener(new View.OnClickListener() {
    @Override
    public void onClick(View v) {
        //加载补丁（加载成功以后patch文件会自动删掉）
        TinkerInstaller.onReceiveUpgradePatch(SysUtils.getApp(), Environment.getExternalStorageDirectory().getAbsolutePath() + "/patch_signed_7zip.apk");
    }
});
```

## **打patch包的步骤**

### 1、调用`assembleDebug`编译原始包

AndroidStudio 命令行下运行

```shell
$ ./gradlew assembleDebug
```

编译过的包会保存在build/bakApk中。然后我们将它安装到手机，可以看到补丁并没有加载。


### 2、修改代码，添加新功能或者更改功能

例如在MainActivity中添加一个`I am on patch onCreate`的Toast.


### 3、然后修改build.gradle中的参数

将步骤一编译保存的安装包路径拷贝到`tinkerPatch`中的`tinkerOldApkPath`参数中，根据需要也得同时修改`tinkerApplyResourcePath` ，`tinkerApplyMappingPath` 。

```groovy
/**
 * you can use assembleRelease to build you base apk
 * use tinkerPatchRelease -POLD_APK=  -PAPPLY_MAPPING=  -PAPPLY_RESOURCE= to build patch
 * add apk from the build/bakApk
 */
ext {
    //for some reason, you may want to ignore tinkerBuild, such as instant run debug build?
    tinkerEnabled = true

    //for normal build
    //old apk file to build patch apk
    tinkerOldApkPath = "${bakPath}/app-debug-1116-15-53-17.apk"
    //proguard mapping file to build patch apk
    tinkerApplyMappingPath = "${bakPath}/app-debug-1116-15-53-17-mapping.txt"
    //resource R.txt to build patch apk, must input if there is resource changed
    tinkerApplyResourcePath = "${bakPath}/app-debug-1116-15-53-17-R.txt"

    //only use for build all flavor, if not, just ignore this field
    tinkerBuildFlavorDirectory = "${bakPath}/app-debug-1107-10-33-32"
}
```


### 4、调用tinkerPatchDebug, 生成补丁包


```shell
$ ./gradlew tinkerPatchDebug
```

补丁包与相关日志会保存在`/build/outputs/tinkerPatch/`中，我们将其中的**patch_signed_7zip.apk**推送到手机的sdcard中。

```shell
$ adb push ./app/build/outputs/tinkerPatch/debug/patch_signed_7zip.apk /storage/sdcard0/
```

### 5、运行app，执行LOAD PATCH代码块

如果看到`patch success, please restart process`的toast，即可锁屏或者KILL 应用进程。


### 6、重新启动App

我们可以看到，补丁包的确已经加载成功了。


---


## **使用Tinker的注意事项**


- 1、Tinker_id的大版本升级问题

![](/gallery/tinker_id_problem.png)

- 2、如果生成patch失败，并且原因如下：

```shell
Warning: ignoreWarning is false, but we found loader classes are found in old secondary dex.
```

那么需要把**相应的报错类**声明在项目的`keep_in_main_dex.txt` 文件中，保证它编译时会被放置到主dex中。参考[Tinker Issue #96](https://github.com/Tencent/tinker/issues/96) 。





---

## 【参考资料】

- [Tinker 官方接入指南](https://github.com/Tencent/tinker/wiki/Tinker-%E6%8E%A5%E5%85%A5%E6%8C%87%E5%8D%97) 
- [微信Android热补丁实践演进之路](http://mp.weixin.qq.com/s?__biz=MzAwNDY1ODY2OQ==&mid=2649286306&idx=1&sn=d6b2865e033a99de60b2d4314c6e0a25&scene=23&srcid=0705vd1zLzQEHZ9G6JyQSqTG#rd)
- [微信Tinker的一切都在这里，包括源码(一)](http://mp.weixin.qq.com/s?__biz=MzAwNDY1ODY2OQ==&mid=2649286384&idx=1&sn=f1aff31d6a567674759be476bcd12549&scene=4#wechat_redirect)
- [【腾讯Bugly干货分享】微信热补丁Tinker的实践演进之路](https://zhuanlan.zhihu.com/p/22089905)
-  [将Tinke集成到自己的项目](http://blog.csdn.net/xiejc01/article/details/52735920)
-  [Android 微信热修复Tinker接入过程以及使用方法](http://blog.csdn.net/a750457103/article/details/52815096)
- [Tinker 逆向分析](https://www.zybuluo.com/dodola/note/554061)


---
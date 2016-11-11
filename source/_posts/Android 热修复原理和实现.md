---
title: Android 热修复原理和实现
layout: post
date: 2016-11-10 13:06:00
comments: true
tags: 
    - hotfix
categories: [Android]
keywords: hotfix
description: 
photos:
    - http://img.blog.csdn.net/20161110131925707
---



> 查看原文： [**Android 热修复，没你想的那么难**](http://kymjs.com/code/2016/05/08/01) —— by kymjs张涛


一种动态加载最简单的实现方式，代码实现起来非常简单，重要的是这种思路和原理 。

《插件化从放弃到捡起》第一章，首先看一张图：

![](http://img.blog.csdn.net/20161110131925707)

这张图是我所理解的 Android 插件化技术的三个技术点以及它们的应用场景。今天以 [【Qzone 热修复方案】](https://zhuanlan.zhihu.com/p/20308548)为例，跟大家讲一讲插件化中 `热修复方案` 的实现。


<!--more-->


## 原理

### ClassLoader

在 Java 中，要加载一个类需要用到`ClassLoader`。
Android 中有三个 ClassLoader, 分别为`URLClassLoader`、`PathClassLoader`、`DexClassLoader`。其中:

- **URLClassLoader** : 只能用于加载jar文件，但是由于 dalvik 不能直接识别jar，所以在 Android 中无法使用这个加载器。

- **PathClassLoader** :它只能加载已经安装的apk。因为 PathClassLoader 只会去读取 /data/dalvik-cache 目录下的 dex 文件。例如我们安装一个包名为`com.hujiang.xxx`的 apk,那么当 apk 安装过程中，就会在`/data/dalvik-cache`目录下生产一个名为`data@app@com.hujiang.xxx-1.apk@classes.dex`的 ODEX 文件。在使用 PathClassLoader 加载 apk 时，它就会去这个文件夹中找相应的 ODEX 文件，如果 apk 没有安装，自然会报`ClassNotFoundException`。

- **DexClassLoader** : 是最理想的加载器。它的构造函数包含四个参数，分别为：

	1、dexPath, 指目标类所在的APK或jar文件的路径.类装载器将从该路径中寻找指定的目标类,该类必须是APK或jar的全路径.如果要包含多个路径,路径之间必须使用特定的分割符分隔,特定的分割符可以使用System.getProperty(“path.separtor”)获得.
	
	2、dexOutputDir, 由于dex文件被包含在APK或者Jar文件中,因此在装载目标类之前需要先从APK或Jar文件中解压出dex文件,该参数就是制定解压出的dex 文件存放的路径.在Android系统中,一个应用程序一般对应一个Linux用户id,应用程序仅对属于自己的数据目录路径有写的权限,因此,该参数可以使用该程序的数据路径.
	
	3、libPath, 指目标类中所使用的C/C++库存放的路径
	
   4、classload, 是指该装载器的父装载器,一般为当前执行类的装载器

从[framework源码](http://androidxref.com/4.0.4/xref/libcore/dalvik/src/main/java/dalvik/system/BaseDexClassLoader.java)中的`dalvik.system`包下，找到`DexClassLoader`源码，并没有什么卵用，实际内容是在它的父类`BaseDexClassLoader`中，顺带一提，这个类最低在API14开始有用。包含了两个变量：

```java
/** originally specified path (just used for {@code toString()}) */
private final String originalPath;
 
/** structured lists of path elements */
private final DexPathList pathList;
```

可以看到注释：pathList就是多dex的结构列表，查看其[源码](http://androidxref.com/4.0.4/xref/libcore/dalvik/src/main/java/dalvik/system/DexPathList.java)

```java
/*package*/ final class DexPathList {
    private static final String DEX_SUFFIX = ".dex";
    private static final String JAR_SUFFIX = ".jar";
    private static final String ZIP_SUFFIX = ".zip";
    private static final String APK_SUFFIX = ".apk";

    /** class definition context */
    private final ClassLoader definingContext;

    /** list of dex/resource (class path) elements */
    private final Element[] dexElements;

    /** list of native library directory elements */
    private final File[] nativeLibraryDirectories;
```

可以看到 `dexElements` 注释，dexElements 就是一个dex列表，那么我们就可以把每个 Element 当成是一个 dex。

此时我们整理一下思路，DexClassLoader 包含有一个dex数组`Element[] dexElements`，其中每个dex文件是一个Element，当需要加载类的时候会遍历 dexElements，如果找到类则加载，如果找不到从下一个 dex 文件继续查找。

那么我们的实现就是把这个插件 dex 插入到 Elements 的最前面，这么做的好处是不仅可以动态的加载一个类，并且由于 DexClassLoader 会优先加载靠前的类，所以我们同时实现了宿主 apk 的热修复功能。

ODEX过程
上文就是整个热修复的原理了，就是向`Classloader`列表中插入一个dex。但是如果你这儿实现了，会发现一个问题，就是 ODEX 过程中引发的问题。
在讲这个蛋疼的过程之前，有几个问题是要搞懂的。
为什么 Android 不能识别 .class 文件，而只能识别 dex 文件。
因为 dex 是对 class 的优化，它对 class 做了极大的压缩，比如以下是一个 class 文件的结构(摘自邓凡平老师博客)

![](http://img.blog.csdn.net/20161110132655991)

dex 将整个 Android 工程中所有的 class 压缩到一个(或几个) dex 文件中，合并了每个 class 的常量、class 版本信息等，例如每个 class 中都有一个相同的字符串，在 dex 中就只存一份就够了。所以，在Android 上，dalvik 虚拟机是无法识别一个普通 class 文件的，因为无法识别这个 class 文件的结构。

以下是一个 dex 文件的结构 :

![](http://img.blog.csdn.net/20161110132725000)

感兴趣的可以阅读《深入理解Android》这本书。

继续往下，其实 dalvik 虚拟机也并不是直接读取 dex 文件的，而是在一个 APK 安装的时候，会首先做一次优化，会生成一个 ODEX 文件，即 Optimized dex。 为什么还要优化，依旧是为了效率。 

只不过，Class -> dex 是为了平台无关的优化；
而 dex -> odex 则是针对不同平台，不同手机的硬件配置做针对性的优化。
就是在这一过程中，虚拟机在启动优化的时候，会有一个选项就是 verify 选项，当 verify 选项被打开的时候，就会执行一次校验，校验的目的是为了判断，这个类是否有引用其他 dex 中的类，如果没有，那么这个类会被打上一个 CLASS_ISPREVERIFIED 的标志。一旦被打上这个标志，就无法再从其他 dex 中替换这个类了。而这个选项开启，则是由虚拟机控制的。

### 字节码操作
那么既然知道了原因，解决的办法自然也有了。你不是没有引用其他 dex 中的类就会被标记吗，那咱们就引用一个其他 dex 中的类。

ClassReader:该类用来解析编译过的class字节码文件。
ClassWriter:该类用来重新构建编译后的类，比如说修改类名、属性以及方法，甚至可以生成新的类的字节码文件。
ClassAdapter:该类也实现了ClassVisitor接口，它将对它的方法调用委托给另一个ClassVisitor对象。

```java
/**
 * 当对象初始化的时候注入Inject类
 *
 * @Note https://www.ibm.com/developerworks/cn/java/j-lo-asm30/
 * @param inputStream 需要注入的Class的文件输入流
 * @return 返回注入以后的Class文件二进制数组
 */
private static byte[] referHackWhenInit(InputStream inputStream) {
    //该类用来解析编译过的class字节码文件。
    ClassReader cr = new ClassReader(inputStream);
    //该类用来重新构建编译后的类，比如说修改类名、属性以及方法，甚至可以生成新的类的字节码文件
    ClassWriter cw = new ClassWriter(cr, 0);
    //类的访问者,可以用来创建对一个Class的改动操作
    ClassVisitor cv = new ClassVisitor(Opcodes.ASM4, cw) {
        @Override
        public MethodVisitor visitMethod(int access, String name, String desc,
                                         String signature, String[] exceptions) {
            MethodVisitor mv = super.visitMethod(access, name, desc, signature, exceptions);
            //如果方法名是<init>,每个类的构造函数函数名叫<init>
            if ("<init>".equals(name)) {
                //在原本的visitMethod操作中添加自己定义的操作
                mv = new MethodVisitor(Opcodes.ASM4, mv) {
                    @Override
                    void visitInsn(int opcode) {
                        //Opcodes可以看做为关键字
                        if (opcode == Opcodes.RETURN) {
                            //visitLdcInsn() 将一个值写入到栈中,可以是一个Class类名/method方法名/desc方法描述
                            //这里相当于插入了一条语句:Class a = Inject.class;
                            super.visitLdcInsn(Type.getType("Lcom/hujiang/hotfix/Inject;"));
                        }
                        //执行opcode对应的其他操作
                        super.visitInsn(opcode);
                    }
                }
            }
            //责任链完成,返回
            return mv;
        }
    };
    //accept这个方法接受一个实现了 ClassVisitor接口的对象实例作为参数，然后依次调用 ClassVisitor接口的各个方法
    //用户无法控制各个方法调用顺序,但是可以提供不同的 Visitor(访问者) 来对字节码树进行不同的修改
    //在这里,调用这一步的目的是为了让上面的visitMethod方法被调用
    cr.accept(cv, 0);
    return cw.toByteArray();
}
```

## 代码实现

可以参考 [**nuwa**](https://github.com/jasonross/Nuwa) 中的实现，首先是 dex 怎样去插入到`Classloader`列表中，其实就是一段反射：

```java
public static void injectDexAtFirst(String dexPath, String defaultDexOptPath) throws NoSuchFieldException, IllegalAccessException, ClassNotFoundException {
    DexClassLoader dexClassLoader = new DexClassLoader(dexPath, defaultDexOptPath, dexPath, getPathClassLoader());
    Object baseDexElements = getDexElements(getPathList(getPathClassLoader()));
    Object newDexElements = getDexElements(getPathList(dexClassLoader));
    Object allDexElements = combineArray(newDexElements, baseDexElements);
    Object pathList = getPathList(getPathClassLoader());
    ReflectionUtils.setField(pathList, pathList.getClass(), "dexElements", allDexElements);
}
```

首先分别获取到宿主应用和补丁的 dex 中的`PathList.dexElements`, 并把两个 dexElements 数组做拼接，将补丁数组放在前面，最后将拼接后生成的数组再赋值回`Classloader`.

nuwa 更主要的是他的 groovy 脚本，完整代码：[**这里**](https://github.com/jasonross/NuwaGradle/blob/master/src/main/groovy/cn/jiajixin/nuwa/NuwaPlugin.groovy)，由于代码很多，就只跟大家讲两个关键的点的实现以及目的，具体的内容可以直接查看源码。

```java
//获得所有输入文件,即preDex的所有jar文件
Set<File> inputFiles = preDexTask.inputs.files.files
inputFiles.each { inputFile ->
    def path = inputFile.absolutePath
    //如果不是support包或者引入的依赖库,则开始生成代码修改部分的hotfix包
    if (HotFixProcessors.shouldProcessPreDexJar(path)) {
        HotFixProcessors.processJar(classHashFile, inputFile, patchDir, classHashMap, includePackage, excludeClass)
    }
}
```

其中`HotFixProcessors.processJar()`是脚本的第一个作用，就是找出哪些类是发生了改变，应该生成对应的补丁。
循环遍历工程中的全部类,声明忽略的直接跳过.对每个类计算hash,并写入到hashFile文件中.通过比较hashFile文件与原先host工程的hashFile(即这里的classHashMap参数),得到所有修改过的类生成这些类的class文件,以及所有修改过的class文件的集合jar文件。

```java
Set<File> inputFiles = dexTask.inputs.files.files
inputFiles.each { inputFile ->
    def path = inputFile.absolutePath
	if (path.endsWith(".class") && !path.contains("/R\$") && !path.endsWith("/R.class") && !path.endsWith("/BuildConfig.class")) {
        if (HotFixSetUtils.isIncluded(path, includePackage)) {
            if (!HotFixSetUtils.isExcluded(path, excludeClass)) {
                def bytes = HotFixProcessors.processClass(inputFile)
                path = path.split("${dirName}/")[1]
                def hash = DigestUtils.shaHex(bytes)
                classHashFile.append(HotFixMapUtils.format(path, hash))

                if (HotFixMapUtils.notSame(classHashMap, path, hash)) {
                    HotFixFileUtils.copyBytesToFile(inputFile.bytes, HotFixFileUtils.touchFile(patchDir, path))
                }
            }
        }
    }
}
```

这一段是脚本的第二个作用，也就是上文字节码操作的目的，为了防止类被虚拟机打上`CLASS_ISPREVERIFIED`，所以需要执行字节码写入。其中`HotFixProcessors.processClass()`就是实际写入字节码的代码。

## 好像差个结尾

同样的方案，除了 nuwa 还有一个开源的实现，**[HotFix](https://github.com/dodola/HotFix)** 两者是差不多的，所以看一个就可以了。

### **看到有很多朋友问，如果混淆后代码怎么办？**

在 Gradle 插件编译过程中，有一个`proguardTask`，看名字应该就知道他是负责 proguard 任务的，我们可以保存首次执行时的混淆规则(也就是线上出BUG的包)，这个混淆规则保存在工程目录中的一个`mapping`文件，当我们需要执行热修复补丁生成的时候，将线上包的`mapping`规则拿出来应用到本次编译中，就可以生成混淆后的类跟线上混淆后的类相同的类名的补丁了。具体实现可以看 nuwa 项目的`applymapping()`方法。
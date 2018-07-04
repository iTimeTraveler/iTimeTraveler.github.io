---
title: 【Android】动态链接库so的加载原理
layout: post
date: 2018-07-03 11:51:55
comments: true
tags: 
    - Android
categories: [Android]
keywords: so
description: 
photos:
    - /gallery/android_common/Android3.png
---



## 前言

最近开发的组件时常出现了运行时加载so库失败问题，每天都会有`java.lang.UnsatisfiedLinkError`的错误爆出来，而且线上总是偶然复现，很疑惑。所以本文将从AOSP源码简单跟踪Android中的动态链接库so的加载原理，试图找出一丝线索。

## 加载入口

首先我们知道在Android(Java)中加载一个动态链接库非常简单。就是我们日常调用的 `System.load(Sring filename)` 或者`System.loadLibrary(String libname)`开始。 看过[《理解JNI技术》](http://47.98.205.211/2017/05/17/jni/)的应该知道上述代码执行过程中会调用native层的`JNI_OnLoad()`方法，一般用于动态注册native方法。

## # System.loadLibrary

[System.java]

```java
public static void loadLibrary(String libname) {
    Runtime.getRuntime().loadLibrary0(VMStack.getCallingClassLoader(), libname);
}
```

此处`VMStack.getCallingClassLoader()`拿到的是调用者的ClassLoader，一般情况下是**PathClassLoader**。我们进入Runtime类的`loadLibrary0()`方法看看。

[Runtime.java]

```java
synchronized void loadLibrary0(ClassLoader loader, String libname) {
    if (libname.indexOf((int)File.separatorChar) != -1) {
        throw new UnsatisfiedLinkError("Directory separator should not appear in library name: " + libname);
    }
    String libraryName = libname;
    // 1. 如果classloder存在，通过loader.findLibrary()查找到so路径
    if (loader != null) {
        String filename = loader.findLibrary(libraryName);
        if (filename == null) {
            // It's not necessarily true that the ClassLoader used
            // System.mapLibraryName, but the default setup does, and it's
            // misleading to say we didn't find "libMyLibrary.so" when we
            // actually searched for "liblibMyLibrary.so.so".
            throw new UnsatisfiedLinkError(loader + " couldn't find \"" +
                                           System.mapLibraryName(libraryName) + "\"");
        }
        String error = doLoad(filename, loader);
        if (error != null) {
            throw new UnsatisfiedLinkError(error);
        }
        return;
    }

    // 2. 如果classloder不存在，通过loader.findLibrary()查找到so路径
    String filename = System.mapLibraryName(libraryName);
    List<String> candidates = new ArrayList<String>();
    String lastError = null;
    for (String directory : getLibPaths()) {	// getLibPaths()代码在最下方
        String candidate = directory + filename;
        candidates.add(candidate);

        if (IoUtils.canOpenReadOnly(candidate)) {
            String error = doLoad(candidate, loader);
            if (error == null) {
                return; // We successfully loaded the library. Job done.
            }
            lastError = error;
        }
    }

    // 3. 都没找到，抛出 UnsatisfiedLinkError 异常
    if (lastError != null) {
        throw new UnsatisfiedLinkError(lastError);
    }
    throw new UnsatisfiedLinkError("Library " + libraryName + " not found; tried " + candidates);
}
```

<!-- more -->

这里根据ClassLoader是否存在分了两种情况：

- 当ClasssLoader存在的时候通过loader的 `findLibrary()`查看目标库所在路径；
- 当ClassLoader不存在的时候通过`getLibPaths()`查找加载路径。
- 最终他们都会调用`doLoad()`加载动态库。

我们下面分别看下这三个步骤。

### ClasssLoader存在时

前面知道了这个ClassLoader其实是PathClassLoader，但是`findLibrary`位于PathClassLoader的父类**BaseDexClassLoader**中：

[BaseDexClassLoader.java]

```java
public String findLibrary(String name) {
    return pathList.findLibrary(name);
}
```

其中`pathList`的类型为DexPathList，我们看看它的`findLibrary()`方法：

[DexPathList.java]

```java
public String findLibrary(String libraryName) {
    String fileName = System.mapLibraryName(libraryName);

    for (NativeLibraryElement element : nativeLibraryPathElements) {
        String path = element.findNativeLibrary(fileName);

        if (path != null) {
            return path;
        }
    }

    return null;
}
```

可以看到，就是在`nativeLibraryPathElements` 变量中遍历查找对应的so文件。那么这个`nativeLibraryPathElements`变量从何而来呢？可以很快查到是在DexPathList的构造方法中赋值的，它的构造方法如下：

[DexPathList.java]

```java
public DexPathList(ClassLoader definingContext, String dexPath,
        String librarySearchPath, File optimizedDirectory) {

    if (definingContext == null) {
        throw new NullPointerException("definingContext == null");
    }

    if (dexPath == null) {
        throw new NullPointerException("dexPath == null");
    }

    if (optimizedDirectory != null) {
        if (!optimizedDirectory.exists())  {
            throw new IllegalArgumentException(
                    "optimizedDirectory doesn't exist: "
                    + optimizedDirectory);
        }

        if (!(optimizedDirectory.canRead()
                        && optimizedDirectory.canWrite())) {
            throw new IllegalArgumentException(
                    "optimizedDirectory not readable/writable: "
                    + optimizedDirectory);
        }
    }

    this.definingContext = definingContext;

    ArrayList<IOException> suppressedExceptions = new ArrayList<IOException>();
    // save dexPath for BaseDexClassLoader
    this.dexElements = makeDexElements(splitDexPath(dexPath), optimizedDirectory,
                                       suppressedExceptions, definingContext);

    // Native libraries may exist in both the system and
    // application library paths, and we use this search order:
    //
    //   1. This class loader's library path for application libraries (librarySearchPath):
    //   1.1. Native library directories
    //   1.2. Path to libraries in apk-files
    //   2. The VM's library path from the system property for system libraries
    //      also known as java.library.path
    //
    // This order was reversed prior to Gingerbread; see http://b/2933456.
    this.nativeLibraryDirectories = splitPaths(librarySearchPath, false);
    this.systemNativeLibraryDirectories =
            splitPaths(System.getProperty("java.library.path"), true);
    List<File> allNativeLibraryDirectories = new ArrayList<>(nativeLibraryDirectories);
    allNativeLibraryDirectories.addAll(systemNativeLibraryDirectories);

    // 这里赋值
    this.nativeLibraryPathElements = makePathElements(allNativeLibraryDirectories);

    if (suppressedExceptions.size() > 0) {
        this.dexElementsSuppressedExceptions =
            suppressedExceptions.toArray(new IOException[suppressedExceptions.size()]);
    } else {
        dexElementsSuppressedExceptions = null;
    }
}
```

这里`nativeLibraryPathElements`收集了apk的so目录，一般位于：`/data/app/${package-name}/lib/arm/` 还有系统的so目录：System.getProperty(“java.library.path”)，可以打印看一下它的值：`/vendor/lib:/system/lib`，其实就是前后两个目录，事实上64位系统是`/vendor/lib64:/system/lib64`。 最终查找so文件的时候就会在这三个路径中查找，优先查找apk目录。

可以看到，PathClassLoader中传入了apk的so目录，然后我们来看没有ClassLoader的情况。

### ClassLoader不存在

当ClassLoader不存在时，通过`getLibPaths()`查找加载路径。

[Runtime.java]

```java
// 返回mLibPaths
private String[] getLibPaths() {
    if (mLibPaths == null) {
        synchronized(this) {
            if (mLibPaths == null) {
                mLibPaths = initLibPaths();
            }
        }
    }
    return mLibPaths;
}

// 其实就是环境变量 java.library.path 中的路径
private static String[] initLibPaths() {
    String javaLibraryPath = System.getProperty("java.library.path");
    if (javaLibraryPath == null) {
        return EmptyArray.STRING;
    }
    String[] paths = javaLibraryPath.split(":");
    // Add a '/' to the end of each directory so we don't have to do it every time.
    for (int i = 0; i < paths.length; ++i) {
        if (!paths[i].endsWith("/")) {
            paths[i] += "/";
        }
    }
    return paths;
}
```

可以看到其实很简单，返回的结果就是拆分环境变量 java.library.path 中的路径。

也就是说，ClassLoader为空时使用系统目录，否则使用ClassLoader提供的目录，ClassLoader提供的目录中包括apk目录和系统目录。在这两步各自得到路径之后，最后我们来看看so文件是如何加载的。

### # doLoad()

[Runtime.java]

```java
private String doLoad(String name, ClassLoader loader) {
    // Android apps are forked from the zygote, so they can't have a custom LD_LIBRARY_PATH,
    // which means that by default an app's shared library directory isn't on LD_LIBRARY_PATH.

    // The PathClassLoader set up by frameworks/base knows the appropriate path, so we can load
    // libraries with no dependencies just fine, but an app that has multiple libraries that
    // depend on each other needed to load them in most-dependent-first order.

    // We added API to Android's dynamic linker so we can update the library path used for
    // the currently-running process. We pull the desired path out of the ClassLoader here
    // and pass it to nativeLoad so that it can call the private dynamic linker API.

    // We didn't just change frameworks/base to update the LD_LIBRARY_PATH once at the
    // beginning because multiple apks can run in the same process and third party code can
    // use its own BaseDexClassLoader.

    // We didn't just add a dlopen_with_custom_LD_LIBRARY_PATH call because we wanted any
    // dlopen(3) calls made from a .so's JNI_OnLoad to work too.

    // So, find out what the native library search path is for the ClassLoader in question...
    String librarySearchPath = null;
    if (loader != null && loader instanceof BaseDexClassLoader) {
        BaseDexClassLoader dexClassLoader = (BaseDexClassLoader) loader;
        librarySearchPath = dexClassLoader.getLdLibraryPath();
    }
    // nativeLoad should be synchronized so there's only one LD_LIBRARY_PATH in use regardless
    // of how many ClassLoaders are in the system, but dalvik doesn't support synchronized
    // internal natives.
    synchronized (this) {
        return nativeLoad(name, loader, librarySearchPath);
    }
}


private static native String nativeLoad(String filename, ClassLoader loader,
                                            String librarySearchPath);
```

这里最后调用了native方法`nativeLoad()`的代码：

[libcore/ojluni/src/main/native/Runtime.c]

```c
JNIEXPORT jstring JNICALL
Runtime_nativeLoad(JNIEnv* env, jclass ignored, jstring javaFilename,
                   jobject javaLoader, jstring javaLibrarySearchPath)
{
    return JVM_NativeLoad(env, javaFilename, javaLoader, javaLibrarySearchPath);
}
```

继续跟进`JVM_NativeLoad()`方法：

[art/runtime/openjdkjvm/OpenjdkJvm.cc]

```c
JNIEXPORT jstring JVM_NativeLoad(JNIEnv* env,
                                 jstring javaFilename,
                                 jobject javaLoader,
                                 jstring javaLibrarySearchPath) {
  ScopedUtfChars filename(env, javaFilename);
  if (filename.c_str() == NULL) {
    return NULL;
  }

  std::string error_msg;
  {
    art::JavaVMExt* vm = art::Runtime::Current()->GetJavaVM();
    // 实际加载
    bool success = vm->LoadNativeLibrary(env,
                                         filename.c_str(),
                                         javaLoader,
                                         javaLibrarySearchPath,
                                         &error_msg);
    if (success) {
      return nullptr;
    }
  }

  // Don't let a pending exception from JNI_OnLoad cause a CheckJNI issue with NewStringUTF.
  env->ExceptionClear();
  return env->NewStringUTF(error_msg.c_str());
}
```

接着通过jvm的`LoadNativeLibary()`执行实际工作。具体实现在`java_vm_ext.cc`中：

[art/runtime/java_vm_ext.cc]

```c
bool JavaVMExt::LoadNativeLibrary(JNIEnv* env,
                                  const std::string& path,
                                  jobject class_loader,
                                  jstring library_path,
                                  std::string* error_msg) {
  error_msg->clear();

  // See if we've already loaded this library.  If we have, and the class loader
  // matches, return successfully without doing anything.
  // TODO: for better results we should canonicalize the pathname (or even compare
  // inodes). This implementation is fine if everybody is using System.loadLibrary.
  SharedLibrary* library;
  Thread* self = Thread::Current();
  {
    // TODO: move the locking (and more of this logic) into Libraries.
    MutexLock mu(self, *Locks::jni_libraries_lock_);
    // 1. 判断是否已经加载过这个library
    library = libraries_->Get(path);
  }
  void* class_loader_allocator = nullptr;
  {
    ScopedObjectAccess soa(env);
    // As the incoming class loader is reachable/alive during the call of this function,
    // it's okay to decode it without worrying about unexpectedly marking it alive.
    ObjPtr<mirror::ClassLoader> loader = soa.Decode<mirror::ClassLoader>(class_loader);

    ClassLinker* class_linker = Runtime::Current()->GetClassLinker();
    if (class_linker->IsBootClassLoader(soa, loader.Ptr())) {
      loader = nullptr;
      class_loader = nullptr;
    }

    class_loader_allocator = class_linker->GetAllocatorForClassLoader(loader.Ptr());
    CHECK(class_loader_allocator != nullptr);
  }
  if (library != nullptr) {
    // Use the allocator pointers for class loader equality to avoid unnecessary weak root decode.
    if (library->GetClassLoaderAllocator() != class_loader_allocator) {
      // The library will be associated with class_loader. The JNI
      // spec says we can't load the same library into more than one
      // class loader.
      StringAppendF(error_msg, "Shared library \"%s\" already opened by "
          "ClassLoader %p; can't open in ClassLoader %p",
          path.c_str(), library->GetClassLoader(), class_loader);
      LOG(WARNING) << error_msg;
      return false;
    }
    VLOG(jni) << "[Shared library \"" << path << "\" already loaded in "
              << " ClassLoader " << class_loader << "]";
    if (!library->CheckOnLoadResult()) {
      StringAppendF(error_msg, "JNI_OnLoad failed on a previous attempt "
          "to load \"%s\"", path.c_str());
      return false;
    }
    return true;
  }

  // Open the shared library.  Because we're using a full path, the system
  // doesn't have to search through LD_LIBRARY_PATH.  (It may do so to
  // resolve this library's dependencies though.)

  // Failures here are expected when java.library.path has several entries
  // and we have to hunt for the lib.

  // Below we dlopen but there is no paired dlclose, this would be necessary if we supported
  // class unloading. Libraries will only be unloaded when the reference count (incremented by
  // dlopen) becomes zero from dlclose.

  Locks::mutator_lock_->AssertNotHeld(self);
  const char* path_str = path.empty() ? nullptr : path.c_str();
  bool needs_native_bridge = false;
  // 2. 加载so
  void* handle = android::OpenNativeLibrary(env,
                                            runtime_->GetTargetSdkVersion(),
                                            path_str,
                                            class_loader,
                                            library_path,
                                            &needs_native_bridge,
                                            error_msg);

  VLOG(jni) << "[Call to dlopen(\"" << path << "\", RTLD_NOW) returned " << handle << "]";

  // 3. 如果handle为空指针，说明上面OpenNativeLibrary失败了。
  if (handle == nullptr) {
    VLOG(jni) << "dlopen(\"" << path << "\", RTLD_NOW) failed: " << *error_msg;
    return false;
  }

  if (env->ExceptionCheck() == JNI_TRUE) {
    LOG(ERROR) << "Unexpected exception:";
    env->ExceptionDescribe();
    env->ExceptionClear();
  }
  // Create a new entry.
  // TODO: move the locking (and more of this logic) into Libraries.
  bool created_library = false;
  {
    // Create SharedLibrary ahead of taking the libraries lock to maintain lock ordering.
    std::unique_ptr<SharedLibrary> new_library(
        new SharedLibrary(env,
                          self,
                          path,
                          handle,
                          needs_native_bridge,
                          class_loader,
                          class_loader_allocator));

    MutexLock mu(self, *Locks::jni_libraries_lock_);
    library = libraries_->Get(path);
    if (library == nullptr) {  // We won race to get libraries_lock.
      library = new_library.release();
      // 4. 加载成功的library需要记录下来
      libraries_->Put(path, library);
      created_library = true;
    }
  }
  if (!created_library) {
    LOG(INFO) << "WOW: we lost a race to add shared library: "
        << "\"" << path << "\" ClassLoader=" << class_loader;
    return library->CheckOnLoadResult();
  }
  VLOG(jni) << "[Added shared library \"" << path << "\" for ClassLoader " << class_loader << "]";

  // 查找并调用执行 JNI_OnLoad 方法回调
  bool was_successful = false;
  void* sym = library->FindSymbol("JNI_OnLoad", nullptr);
  if (sym == nullptr) {
    VLOG(jni) << "[No JNI_OnLoad found in \"" << path << "\"]";
    was_successful = true;
  } else {
    // Call JNI_OnLoad.  We have to override the current class
    // loader, which will always be "null" since the stuff at the
    // top of the stack is around Runtime.loadLibrary().  (See
    // the comments in the JNI FindClass function.)
    ScopedLocalRef<jobject> old_class_loader(env, env->NewLocalRef(self->GetClassLoaderOverride()));
    self->SetClassLoaderOverride(class_loader);

    VLOG(jni) << "[Calling JNI_OnLoad in \"" << path << "\"]";
    typedef int (*JNI_OnLoadFn)(JavaVM*, void*);
    JNI_OnLoadFn jni_on_load = reinterpret_cast<JNI_OnLoadFn>(sym);
    int version = (*jni_on_load)(this, nullptr);

    if (runtime_->GetTargetSdkVersion() != 0 && runtime_->GetTargetSdkVersion() <= 21) {
      // Make sure that sigchain owns SIGSEGV.
      EnsureFrontOfChain(SIGSEGV);
    }

    self->SetClassLoaderOverride(old_class_loader.get());

    if (version == JNI_ERR) {
      StringAppendF(error_msg, "JNI_ERR returned from JNI_OnLoad in \"%s\"", path.c_str());
    } else if (JavaVMExt::IsBadJniVersion(version)) {
      StringAppendF(error_msg, "Bad JNI version returned from JNI_OnLoad in \"%s\": %d",
                    path.c_str(), version);
      // It's unwise to call dlclose() here, but we can mark it
      // as bad and ensure that future load attempts will fail.
      // We don't know how far JNI_OnLoad got, so there could
      // be some partially-initialized stuff accessible through
      // newly-registered native method calls.  We could try to
      // unregister them, but that doesn't seem worthwhile.
    } else {
      was_successful = true;
    }
    VLOG(jni) << "[Returned " << (was_successful ? "successfully" : "failure")
              << " from JNI_OnLoad in \"" << path << "\"]";
  }

  library->SetResult(was_successful);
  return was_successful;
}
```

LoadNativeLibrary方法开始的时候会去缓存查看是否已经加载过动态库，如果已经加载过会判断上次加载的ClassLoader和这次加载的ClassLoader是否一致，如果不一致则加载失败，如果一致则返回上次加载的结果，换句话说就是**不允许不同的ClassLoader加载同一个动态库**。为什么这么做我们这里不进行分析。 上面的整体操作步骤如下：

1. 判断缓存中是否已经加载过这个library，如果加载过就检查下ClassLoader，直接返回；
2. 调用`android::OpenNativeLibrary()`方法加载library；
3. 如果上一步的加载动作的返回值handle为空指针，说明上面OpenNativeLibrary失败了，返回；
4. 记录加载成功的library，然后查找并调用library中的` JNI_OnLoad`回调方法。

总之这个LoadNativeLibrary方法目的就是利用的是OpenNativeLibrary这个函数去加载动态链接库，然后执行其中的`JNI_OnLoad`接口（这个函数是jni库的首选入口，可以利用它完成一些初始化工作，或者动态注册JNI方法）。

[system/core/libnativeloader/native_loader.cpp]

```java
void* OpenNativeLibrary(JNIEnv* env,
                        int32_t target_sdk_version,
                        const char* path,
                        jobject class_loader,
                        jstring library_path,
                        bool* needs_native_bridge,
                        std::string* error_msg) {
#if defined(__ANDROID__)
  UNUSED(target_sdk_version);
  if (class_loader == nullptr) {
    *needs_native_bridge = false;
    return dlopen(path, RTLD_NOW);
  }

  std::lock_guard<std::mutex> guard(g_namespaces_mutex);
  NativeLoaderNamespace ns;

  if (!g_namespaces->FindNamespaceByClassLoader(env, class_loader, &ns)) {
    // This is the case where the classloader was not created by ApplicationLoaders
    // In this case we create an isolated not-shared namespace for it.
    if (!g_namespaces->Create(env,
                              target_sdk_version,
                              class_loader,
                              false /* is_shared */,
                              false /* is_for_vendor */,
                              library_path,
                              nullptr,
                              &ns,
                              error_msg)) {
      return nullptr;
    }
  }

  if (ns.is_android_namespace()) {
    android_dlextinfo extinfo;
    extinfo.flags = ANDROID_DLEXT_USE_NAMESPACE;
    extinfo.library_namespace = ns.get_android_ns();

    void* handle = android_dlopen_ext(path, RTLD_NOW, &extinfo);
    if (handle == nullptr) {
      *error_msg = dlerror();
    }
    *needs_native_bridge = false;
    return handle;
  } else {
    void* handle = NativeBridgeLoadLibraryExt(path, RTLD_NOW, ns.get_native_bridge_ns());
    if (handle == nullptr) {
      *error_msg = NativeBridgeGetError();
    }
    *needs_native_bridge = true;
    return handle;
  }
#else
  UNUSED(env, target_sdk_version, class_loader, library_path);
  *needs_native_bridge = false;
  void* handle = dlopen(path, RTLD_NOW);
  if (handle == nullptr) {
    if (NativeBridgeIsSupported(path)) {
      *needs_native_bridge = true;
      handle = NativeBridgeLoadLibrary(path, RTLD_NOW);
      if (handle == nullptr) {
        *error_msg = NativeBridgeGetError();
      }
    } else {
      *needs_native_bridge = false;
      *error_msg = dlerror();
    }
  }
  return handle;
#endif
}
```

先利用`FindNamespaceByClassLoader`查找当前的ClassLoader是否有相关的Namespace，如果没有直接跳转到`android_dlopen_ext`；如果有调用其Create方法创建一个Namespace。

`android_dlopen_ext`跟`dlopen`类似，第一个参数是要打开的动态库的名称，第二个参数RTLD_NOW，表示动态库中所有未定义的符号在`dlopen`返回前都会被解析。

接下来的实现，是调用find_libary来查找动态库，找到后，调用dlsym来查找加载的动态库中是否包含JNI_OnLoader入口函数。



## Linux 加载动态库的系统调用

Android是基于Linux系统的，那么在Linux系统下是如何加载动态链接库的呢？Linux环境下加载动态库主要包括如下函数，位于头文件#include <dlfcn.h>中：

```c
void *dlopen(const char *filename, int flag);  	//打开动态链接库
char *dlerror(void);  							//获取错误信息
void *dlsym(void *handle, const char *symbol);  //获取方法指针
int dlclose(void *handle); 						//关闭动态链接库  
```

大家感兴趣的可以进一步Google，这里就不再深入到系统调用了。

看完这篇文章我们明确了几点：

1. System.loadLibrary会优先查找apk中的so目录，再查找系统目录，系统目录包括：/vendor/lib(64)，/system/lib(64)
2. 不能使用不同的ClassLoader加载同一个动态库
3. System.loadLibrary加载过程中会调用目标库的`JNI_OnLoad`方法，我们可以在动态库中加一个`JNI_OnLoad`方法用于动态注册
4. 如果加了`JNI_OnLoad`方法，其的返回值为JNI_VERSION_1_2 ，JNI_VERSION_1_4， JNI_VERSION_1_6其一。我们一般使用JNI_VERSION_1_4即可
5. Android动态库的加载与Linux一致使用dlopen系列函数，通过动态库的句柄和函数名称来调用动态库的函数



## 参考资料

- [Android 动态链接库加载原理及 HotFix 方案介绍](https://cloud.tencent.com/developer/article/1071447)
- [深入理解 System.loadLibrary](https://pqpo.me/2017/05/31/system-loadlibrary/)
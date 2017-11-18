### 前言

Binder是Android进程间通信（IPC）的方式之一。

## Android中解决IPC的方法

上面也讲到，为了解决这些跨进程的问题，Android沿用了一些Linux的进程管理机制，使得进程之间能够进行交互，下面我将列出一些常见的IPC方式，需要指出的是本文主要讲解Binder机制，所以会注重讲解AIDL，其他方式请读者自行查阅相关资料。

| 名称              | 特点                                       | 使用场景                           |
| --------------- | ---------------------------------------- | ------------------------------ |
| Bundle          | 只能传输实现了Serializable或者Parcelable接口或者一些Android支持的特殊对象 | 适合用于四大组件之间的进程交互                |
| 文件共享            | 不能做到进程间的即时通信，并且不适合用于高并发的场景               | 适合用于SharedPreference以及IO操作     |
| ContentProvider | 可以访问较多的数据，支持一对多的高并发访问，因为ContentProvider已经自动做好了关于并发的机制 | 适合用于一对多的数据共享并且需要对数据进行频繁的CRUD操作 |
| Socket          | 通过网络传输字节流，支持一对多的实时通信，但是实现起来比较复杂          | 适合用于网络数据共享                     |
| Messenger       | 底层原理是AIDL，只是对其做了封装，但是不能很好的处理高并发的场景，并且传输的数据只能支持Bundle类型 | 低并发的一对多的即时通信                   |
| AIDL            | 功能强大，使用Binder机制(接下来会讲解),支持一对多的高并发实时通信，但是需要处理好线程同步 | 一对多并且有远程进程通信的场景                |

### Binder的基本使用



# Serializable 和Parcelable的对比

两种都是用于支持序列化、反序列化话操作，两者最大的区别在于存储媒介的不同，Serializable使用IO读写存储在硬盘上，而Parcelable是直接在内存中读写，很明显内存的读写速度通常大于IO读写，所以在Android中通常优先选择Parcelable。

android上应该尽量采用Parcelable，效率至上
编码上：
Serializable代码量少，写起来方便
Parcelable代码多一些
效率上：
Parcelable的速度比高十倍以上
serializable的迷人之处在于你只需要对某个类以及它的属性实现Serializable 接口即可。Serializable 接口是一种标识接口（marker interface），这意味着无需实现方法，Java便会对这个对象进行高效的序列化操作。
这种方法的缺点是使用了反射，序列化的过程较慢。这种机制会在序列化的时候创建许多的临时对象，容易触发垃圾回收。
Parcelable方式的实现原理是将一个完整的对象进行分解，而分解后的每一部分都是Intent所支持的数据类型，这样也就实现传递对象的功能了




### Binder



IRemoteService.aidl

```java
/*
 * This file is auto-generated.  DO NOT MODIFY.
 */
package com.cuc.myandroidtest;

public interface IRemoteService extends android.os.IInterface {
	/**
	 * Local-side IPC implementation stub class.
	 */
	public static abstract class Stub extends android.os.Binder implements com.cuc.myandroidtest.IRemoteService {
		private static final java.lang.String DESCRIPTOR = "com.cuc.myandroidtest.IRemoteService";
		
      	/**
		 * Construct the stub at attach it to the interface.
		 */
		public Stub() {
			this.attachInterface(this, DESCRIPTOR);
		}

		/**
		 * Cast an IBinder object into an com.cuc.myandroidtest.IRemoteService interface,
		 * generating a proxy if needed.
		 */
		public static com.cuc.myandroidtest.IRemoteService asInterface(android.os.IBinder obj) {
			if ((obj == null)) {
				return null;
			}
			android.os.IInterface iin = obj.queryLocalInterface(DESCRIPTOR);
			if (((iin != null) && (iin instanceof com.cuc.myandroidtest.IRemoteService))) {
				return ((com.cuc.myandroidtest.IRemoteService) iin);
			}
			return new com.cuc.myandroidtest.IRemoteService.Stub.Proxy(obj);
		}

		@Override
		public android.os.IBinder asBinder() {
			return this;
		}

		@Override
		public boolean onTransact(int code, android.os.Parcel data, android.os.Parcel reply, int flags) throws android.os.RemoteException {
			switch (code) {
				case INTERFACE_TRANSACTION: {
					reply.writeString(DESCRIPTOR);
					return true;
				}
				case TRANSACTION_getPid: {
					data.enforceInterface(DESCRIPTOR);
					int _result = this.getPid();
					reply.writeNoException();
					reply.writeInt(_result);
					return true;
				}
				case TRANSACTION_getMyData: {
					data.enforceInterface(DESCRIPTOR);
					com.cuc.myandroidtest.MyData _result = this.getMyData();
					reply.writeNoException();
					if ((_result != null)) {
						reply.writeInt(1);
						_result.writeToParcel(reply, android.os.Parcelable.PARCELABLE_WRITE_RETURN_VALUE);
					} else {
						reply.writeInt(0);
					}
					return true;
				}
				case TRANSACTION_registerCallback: {
					data.enforceInterface(DESCRIPTOR);
					com.cuc.myandroidtest.IServiceCallback _arg0;
					_arg0 = com.cuc.myandroidtest.IServiceCallback.Stub.asInterface(data.readStrongBinder());
					this.registerCallback(_arg0);
					reply.writeNoException();
					return true;
				}
				case TRANSACTION_unregisterCallback: {
					data.enforceInterface(DESCRIPTOR);
					this.unregisterCallback();
					reply.writeNoException();
					return true;
				}
			}
			return super.onTransact(code, data, reply, flags);
		}

		private static class Proxy implements com.cuc.myandroidtest.IRemoteService {
			private android.os.IBinder mRemote;

			Proxy(android.os.IBinder remote) {
				mRemote = remote;
			}

			@Override
			public android.os.IBinder asBinder() {
				return mRemote;
			}

			public java.lang.String getInterfaceDescriptor() {
				return DESCRIPTOR;
			}

			@Override
			public int getPid() throws android.os.RemoteException {
				android.os.Parcel _data = android.os.Parcel.obtain();
				android.os.Parcel _reply = android.os.Parcel.obtain();
				int _result;
				try {
					_data.writeInterfaceToken(DESCRIPTOR);
					mRemote.transact(Stub.TRANSACTION_getPid, _data, _reply, 0);
					_reply.readException();
					_result = _reply.readInt();
				} finally {
					_reply.recycle();
					_data.recycle();
				}
				return _result;
			}

			@Override
			public com.cuc.myandroidtest.MyData getMyData() throws android.os.RemoteException {
				android.os.Parcel _data = android.os.Parcel.obtain();
				android.os.Parcel _reply = android.os.Parcel.obtain();
				com.cuc.myandroidtest.MyData _result;
				try {
					_data.writeInterfaceToken(DESCRIPTOR);
					mRemote.transact(Stub.TRANSACTION_getMyData, _data, _reply, 0);
					_reply.readException();
					if ((0 != _reply.readInt())) {
						_result = com.cuc.myandroidtest.MyData.CREATOR.createFromParcel(_reply);
					} else {
						_result = null;
					}
				} finally {
					_reply.recycle();
					_data.recycle();
				}
				return _result;
			}

			@Override
			public void registerCallback(com.cuc.myandroidtest.IServiceCallback callback) throws android.os.RemoteException {
				android.os.Parcel _data = android.os.Parcel.obtain();
				android.os.Parcel _reply = android.os.Parcel.obtain();
				try {
					_data.writeInterfaceToken(DESCRIPTOR);
					_data.writeStrongBinder((((callback != null)) ? (callback.asBinder()) : (null)));
					mRemote.transact(Stub.TRANSACTION_registerCallback, _data, _reply, 0);
					_reply.readException();
				} finally {
					_reply.recycle();
					_data.recycle();
				}
			}

			@Override
			public void unregisterCallback() throws android.os.RemoteException {
				android.os.Parcel _data = android.os.Parcel.obtain();
				android.os.Parcel _reply = android.os.Parcel.obtain();
				try {
					_data.writeInterfaceToken(DESCRIPTOR);
					mRemote.transact(Stub.TRANSACTION_unregisterCallback, _data, _reply, 0);
					_reply.readException();
				} finally {
					_reply.recycle();
					_data.recycle();
				}
			}
		}

		static final int TRANSACTION_getPid = (android.os.IBinder.FIRST_CALL_TRANSACTION + 0);
		static final int TRANSACTION_getMyData = (android.os.IBinder.FIRST_CALL_TRANSACTION + 1);
		static final int TRANSACTION_registerCallback = (android.os.IBinder.FIRST_CALL_TRANSACTION + 2);
		static final int TRANSACTION_unregisterCallback = (android.os.IBinder.FIRST_CALL_TRANSACTION + 3);
	}

	public int getPid() throws android.os.RemoteException;

	public com.cuc.myandroidtest.MyData getMyData() throws android.os.RemoteException;

	public void registerCallback(com.cuc.myandroidtest.IServiceCallback callback) throws android.os.RemoteException;

	public void unregisterCallback() throws android.os.RemoteException;
}

```





```java
/*
 * This file is auto-generated.  DO NOT MODIFY.
 */
package com.cuc.myandroidtest;

public interface IServiceCallback extends android.os.IInterface {
	/**
	 * Local-side IPC implementation stub class.
	 */
	public static abstract class Stub extends android.os.Binder implements com.cuc.myandroidtest.IServiceCallback {
		private static final java.lang.String DESCRIPTOR = "com.cuc.myandroidtest.IServiceCallback";

		/**
		 * Construct the stub at attach it to the interface.
		 */
		public Stub() {
			this.attachInterface(this, DESCRIPTOR);
		}

		/**
		 * Cast an IBinder object into an com.cuc.myandroidtest.IServiceCallback interface,
		 * generating a proxy if needed.
		 */
		public static com.cuc.myandroidtest.IServiceCallback asInterface(android.os.IBinder obj) {
			if ((obj == null)) {
				return null;
			}
			android.os.IInterface iin = obj.queryLocalInterface(DESCRIPTOR);
			if (((iin != null) && (iin instanceof com.cuc.myandroidtest.IServiceCallback))) {
				return ((com.cuc.myandroidtest.IServiceCallback) iin);
			}
			return new com.cuc.myandroidtest.IServiceCallback.Stub.Proxy(obj);
		}

		@Override
		public android.os.IBinder asBinder() {
			return this;
		}

		@Override
		public boolean onTransact(int code, android.os.Parcel data, android.os.Parcel reply, int flags) throws android.os.RemoteException {
			switch (code) {
				case INTERFACE_TRANSACTION: {
					reply.writeString(DESCRIPTOR);
					return true;
				}
				case TRANSACTION_onDownloadProgress: {
					data.enforceInterface(DESCRIPTOR);
					double _arg0;
					_arg0 = data.readDouble();
					this.onDownloadProgress(_arg0);
					reply.writeNoException();
					return true;
				}
				case TRANSACTION_onDownloadCompleted: {
					data.enforceInterface(DESCRIPTOR);
					this.onDownloadCompleted();
					reply.writeNoException();
					return true;
				}
			}
			return super.onTransact(code, data, reply, flags);
		}

		private static class Proxy implements com.cuc.myandroidtest.IServiceCallback {
			private android.os.IBinder mRemote;

			Proxy(android.os.IBinder remote) {
				mRemote = remote;
			}

			@Override
			public android.os.IBinder asBinder() {
				return mRemote;
			}

			public java.lang.String getInterfaceDescriptor() {
				return DESCRIPTOR;
			}

			@Override
			public void onDownloadProgress(double progress) throws android.os.RemoteException {
				android.os.Parcel _data = android.os.Parcel.obtain();
				android.os.Parcel _reply = android.os.Parcel.obtain();
				try {
					_data.writeInterfaceToken(DESCRIPTOR);
					_data.writeDouble(progress);
					mRemote.transact(Stub.TRANSACTION_onDownloadProgress, _data, _reply, 0);
					_reply.readException();
				} finally {
					_reply.recycle();
					_data.recycle();
				}
			}

			@Override
			public void onDownloadCompleted() throws android.os.RemoteException {
				android.os.Parcel _data = android.os.Parcel.obtain();
				android.os.Parcel _reply = android.os.Parcel.obtain();
				try {
					_data.writeInterfaceToken(DESCRIPTOR);
					mRemote.transact(Stub.TRANSACTION_onDownloadCompleted, _data, _reply, 0);
					_reply.readException();
				} finally {
					_reply.recycle();
					_data.recycle();
				}
			}
		}

		static final int TRANSACTION_onDownloadProgress = (android.os.IBinder.FIRST_CALL_TRANSACTION + 0);
		static final int TRANSACTION_onDownloadCompleted = (android.os.IBinder.FIRST_CALL_TRANSACTION + 1);
	}

	public void onDownloadProgress(double progress) throws android.os.RemoteException;

	public void onDownloadCompleted() throws android.os.RemoteException;
}
```











### 参考资料

- [Android 接口定义语言 (AIDL)](https://developer.android.com/guide/components/aidl.html) - Google Developer文档


- [Android Binder机制原理（史上最强理解，没有之一）](http://blog.csdn.net/boyupeng/article/details/47011383)
- [Android Bander设计与实现 - 设计篇](http://blog.csdn.net/universus/article/details/6211589) - [universus](http://blog.csdn.net/universus)
- [为什么 Android 要采用 Binder 作为 IPC 机制？](https://www.zhihu.com/question/39440766)
- [Binder系列—开篇](http://gityuan.com/2015/10/31/binder-prepare/) - Gityuan
- [本地Binder：在Activity和Service之间使用本地Binder和回调接口进行通信](http://blog.csdn.net/liuyi1207164339/article/details/51683544)
- [Binder 源码分析](https://github.com/xdtianyu/SourceAnalysis/blob/master/Binder%E6%BA%90%E7%A0%81%E5%88%86%E6%9E%90.md)



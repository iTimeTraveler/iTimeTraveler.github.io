### 前言

Binder是Android进程间通信（IPC）的方式之一。



### Binder的基本使用



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



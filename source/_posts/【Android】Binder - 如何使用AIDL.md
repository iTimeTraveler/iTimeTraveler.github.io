---
title: 【Android】Binder - 如何使用AIDL
layout: post
date: 2017-08-02 22:20:55
comments: true
tags: 
    - Android
categories: 
    - Android
keywords: Binder 
description: 
photos:
    - /gallery/android-binder/522669-03d807d111900c32.png
---

### 一、跨进程通信

为了演示方便，将Service与Activity处于不同的进程，可以在AndroidManifest.xml中，把service配置成`android:process=":remote"` ，也可以命名成其他的。

#### AIDL

（1） IRemoteService.aidl：定义Server端提供的服务接口

```java
// IRemoteService.aidl
package com.cuc.myandroidtest;

import com.cuc.myandroidtest.MyData;
import com.cuc.myandroidtest.IServiceCallback;

interface IRemoteService {
    int getPid();			//获取服务端进程ID
    MyData getMyData();		//从服务端获取数据

    void registerCallback(IServiceCallback callback);		//注册服务端回调
    void unregisterCallback();
}
```

（2） IServiceCallBack.aidl：定义服务端回调接口，把Service的下载进度通知给客户端ClientActivity

```java
// IServiceCallBack.aidl
package com.cuc.myandroidtest;

interface IServiceCallback {
    void onDownloadProgress(double progress);   //服务端下载进度通知
    void onDownloadCompleted();                 //下载完成通知
}
```

（3） MyData.aidl：定义传输的Parcel数据

```java
// MyData.aidl
package com.cuc.myandroidtest;

parcelable MyData;
```

<!-- more -->

#### Parcel数据

```java
public class MyData implements Parcelable{
	int data1;
	int data2;
	String key;

	public MyData(){}

	protected MyData(Parcel in) {
		data1 = in.readInt();
		data2 = in.readInt();
		key = in.readString();
	}

	public static final Creator<MyData> CREATOR = new Creator<MyData>() {
		@Override
		public MyData createFromParcel(Parcel in) {
			return new MyData(in);
		}

		@Override
		public MyData[] newArray(int size) {
			return new MyData[size];
		}
	};

	@Override
	public int describeContents() {
		return 0;
	}

      /** 将数据写入到Parcel **/
	@Override
	public void writeToParcel(Parcel dest, int flags) {
		dest.writeInt(data1);
		dest.writeInt(data2);
		dest.writeString(key);
	}


	public int getData1() {
		return data1;
	}

	public void setData1(int data1) {
		this.data1 = data1;
	}

	public int getData2() {
		return data2;
	}

	public void setData2(int data2) {
		this.data2 = data2;
	}

	public String getKey() {
		return key;
	}

	public void setKey(String key) {
		this.key = key;
	}
}
```

#### Server端

```java
public class RemoteService extends Service {
	private static final String TAG = "BinderSimple";

	int mDownloadCount = 0;
	MyData mMyData;
	IServiceCallback mCallback;    //用来通知客户端的回调
	ScheduledExecutorService mThreadPool;    //下载线程

	@Override
	public void onCreate() {
		super.onCreate();
		Log.i(TAG, "[RemoteService] onCreate");

		mMyData = new MyData();
		mMyData.setData1(10);
		mMyData.setData2(20);
		mMyData.setKey("在那遥远的地方");
	}

	@Override
	public IBinder onBind(Intent intent) {
		Log.i(TAG,"[RemoteService] onBind");

		//开始下载
		startDownloadThread();
		return mBinder;
	}

	@Override
	public boolean onUnbind(Intent intent) {
		Log.i(TAG, "[RemoteService] onUnbind");
		try {
			mBinder.unregisterCallback();
		} catch (RemoteException e) {
			e.printStackTrace();
		}
		return super.onUnbind(intent);
	}

	@Override
	public void onDestroy() {
		Log.i(TAG, "[RemoteService] onDestroy");
		super.onDestroy();
	}

	/**
	 * 实现接口IRemoteService.aidl中定义的方法
	 */
	private final IRemoteService.Stub mBinder = new IRemoteService.Stub() {

		@Override
		public int getPid() throws RemoteException {
			Log.i(TAG,"[RemoteService] getPid() = " + android.os.Process.myPid());
			return android.os.Process.myPid();
		}

		@Override
		public MyData getMyData() throws RemoteException {
			Log.i(TAG,"[RemoteService] getMyData()  " + mMyData.toString());
			return mMyData;
		}

		@Override
		public void registerCallback(IServiceCallback callback) throws RemoteException {
			Log.i(TAG,"[RemoteService] registerCallback()  ");
			mCallback = callback;
		}

		@Override
		public void unregisterCallback() throws RemoteException {
			Log.i(TAG,"[RemoteService] unregisterCallback()  ");
			mCallback = null;
		}

		/**此处可用于权限拦截**/
		@Override
		public boolean onTransact(int code, Parcel data, Parcel reply, int flags) throws RemoteException {
			return super.onTransact(code, data, reply, flags);
		}
	};


	/**
	 * 模拟下载线程
	 */
	private void startDownloadThread(){
		Log.i(TAG,"[RemoteService] startDownloadThread()");
		
		//2秒后开始下载
		mThreadPool = Executors.newScheduledThreadPool(1);
		mThreadPool.scheduleAtFixedRate(new Runnable() {
			@Override
			public void run() {
				try {
					mDownloadCount++;
					if(mCallback != null){
						mCallback.onDownloadProgress((double) mDownloadCount / 100.0);
						if (mDownloadCount == 100) {
							mCallback.onDownloadCompleted();
							mThreadPool.shutdown();
						}
					}
				} catch (RemoteException e) {
					e.printStackTrace();
				}

			}
		}, 2000, 50, TimeUnit.MILLISECONDS);
	}
}
```



#### Client端

```java
public class ClientActivity extends AppCompatActivity {
	private static final String TAG = "BinderSimple";
	private IRemoteService mRemoteService;
	private TextView textView;
	private boolean mIsBound;

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		setContentView(R.layout.activity_client);

		textView = (TextView) findViewById(R.id.tv);
		Button btn0 = (Button) findViewById(R.id.btn_bind);
		Button btn1 = (Button) findViewById(R.id.btn_unbind);
		Button btn2 = (Button) findViewById(R.id.btn_kill);
		btn0.setOnClickListener(new View.OnClickListener() {
			@Override
			public void onClick(View v) {
				bindMyService();
			}
		});

		btn1.setOnClickListener(new View.OnClickListener() {
			@Override
			public void onClick(View v) {
				unBindMyService();
			}
		});

		btn2.setOnClickListener(new View.OnClickListener() {
			@Override
			public void onClick(View v) {
				killMyService();
			}
		});
	}

	private ServiceConnection mRemoteConnection = new ServiceConnection() {
		@Override
		public void onServiceConnected(ComponentName name, IBinder service) {
			//注意这里，把Server返回的Binder对象转换成了IRemoteService接口对象
			mRemoteService = IRemoteService.Stub.asInterface(service);

			try {
				mRemoteService.registerCallback(mServiceCallbackBinder);

				MyData myData = mRemoteService.getMyData();
				String pidInfo = " servicePid = "+ mRemoteService.getPid() +
						"\n myPid = " + android.os.Process.myPid() +
						"\n data1 = "+ myData.getData1() +
						"\n data2 = "+ myData.getData2() +
						"\n key = "+ myData.getKey();

				Log.i(TAG, "[ClientActivity] onServiceConnected\n" + pidInfo);
				textView.setText(pidInfo);
				Toast.makeText(ClientActivity.this, "remoteService 连接成功", Toast.LENGTH_SHORT).show();
			} catch (RemoteException e) {
				e.printStackTrace();
			}
		}

		@Override
		public void onServiceDisconnected(ComponentName name) {
			Log.i(TAG, "[ClientActivity] onServiceDisconnected");
			mRemoteService = null;
			Toast.makeText(ClientActivity.this, "remoteService 断开连接", Toast.LENGTH_SHORT).show();
		}
	};


	//服务回调
	private IServiceCallback.Stub mServiceCallbackBinder = new IServiceCallback.Stub(){

		@Override
		public void onDownloadProgress(final double progress) throws RemoteException {
			Handler handler = new Handler(Looper.getMainLooper());
			handler.post(new Runnable() {
				@Override
				public void run() {
					textView.setText("下载进度:" + progress);
				}
			});
		}

		@Override
		public void onDownloadCompleted() throws RemoteException {
			Log.i(TAG, "[ClientActivity] mServiceCallbackBinder -> onDownloadCompleted");
			Handler handler = new Handler(Looper.getMainLooper());
			handler.post(new Runnable() {
				@Override
				public void run() {
					textView.setText("下载完成");
				}
			});
		}
	};


	/**
	 * 绑定远程服务
	 */
	private void bindMyService(){
		Log.i(TAG, "[ClientActivity] bindMyService");
		Intent intent = new Intent(ClientActivity.this, RemoteService.class);
		intent.setAction(IRemoteService.class.getName());
		bindService(intent, mRemoteConnection, Context.BIND_AUTO_CREATE);

		mIsBound = true;
		textView.setText("bind success");
	}

	/**
	 * 解除绑定远程服务
	 */
	private void unBindMyService(){
		if(!mIsBound){
			return;
		}
		Log.i(TAG, "[ClientActivity] unBindMyService");
		unbindService(mRemoteConnection);

		mIsBound = false;
		textView.setText("unbind");
	}

	/**
	 * 杀死远程服务
	 */
	private void killMyService(){
		Log.i(TAG, "[ClientActivity] killMyService");
		try {
			android.os.Process.killProcess(mRemoteService.getPid());
			textView.setText("kill success");
		} catch (RemoteException e) {
			e.printStackTrace();
			Toast.makeText(ClientActivity.this, "kill failed", Toast.LENGTH_SHORT).show();
		}
	}
}
```



#### 运行

该工程会生成一个apk，安装到手机，打开apk，界面如下：

![](/gallery/android-binder/demoapk.gif)


界面上有三个按钮，分别是功能分别是：

- bindService（绑定Service）
- unbindService（解除绑定Service）
- killProcess（杀死Service进程）

从左往右，依次点击界面，可得：

![](/gallery/android-binder/bind-service-log.png)

![](/gallery/android-binder/unbind-service-log.png)

![](/gallery/android-binder/kill-process_log.png)


### 二、同一进程

如果Activity和Service位于同一进程内，也可以使用上面的方式。不过还有一种方法是下面这种。

AIDL文件、Parcel数据与上面均一致，下面仅列出不同的Server端和Client端的实现。

#### Server端

```java
public class LocalService extends Service {
	private static final String TAG = "BinderSimple";

  	//封装的服务端功能对象，供Client端bindService之后调用
	private LocalServerFunc mBinder = new LocalServerFunc();

	@Override
	public void onCreate() {
		super.onCreate();
		Log.i(TAG, "[LocalService] onCreate");
	}

	@Override
	public IBinder onBind(Intent intent) {
		Log.i(TAG,"[LocalService] onBind");

		//开启下载线程
		mBinder.startDownloadThread();
		return mBinder;
	}

	@Override
	public boolean onUnbind(Intent intent) {
		Log.i(TAG, "[LocalService] onUnbind");
		try {
			mBinder.unregisterCallback();
		} catch (RemoteException e) {
			e.printStackTrace();
		}
		return super.onUnbind(intent);
	}

	@Override
	public void onDestroy() {
		Log.i(TAG, "[LocalService] onDestroy");
		super.onDestroy();
	}
}
```

因为，Service被bind了之后，需要返回一个IBinder对象。所以需要继承自Binder封装一个IBinder对象供客户端调用。

```java
public class LocalServerFunc extends Binder implements IRemoteService {
	private static final String TAG = "BinderSimple";

	int mDownloadCount = 0;
	MyData mMyData;
	IServiceCallback mCallback;
	ScheduledExecutorService mThreadPool;

	public LocalServerFunc(){
		mMyData = new MyData();
		mMyData.setData1(66);
		mMyData.setData2(88);
		mMyData.setKey("就在眼前");
	}

	public void startDownloadThread(){
		Log.i(TAG,"[LocalServerFunc] startDownloadThread()");
		mThreadPool = Executors.newScheduledThreadPool(1);
		mThreadPool.scheduleAtFixedRate(new Runnable() {
			@Override
			public void run() {
				try {
					mDownloadCount++;
					if(mCallback != null){
						mCallback.onDownloadProgress((double) mDownloadCount / 100.0);
						if (mDownloadCount == 100) {
							mCallback.onDownloadCompleted();
							mThreadPool.shutdown();
						}
					}
				} catch (RemoteException e) {
					e.printStackTrace();
				}

			}
		}, 2000, 50, TimeUnit.MILLISECONDS);
	}

	@Override
	public int getPid() throws RemoteException {
		Log.i(TAG,"[LocalServerFunc] getPid()");
		return android.os.Process.myPid();
	}

	@Override
	public MyData getMyData() throws RemoteException {
		Log.i(TAG,"[LocalServerFunc] getMyData()");
		return mMyData;
	}

	@Override
	public void registerCallback(IServiceCallback callback) throws RemoteException {
		Log.i(TAG,"[LocalServerFunc] registerCallback()");
		mCallback = callback;
	}

	@Override
	public void unregisterCallback() throws RemoteException {
		Log.i(TAG,"[LocalServerFunc] unregisterCallback()");
		if(mThreadPool != null){
			mThreadPool.shutdown();
		}
		mCallback = null;
	}

	@Override
	public IBinder asBinder() {
		return null;
	}
}
```



#### Client端

```java
public class ClientActivity extends AppCompatActivity {
	private static final String TAG = "BinderSimple";
	private IRemoteService mLocalService;
	private TextView textView;
	private boolean mIsBound;

	@Override
	protected void onCreate(Bundle savedInstanceState) {
		super.onCreate(savedInstanceState);
		setContentView(R.layout.activity_client);

		textView = (TextView) findViewById(R.id.tv);
		Button btn0 = (Button) findViewById(R.id.btn_bind);
		Button btn1 = (Button) findViewById(R.id.btn_unbind);
		Button btn2 = (Button) findViewById(R.id.btn_kill);
		btn0.setOnClickListener(new View.OnClickListener() {
			@Override
			public void onClick(View v) {
				bindMyService();
			}
		});

		btn1.setOnClickListener(new View.OnClickListener() {
			@Override
			public void onClick(View v) {
				unBindMyService();
			}
		});

		btn2.setOnClickListener(new View.OnClickListener() {
			@Override
			public void onClick(View v) {
				killMyService();
			}
		});
	}

	private ServiceConnection mServiceConnection = new ServiceConnection() {
		@Override
		public void onServiceConnected(ComponentName name, IBinder service) {
			//注意这个Binder对象转换成IRemoteService接口方式的不同 
			mLocalService = (IRemoteService) service;

			try {
				mLocalService.registerCallback(mLocalServiceCallback);

				MyData myData = mLocalService.getMyData();
				String pidInfo = " servicePid = "+ mLocalService.getPid() +
						"\n myPid = " + android.os.Process.myPid() +
						"\n data1 = "+ myData.getData1() +
						"\n data2 = "+ myData.getData2() +
						"\n key = "+ myData.getKey();

				Log.i(TAG, "[ClientActivity] onServiceConnected\n" + pidInfo);
				textView.setText(pidInfo);
				Toast.makeText(ClientActivity.this, "localService 连接成功", Toast.LENGTH_SHORT).show();
			} catch (RemoteException e) {
				e.printStackTrace();
			}
		}

		@Override
		public void onServiceDisconnected(ComponentName name) {
			Log.i(TAG, "[ClientActivity] onServiceDisconnected");
			mLocalService = null;
			Toast.makeText(ClientActivity.this, "localService 断开连接", Toast.LENGTH_SHORT).show();
		}
	};


	//服务回调，注意这个对象的不同
	private IServiceCallback mLocalServiceCallback = new IServiceCallback() {
		@Override
		public void onDownloadProgress(final double progress) throws RemoteException {
			Handler handler = new Handler(Looper.getMainLooper());
			handler.post(new Runnable() {
				@Override
				public void run() {
					textView.setText("下载进度:" + progress);
				}
			});
		}

		@Override
		public void onDownloadCompleted() throws RemoteException {
			Log.i(TAG, "[ClientActivity] mServiceCallback -> onDownloadCompleted");

			Handler handler = new Handler(Looper.getMainLooper());
			handler.post(new Runnable() {
				@Override
				public void run() {
					textView.setText("下载完成");
				}
			});
		}

		@Override
		public IBinder asBinder() {
			return null;
		}
	};

	/**
	 * 绑定服务
	 */
	private void bindMyService(){
		Log.i(TAG, "[ClientActivity] bindMyService");
		Intent intent = new Intent(ClientActivity.this, LocalService.class);
		intent.setAction(IRemoteService.class.getName());
		bindService(intent, mServiceConnection, Context.BIND_AUTO_CREATE);

		mIsBound = true;
		textView.setText("bind success");
	}

	/**
	 * 解除绑定服务
	 */
	private void unBindMyService(){
		if(!mIsBound){
			return;
		}
		Log.i(TAG, "[ClientActivity] unBindMyService");
		unbindService(mServiceConnection);

		mIsBound = false;
		textView.setText("unbind");
	}

	/**
	 * 杀死服务
	 */
	private void killMyService(){
		Log.i(TAG, "[ClientActivity] killMyService");
		try {
			android.os.Process.killProcess(mLocalService.getPid());
			textView.setText("kill success");
		} catch (RemoteException e) {
			e.printStackTrace();
			Toast.makeText(ClientActivity.this, "kill failed", Toast.LENGTH_SHORT).show();
		}
	}
}
```

#### 运行

因为这个Acitivy和Sevice位于同一进程，所以当点击KILL按钮杀死Service进程时，Activity也会同时被杀掉，所以可以看到动画最后就退出了App。

![](/gallery/android-binder/ezgif-5-bba2b7e591.gif)

从左往右，依次点击三个按钮，可得：

![](/gallery/android-binder/bind-localservice.png)

![](/gallery/android-binder/unbind-localservice.png)

![](/gallery/android-binder/kill-localservice.png)

### 简单看AIDL的原理

`IRemoteService.aidl`文件和`IServiceCallback.aidl`文件生成的接口文件分别如下：

#### #IRemoteService.java

```java
/*
 * This file is auto-generated.  DO NOT MODIFY.
 */
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

#### #IServiceCallback.java

```java
/*
 * This file is auto-generated.  DO NOT MODIFY.
 */
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
           
            //下载进度
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

    //下载进度
	public void onDownloadCompleted() throws android.os.RemoteException;
}
```


### 参考资料

- [Android 接口定义语言 (AIDL)](https://developer.android.com/guide/components/aidl.html) - Google Developer文档
- [Binder系列9—如何使用AIDL](http://gityuan.com/2015/11/23/binder-aidl/)
- [Android跨进程bindService与callback](http://blog.csdn.net/saberviii/article/details/51470347)
- [在Activity和Service之间使用本地Binder和回调接口进行通信](http://blog.csdn.net/liuyi1207164339/article/details/51683544)
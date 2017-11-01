Binder系列9—如何使用AIDL



### 一、不同进程

为了演示方便，将Service与Activity处于不同的进程，可以在AndroidManifest.xml中，把service配置成`android:process=":remote"` ，也可以命名成其他的。

### AIDL

```java
// IRemoteService.aidl
package com.cuc.myandroidtest;

import com.cuc.myandroidtest.MyData;

interface IRemoteService {
    int getPid();
    MyData getMyData();
}
```



```java
// MyData.aidl
package com.cuc.myandroidtest;

parcelable MyData;
```







```java
public class RemoteService extends Service {
	private static final String TAG = "BinderSimple";

	MyData mMyData;

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
		return mBinder;
	}

	@Override
	public boolean onUnbind(Intent intent) {
		Log.i(TAG, "[RemoteService] onUnbind");
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
			Log.i(TAG,"[RemoteService] getPid()="+android.os.Process.myPid());
			return android.os.Process.myPid();
		}

		@Override
		public MyData getMyData() throws RemoteException {
			Log.i(TAG,"[RemoteService] getMyData()  "+ mMyData.toString());
			return mMyData;
		}

		/**此处可用于权限拦截**/
		@Override
		public boolean onTransact(int code, Parcel data, Parcel reply, int flags) throws RemoteException {
			return super.onTransact(code, data, reply, flags);
		}
	};
}
```





```java
public class MyData implements Parcelable{
	int data1;
	int data2;
	String key;

	public MyData(){
	}

	protected MyData(Parcel in) {
		data1 = in.readInt();
		data2 = in.readInt();
		key = in.readString();
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

	@Override
	public void writeToParcel(Parcel dest, int flags) {
		dest.writeInt(data1);
		dest.writeInt(data2);
		dest.writeString(key);
	}
}
```



### 二、同一进程



### 参考资料

- [Android 接口定义语言 (AIDL)](https://developer.android.com/guide/components/aidl.html) - Google Developer文档


- [Binder系列9—如何使用AIDL](http://gityuan.com/2015/11/23/binder-aidl/)
- [Android跨进程bindService与callback](http://blog.csdn.net/saberviii/article/details/51470347)
- [本地Binder：在Activity和Service之间使用本地Binder和回调接口进行通信](http://blog.csdn.net/liuyi1207164339/article/details/51683544)
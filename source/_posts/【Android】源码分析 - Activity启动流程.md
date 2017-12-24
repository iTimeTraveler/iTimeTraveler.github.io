---
title: 【Android】源码分析 - Activity启动流程
layout: post
date: 2017-12-18 22:20:55
comments: true
tags: 
    - Android
categories: 
    - Android
keywords: Activity启动流程
description: 
photos:
    - /gallery/android_common/flow.jpg
---



### 启动Activity的方式

Activity有2种启动的方式，一种是在Launcher界面点击应用的图标、另一种是在应用中通过Intent进行跳转。我们主要介绍与后者相关的启动流程。

```java
Intent intent = new Intent(this, TestActivity.class);
startActivity(intent);
```



### 从Activity入手

```java
@Override
public void startActivity(Intent intent) {
    this.startActivity(intent, null);
}

@Override
public void startActivity(Intent intent, @Nullable Bundle options) {
    if (options != null) {
        startActivityForResult(intent, -1, options);
    } else {
        // Note we want to go through this call for compatibility with
        // applications that may have overridden the method.
        startActivityForResult(intent, -1);
    }
}
```

<!-- more -->

我们看到最终都会进入`startActivityForResult()`方法。我们跟进去看看：

```java
public void startActivityForResult(Intent intent, int requestCode, @Nullable Bundle options) {
    if (mParent == null) {
        //转交给Instrumentation来startActivity
        Instrumentation.ActivityResult ar = mInstrumentation.execStartActivity(
                this, mMainThread.getApplicationThread(), mToken, this,
                intent, requestCode, options);
        if (ar != null) {
            mMainThread.sendActivityResult(
                mToken, mEmbeddedID, requestCode, ar.getResultCode(),
                ar.getResultData());
        }
        if (requestCode >= 0) {
            // If this start is requesting a result, we can avoid making
            // the activity visible until the result is received.  Setting
            // this code during onCreate(Bundle savedInstanceState) or onResume() will keep the
            // activity hidden during this time, to avoid flickering.
            // This can only be done when a result is requested because
            // that guarantees we will get information back when the
            // activity is finished, no matter what happens to it.
            mStartedActivity = true;
        }

        final View decor = mWindow != null ? mWindow.peekDecorView() : null;
        if (decor != null) {
            decor.cancelPendingInputEvents();
        }
        // TODO Consider clearing/flushing other event sources and events for child windows.
    } else {
        if (options != null) {
            mParent.startActivityFromChild(this, intent, requestCode, options);
        } else {
            // Note we want to go through this method for compatibility with
            // existing applications that may have overridden it.
            mParent.startActivityFromChild(this, intent, requestCode);
        }
    }
    if (options != null && !isTopOfTask()) {
        mActivityTransitionState.startExitOutTransition(this, options);
    }
}
```

继续进入`Instrumentation`类，看看`execStartActivity`方法：

```java
//Instrumentation类
public ActivityResult execStartActivity(
            Context who, IBinder contextThread, IBinder token, Activity target,
            Intent intent, int requestCode, Bundle options) {
    IApplicationThread whoThread = (IApplicationThread) contextThread;
    if (mActivityMonitors != null) {
        synchronized (mSync) {
            final int N = mActivityMonitors.size();
            for (int i=0; i<N; i++) {
                final ActivityMonitor am = mActivityMonitors.get(i);
                if (am.match(who, null, intent)) {
                    am.mHits++;
                    if (am.isBlocking()) {
                        return requestCode >= 0 ? am.getResult() : null;
                    }
                    break;
                }
            }
        }
    }
    try {
        intent.migrateExtraStreamToClipData();
        intent.prepareToLeaveProcess();
        //交给ActivityManagerNative来startActivity
        int result = ActivityManagerNative.getDefault()
            .startActivity(whoThread, who.getBasePackageName(), intent,
                    intent.resolveTypeIfNeeded(who.getContentResolver()),
                    token, target != null ? target.mEmbeddedID : null,
                    requestCode, 0, null, options);
        //检查启动Activity的结果
        checkStartActivityResult(result, intent);
    } catch (RemoteException e) {
    }
    return null;
}
```

上面的代码可以看出，启动Activity真正的实现交给了`ActivityManagerNative.getDefault()`的startActivity方法来完成。然后启动之后通过`checkStartActivityResult(result, intent);`来检查Activity的启动结果（比如Activity没有在AndroidManifest.xml中注册就throw `ActivityNotFoundException`的异常等）。

我们来着重看下这个`ActivityManagerNative`。

### ActivityManagerNative是什么？

`ActivityManagerNative`比较特殊，从下面的定义可以看到它就是一个Binder对象，并实现了`IActivityManager`接口。而它的`getDefault()`方法其实就是通过`asInterface(IBinder obj)`方法构建的`ActivityManagerProxy(obj)`单例。

```java
public abstract class ActivityManagerNative extends Binder implements IActivityManager
{
    /**
     * Cast a Binder object into an activity manager interface, generating
     * a proxy if needed.
     */
    static public IActivityManager asInterface(IBinder obj) {
        if (obj == null) {
            return null;
        }
        IActivityManager in =
            (IActivityManager)obj.queryLocalInterface(descriptor);
        if (in != null) {
            return in;
        }

        return new ActivityManagerProxy(obj);
    }

    /**
     * Retrieve the system's default/global activity manager.
     */
    static public IActivityManager getDefault() {
        return gDefault.get();
    }
    
    private static final Singleton<IActivityManager> gDefault = new Singleton<IActivityManager>() {
        protected IActivityManager create() {
            IBinder b = ServiceManager.getService("activity");
            if (false) {
                Log.v("ActivityManager", "default service binder = " + b);
            }
            IActivityManager am = asInterface(b);
            if (false) {
                Log.v("ActivityManager", "default service = " + am);
            }
            return am;
        }
    };
    
    //...省略其他代码...
}
```

而`ActivityManagerNative.getDefault()`实际上是个`ActivityManagerService`（简称AMS），因此Activity的启动任务其实最后交给了AMS中，

### ActivityManagerService（AMS）

看AMS的`startActivity()`方法

```java
//ActivityManagerService类
@Override
public final int startActivity(IApplicationThread caller, String callingPackage,
        Intent intent, String resolvedType, IBinder resultTo, String resultWho, int requestCode,
        int startFlags, ProfilerInfo profilerInfo, Bundle options) {
    //交给startActivityAsUser方法
    return startActivityAsUser(caller, callingPackage, intent, resolvedType, resultTo,
        resultWho, requestCode, startFlags, profilerInfo, options,
        UserHandle.getCallingUserId());
}

 @Override
public final int startActivityAsUser(IApplicationThread caller, String callingPackage,
        Intent intent, String resolvedType, IBinder resultTo, String resultWho, int requestCode,
        int startFlags, ProfilerInfo profilerInfo, Bundle options, int userId) {
    enforceNotIsolatedCaller("startActivity");
    userId = handleIncomingUser(Binder.getCallingPid(), Binder.getCallingUid(), userId,
            false, ALLOW_FULL_ONLY, "startActivity", null);
    // TODO: Switch to user app stacks here.
    return mStackSupervisor.startActivityMayWait(caller, -1, callingPackage, intent,
            resolvedType, null, null, resultTo, resultWho, requestCode, startFlags,
            profilerInfo, null, null, options, false, userId, null, null);
}


/** mStackSupervisor的定义 Run all ActivityStacks through this */
ActivityStackSupervisor mStackSupervisor;
```

可以看出，Activity启动任务被AMS转交给了`ActivityStackSupervisor`的`startActivityMayWait`方法。

```java
//ActivityStackSupervisor类
final int startActivityMayWait(IApplicationThread caller, int callingUid,
        String callingPackage, Intent intent, String resolvedType,
        IVoiceInteractionSession voiceSession, IVoiceInteractor voiceInteractor,
        IBinder resultTo, String resultWho, int requestCode, int startFlags,
        ProfilerInfo profilerInfo, WaitResult outResult, Configuration config,
        Bundle options, boolean ignoreTargetSecurity, int userId,
        IActivityContainer iContainer, TaskRecord inTask) {


        //...省略一大片代码...

        int res = startActivityLocked(caller, intent, resolvedType, aInfo,
                    voiceSession, voiceInteractor, resultTo, resultWho,
                    requestCode, callingPid, callingUid, callingPackage,
                    realCallingPid, realCallingUid, startFlags, options, ignoreTargetSecurity,
                    componentSpecified, null, container, inTask);

        //...再省略一大片代码...
}


final int startActivityLocked(IApplicationThread caller,
        Intent intent, String resolvedType, ActivityInfo aInfo,
        IVoiceInteractionSession voiceSession, IVoiceInteractor voiceInteractor,
        IBinder resultTo, String resultWho, int requestCode,
        int callingPid, int callingUid, String callingPackage,
        int realCallingPid, int realCallingUid, int startFlags, Bundle options,
        boolean ignoreTargetSecurity, boolean componentSpecified, ActivityRecord[] outActivity,
        ActivityContainer container, TaskRecord inTask) {

    int err = ActivityManager.START_SUCCESS;
    
    //...再省略一大片代码...

    err = startActivityUncheckedLocked(r, sourceRecord, voiceSession, voiceInteractor,
            startFlags, true, options, inTask);
    if (err < 0) {
        // If someone asked to have the keyguard dismissed on the next
        // activity start, but we are not actually doing an activity
        // switch...  just dismiss the keyguard now, because we
        // probably want to see whatever is behind it.
        notifyActivityDrawnForKeyguard();
    }
    return err;
}
```

`ActivityStackSupervisor`类中的`startActivityMayWait`方法调用`startActivityLocked()`继续执行，而`startActivityLocked()`方法中又会调用`startActivityUncheckedLocked()`方法，然后会调用`resumeTopActivitiesLocked()`方法：

```java
//ActivityStackSupervisor类
boolean resumeTopActivitiesLocked() {
    return resumeTopActivitiesLocked(null, null, null);
}


boolean resumeTopActivitiesLocked(ActivityStack targetStack, ActivityRecord target,
        Bundle targetOptions) {
    if (targetStack == null) {
        targetStack = mFocusedStack;
    }
    // Do targetStack first.
    boolean result = false;
    if (isFrontStack(targetStack)) {
        //到这里，启动过程从ActivityStackSupervisor类交给了ActivityStack类
        result = targetStack.resumeTopActivityLocked(target, targetOptions);
    }
    for (int displayNdx = mActivityDisplays.size() - 1; displayNdx >= 0; --displayNdx) {
        final ArrayList<ActivityStack> stacks = mActivityDisplays.valueAt(displayNdx).mStacks;
        for (int stackNdx = stacks.size() - 1; stackNdx >= 0; --stackNdx) {
            final ActivityStack stack = stacks.get(stackNdx);
            if (stack == targetStack) {
                // Already started above.
                continue;
            }
            if (isFrontStack(stack)) {
                stack.resumeTopActivityLocked(null);
            }
        }
    }
    return result;
}
```

上面代码能看到，最后启动过程从`ActivityStackSupervisor`类交给了`ActivityStack`类。

跟进它的`resumeTopActivityLocked`方法：

```java
/**
 * Ensure that the top activity in the stack is resumed.
 *
 * @param prev The previously resumed activity, for when in the process
 * of pausing; can be null to call from elsewhere.
 *
 * @return Returns true if something is being resumed, or false if
 * nothing happened.
 */
final boolean resumeTopActivityLocked(ActivityRecord prev) {
    return resumeTopActivityLocked(prev, null);
}

final boolean resumeTopActivityLocked(ActivityRecord prev, Bundle options) {
    if (mStackSupervisor.inResumeTopActivity) {
        // Don't even start recursing.
        return false;
    }
    boolean result = false;
    try {
        // Protect against recursion.
        mStackSupervisor.inResumeTopActivity = true;
        if (mService.mLockScreenShown == ActivityManagerService.LOCK_SCREEN_LEAVING) {
            mService.mLockScreenShown = ActivityManagerService.LOCK_SCREEN_HIDDEN;
            mService.updateSleepIfNeededLocked();
        }
        //注意这里
        result = resumeTopActivityInnerLocked(prev, options);
    } finally {
        mStackSupervisor.inResumeTopActivity = false;
    }
    return result;
}
```

继续看看`resumeTopActivityInnerLocked()`方法

```java

private boolean resumeTopActivityInnerLocked(ActivityRecord prev, Bundle options) {
 
    //看这里，又返回交给了ActivityStackSupervisor类
    mStackSupervisor.startSpecificActivityLocked(next, true, false);     

    //...省略一大片代码...
}
```

### 又返回ActivityStackSupervisor类

```java
//ActivityStackSupervisor类
void startSpecificActivityLocked(ActivityRecord r,
        boolean andResume, boolean checkConfig) {
  
    // Is this activity's application already running?
    // 判断需要启动的Activity所在进程和app已经存在，若存在，直接启动，否则准备创建该进程。
    ProcessRecord app = mService.getProcessRecordLocked(r.processName,
            r.info.applicationInfo.uid, true);
    r.task.stack.setLaunchTime(r);
    if (app != null && app.thread != null) {
        try {
            if ((r.info.flags&ActivityInfo.FLAG_MULTIPROCESS) == 0
                    || !"android".equals(r.info.packageName)) {
                // Don't add this if it is a platform component that is marked
                // to run in multiple processes, because this is actually
                // part of the framework so doesn't make sense to track as a
                // separate apk in the process.
                app.addPackage(r.info.packageName, r.info.applicationInfo.versionCode,
                        mService.mProcessStats);
            }
            //注意这里
            realStartActivityLocked(r, app, andResume, checkConfig);
            return;
        } catch (RemoteException e) {
            Slog.w(TAG, "Exception when starting activity "
                    + r.intent.getComponent().flattenToShortString(), e);
        }
        // If a dead object exception was thrown -- fall through to
        // restart the application.
    }
    // 否则准备创建该进程
    mService.startProcessLocked(r.processName, r.info.applicationInfo, true, 0,
            "activity", r.intent.getComponent(), false, false, true);
}
```

上面的`startSpecificActivityLocked()`方法，首先判断需要启动的Activity所在进程和app是否已经存在。若存在，直接拿着该进行信息去启动该Activity，否则准备创建该进程。

我们简单先看下创建该App进程的方法`startProcessLocked()`，位于ActivityManagerService类中：

```java
//ActivityManagerService类中
private final void startProcessLocked(ProcessRecord app, String hostingType,
        String hostingNameStr, String abiOverride, String entryPoint, String[] entryPointArgs) {

    long startTime = SystemClock.elapsedRealtime();
    if (app.pid > 0 && app.pid != MY_PID) {
        checkTime(startTime, "startProcess: removing from pids map");
        synchronized (mPidsSelfLocked) {
            mPidsSelfLocked.remove(app.pid);
            mHandler.removeMessages(PROC_START_TIMEOUT_MSG, app);
        }
        checkTime(startTime, "startProcess: done removing from pids map");
        app.setPid(0);
    }

    if (DEBUG_PROCESSES && mProcessesOnHold.contains(app)) Slog.v(TAG_PROCESSES,
            "startProcessLocked removing on hold: " + app);
    mProcessesOnHold.remove(app);

    checkTime(startTime, "startProcess: starting to update cpu stats");
    updateCpuStats();
    checkTime(startTime, "startProcess: done updating cpu stats");

    try {
    
    	//...省略其他代码...
        
        // Process.start()完成了ActivityThread的创建，之后就会执行ActivityThread的main()方法
        // Start the process.  It will either succeed and return a result containing
        // the PID of the new process, or else throw a RuntimeException.
        boolean isActivityProcess = (entryPoint == null);
        if (entryPoint == null) entryPoint = "android.app.ActivityThread";
        Trace.traceBegin(Trace.TRACE_TAG_ACTIVITY_MANAGER, "Start proc: " +
                    app.processName);
        checkTime(startTime, "startProcess: asking zygote to start proc");
        Process.ProcessStartResult startResult = Process.start(entryPoint,
                app.processName, uid, uid, gids, debugFlags, mountExternal,
                app.info.targetSdkVersion, app.info.seinfo, requiredAbi, instructionSet,
                app.info.dataDir, entryPointArgs);
        checkTime(startTime, "startProcess: returned from zygote!");
        Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);

        //...省略其他代码...

    } catch (RuntimeException e) {
        // XXX do better error recovery.
        app.setPid(0);
        mBatteryStatsService.noteProcessFinish(app.processName, app.info.uid);
        if (app.isolated) {
            mBatteryStatsService.removeIsolatedUid(app.uid, app.info.uid);
        }
        Slog.e(TAG, "Failure starting process " + app.processName, e);
    }
}
```

我们可以看到这个方法就是使用`Process.start()`，并通过Socket连接的方式孵化新建了一个**Zygote进程**，完成了ActivityThread的创建，之后就会执行ActivityThread的`main()`方法。

接着上面，App进程如果存在就会直接调用`realStartActivityLocked()`方法：

```java
//ActivityStackSupervisor类中
final boolean realStartActivityLocked(ActivityRecord r,
        ProcessRecord app, boolean andResume, boolean checkConfig)
        throws RemoteException {

    //...省略其他代码...

    try {
        app.forceProcessStateUpTo(mService.mTopProcessState);
        app.thread.scheduleLaunchActivity(new Intent(r.intent), r.appToken,
                System.identityHashCode(r), r.info, new Configuration(mService.mConfiguration),
                new Configuration(stack.mOverrideConfig), r.compat, r.launchedFromPackage,
                task.voiceInteractor, app.repProcState, r.icicle, r.persistentState, results,
                newIntents, !andResume, mService.isNextTransitionForward(), profilerInfo);

    } catch (RemoteException e) {
        throw e;
    }

    return true;
}
```
上面的调用了`app.thread`的`scheduleLaunchActivity()`方法，app的类型是`ProcessRecord`类，它的thread成员变量定义如下，是一个`IApplicationThread`对象：


```java
/**
 * Full information about a particular process that
 * is currently running.
 */
final class ProcessRecord {
    private static final String TAG = TAG_WITH_CLASS_NAME ? "ProcessRecord" : TAG_AM;

    private final BatteryStatsImpl mBatteryStats; // where to collect runtime statistics
    final ApplicationInfo info; // all about the first app in the process
    final boolean isolated;     // true if this is a special isolated process
    final int uid;              // uid of process; may be different from 'info' if isolated
    final int userId;           // user of process.
    final String processName;   // name of the process
    // List of packages running in the process
    final ArrayMap<String, ProcessStats.ProcessStateHolder> pkgList = new ArrayMap<>();
    UidRecord uidRecord;        // overall state of process's uid.
    ArraySet<String> pkgDeps;   // additional packages we have a dependency on
    IApplicationThread thread;  // the actual proc...  may be null only if
                                // 'persistent' is true (in which case we
                                // are in the process of launching the app)

}

    //...省略其他代码...
```

而`IApplicationThread`的声明如下：

```java
/**
 * System private API for communicating with the application.  This is given to
 * the activity manager by an application  when it starts up, for the activity
 * manager to tell the application about things it needs to do.
 *
 * {@hide}
 */
public interface IApplicationThread extends IInterface {
    void schedulePauseActivity(IBinder token, boolean finished, boolean userLeaving,
            int configChanges, boolean dontReport) throws RemoteException;
    void scheduleStopActivity(IBinder token, boolean showWindow,
            int configChanges) throws RemoteException;
    void scheduleWindowVisibility(IBinder token, boolean showWindow) throws RemoteException;
    void scheduleSleeping(IBinder token, boolean sleeping) throws RemoteException;
    void scheduleResumeActivity(IBinder token, int procState, boolean isForward, Bundle resumeArgs)
            throws RemoteException;
    void scheduleSendResult(IBinder token, List<ResultInfo> results) throws RemoteException;
    void scheduleLaunchActivity(Intent intent, IBinder token, int ident,
            ActivityInfo info, Configuration curConfig, Configuration overrideConfig,
            CompatibilityInfo compatInfo, String referrer, IVoiceInteractor voiceInteractor,
            int procState, Bundle state, PersistableBundle persistentState,
            List<ResultInfo> pendingResults, List<ReferrerIntent> pendingNewIntents,
            boolean notResumed, boolean isForward, ProfilerInfo profilerInfo) throws RemoteException;
    void scheduleRelaunchActivity(IBinder token, List<ResultInfo> pendingResults,
            List<ReferrerIntent> pendingNewIntents, int configChanges, boolean notResumed,
            Configuration config, Configuration overrideConfig) throws RemoteException;
    void scheduleNewIntent(List<ReferrerIntent> intent, IBinder token) throws RemoteException;
    void scheduleDestroyActivity(IBinder token, boolean finished,
            int configChanges) throws RemoteException;
    void scheduleReceiver(Intent intent, ActivityInfo info, CompatibilityInfo compatInfo,
            int resultCode, String data, Bundle extras, boolean sync,
            int sendingUser, int processState) throws RemoteException;
    static final int BACKUP_MODE_INCREMENTAL = 0;
    static final int BACKUP_MODE_FULL = 1;
    static final int BACKUP_MODE_RESTORE = 2;
    static final int BACKUP_MODE_RESTORE_FULL = 3;
    void scheduleCreateBackupAgent(ApplicationInfo app, CompatibilityInfo compatInfo,
            int backupMode) throws RemoteException;
    void scheduleDestroyBackupAgent(ApplicationInfo app, CompatibilityInfo compatInfo)
            throws RemoteException;
    void scheduleCreateService(IBinder token, ServiceInfo info,
            CompatibilityInfo compatInfo, int processState) throws RemoteException;
    void scheduleBindService(IBinder token,
            Intent intent, boolean rebind, int processState) throws RemoteException;
    void scheduleUnbindService(IBinder token,
            Intent intent) throws RemoteException;
    void scheduleServiceArgs(IBinder token, boolean taskRemoved, int startId,
            int flags, Intent args) throws RemoteException;
    void scheduleStopService(IBinder token) throws RemoteException;
    static final int DEBUG_OFF = 0;
    static final int DEBUG_ON = 1;
    static final int DEBUG_WAIT = 2;
    void bindApplication(String packageName, ApplicationInfo info, List<ProviderInfo> providers,
            ComponentName testName, ProfilerInfo profilerInfo, Bundle testArguments,
            IInstrumentationWatcher testWatcher, IUiAutomationConnection uiAutomationConnection,
            int debugMode, boolean openGlTrace, boolean restrictedBackupMode, boolean persistent,
            Configuration config, CompatibilityInfo compatInfo, Map<String, IBinder> services,
            Bundle coreSettings) throws RemoteException;
    void scheduleExit() throws RemoteException;
    void scheduleSuicide() throws RemoteException;
    void scheduleConfigurationChanged(Configuration config) throws RemoteException;
    void updateTimeZone() throws RemoteException;
    void clearDnsCache() throws RemoteException;
    void setHttpProxy(String proxy, String port, String exclList,
            Uri pacFileUrl) throws RemoteException;
    void processInBackground() throws RemoteException;
    void dumpService(FileDescriptor fd, IBinder servicetoken, String[] args)
            throws RemoteException;
    void dumpProvider(FileDescriptor fd, IBinder servicetoken, String[] args)
            throws RemoteException;
    void scheduleRegisteredReceiver(IIntentReceiver receiver, Intent intent,
            int resultCode, String data, Bundle extras, boolean ordered,
            boolean sticky, int sendingUser, int processState) throws RemoteException;
    void scheduleLowMemory() throws RemoteException;
    void scheduleActivityConfigurationChanged(IBinder token, Configuration overrideConfig)
            throws RemoteException;
    void profilerControl(boolean start, ProfilerInfo profilerInfo, int profileType)
            throws RemoteException;
    void dumpHeap(boolean managed, String path, ParcelFileDescriptor fd)
            throws RemoteException;
    void setSchedulingGroup(int group) throws RemoteException;
    static final int PACKAGE_REMOVED = 0;
    static final int EXTERNAL_STORAGE_UNAVAILABLE = 1;
    void dispatchPackageBroadcast(int cmd, String[] packages) throws RemoteException;
    void scheduleCrash(String msg) throws RemoteException;
    void dumpActivity(FileDescriptor fd, IBinder servicetoken, String prefix, String[] args)
            throws RemoteException;
    void setCoreSettings(Bundle coreSettings) throws RemoteException;
    void updatePackageCompatibilityInfo(String pkg, CompatibilityInfo info) throws RemoteException;
    void scheduleTrimMemory(int level) throws RemoteException;
    void dumpMemInfo(FileDescriptor fd, Debug.MemoryInfo mem, boolean checkin, boolean dumpInfo,
            boolean dumpDalvik, boolean dumpSummaryOnly, String[] args) throws RemoteException;
    void dumpGfxInfo(FileDescriptor fd, String[] args) throws RemoteException;
    void dumpDbInfo(FileDescriptor fd, String[] args) throws RemoteException;
    void unstableProviderDied(IBinder provider) throws RemoteException;
    void requestAssistContextExtras(IBinder activityToken, IBinder requestToken, int requestType)
            throws RemoteException;
    void scheduleTranslucentConversionComplete(IBinder token, boolean timeout)
            throws RemoteException;
    void scheduleOnNewActivityOptions(IBinder token, ActivityOptions options)
            throws RemoteException;
    void setProcessState(int state) throws RemoteException;
    void scheduleInstallProvider(ProviderInfo provider) throws RemoteException;
    void updateTimePrefs(boolean is24Hour) throws RemoteException;
    void scheduleCancelVisibleBehind(IBinder token) throws RemoteException;
    void scheduleBackgroundVisibleBehindChanged(IBinder token, boolean enabled) throws RemoteException;
    void scheduleEnterAnimationComplete(IBinder token) throws RemoteException;
    void notifyCleartextNetwork(byte[] firstPacket) throws RemoteException;

    String descriptor = "android.app.IApplicationThread";

    int SCHEDULE_PAUSE_ACTIVITY_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION;
    int SCHEDULE_STOP_ACTIVITY_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+2;
    int SCHEDULE_WINDOW_VISIBILITY_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+3;
    int SCHEDULE_RESUME_ACTIVITY_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+4;
    int SCHEDULE_SEND_RESULT_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+5;
    int SCHEDULE_LAUNCH_ACTIVITY_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+6;
    int SCHEDULE_NEW_INTENT_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+7;
    int SCHEDULE_FINISH_ACTIVITY_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+8;
    int SCHEDULE_RECEIVER_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+9;
    int SCHEDULE_CREATE_SERVICE_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+10;
    int SCHEDULE_STOP_SERVICE_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+11;
    int BIND_APPLICATION_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+12;
    int SCHEDULE_EXIT_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+13;

    int SCHEDULE_CONFIGURATION_CHANGED_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+15;
    int SCHEDULE_SERVICE_ARGS_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+16;
    int UPDATE_TIME_ZONE_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+17;
    int PROCESS_IN_BACKGROUND_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+18;
    int SCHEDULE_BIND_SERVICE_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+19;
    int SCHEDULE_UNBIND_SERVICE_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+20;
    int DUMP_SERVICE_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+21;
    int SCHEDULE_REGISTERED_RECEIVER_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+22;
    int SCHEDULE_LOW_MEMORY_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+23;
    int SCHEDULE_ACTIVITY_CONFIGURATION_CHANGED_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+24;
    int SCHEDULE_RELAUNCH_ACTIVITY_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+25;
    int SCHEDULE_SLEEPING_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+26;
    int PROFILER_CONTROL_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+27;
    int SET_SCHEDULING_GROUP_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+28;
    int SCHEDULE_CREATE_BACKUP_AGENT_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+29;
    int SCHEDULE_DESTROY_BACKUP_AGENT_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+30;
    int SCHEDULE_ON_NEW_ACTIVITY_OPTIONS_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+31;
    int SCHEDULE_SUICIDE_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+32;
    int DISPATCH_PACKAGE_BROADCAST_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+33;
    int SCHEDULE_CRASH_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+34;
    int DUMP_HEAP_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+35;
    int DUMP_ACTIVITY_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+36;
    int CLEAR_DNS_CACHE_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+37;
    int SET_HTTP_PROXY_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+38;
    int SET_CORE_SETTINGS_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+39;
    int UPDATE_PACKAGE_COMPATIBILITY_INFO_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+40;
    int SCHEDULE_TRIM_MEMORY_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+41;
    int DUMP_MEM_INFO_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+42;
    int DUMP_GFX_INFO_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+43;
    int DUMP_PROVIDER_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+44;
    int DUMP_DB_INFO_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+45;
    int UNSTABLE_PROVIDER_DIED_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+46;
    int REQUEST_ASSIST_CONTEXT_EXTRAS_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+47;
    int SCHEDULE_TRANSLUCENT_CONVERSION_COMPLETE_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+48;
    int SET_PROCESS_STATE_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+49;
    int SCHEDULE_INSTALL_PROVIDER_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+50;
    int UPDATE_TIME_PREFS_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+51;
    int CANCEL_VISIBLE_BEHIND_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+52;
    int BACKGROUND_VISIBLE_BEHIND_CHANGED_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+53;
    int ENTER_ANIMATION_COMPLETE_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+54;
    int NOTIFY_CLEARTEXT_NETWORK_TRANSACTION = IBinder.FIRST_CALL_TRANSACTION+55;
}
```

可以看到`IApplicationThread`它继承了IInterface接口，是一个Binder类型接口。里面包含了大量的启动、停止Activity的接口，启动、停止Service的接口。那么它的实现者到底是谁呢？答案就是`ActivityThread`类里的内部类`ApplicationThread`，我们去看看它的定义：

```java
private class ApplicationThread extends ApplicationThreadNative {...}
public abstract class ApplicationThreadNative extends Binder
        implements IApplicationThread {
```
可以看到，`ApplicationThread`类继承自`ApplicationThreadNative`，而`ApplicationThreadNative`是一个Binder对象并且实现了`IApplicationThread`接口。

而且在`ApplicationThreadNative`类的内部有一个`ApplicationThreadProxy`代理类。

```java
public abstract class ApplicationThreadNative extends Binder
    implements IApplicationThread {

	/**
	 * Cast a Binder object into an application thread interface, generating
	 * a proxy if needed.
	 */
	static public IApplicationThread asInterface(IBinder obj) {
	    if (obj == null) {
	        return null;
	    }
	    IApplicationThread in =
	        (IApplicationThread)obj.queryLocalInterface(descriptor);
	    if (in != null) {
	        return in;
	    }
	    return new ApplicationThreadProxy(obj);
	}

	public ApplicationThreadNative() {
	    attachInterface(this, descriptor);
	}

	@Override
	public boolean onTransact(int code, Parcel data, Parcel reply, int flags)
	        throws RemoteException {
	    switch (code) {
	    case SCHEDULE_PAUSE_ACTIVITY_TRANSACTION:
	    {
	        data.enforceInterface(IApplicationThread.descriptor);
	        IBinder b = data.readStrongBinder();
	        boolean finished = data.readInt() != 0;
	        boolean userLeaving = data.readInt() != 0;
	        int configChanges = data.readInt();
	        boolean dontReport = data.readInt() != 0;
	        schedulePauseActivity(b, finished, userLeaving, configChanges, dontReport);
	        return true;
	    }
	    case SCHEDULE_STOP_ACTIVITY_TRANSACTION:
	    {
	        data.enforceInterface(IApplicationThread.descriptor);
	        IBinder b = data.readStrongBinder();
	        boolean show = data.readInt() != 0;
	        int configChanges = data.readInt();
	        scheduleStopActivity(b, show, configChanges);
	        return true;
	    }

	    //...省略一大片代码...

	    return super.onTransact(code, data, reply, flags);
	}
}


class ApplicationThreadProxy implements IApplicationThread {
	private final IBinder mRemote;

	public ApplicationThreadProxy(IBinder remote) {
	    mRemote = remote;
	}

	public final IBinder asBinder() {
	    return mRemote;
	}

	public final void schedulePauseActivity(IBinder token, boolean finished,
	        boolean userLeaving, int configChanges, boolean dontReport) throws RemoteException {
	    Parcel data = Parcel.obtain();
	    data.writeInterfaceToken(IApplicationThread.descriptor);
	    data.writeStrongBinder(token);
	    data.writeInt(finished ? 1 : 0);
	    data.writeInt(userLeaving ? 1 :0);
	    data.writeInt(configChanges);
	    data.writeInt(dontReport ? 1 : 0);
	    mRemote.transact(SCHEDULE_PAUSE_ACTIVITY_TRANSACTION, data, null,
	            IBinder.FLAG_ONEWAY);
	    data.recycle();
	}

	public final void scheduleStopActivity(IBinder token, boolean showWindow,
	        int configChanges) throws RemoteException {
	    Parcel data = Parcel.obtain();
	    data.writeInterfaceToken(IApplicationThread.descriptor);
	    data.writeStrongBinder(token);
	    data.writeInt(showWindow ? 1 : 0);
	    data.writeInt(configChanges);
	    mRemote.transact(SCHEDULE_STOP_ACTIVITY_TRANSACTION, data, null,
	            IBinder.FLAG_ONEWAY);
	    data.recycle();
	}

	//...省略一大片代码...
}
```

也就是说，按照上面的流程，最终从AMS回调到了`ApplicationThread`中，我们看看`ApplicationThread`类的`scheduleLaunchActivity()`方法：

```java
//位于ActivityThread类中的内部类ApplicationThread类中
//
// we use token to identify this activity without having to send the
// activity itself back to the activity manager. (matters more with ipc)
@Override
public final void scheduleLaunchActivity(Intent intent, IBinder token, int ident,
        ActivityInfo info, Configuration curConfig, Configuration overrideConfig,
        CompatibilityInfo compatInfo, String referrer, IVoiceInteractor voiceInteractor,
        int procState, Bundle state, PersistableBundle persistentState,
        List<ResultInfo> pendingResults, List<ReferrerIntent> pendingNewIntents,
        boolean notResumed, boolean isForward, ProfilerInfo profilerInfo) {
    updateProcessState(procState, false);
    ActivityClientRecord r = new ActivityClientRecord();
    r.token = token;
    r.ident = ident;
    r.intent = intent;
    r.referrer = referrer;
    r.voiceInteractor = voiceInteractor;
    r.activityInfo = info;
    r.compatInfo = compatInfo;
    r.state = state;
    r.persistentState = persistentState;
    r.pendingResults = pendingResults;
    r.pendingIntents = pendingNewIntents;
    r.startsNotResumed = notResumed;
    r.isForward = isForward;
    r.profilerInfo = profilerInfo;
    r.overrideConfig = overrideConfig;
    updatePendingConfiguration(curConfig);
    sendMessage(H.LAUNCH_ACTIVITY, r);
}
```

可以看到，`scheduleLaunchActivity`方法就是发送了一个启动Activity的Message交给H这个Handler，这个Handler定义如下：

```java
private class H extends Handler {
    public static final int LAUNCH_ACTIVITY         = 100;
    public static final int PAUSE_ACTIVITY          = 101;
    public static final int PAUSE_ACTIVITY_FINISHING= 102;
    public static final int STOP_ACTIVITY_SHOW      = 103;
    public static final int STOP_ACTIVITY_HIDE      = 104;
    public static final int SHOW_WINDOW             = 105;
    public static final int HIDE_WINDOW             = 106;
    public static final int RESUME_ACTIVITY         = 107;
    public static final int SEND_RESULT             = 108;
    public static final int DESTROY_ACTIVITY        = 109;
    public static final int BIND_APPLICATION        = 110;
    public static final int EXIT_APPLICATION        = 111;
    public static final int NEW_INTENT              = 112;
    public static final int RECEIVER                = 113;
    public static final int CREATE_SERVICE          = 114;
    public static final int SERVICE_ARGS            = 115;
    public static final int STOP_SERVICE            = 116;
    public static final int CONFIGURATION_CHANGED   = 118;
    public static final int CLEAN_UP_CONTEXT        = 119;
    public static final int GC_WHEN_IDLE            = 120;
    public static final int BIND_SERVICE            = 121;
    public static final int UNBIND_SERVICE          = 122;
    public static final int DUMP_SERVICE            = 123;
    public static final int LOW_MEMORY              = 124;
    public static final int ACTIVITY_CONFIGURATION_CHANGED = 125;
    public static final int RELAUNCH_ACTIVITY       = 126;
    public static final int PROFILER_CONTROL        = 127;
    public static final int CREATE_BACKUP_AGENT     = 128;
    public static final int DESTROY_BACKUP_AGENT    = 129;
    public static final int SUICIDE                 = 130;
    public static final int REMOVE_PROVIDER         = 131;
    public static final int ENABLE_JIT              = 132;
    public static final int DISPATCH_PACKAGE_BROADCAST = 133;
    public static final int SCHEDULE_CRASH          = 134;
    public static final int DUMP_HEAP               = 135;
    public static final int DUMP_ACTIVITY           = 136;
    public static final int SLEEPING                = 137;
    public static final int SET_CORE_SETTINGS       = 138;
    public static final int UPDATE_PACKAGE_COMPATIBILITY_INFO = 139;
    public static final int TRIM_MEMORY             = 140;
    public static final int DUMP_PROVIDER           = 141;
    public static final int UNSTABLE_PROVIDER_DIED  = 142;
    public static final int REQUEST_ASSIST_CONTEXT_EXTRAS = 143;
    public static final int TRANSLUCENT_CONVERSION_COMPLETE = 144;
    public static final int INSTALL_PROVIDER        = 145;
    public static final int ON_NEW_ACTIVITY_OPTIONS = 146;
    public static final int CANCEL_VISIBLE_BEHIND = 147;
    public static final int BACKGROUND_VISIBLE_BEHIND_CHANGED = 148;
    public static final int ENTER_ANIMATION_COMPLETE = 149;
    
    public void handleMessage(Message msg) {
        if (DEBUG_MESSAGES) Slog.v(TAG, ">>> handling: " + codeToString(msg.what));
        switch (msg.what) {
            case LAUNCH_ACTIVITY: {
                Trace.traceBegin(Trace.TRACE_TAG_ACTIVITY_MANAGER, "activityStart");
                final ActivityClientRecord r = (ActivityClientRecord) msg.obj;
                r.packageInfo = getPackageInfoNoCheck(
                        r.activityInfo.applicationInfo, r.compatInfo);
                handleLaunchActivity(r, null);
                Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);
            } break;
            case RELAUNCH_ACTIVITY: {
                Trace.traceBegin(Trace.TRACE_TAG_ACTIVITY_MANAGER, "activityRestart");
                ActivityClientRecord r = (ActivityClientRecord)msg.obj;
                handleRelaunchActivity(r);
                Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);
            } break;
            case PAUSE_ACTIVITY:
                Trace.traceBegin(Trace.TRACE_TAG_ACTIVITY_MANAGER, "activityPause");
                handlePauseActivity((IBinder)msg.obj, false, (msg.arg1&1) != 0, msg.arg2,
                        (msg.arg1&2) != 0);
                maybeSnapshot();
                Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);
                break;
            case PAUSE_ACTIVITY_FINISHING:
                Trace.traceBegin(Trace.TRACE_TAG_ACTIVITY_MANAGER, "activityPause");
                handlePauseActivity((IBinder)msg.obj, true, (msg.arg1&1) != 0, msg.arg2,
                        (msg.arg1&1) != 0);
                Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);
                break;
            case STOP_ACTIVITY_SHOW:
                Trace.traceBegin(Trace.TRACE_TAG_ACTIVITY_MANAGER, "activityStop");
                handleStopActivity((IBinder)msg.obj, true, msg.arg2);
                Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);
                break;
            case STOP_ACTIVITY_HIDE:
                Trace.traceBegin(Trace.TRACE_TAG_ACTIVITY_MANAGER, "activityStop");
                handleStopActivity((IBinder)msg.obj, false, msg.arg2);
                Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);
                break;
            case SHOW_WINDOW:
                Trace.traceBegin(Trace.TRACE_TAG_ACTIVITY_MANAGER, "activityShowWindow");
                handleWindowVisibility((IBinder)msg.obj, true);
                Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);
                break;
            case HIDE_WINDOW:
                Trace.traceBegin(Trace.TRACE_TAG_ACTIVITY_MANAGER, "activityHideWindow");
                handleWindowVisibility((IBinder)msg.obj, false);
                Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);
                break;
            case RESUME_ACTIVITY:
                Trace.traceBegin(Trace.TRACE_TAG_ACTIVITY_MANAGER, "activityResume");
                handleResumeActivity((IBinder) msg.obj, true, msg.arg1 != 0, true);
                Trace.traceEnd(Trace.TRACE_TAG_ACTIVITY_MANAGER);
                break;

            //...省略其他代码...

        }
    }

    //...省略其他代码...
}
```

H这个Handler对`LAUNCH_ACTIVITY`的处理就是调用了`handleLaunchActivity`方法：

```java
//ActivityThread类中
private void handleLaunchActivity(ActivityClientRecord r, Intent customIntent) {
    // If we are getting ready to gc after going to the background, well
    // we are back active so skip it.
    unscheduleGcIdler();
    mSomeActivitiesChanged = true;
    if (r.profilerInfo != null) {
        mProfiler.setProfiler(r.profilerInfo);
        mProfiler.startProfiling();
    }
    // Make sure we are running with the most recent config.
    handleConfigurationChanged(null, null);
    if (localLOGV) Slog.v(
        TAG, "Handling launch of " + r);
    // Initialize before creating the activity
    WindowManagerGlobal.initialize();
  
    //注意这里
    Activity a = performLaunchActivity(r, customIntent);
    if (a != null) {
        r.createdConfig = new Configuration(mConfiguration);
        Bundle oldState = r.state;
      
        //注意这里
        handleResumeActivity(r.token, false, r.isForward,
                !r.activity.mFinished && !r.startsNotResumed);
        if (!r.activity.mFinished && r.startsNotResumed) {
            // The activity manager actually wants this one to start out
            // paused, because it needs to be visible but isn't in the
            // foreground.  We accomplish this by going through the
            // normal startup (because activities expect to go through
            // onResume() the first time they run, before their window
            // is displayed), and then pausing it.  However, in this case
            // we do -not- need to do the full pause cycle (of freezing
            // and such) because the activity manager assumes it can just
            // retain the current state it has.
            try {
                r.activity.mCalled = false;
                mInstrumentation.callActivityOnPause(r.activity);
                // We need to keep around the original state, in case
                // we need to be created again.  But we only do this
                // for pre-Honeycomb apps, which always save their state
                // when pausing, so we can not have them save their state
                // when restarting from a paused state.  For HC and later,
                // we want to (and can) let the state be saved as the normal
                // part of stopping the activity.
                if (r.isPreHoneycomb()) {
                    r.state = oldState;
                }
                if (!r.activity.mCalled) {
                    throw new SuperNotCalledException(
                        "Activity " + r.intent.getComponent().toShortString() +
                        " did not call through to super.onPause()");
                }
            } catch (SuperNotCalledException e) {
                throw e;
            } catch (Exception e) {
                if (!mInstrumentation.onException(r.activity, e)) {
                    throw new RuntimeException(
                            "Unable to pause activity "
                            + r.intent.getComponent().toShortString()
                            + ": " + e.toString(), e);
                }
            }
            r.paused = true;
        }
    } else {
        // If there was an error, for any reason, tell the activity
        // manager to stop us.
        try {
            ActivityManagerNative.getDefault()
                .finishActivity(r.token, Activity.RESULT_CANCELED, null, false);
        } catch (RemoteException ex) {
            // Ignore
        }
    }
}
```

最终：

1. 通过ActivityThread的`performLaunchActivity()`方法完成了Activity的创建和启动过程；
2. 通过`handleResumeActivity()`方法调用了这个Activity的`onResume()`生命周期方法。



### `performLaunchActivity()`方法

`performLaunchActivity()`方法主要完成了Activity的初始化任务，根据注释大致可以分为四步：

```java
private Activity performLaunchActivity(ActivityClientRecord r, Intent customIntent) {

	//1. 从ActivityClientRecord中读取Activity的组件信息
    ActivityInfo aInfo = r.activityInfo;
    if (r.packageInfo == null) {
        r.packageInfo = getPackageInfo(aInfo.applicationInfo, r.compatInfo,
                Context.CONTEXT_INCLUDE_CODE);
    }

    ComponentName component = r.intent.getComponent();
    if (component == null) {
        component = r.intent.resolveActivity(
            mInitialApplication.getPackageManager());
        r.intent.setComponent(component);
    }

    if (r.activityInfo.targetActivity != null) {
        component = new ComponentName(r.activityInfo.packageName,
                r.activityInfo.targetActivity);
    }

    Activity activity = null;
    try {
        java.lang.ClassLoader cl = r.packageInfo.getClassLoader();

        //2. 通过mInstrumentation.newActivity()方法创建Activity对象
        activity = mInstrumentation.newActivity(
                cl, component.getClassName(), r.intent);
        StrictMode.incrementExpectedActivityCount(activity.getClass());
        r.intent.setExtrasClassLoader(cl);
        r.intent.prepareToEnterProcess();
        if (r.state != null) {
            r.state.setClassLoader(cl);
        }
    } catch (Exception e) {
        if (!mInstrumentation.onException(activity, e)) {
            throw new RuntimeException(
                "Unable to instantiate activity " + component
                + ": " + e.toString(), e);
        }
    }

    try {
    	//3. 通过LoadApk的makeApplication()方法创建Application对象
        Application app = r.packageInfo.makeApplication(false, mInstrumentation);

        if (localLOGV) Slog.v(TAG, "Performing launch of " + r);
        if (localLOGV) Slog.v(
                TAG, r + ": app=" + app
                + ", appName=" + app.getPackageName()
                + ", pkg=" + r.packageInfo.getPackageName()
                + ", comp=" + r.intent.getComponent().toShortString()
                + ", dir=" + r.packageInfo.getAppDir());

        if (activity != null) {
        
        	//4. 创建ContextImpl对象并调用Activity的attach()方法完成初始化
            Context appContext = createBaseContextForActivity(r, activity);
            CharSequence title = r.activityInfo.loadLabel(appContext.getPackageManager());
            Configuration config = new Configuration(mCompatConfiguration);
            if (DEBUG_CONFIGURATION) Slog.v(TAG, "Launching activity "
                    + r.activityInfo.name + " with config " + config);
            activity.attach(appContext, this, getInstrumentation(), r.token,
                    r.ident, app, r.intent, r.activityInfo, title, r.parent,
                    r.embeddedID, r.lastNonConfigurationInstances, config,
                    r.referrer, r.voiceInteractor);

            if (customIntent != null) {
                activity.mIntent = customIntent;
            }
            r.lastNonConfigurationInstances = null;
            activity.mStartedActivity = false;
            int theme = r.activityInfo.getThemeResource();
            if (theme != 0) {
                activity.setTheme(theme);
            }

            activity.mCalled = false;
            //5. 通过Instrumentation的callActivityOnCreate方法调用Activity的onCreate()方法
            if (r.isPersistable()) {
                mInstrumentation.callActivityOnCreate(activity, r.state, r.persistentState);
            } else {
                mInstrumentation.callActivityOnCreate(activity, r.state);
            }
            if (!activity.mCalled) {
                throw new SuperNotCalledException(
                    "Activity " + r.intent.getComponent().toShortString() +
                    " did not call through to super.onCreate()");
            }
            r.activity = activity;
            r.stopped = true;
            if (!r.activity.mFinished) {
                activity.performStart();
                r.stopped = false;
            }
            if (!r.activity.mFinished) {
                if (r.isPersistable()) {
                    if (r.state != null || r.persistentState != null) {
                        mInstrumentation.callActivityOnRestoreInstanceState(activity, r.state,
                                r.persistentState);
                    }
                } else if (r.state != null) {
                    mInstrumentation.callActivityOnRestoreInstanceState(activity, r.state);
                }
            }
            if (!r.activity.mFinished) {
                activity.mCalled = false;
                if (r.isPersistable()) {
                    mInstrumentation.callActivityOnPostCreate(activity, r.state,
                            r.persistentState);
                } else {
                    mInstrumentation.callActivityOnPostCreate(activity, r.state);
                }
                if (!activity.mCalled) {
                    throw new SuperNotCalledException(
                        "Activity " + r.intent.getComponent().toShortString() +
                        " did not call through to super.onPostCreate()");
                }
            }
        }
        r.paused = true;

        mActivities.put(r.token, r);

    } catch (SuperNotCalledException e) {
        throw e;

    } catch (Exception e) {
        if (!mInstrumentation.onException(activity, e)) {
            throw new RuntimeException(
                "Unable to start activity " + component
                + ": " + e.toString(), e);
        }
    }

    return activity;
}
```

总结上面的`performLaunchActivity()`方法，主要完成了如下工作：

1. 从ActivityClientRecord中读取Activity的组件信息
2. 通过`mInstrumentation.newActivity()`方法创建Activity对象
3. 通过LoadApk的`makeApplication()`方法创建Application对象
4. 创建`ContextImpl`对象并调用Activity的`attach()`方法完成初始化
5. 通过Instrumentation的`callActivityOnCreate`方法调用Activity的`onCreate()`方法

我们跟进一下第二步的`Instrumentation`类的`newActivity()`方法，很简单，就是使用类加载器创建了Activity对象：

```java
//Instrumentation类
public Activity newActivity(ClassLoader cl, String className,
        Intent intent)
        throws InstantiationException, IllegalAccessException,
        ClassNotFoundException {
    return (Activity)cl.loadClass(className).newInstance();
}
```

第三步：通过LoadApk的`makeApplication()`方法创建Application对象：

```java
//LoadApk类
public Application makeApplication(boolean forceDefaultAppClass,
        Instrumentation instrumentation) {
    if (mApplication != null) {
        return mApplication;
    }

    Application app = null;

    String appClass = mApplicationInfo.className;
    if (forceDefaultAppClass || (appClass == null)) {
        appClass = "android.app.Application";
    }

    try {
        java.lang.ClassLoader cl = getClassLoader();
        if (!mPackageName.equals("android")) {
            initializeJavaContextClassLoader();
        }
        //通过Instrumentation类的newApplication方法创建Application对象
        ContextImpl appContext = ContextImpl.createAppContext(mActivityThread, this);
        app = mActivityThread.mInstrumentation.newApplication(
                cl, appClass, appContext);
        appContext.setOuterContext(app);
    } catch (Exception e) {
        if (!mActivityThread.mInstrumentation.onException(app, e)) {
            throw new RuntimeException(
                "Unable to instantiate application " + appClass
                + ": " + e.toString(), e);
        }
    }
    mActivityThread.mAllApplications.add(app);
    mApplication = app;

    if (instrumentation != null) {
        try {
            instrumentation.callApplicationOnCreate(app);
        } catch (Exception e) {
            if (!instrumentation.onException(app, e)) {
                throw new RuntimeException(
                    "Unable to create application " + app.getClass().getName()
                    + ": " + e.toString(), e);
            }
        }
    }

    // Rewrite the R 'constants' for all library apks.
    SparseArray<String> packageIdentifiers = getAssets(mActivityThread)
            .getAssignedPackageIdentifiers();
    final int N = packageIdentifiers.size();
    for (int i = 0; i < N; i++) {
        final int id = packageIdentifiers.keyAt(i);
        if (id == 0x01 || id == 0x7f) {
            continue;
        }

        rewriteRValues(getClassLoader(), packageIdentifiers.valueAt(i), id);
    }

    return app;
}
```

跟进去Instrumentation类的`newApplication()`方法看看：

```java
//Instrumentation类
public Application newApplication(ClassLoader cl, String className, Context context)
        throws InstantiationException, IllegalAccessException, 
        ClassNotFoundException {
    return newApplication(cl.loadClass(className), context);
}

static public Application newApplication(Class<?> clazz, Context context)
        throws InstantiationException, IllegalAccessException, 
        ClassNotFoundException {
    Application app = (Application)clazz.newInstance();
    app.attach(context);
    return app;
}

//最终调用了Application类的attach方法
final void attach(Context context) {
    attachBaseContext(context);		//熟悉的生命周期方法
    mLoadedApk = ContextImpl.getImpl(context).mPackageInfo;
}
```

它通过类加载器创建了Application的对象，当Application对象创建完毕之后，系统会通过Instrumentation类的`callApplicationOnCreate()`方法来调用Application的`onCreate()`方法。最后通过`app.attach()`调用了我们熟悉的Application的`attachBaseContext()`方法。



### `handleResumeActivity()`方法流程



```java
//ActivityThread类
final void handleResumeActivity(IBinder token,
        boolean clearHide, boolean isForward, boolean reallyResume) {
    // If we are getting ready to gc after going to the background, well
    // we are back active so skip it.
    unscheduleGcIdler();
    mSomeActivitiesChanged = true;

    // TODO Push resumeArgs into the activity for consideration
    ActivityClientRecord r = performResumeActivity(token, clearHide);

    if (r != null) {
        final Activity a = r.activity;

        if (localLOGV) Slog.v(
            TAG, "Resume " + r + " started activity: " +
            a.mStartedActivity + ", hideForNow: " + r.hideForNow
            + ", finished: " + a.mFinished);

        final int forwardBit = isForward ?
                WindowManager.LayoutParams.SOFT_INPUT_IS_FORWARD_NAVIGATION : 0;

        // If the window hasn't yet been added to the window manager,
        // and this guy didn't finish itself or start another activity,
        // then go ahead and add the window.
        boolean willBeVisible = !a.mStartedActivity;
        if (!willBeVisible) {
            try {
                willBeVisible = ActivityManagerNative.getDefault().willActivityBeVisible(
                        a.getActivityToken());
            } catch (RemoteException e) {
            }
        }
        if (r.window == null && !a.mFinished && willBeVisible) {
            r.window = r.activity.getWindow();
            View decor = r.window.getDecorView();
            decor.setVisibility(View.INVISIBLE);
            ViewManager wm = a.getWindowManager();
            WindowManager.LayoutParams l = r.window.getAttributes();
            a.mDecor = decor;
            l.type = WindowManager.LayoutParams.TYPE_BASE_APPLICATION;
            l.softInputMode |= forwardBit;
            if (a.mVisibleFromClient) {
                a.mWindowAdded = true;
                wm.addView(decor, l);
            }

        // If the window has already been added, but during resume
        // we started another activity, then don't yet make the
        // window visible.
        } else if (!willBeVisible) {
            if (localLOGV) Slog.v(
                TAG, "Launch " + r + " mStartedActivity set");
            r.hideForNow = true;
        }

        // Get rid of anything left hanging around.
        cleanUpPendingRemoveWindows(r);

        // The window is now visible if it has been added, we are not
        // simply finishing, and we are not starting another activity.
        if (!r.activity.mFinished && willBeVisible
                && r.activity.mDecor != null && !r.hideForNow) {
            if (r.newConfig != null) {
                r.tmpConfig.setTo(r.newConfig);
                if (r.overrideConfig != null) {
                    r.tmpConfig.updateFrom(r.overrideConfig);
                }
                if (DEBUG_CONFIGURATION) Slog.v(TAG, "Resuming activity "
                        + r.activityInfo.name + " with newConfig " + r.tmpConfig);
                performConfigurationChanged(r.activity, r.tmpConfig);
                freeTextLayoutCachesIfNeeded(r.activity.mCurrentConfig.diff(r.tmpConfig));
                r.newConfig = null;
            }
            if (localLOGV) Slog.v(TAG, "Resuming " + r + " with isForward="
                    + isForward);
            WindowManager.LayoutParams l = r.window.getAttributes();
            if ((l.softInputMode
                    & WindowManager.LayoutParams.SOFT_INPUT_IS_FORWARD_NAVIGATION)
                    != forwardBit) {
                l.softInputMode = (l.softInputMode
                        & (~WindowManager.LayoutParams.SOFT_INPUT_IS_FORWARD_NAVIGATION))
                        | forwardBit;
                if (r.activity.mVisibleFromClient) {
                    ViewManager wm = a.getWindowManager();
                    View decor = r.window.getDecorView();
                    wm.updateViewLayout(decor, l);
                }
            }
            r.activity.mVisibleFromServer = true;
            mNumVisibleActivities++;
            if (r.activity.mVisibleFromClient) {
                r.activity.makeVisible();
            }
        }

        if (!r.onlyLocalRequest) {
            r.nextIdle = mNewActivities;
            mNewActivities = r;
            if (localLOGV) Slog.v(
                TAG, "Scheduling idle handler for " + r);
            Looper.myQueue().addIdleHandler(new Idler());
        }
        r.onlyLocalRequest = false;

        // 通知AMS已经resume完成 Tell the activity manager we have resumed.
        if (reallyResume) {
            try {
                ActivityManagerNative.getDefault().activityResumed(token);
            } catch (RemoteException ex) {
            }
        }

    } else {
        // If an exception was thrown when trying to resume, then
        // just end this activity.
        try {
            ActivityManagerNative.getDefault()
                .finishActivity(token, Activity.RESULT_CANCELED, null, false);
        } catch (RemoteException ex) {
        }
    }
}
```

接着看`performResumeActivity()`方法：

```java
//ActivityThread类
public final ActivityClientRecord performResumeActivity(IBinder token,
        boolean clearHide) {
    ActivityClientRecord r = mActivities.get(token);
    if (localLOGV) Slog.v(TAG, "Performing resume of " + r
            + " finished=" + r.activity.mFinished);
    if (r != null && !r.activity.mFinished) {
        if (clearHide) {
            r.hideForNow = false;
            r.activity.mStartedActivity = false;
        }
        try {
            r.activity.onStateNotSaved();
            r.activity.mFragments.noteStateNotSaved();
            if (r.pendingIntents != null) {
                deliverNewIntents(r, r.pendingIntents);
                r.pendingIntents = null;
            }
            if (r.pendingResults != null) {
                deliverResults(r, r.pendingResults);
                r.pendingResults = null;
            }
            //注意这里，调用Activity的performResume()方法
            r.activity.performResume();

            EventLog.writeEvent(LOG_AM_ON_RESUME_CALLED,
                    UserHandle.myUserId(), r.activity.getComponentName().getClassName());

            r.paused = false;
            r.stopped = false;
            r.state = null;
            r.persistentState = null;
        } catch (Exception e) {
            if (!mInstrumentation.onException(r.activity, e)) {
                throw new RuntimeException(
                    "Unable to resume activity "
                    + r.intent.getComponent().toShortString()
                    + ": " + e.toString(), e);
            }
        }
    }
    return r;
}
```

ActivityThread类中的`performResumeActivity()`方法调用了Activity类的`performResume()`方法：

```java
//Activity类
final void performResume() {
    performRestart();

    mFragments.execPendingActions();

    mLastNonConfigurationInstances = null;

    mCalled = false;
    // 看这里 mResumed is set by the instrumentation
    mInstrumentation.callActivityOnResume(this);
    if (!mCalled) {
        throw new SuperNotCalledException(
            "Activity " + mComponent.toShortString() +
            " did not call through to super.onResume()");
    }

    // Now really resume, and install the current status bar and menu.
    mCalled = false;

    mFragments.dispatchResume();
    mFragments.execPendingActions();

    onPostResume();
    if (!mCalled) {
        throw new SuperNotCalledException(
            "Activity " + mComponent.toShortString() +
            " did not call through to super.onPostResume()");
    }
}
```

Instrumentation类中的`callActivityOnResume`方法

```java
/** Instrumentation类
 * Perform calling of an activity's {@link Activity#onResume} method.  The
 * default implementation simply calls through to that method.
 * 
 * @param activity The activity being resumed.
 */
public void callActivityOnResume(Activity activity) {
    activity.mResumed = true;
    activity.onResume();	//调用了onResume()方法完成了启动过程
    
    if (mActivityMonitors != null) {
        synchronized (mSync) {
            final int N = mActivityMonitors.size();
            for (int i=0; i<N; i++) {
                final ActivityMonitor am = mActivityMonitors.get(i);
                am.match(activity, activity, activity.getIntent());
            }
        }
    }
}
```




### 应用的主要启动流程

关于 App 启动流程的文章很多，文章底部有一些启动流程相关的参考文章，这里只列出大致流程如下：

1. 通过 Launcher 启动应用时，点击应用图标后，Launcher 调用 `startActivity()` 启动应用。
2. Launcher Activity 最终调用` Instrumentation` 的 `execStartActivity` 来启动应用。
3. `Instrumentation` 调用 `ActivityManagerProxy` (`ActivityManagerService` 在应用进程的一个代理对象) 对象的 `startActivity` 方法启动 Activity。
4. 到目前为止所有过程都在 Launcher 进程里面执行，接下来` ActivityManagerProxy` 对象跨进程调用` ActivityManagerService` (运行在**` system_server` **进程)的 `startActivity` 方法启动应用。
5. `ActivityManagerService` 的 `startActivity` 方法经过一系列调用，最后调用 `zygoteSendArgsAndGetResult` 通过` socket` 发送给 `zygote` 进程，`zygote` 进程会孵化出新的应用进程。
6. `zygote` 进程孵化出新的应用进程后，会执行` ActivityThread` 类的 `main()` 方法。在该方法里会先准备好 `Looper` 和消息队列，然后调用 `attach()` 方法将应用进程绑定到 `ActivityManagerService`，然后进入` loop` 循环，不断地读取消息队列里的消息，并分发消息。
7. `ActivityManagerService` 保存应用进程的一个代理对象，然后 `ActivityManagerService` 通过代理对象通知应用进程创建入口 Activity 的实例，并执行它的生命周期函数。



**总结过程就是：**用户在 `Launcher` 程序里点击应用图标时，会通知 `ActivityManagerService` 启动应用的入口 Activity， `ActivityManagerService` 发现这个应用还未启动，则会通知 `Zygote `进程孵化出应用进程，然后在这个应用进程里执行 `ActivityThread` 的 main() 方法。应用进程接下来通知` ActivityManagerService` 应用进程已启动，`ActivityManagerService` 保存应用进程的一个代理对象，这样` ActivityManagerService` 可以通过这个代理对象控制应用进程，然后 ActivityManagerService 通知应用进程创建入口 Activity 的实例，并执行它的生命周期函数。



**到这里，我们大概理解一下这几个相关类的定位**


（一）**ActivityManagerService**：（ActivityManagerNative）是核心管理类，负责组件的管理，在这里主要与ActivityStackSupervisor通信。

（二）**ActivityStackSupervisor**：管理整个手机任务栈，即管理着ActivityStack。

（三）**ActivityStack**：是Activity的栈，即任务栈，从中可以获取需要进行操作的ActivityRecord，并且可以对任务的进程进行操作。

（四）**ActivityThread**：是安卓java应用层的入口函数类，它会执行具体对Activity的操作，并将结果通知给ActivityManagerService。




### 参考

- [Activity启动流程简直丧心病狂！](https://www.jianshu.com/p/2bed70245c76)
- [【凯子哥带你学Framework】Activity启动过程全解析](http://blog.csdn.net/zhaokaiqiang1992/article/details/49428287)
- [Android源码解析之（十四）-->Activity启动流程](http://blog.csdn.net/qq_23547831/article/details/51224992)
- [图解Activity启动流程](http://www.cnblogs.com/solo-heart/articles/3871110.html)
- [Android 开发之 App 启动时间统计](https://www.jianshu.com/p/c967653a9468)
- [Android性能优化（一）之启动加速35%](https://juejin.im/post/5874bff0128fe1006b443fa0)
- [官方文档 - Launch-Time Performance](https://developer.android.com/topic/performance/launch-time.html)
![|500](https://pic.rmb.bdstatic.com/bjh/13975df155153ae785b86e901db44d921765.png)
# 一、课程目标

1.了解Frida-Native-Hook
2.借助ida脚本实现一键式hook

# 二、工具

1.教程Demo(更新)
2.jadx-gui
3.VS Code

# 三、课程内容
## 1.Process、Module、Memory基础
### 1.Process
`Process` 对象代表当前被Hook的进程，能获取进程的信息，枚举模块，枚举范围等
| API                       | 含义 |
|-------------------------------|-------------|
| `Process.id`                  | 返回附加目标进程的 `PID` |
| `Process.isDebuggerAttached()`| 检测当前是否对目标程序已经附加 |
| `Process.enumerateModules()`  | 枚举当前加载的模块，返回模块对象的数组 |
| `Process.enumerateThreads()`  | 枚举当前所有的线程，返回包含 `id`, `state`, `context` 等属性的对象数组 |

### 2.Module
`Module` 对象代表一个加载到进程的模块(例如，在 Windows 上的 DLL，或在 Linux/Android 上的 .so 文件),能查询模块的信息，如模块的基址、名称、导入/导出的函数等
| API                                                        | 含义                                                           |
|------------------------------------------------------------|----------------------------------------------------------------|
| `Module.load()`                                            | 加载指定so文件，返回一个Module对象                              |
| `enumerateImports()`                                       | 枚举所有Import库函数，返回Module数组对象                         |
| `enumerateExports()`                                       | 枚举所有Export库函数，返回Module数组对象                         |
| `enumerateSymbols()`                                       | 枚举所有Symbol库函数，返回Module数组对象                         |
| `Module.findExportByName(exportName)、Module.getExportByName(exportName)` | 寻找指定so中export库中的函数地址 |
| `Module.findBaseAddress(name)、Module.getBaseAddress(name)` | 返回so的基地址 |
### 3.Memory
`Memory`是一个工具对象，提供直接读取和修改进程内存的功能，能够读取特定地址的值、写入数据、分配内存等

| 方法                      | 功能                                                        |
| ------------------------- | ----------------------------------------------------------- |
| `Memory.copy()`           | 复制内存                                                    |
| `Memory.scan()`           | 搜索内存中特定模式的数据                                    |
| `Memory.scanSync()`       | 同上，但返回多个匹配的数据                                  |
| `Memory.alloc()`          | 在目标进程的堆上申请指定大小的内存，返回一个`NativePointer` |
| `Memory.writeByteArray()` | 将字节数组写入一个指定内存                                  |
| `Memory.readByteArray`                          | 读取内存                                                            |

## 2.枚举导入导出表

1. **导出表（Export Table）**：列出了库中可以被其他程序或库访问的所有公开函数和符号的名称。
2. **导入表（Import Table）**：列出了库需要从其他库中调用的函数和符号的名称。

简而言之，导出表告诉其他程序：“这些是我提供的功能。”，而导入表则表示：“这些是我需要的功能。”。

```js
function hookTest1(){
    Java.perform(function(){
        //打印导入表
        var imports = Module.enumerateImports("lib52pojie.so");
        for(var i =0; i < imports.length;i++){
            if(imports[i].name == "vip"){
                console.log(JSON.stringify(imports[i])); //通过JSON.stringify打印object数据
                console.log(imports[i].address);
            }
        }
        //打印导出表
        var exports = Module.enumerateExports("lib52pojie.so");
        for(var i =0; i < exports.length;i++){
            console.log(JSON.stringify(exports[i]));
        }
        
    })
}
```
## 3.Native函数的基础Hook打印
1. 整数型、布尔值类型、char类型
```JS
function hookTest2(){
    Java.perform(function(){
        //根据导出函数名打印地址
        var helloAddr = Module.findExportByName("lib52pojie.so","Java_com_xiaojianbang_app_NativeHelper_add");
        console.log(helloAddr); 
        if(helloAddr != null){
	        //Interceptor.attach是Frida里的一个拦截器
            Interceptor.attach(helloAddr,{
	            //onEnter里可以打印和修改参数
                onEnter: function(args){  //args传入参数
                    console.log(args[0]);  //打印第一个参数的值
                    console.log(this.context.x1);  // 打印寄存器内容
                    console.log(args[1].toInt32()); //toInt32()转十进制
					console.log(args[2].readCString()); //读取字符串 char类型
					console.log(hexdump(args[2])); //内存dump

                },
                //onLeave里可以打印和修改返回值
                onLeave: function(retval){  //retval返回值
                    console.log(retval);
                    console.log("retval",retval.toInt32());
                }
            })
        }
    })
}
```
2. 字符串类型
```js
function hookTest2(){
    Java.perform(function(){
        //根据导出函数名打印地址
        var helloAddr = Module.findExportByName("lib52pojie.so","Java_com_zj_wuaipojie_util_SecurityUtil_vipLevel");
        if(helloAddr != null){
            Interceptor.attach(helloAddr,{
                //onEnter里可以打印和修改参数
                onEnter: function(args){  //args传入参数
                    // 方法一
                    var jString = Java.cast(args[2], Java.use('java.lang.String'));
                    console.log("参数:", jString.toString());
                    // 方法二
                    var JNIEnv = Java.vm.getEnv();
                    var originalStrPtr = JNIEnv.getStringUtfChars(args[2], null).readCString();	
                    console.log("参数:", originalStrPtr);				
                },
                //onLeave里可以打印和修改返回值
                onLeave: function(retval){  //retval返回值
                    var returnedJString = Java.cast(retval, Java.use('java.lang.String'));
                    console.log("返回值:", returnedJString.toString());
                }
            })
        }
    })
}

```

## 4.Native函数的基础Hook修改
1. 整数型修改
```js
function hookTest3(){
    Java.perform(function(){
        //根据导出函数名打印地址
        var helloAddr = Module.findExportByName("lib52pojie.so","func_four");
        console.log(helloAddr);
        if(helloAddr != null){
            Interceptor.attach(helloAddr,{
                onEnter: function(args){  //args参数
                    args[0] = ptr(1000); //第一个参数修改为整数 1000，先转为指针再赋值
                    console.log(args[0]);
                      
                },
                onLeave: function(retval){  //retval返回值
                    retval.replace(20000);  //返回值修改
                    console.log("retval",retval.toInt32());
                }
            })
        }
    })
}
```
2. 字符串类型修改
```js
function hookTest2(){
    Java.perform(function(){
        //根据导出函数名打印地址
        var helloAddr = Module.findExportByName("lib52pojie.so","Java_com_zj_wuaipojie_util_SecurityUtil_vipLevel");
        if(helloAddr != null){
            Interceptor.attach(helloAddr,{
                //onEnter里可以打印和修改参数
                onEnter: function(args){  //args传入参数
                    var JNIEnv = Java.vm.getEnv();
                    var originalStrPtr = JNIEnv.getStringUtfChars(args[2], null).readCString();	
                    console.log("参数:", originalStrPtr);
                    var modifiedContent = "至尊";
                    var newJString = JNIEnv.newStringUtf(modifiedContent);
                    args[2] = newJString;				
                },
                //onLeave里可以打印和修改返回值
                onLeave: function(retval){  //retval返回值
                    var returnedJString = Java.cast(retval, Java.use('java.lang.String'));
                    console.log("返回值:", returnedJString.toString());
                    var JNIEnv = Java.vm.getEnv();
                    var modifiedContent = "无敌";
                    var newJString = JNIEnv.newStringUtf(modifiedContent);
                    retval.replace(newJString);
                }
            })
        }
    })
}
```

## 5.SO基址的获取方式
```js
var moduleAddr1 = Process.findModuleByName("lib52pojie.so").base;  
var moduleAddr2 = Process.getModuleByName("lib52pojie.so").base;  
var moduleAddr3 = Module.findBaseAddress("lib52pojie.so");
```
## 6.Hook未导出函数与函数地址计算
```js
function hookTest6(){
    Java.perform(function(){
        //根据导出函数名打印基址
        var soAddr = Module.findBaseAddress("lib52pojie.so");
        console.log(soAddr);
        var funcaddr = soAddr.add(0x1071C);  
        console.log(funcaddr);
        if(funcaddr != null){
            Interceptor.attach(funcaddr,{
                onEnter: function(args){  //args参数
 
                },
                onLeave: function(retval){  //retval返回值
                    console.log(retval.toInt32());
                }
            })
        }
    })
}
```

函数地址计算
1. 安卓里一般32 位的 so 中都是`thumb`指令，64 位的 so 中都是`arm`指令
2. 通过IDA里的opcode bytes来判断，arm 指令为 4 个字节(options -> general -> Number of opcode bytes (non-graph)  输入4)
3. thumb 指令，函数地址计算方式： so 基址 + 函数在 so 中的偏移 + 1  
	arm 指令，函数地址计算方式： so 基址 + 函数在 so 中的偏移

## 7.Hook_dlopen
[dlopen源码](http://aospxref.com/android-8.0.0_r36/xref/bionic/libdl/libdl.c?r=&mo=4035&fi=101#101)
[android_dlopen_ext源码](http://aospxref.com/android-8.0.0_r36/xref/bionic/libdl/libdl.c#146)

```js
function hook_dlopen() {
    var dlopen = Module.findExportByName(null, "dlopen");
    Interceptor.attach(dlopen, {
        onEnter: function (args) {
            var so_name = args[0].readCString();
            if (so_name.indexOf("lib52pojie.so") >= 0) this.call_hook = true;
        }, onLeave: function (retval) {
            if (this.call_hook) hookTest2();
        }
    });
    // 高版本Android系统使用android_dlopen_ext
    var android_dlopen_ext = Module.findExportByName(null, "android_dlopen_ext");
    Interceptor.attach(android_dlopen_ext, {
        onEnter: function (args) {
            var so_name = args[0].readCString();
            if (so_name.indexOf("lib52pojie.so") >= 0) this.call_hook = true;
        }, onLeave: function (retval) {
            if (this.call_hook) hookTest2();
        }
    });
}
```

## 8.借助IDA脚本实现一键式hook
![图片](https://pic.rmb.bdstatic.com/bjh/a5da95feb308079617adbee3cfae85357280.png)
[IDA&Frida 学习](https://www.52pojie.cn/forum.php?mod=viewthread&tid=1759879&highlight=frida)

#  四、课后小作业


[作业反馈贴](https://www.52pojie.cn/thread-1706783-1-1.html)
# 五、答疑

待更新

# 六、视频及课件地址


[百度云](https://pan.baidu.com/s/1cFWTLn14jeWfpXxlx3syYw?pwd=nqu9)
[阿里云](https://www.aliyundrive.com/s/TJoKMK6du6x)
[哔哩哔哩](https://www.bilibili.com/video/BV1wT411N7sV/?spm_id_from=333.788&vd_source=6dde16dc6479f00694baaf73a2225452)
PS:解压密码都是52pj，阿里云由于不能分享压缩包，所以下载exe文件，双击自解压

# 七、其他章节
[《安卓逆向这档事》一、模拟器环境搭建](https://www.52pojie.cn/thread-1695141-1-1.html)  
[《安卓逆向这档事》二、初识APK文件结构、双开、汉化、基础修改](https://www.52pojie.cn/thread-1695796-1-1.html)  
[《安卓逆向这档事》三、初识smail，vip终结者](https://www.52pojie.cn/thread-1701353-1-1.html)  
[《安卓逆向这档事》四、恭喜你获得广告&弹窗静默卡](https://www.52pojie.cn/thread-1706691-1-1.html)  
[《安卓逆向这档事》五、1000-7=？&动态调试&Log插桩](https://www.52pojie.cn/thread-1714727-1-1.html)  
[《安卓逆向这档事》六、校验的N次方-签名校验对抗、PM代{过}{滤}理、IO重定向](https://www.52pojie.cn/thread-1731181-1-1.html)  
[《安卓逆向这档事》七、Sorry，会Hook真的可以为所欲为-Xposed快速上手(上)模块编写,常用Api](https://www.52pojie.cn/thread-1740944-1-1.html)  
[《安卓逆向这档事》八、Sorry，会Hook真的可以为所欲为-xposed快速上手(下)快速hook](https://www.52pojie.cn/thread-1748081-1-1.html)  
[《安卓逆向这档事》九、密码学基础、算法自吐、非标准加密对抗](https://www.52pojie.cn/thread-1762225-1-1.html)  
[《安卓逆向这档事》十、不是我说，有了IDA还要什么女朋友？](https://www.52pojie.cn/thread-1787667-1-1.html)  
[《安卓逆向这档事》十二、大佬帮我分析一下](https://www.52pojie.cn/thread-1809646-1-1.html)  
[《安卓逆向这档事》番外实战篇1-某电影视全家桶](https://www.52pojie.cn/thread-1814917-1-1.html)  
[《安卓逆向这档事》十三、是时候学习一下Frida一把梭了(上)](https://www.52pojie.cn/thread-1823118-1-1.html)
# 八、参考文档
[FRIDA-API使用篇：rpc、Process、Module、Memory使用方法及示例](https://www.anquanke.com/post/id/195215)
[IDA&Frida 学习](https://www.52pojie.cn/forum.php?mod=viewthread&tid=1759879&highlight=frida)
[Frida Hook 常用函数、java 层 hook、so 层 hook、RPC、群控](https://blog.csdn.net/freeking101/article/details/112634649)

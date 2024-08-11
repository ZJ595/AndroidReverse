![图片|800](_assets_21/01c867a0f9c7aa12547fff13d7da37233297.png)  
# 一、课程目标  
1.了解Flutter基本概念以及识别特征  
2.了解Flutter应用的抓包对抗策略  
3.了解Flutter反编译以及实战  
# 二、工具  
  
1.某读app  
2.proxypin  
3.blutter  
# 三、课程内容  
## 1.Flutter简介  
Flutter是Google构建在开源的Dart VM之上，使用Dart语言开发的移动应用开发框架，可以帮助开发者使用一套Dart代码就能快速在移动iOS 、Android上构建高质量的原生用户界面，同时还支持开发Web和桌面应用。  
`Flutter`引擎是一个用于**高质量跨平台应用的可移植运行时，由**`C/C++`**编写**。它实现了`Flutter`的核心库，包括动画和图形、文件和网络I/O、辅助功能支持、插件架构，以及用于开发、编译和运行`Flutter`应用程序的`Dart`**运行时**和工具链。引擎将底层`C++`代码包装成 `Dart`代码，通过`dart:ui`暴露给 `Flutter`框架层。  
[flutter开源地址](https://github.com/flutter/flutter)  
[flutter官网](https://flutter.dev/)  
![](_assets_21/fd5f2e774a73c9cab41771670ddd44d63517.jpeg)  
  
[[原创]Flutter概述和逆向技术发展时间线，带你快速了解](https://bbs.kanxue.com/thread-274981.htm)  
## 2.Flutter特征  
在逆向分析前，我们首先要确定测试目标是否用Flutter开发的。当使用Flutter构建Android APP时，在assets文件夹下会有dexopt和flutter_assets两个文件夹  
![图片](_assets_21/10412680bca1b1eb36f35b94753359722389.png)  
lib文件夹会有两个so文件：libapp.so和libflutter.so(flutter动态链接库，与实际业务代码无关)  
![图片](_assets_21/327705fdbf6c6e9174662278103993333896.png)  
  
## 3.Flutter抓包对抗  
`原理:`  
1. **Dart语言标准库的网络请求不走Wi-Fi代理**：Flutter使用的是Dart语言，其标准库中的网络请求不会通过代理发送，这与许多其他应用不同。常规的抓包工具通常依赖于代理来捕获网络流量，因此无法捕获Flutter应用的网络请求。  
2. **Dart SDK中的证书信任**：Dart SDK在Android平台上强制只信任系统目录下的证书。这意味着Flutter应用不会信任用户安装的证书，除非这些证书位于Android系统的`/system/etc/security/cacerts`目录中。这是通过Dart源码中的`runtime/bin/security_context_linux.cc`文件实现的。  
  
通过分析Flutter应用程序抛出的错误，可以定位到触发错误的源代码位置，错误指向了`handshake.cc:352`，这是一个处理SSL握手的源代码位置。  
```  
 E/flutter (10371):  [ERROR:flutter/runtime/dart_isolate.cc(805)] Unhandled exception:  
 E/flutter (10371):  HandshakeException: Handshake error in client (OS Error:  
 E/flutter (10371):  NO_START_LINE(pem_lib.c:631)  
 E/flutter (10371):  PEM routines(by_file.c:146)  
 E/flutter (10371):  NO_START_LINE(pem_lib.c:631)  
 E/flutter (10371):  PEM routines(by_file.c:146)  
 E/flutter (10371):  CERTIFICATE_VERIFY_FAILED: self signed certificate in certificate chain(handshake.cc:352))  
```  
为了绕过SSL验证，需要找到一个合适的hook点，即源代码中可以被拦截和修改以改变程序行为的位置。`ssl_verify_peer_cert`函数是一个可能的hook点，但经过测试，仅仅修改这个函数的返回值并不能成功绕过SSL验证。  
进一步分析源代码后，发现`session_verify_cert_chain`函数可以作为另一个hook点。这个函数在验证证书链时，如果证书验证失败，会返回一个错误。  
```C  
ret = ssl->ctx->x509_method->session_verify_cert_chain(  
              hs->new_session.get(), hs, &alert)  
              ? ssl_verify_ok  
              : ssl_verify_invalid;  
```  
session_verify_cert_chain函数定义在ssl_x509.cc，在该方法里可以看到有`ssl_client和ssl_server`两个字符串可以辅助定位方法  
![图片](_assets_21/4e90d681954f292f3d0d1fa449a283826951.png)  
  
### 1.hook_ssl_client  
在libflutter.so里搜索`ssl_client`定位到方法，内存搜刮函数前10字节定位，在运行时将返回函数改为true即可绕过证书链检查实现抓包(这里以64位的so为例)  
![图片](_assets_21/fc153f6ac1c211d8585b54ec7aed6f106586.png)  
  
```js  
function hook_dlopen() {  
    var android_dlopen_ext = Module.findExportByName(null, "android_dlopen_ext");  
    Interceptor.attach(android_dlopen_ext, {  
        onEnter: function (args) {  
            var so_name = args[0].readCString();  
            if (so_name.indexOf("libflutter.so") >= 0) this.call_hook = true;  
        }, onLeave: function (retval) {  
            if (this.call_hook) hookFlutter();  
        }  
    });  
}  
  
function hook_ssl_verify_result(address) {  
    Interceptor.attach(address, {  
            onEnter: function(args) {  
                console.log("Disabling SSL validation")  
            },  
            onLeave: function(retval) {  
				console.log("Retval: " + retval);  
                retval.replace(0x1);  
            }  
        });  
    }  
function hookFlutter() {  
    var m = Process.findModuleByName("libflutter.so");  
    //利用函数前10字节定位  
    var pattern = "FF C3 01 D1 FD 7B 01 A9 FC 6F 02 A9FA 67 03 A9 F8 5F 04 A9 F6 57 05 A9 F4 4F 06 A9 08 0A 80 52 48 00 00 39";  
    var res = Memory.scan(m.base, m.size, pattern, {  
        onMatch: function(address, size){  
            console.log('[+] ssl_verify_result found at: ' + address.toString());  
        // Add 0x01 because it's a THUMB function  
        // Otherwise, we would get 'Error: unable to intercept function at 0x9906f8ac; please file a bug'  
            hook_ssl_verify_result(address);  
        },  
        onError: function(reason){  
            console.log('[!] There was an error scanning memory');  
        },  
        onComplete: function() {  
            console.log("All done")  
        }  
    });  
}  
  
```  
  
### 2.reflutter之patch  
[reFlutter开源地址](https://github.com/Impact-I/reFlutter)  
![图片](_assets_21/ccffa5dc15c369ef1db76ef41a13bb903741.png)  
1.pip3 install reflutter pip安装对应的库  
2.输入命令：reflutter flutter.apk  
选择1流量监控和拦截，输入PC端的IP地址后(cmd窗口输入ipconfig)，将获取到release.RE.apk，但此apk尚未签名，需要我们手动签名(输入命令的过程需要全局代理)  
![图片](_assets_21/cea0767af148752ed9b8fbee9084b9c53235.png)  
  
3.使用MT管理器或者uber-apk-signer.jar签名，输入命令：_java -jar uber-apk-signer-1.2.1.jar --apk release.RE.apk_。然后将重签名的apk安装到真机或者模拟器上。  
4.设置BurpSuite的代理，端口为8083，绑定所有地址，并且勾选All interfaces，使非代理意识的客户端直接连接到侦听器。  
[BurpSuitePro-2.1](https://github.com/TrojanAZhen/BurpSuitePro-2.1)  
![图片](_assets_21/220f891dcbe0141f943329092d824e8f4823.png)  
![图片](_assets_21/55c4c46ec2a7069adba004a951b6155f8883.png)  
5.设置Drony的wifi代理主机名端口和BurpSuite一致，然后触发app就能抓到包了  
![图片](_assets_21/eb0b10801f015a40537d6a47f65a81e64424.png)  
  
### 3.Reqable&proxyPin(推荐)  
Reqable或者proxyPin直接抓包即可(工具下载看上一课)  
![图片](_assets_21/b1f52f35ce477799124866bf8c2f03665392.png)  
![图片](_assets_21/acbec70f90e02bc9b22e03329310dced8210.png)  
  
## 4.Flutter反编译  
### 1.快照  
使用`readelf -s`命令读取保存快照信息的`libapp.so`将会输出下面的内容  
```  
Symbol table '.dynsym' contains 6 entries:  
Num:    Value          Size Type    Bind   Vis      Ndx Name  
 0: 0000000000000000     0 NOTYPE  LOCAL  DEFAULT  UND  
 1: 000000000014c000 29728 OBJECT  GLOBAL DEFAULT    7 _kDartVmSnapshotInstructi  
 2: 0000000000153440 0x22bd30 OBJECT  GLOBAL DEFAULT    7 _kDartIsolateSnapshotInst  
 3: 0000000000000200 15248 OBJECT  GLOBAL DEFAULT    2 _kDartVmSnapshotData  
 4: 0000000000003dc0 0x147af0 OBJECT  GLOBAL DEFAULT    2 _kDartIsolateSnapshotData  
 5: 00000000000001c8    32 OBJECT  GLOBAL DEFAULT    1 _kDartSnapshotBuildId  
```  
“快照”指的是 Flutter 应用在编译过程中生成的特定数据结构，用于加速应用的启动和运行。具体来说，快照包括四种类型：  
- **`_kDartVmSnapshotData`**： 代表 isolate 之间共享的 Dart 堆 (heap) 的初始状态。有助于更快地启动 Dart isolate，但不包含任何 isolate 专属的信息。  
  
- **`_kDartVmSnapshotInstructions`**：包含 VM 中所有 Dart isolate 之间共享的通用例程的 AOT 指令。这种快照的体积通常非常小，并且大多会包含程序桩 (stub)。  
  
- **`_kDartIsolateSnapshotData`**：代表 Dart 堆的初始状态，并包含 isolate 专属的信息。  
  
- **`_kDartIsolateSnapshotInstructions`**：包含由 Dart isolate 执行的 AOT 代码。  
  
其中`_kDartIsolateSnapshotInstructions`是最为重要的，因为包含了所有要执行的AOT代码，即业务相关的代码。  
  
### 2.逆向方法  
1.(静态)解析libapp.so，即写一个解析器，将libapp.so中的快照数据按照其既定格式进行解析，获取业务代码的类的各种信息，包括类的名称、其中方法的偏移等数据，从而辅助逆向工作。  
关于Flutter快照的具体刨析只需要看下面引用的两篇文章  
[Reverse engineering Flutter apps (Part 1) (tst.sh)](https://blog.tst.sh/reverse-engineering-flutter-apps-part-1/)  
[Reverse engineering Flutter apps (Part 2) (tst.sh)](https://blog.tst.sh/reverse-engineering-flutter-apps-part-2/)  
2.(动态)编译修改过的`libflutter.so`并且重新打包到APK中，在启动APP的过程中，由修改过的引擎动态链接库将快照数据获取并且保存。  
  
PS:不同版本的Dart引擎其快照格式不同，所以静态的方法就需要频繁跟着版本更新迭代，成本极高，而动态也需要重新编译对应版本的链接库。同时如果APP作者抹除版本信息和hash信息，则无从下手，且重打包APK极易被检测到。  
  
静态方法推荐工具:[blutter](https://github.com/worawit/blutter)  
动态方法推荐工具:[reFlutter](https://github.com/Impact-I/reFlutter)  
  
### 3.blutter实战  
环境:python3.10  
1.首先安装git  
[下载地址](https://git-scm.com/downloads)  
![图片|500](_assets_21/7ee730055cad5f62a71757086a60393e6576.png)  
2.下载visual studio  
[下载地址](https://visualstudio.microsoft.com/zh-hans/)  
![图片|500](_assets_21/2fe64e3f49905acfb778c9e768d877903919.png)  
3.下载安装，在工作负荷里勾选"使用C++的桌面开发"  
![图片](_assets_21/0a9a2100cf372797d71d6eef020f20995509.png)  
  
4.clone项目(全程运行在代理环境否则会导致无法下载)，或者下载解压到指定文件夹  
```  
git clone https://github.com/worawit/blutter --depth=1  
```  
5.进入到blutter文件夹，cmd窗口运行初始化脚本  
```  
python .\scripts\init_env_win.py  
```  
![图片](_assets_21/270791dea38b7180e01545da7451c4838629.png)  
6.要打开`x64 Native Tools Command Prompt`,它可以在`Visual Studio`文件夹中找到  
![图片](_assets_21/46ae4e01cb09f73cdcc08aa9d186a59f4749.png)  
7.把需要反编译的flutterapp用压缩包打开，提取v8a里的`libflutter.so`和`libapp.so`(现在基本上是64位)解压到blutter文件夹，并创建一个输出结果的文件夹  
![图片](_assets_21/2c99b38732db09c7c53ff41c01558c829480.png)  
8.在刚才打开的x64窗口运行下面的命令(全局代理!)，等待运行完后会在output文件下生成一些脚本信息  
PS:blutter目前支持最新的版本的dart快照解析，如果这个跑不起来可以参考第四步手动配置  
```  
python blutter.py .\arm64-v8a\ .\output  
```  
![图片](_assets_21/8d1507667471fd97a56535605ee2f8394322.png)  
![图片](_assets_21/cca5d2acd5a5489d4deabe0a8cb1075c7230.png)  
```  
asm 对dart语言的反编译结果，里面有很多dart源代码的对应偏移  
ida_script so文件的符号表还原脚本  
blutter_frida.js目标应用程序的 frida 脚本模板  
objs.txt对象池中对象的完整（嵌套）转储,对象池里面的方法和相应的偏移量  
pp.txt对象池中的所有 Dart 对象  
  
```  
  
9.接下来ida加载libapp.so，然后ida左上角点击file，再点击Script file加载符号解析脚本  
![图片](_assets_21/b3c57e78ebf7c0f4b78a7455d2d8202c9612.png)  
10.至此可以看到so里的相关函数以显现  
![图片](_assets_21/b558f9e5955df257c7a69fdf2674a32b7773.png)  
`协议实现:`  
```python  
import hashlib  
import base64  
import requests  
  
headers = {  
    'user-agent': 'Dart/3.1 (dart:io)',  
    'content-type': 'application/json; charset=utf-8',  
    'accept-encoding': 'gzip',  
    'host': 'api.mandu.pro',  
    'Content-Length': '98',  
}  
def hash_and_encode(input_string):  
    sha256_hash = hashlib.sha256()  
    sha256_hash.update(input_string.encode('utf-8'))  
    hash_bytes = sha256_hash.digest()  
    base64_encoded = base64.b64encode(hash_bytes).decode('utf-8')  
    return base64_encoded  
  
input_string = "md123456"  
result = hash_and_encode(input_string)  
  
json_data = {  
    'account': 'xxx@qq.com',  
    'type': 1,  
    'password': result,  
}  
  
response = requests.post('https://api.xxx.pro/user/session', headers=headers, json=json_data)  
print(response.text)  
```  
# 六、视频及课件地址  
  
  
[百度云](https://pan.baidu.com/s/1cFWTLn14jeWfpXxlx3syYw?pwd=nqu9)  
[阿里云](https://www.aliyundrive.com/s/TJoKMK6du6x)  
[哔哩哔哩](https://www.bilibili.com/video/BV1wT411N7sV/?spm_id_from=333.788&vd_source=6dde16dc6479f00694baaf73a2225452)  
[教程开源地址](https://github.com/ZJ595/AndroidReverse)  
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
[《安卓逆向这档事》十四、是时候学习一下Frida一把梭了(中)](https://www.52pojie.cn/thread-1838539-1-1.html)  
[《安卓逆向这档事》十五、是时候学习一下Frida一把梭了(下)](https://www.52pojie.cn/thread-1840174-1-1.html)  
[《安卓逆向这档事》十六、是时候学习一下Frida一把梭了(终)](https://www.52pojie.cn/thread-1859820-1-1.html#/)  
[《安卓逆向这档事》十七、你的RPCvs佬的RPC](https://www.52pojie.cn/thread-1892127-1-1.html#/)  
[《安卓逆向这档事》番外实战篇2-【2024春节】解题领红包活动，启动!](https://www.52pojie.cn/thread-1893708-1-1.html#/)  
[《安卓逆向这档事》十八、表哥，你也不想你的Frida被检测吧!(上)](https://www.52pojie.cn/thread-1921073-1-1.html)  
[《安卓逆向这档事》十九、表哥，你也不想你的Frida被检测吧!(下)](https://www.52pojie.cn/thread-1938862-1-1.html)  
[《安卓逆向这档事》二十、抓包学得好，牢饭吃得饱(上)](https://www.52pojie.cn/thread-1945285-1-1.html)  
# 八、参考文档  
[[原创]Flutter概述和逆向技术发展时间线，带你快速了解](https://bbs.kanxue.com/thread-274981.htm)  
[blutter](https://github.com/worawit/blutter)  
[reFlutter](https://github.com/Impact-I/reFlutter)  
[[翻译]Flutter 逆向初探](https://bbs.kanxue.com/thread-275953.htm)  
[[原创]一种基于frida和drony的针对flutter抓包的方法](https://bbs.kanxue.com/thread-261941.htm)  
[Android-Flutter逆向](https://blog.lleavesg.top/article/Flutter-Reverse#9a5b45b33a1549a9a8d19f7fcc75384f)  
[Flutter Android APP 逆向系列 (一)](https://dawnnnnnn.com/2024/06/:/day/Flutter%20Android%20APP%E9%80%86%E5%90%91/)  

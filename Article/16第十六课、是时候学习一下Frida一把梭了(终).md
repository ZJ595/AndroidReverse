![|500](https://pic.rmb.bdstatic.com/bjh/13975df155153ae785b86e901db44d921765.png)

# 题外话(盗课后续)
吃瓜地址:https://www.52pojie.cn/thread-1854492-1-1.html

盗版课程地址:https://www.mashibing.com/live/2520

![img](https://pic.rmb.bdstatic.com/bjh/bb1e9696cffc6368f24605e2beb99f16502.png)
![img](https://pic.rmb.bdstatic.com/bjh/d3cdcddccaaf1eba5e437f1ea8c458939121.png)
![img](https://pic.rmb.bdstatic.com/bjh/006f2041e717d32f007ac202d9bd245d4025.png)

PS:感谢北京金诚同达（沈阳）律师事务所-黄律师一直无偿帮我解疑

吾爱破解论坛官方B站号:https://space.bilibili.com/544451485

我的B站号:https://space.bilibili.com/337859280

《安卓逆向这档事》视频教程地址:https://www.bilibili.com/video/BV1wT411N7sV

教程开源地址:https://github.com/ZJ595/AndroidReverse
# 一、课程目标

1.了解Frida-Native-Hook读写、主动调用

2.了解常见的frida_trace工具

3.了解控制流混淆对抗新思路

# 二、工具

1.教程Demo(更新)

2.jadx-gui

3.VS Code

4.jeb

# 三、课程内容
## 1.Frida写数据

```js
//一般写在app的私有目录里，不然会报错:failed to open file (Permission denied)(实际上就是权限不足)
var file_path = "/data/user/0/com.zj.wuaipojie/test.txt";
var file_handle = new File(file_path, "wb");
if (file_handle && file_handle != null) {
        file_handle.write(data); //写入数据
        file_handle.flush(); //刷新
        file_handle.close(); //关闭
}
```
## 2.Frida_inlineHook与读写汇编
什么是inlinehook？
Inline hook（内联钩子）是一种在程序运行时修改函数执行流程的技术。**它通过修改函数的原始代码，将目标函数的执行路径重定向到自定义的代码段，从而实现对目标函数的拦截和修改。**
简单来说就是可以对任意地址的指令进行hook读写操作

常见inlinehook框架:

[Android-Inline-Hook](https://github.com/ele7enxxh/Android-Inline-Hook)

[whale](https://github.com/asLody/whale)

[Dobby](https://github.com/jmpews/Dobby)

[substrate](http://www.cydiasubstrate.com/)

PS：Frida的inlinehook不是太稳定，崩溃是基操，另外新版的frida兼容性会比较好
```js
function inline_hook() {
    var soAddr = Module.findBaseAddress("lib52pojie.so");
    if (soAddr) {
        var func_addr = soAddr.add(0x10428);
        Java.perform(function () {
            Interceptor.attach(func_addr, {
                onEnter: function (args) {
                    console.log(this.context.x22); //注意此时就没有args概念了
                    this.context.x22 = ptr(1); //赋值方法参考上一节课
                },
                onLeave: function (retval) {
                }
            }
            )
        })
    }
}

```

1. 将地址的指令解析成汇编
```js
var soAddr = Module.findBaseAddress("lib52pojie.so");
var codeAddr = Instruction.parse(soAddr.add(0x10428));
console.log(codeAddr.toString());
```
2. Frida Api

[arm转hex](https://armconverter.com/)
```js
var soAddr = Module.findBaseAddress("lib52pojie.so");
var codeAddr = soAddr.add(0x10428);
Memory.patchCode(codeAddr, 4, function(code) {
    const writer = new Arm64Writer(code, { pc: codeAddr });
    writer.putBytes(hexToBytes("20008052"));
    writer.flush();
});
function hexToBytes(str) {
    var pos = 0;
    var len = str.length;
    if (len % 2 != 0) {
        return null;
    }
    len /= 2;
    var hexA = new Array();
    for (var i = 0; i < len; i++) {
        var s = str.substr(pos, 2);
        var v = parseInt(s, 16);
        hexA.push(v);
        pos += 2;
    }
    return hexA;
}
```

## 3.普通函数与jni函数的主动调用
[nativefunction](https://frida.re/docs/javascript-api/#nativefunction)

| 数据类型 | 描述             |
|---------|------------------|
| void    | 无返回值         |
| pointer | 指针             |
| int     | 整数             |
| long    | 长整数           |
| char    | 字符             |
| float   | 浮点数           |
| double  | 双精度浮点数     |
| bool    | 布尔值           |


```js
var funcAddr = Module.findBaseAddress("lib52pojie.so").add(0x1054C);
//声明函数指针
//NativeFunction的第一个参数是地址，第二个参数是返回值类型，第三个[]里的是传入的参数类型(有几个就填几个)
var aesAddr = new NativeFunction(funcAddr , 'pointer', ['pointer', 'pointer']);
var encry_text = Memory.allocUtf8String("OOmGYpk6s0qPSXEPp4X31g==");    //开辟一个指针存放字符串       
var key = Memory.allocUtf8String('wuaipojie0123456'); 
console.log(aesAddr(encry_text ,key).readCString());

```

jni的主动调用
参考java的主动调用，简单快捷

## 4.Trace

| 工具名称          | 描述                                                                         | 链接                                                                   |
| ----------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| jnitrace          | 老牌，经典，信息全，携带方便                                                 | [jnitrace](https://github.com/chame1eon/jnitrace)                      |
| jnitrace-engine   | 基于jnitrace，可定制化                                                       | [jnitrace-engine](https://github.com/chame1eon/jnitrace-engine)        |
| jtrace            | 定制方便，信息全面，直接在_agent.js或者_agent_stable.js 里面加自己的逻辑就行 | [jtrace](https://github.com/SeeFlowerX/jtrace)                          |
| hook_art.js       | 可提供jni trace，可以灵活的增加你需要hook的函数                              | [hook_art.js](https://github.com/lasting-yang/frida_hook_libart)       |
| JNI-Frida-Hook    | 函数名已定义，方便定位                                                       | [JNI-Frida-Hook](https://github.com/Areizen/JNI-Frida-Hook)            |
| findhash          | ida插件，可用于检测加解密函数，也可作为Native Trace库                        | [findhash](https://github.com/Pr0214/findhash)                         |
|           Stalker        |    frida官方提供的代码跟踪引擎，可以在Native层方法级别，块级别，指令级别实现代码修改，代码跟踪                                                                         |    [Stalker](https://frida.re/docs/stalker/)                                                                   |
| sktrace           | 类似 ida 指令 trace 功能                                                     | [sktrace](https://github.com/bmax121/sktrace)                          |
| frida-qbdi-tracer | 速度比frida stalker快，免补环境                                              | [frida-qbdi-tracer](https://github.com/lasting-yang/frida-qbdi-tracer) |

PS:这次介绍的几款工具都是基础用法，更深入的还需要大家去看看源码学习

### 4.1 frida-trace
[官方文档](https://frida.re/docs/frida-trace/)

frida-trace 可以一次性监控一堆函数地址。还能打印出比较漂亮的树状图，不仅可以显示调用流程，还能显示调用层次。并且贴心的把不同线程调用结果用不同的颜色区分开了。
大佬整理的文档:

[frida-trace](https://crifan.github.io/reverse_debug_frida/website/use_frida/frida_trace/)
```
D:\> frida-trace.exe --help  
用法: frida-trace [options] target

位置参数:  
   args                  extra arguments and/or target

选项:  
  -h, --help               显示帮助  
  -D ID, --device ID       通过 ID 连接设备  
  -U, --usb                通过 USB 连接设备  
  -R, --remote             连接到远程 frida-server  
  -H HOST, --host HOST     连接到远程 host 上的 frida-server  
  --certificate 证书       设置证书，通过 TSL 与 host 交互                          
  --origin ORIGIN          设置连接到远程服务的 "Origin" 头部  
  --token TOKEN            设置 与host 认证  
  --keepalive-interval     时间间隔。0表示禁用，-1表示基于传输自动选择                          
  --p2p                    建立一个点对点的连接  
  --stun-server ADDRESS    设置--p2p 的 STUN 服务地址  
  --relay address,username,password,turn-{udp,tcp,tls}  添加--p2p 延迟  
  -f TARGET, --file TARGET       spawn 模式  
  -F, --attach-frontmost         附加到最前端的 application  
  -n NAME, --attach-name NAME    附加到一个名字                          
  -N IDENTIFIER, --attach-identifier IDENTIFIER   附加到标识符                          
  -p PID, --attach-pid PID        附加到 pid                          
  -W PATTERN, --await PATTERN  
                        await spawn matching PATTERN  
  --stdio {inherit,pipe}  
                        stdio behavior when spawning (defaults to “inherit”)  
  --aux option          set aux option when spawning, such as “uid=(int)42” (supported types are:  
                        string, bool, int)  
  --realm {native,emulated}            附件的范围  
  --runtime {qjs,v8}                   使用的脚本运行环境  
  --debug                              启用 Node.js 兼容的脚本调试器  
  --squelch-crash                      如果启用，将不会将崩溃报告转储到控制台  
  -O FILE, --options-file FILE         将信息保存到文件中
  --version                            显示版本号
```

- `-i` / `-a`: 跟踪 C 函数或 so 库中的函数。

PS:-a 包含模块+偏移跟踪，一般用于追踪未导出函数，例子：-a "lib52pojie.so!0x4793c"

包含/排除模块或函数：
- `-I` : 包含指定模块。
- `-X` : 排除指定模块。

Java 方法跟踪：
- `-j JAVA_METHOD`: 包含 Java 方法。
- `-J JAVA_METHOD`: 排除 Java 方法。

附加方式:
- `-f`:通过 spwan 方式启动
- `-F`:通过 attach 方式附加当前进程

日志输出:
`-o`:日志输出到文件

```
使用案例：
frida-trace -U -F -I "lib52pojie.so" -i "Java_" #附加当前进程并追踪lib52pojie.so里的所有Java_开头的jni导出函数
```

![图片](https://pic.rmb.bdstatic.com/bjh/288c4c7447228d803b9355891be976457415.png)

### 4.2jnitrace
前提
```
pip install jnitrace==3.3.0
```

使用方法
```
jnitrace -m attach -l lib52pojie.so com.zj.wuaipojie -o trace.json //attach模式附加52pojie.so并输出日志
```
`-l libnative-lib.so`- 用于指定要跟踪的库

`-m <spawn|attach>`- 用于指定要使用的 Frida 附加机制

`-i <regex>`- 用于指定应跟踪的方法名称，例如，`-i Get -i RegisterNatives`将仅包含名称中包含 Get 或 RegisterNatives 的 JNI 方法

`-e <regex>`- 用于指定跟踪中应忽略的方法名称，例如，`-e ^Find -e GetEnv`将从结果中排除所有以 Find 开头或包含 GetEnv 的 JNI 方法名称

`-I <string>`- 用于指定应跟踪的库的导出

`-E <string>`用于指定不应跟踪的库的导出

`-o path/output.json`- 用于指定`jnitrace`存储所有跟踪数据的输出路径

![图片](https://pic.rmb.bdstatic.com/bjh/6030c0c3518cca31e9a9651dadc2875f7693.png)

### 4.3sktrace
```
python sktrace.py -m attach -l lib52pojie.so -i 0x103B4 com.zj.wuaipojie
```

![图片](https://pic.rmb.bdstatic.com/bjh/2316edaea1d4685375ef7ecb0104f9196857.png)
## 5.控制流混淆对抗新发现
[细品sec2023安卓赛题](https://bbs.kanxue.com/thread-278648.htm)

[JEB Decompiler 5.5.0.202311022109 mod by CXV](https://bbs.kanxue.com/thread-279456.htm)

PS：注意jdk的版本要高于17，不然打不开

[下载地址](https://www.oracle.com/java/technologies/javase/jdk17-archive-downloads.html)

恐怖如斯的效果对比图:

![图片](https://pic.rmb.bdstatic.com/bjh/9f23f5f8dc5bb2f1c7b14f2ad406c7891341.png)

PS:珍惜表哥说dexlib2也能混淆对抗，效果比jeb的还强大

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
[《安卓逆向这档事》十四、是时候学习一下Frida一把梭了(中)](https://www.52pojie.cn/thread-1838539-1-1.html)
[《安卓逆向这档事》十五、是时候学习一下Frida一把梭了(下)](https://www.52pojie.cn/thread-1840174-1-1.html)

# 八、参考文档

[Trace大盘点](https://blog.csdn.net/fenfei331/article/details/123523182)

[[原创]frida-qbdi-tracer](https://bbs.kanxue.com/thread-276523.htm)

[优化jnitrace以及增强信息打印](https://blog.seeflower.dev/archives/82/)

[jnitrace、frida-trace、Stalker、sktrace、Frida Native Trace、r0tracer、strace、IDA trace、Unidbg Trace](https://blog.csdn.net/freeking101/article/details/129645787)

[Frida Stalker - Tracing binary instructions](https://www.youtube.com/watch?v=BgICyi2H2CU)

[frida hook so层方法大全](https://blog.csdn.net/weixin_38819889/article/details/122535920)

[Inline HOOK](https://blog.csdn.net/Tandy12356_/article/details/130898669)

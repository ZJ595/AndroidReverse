![|500](http://pic.rmb.bdstatic.com/bjh/6662c1557c35c098361cf868274174e5.png)
# 一、课程目标
1.配置java环境

2.了解并掌握动态调试

3.了解并掌握Log插桩

# 二、工具

1.教程Demo

2.MT管理器/NP管理器

3.jeb

4.雷电模拟器

5.XappDebug

# 三、课程内容

## 1.配置java环境

1.下载jdk文件并安装(课件里有)  
2.配置java环境  
ps：在视频里面环境配置只配置了一个JAVA_HOME  
还有一个Path和CLASSPATH，请参考这篇文档，写得很详细，配置完后记得cmd窗口输入java验证一下  
[java 环境配置(详细教程)](https://blog.csdn.net/xhmico/article/details/122390181)

## 2.什么是动态调试

动态调试是指自带的调试器跟踪自己软件的运行，可以在调试的过程中知道参数或者局部变量的值以及履清代码运行的先后顺序。多用于爆破注册码(CTF必备技能)

## 3.动态调试步骤

### 1.修改debug权限
方法一:在AndroidManifest.xml里添加可调试权限
```xml
android:debuggable="true"
```

方法二：XappDebug模块hook对应的app

项目地址

[XappDebug](https://github.com/Palatis/XAppDebug)

方法三：Magisk命令(重启失效)

```
1.  adb shell #adb进入命令行模式
    
2.  su #切换至超级用户
    
3.  magisk resetprop ro.debuggable 1
    
4.  stop;start; #一定要通过该方式重启
```

方法四:刷入MagiskHide Props Config模块(永久有效，但我这两台手机都不行，哭死，呜呜呜)

一般来说，在4选项中如果有ro.debuggable那就直接修改
没有的话就选5
![](http://pic.rmb.bdstatic.com/bjh/aafaf597b418757a41a89c24897606fe.png)
修改ro.debuggable的值为1


### 2.端口转发以及开启adb权限


版本号点击七次开启开发者模式并开启adb调试权限

夜神模拟器：adb connect 127.0.0.1:62001

### 3.下段点


ctrl+b下断点

### 4.debug模式启动


```
adb shell am start -D -n com.zj.wuaipojie/.ui.MainActivity
```
adb shell am start -D -n
adb shell am start -D -n 包名/类名
am start -n 表示启动一个activity
am start -D 表示将应用设置为可调试模式

### 5.Jeb附加调试进程

激活jeb

在线python运行
[https://tool.lu/coderunner/](https://tool.lu/coderunner/)

算号代码：
```python
#[url=https://bbs.pediy.com/]https://bbs.pediy.com/[/url]
#!/usr/bin/env python
import os, sys, struct, time, binascii, hashlib
 
RC4_Key2= 'Eg\xa2\x99_\x83\xf1\x10'
 
def rc4(Key, inData):
    Buf = ""
    S = range(256)
    K = (map(lambda x:ord(x), Key) * (256 / len(Key) + 1))[:256]
    j = 0
    for i in range(256):
        j = (S[i] + K[i] + j) % 256
        S[i], S[j] = S[j], S[i]
    i, j = 0, 0
    for x in range(len(inData)):
        i = (i + 1) % 256
        j = (j + S[i]) % 256
        S[i], S[j] = S[j], S[i]
        Buf += chr(S[(S[j] + S[i]) % 256] ^ ord(inData[x]))
    return Buf
 
def Long2Int(longdata):
    lo = longdata & 0xFFFFFFFF
    hi = (longdata >> 32) & 0x7FFFFFFF
    return hi, lo
 
def KeygenSN(LicenseSerial, MachineID):
    mhi, mlo = Long2Int(MachineID)
    lhi, llo = Long2Int(LicenseSerial)
    hi_Key = (mhi - lhi + 0x55667788) & 0x7FFFFFFF
    lo_Key = (mlo + llo + 0x11223344) & 0xFFFFFFFF
    Z0, = struct.unpack('<Q', struct.pack('<LL', lo_Key, hi_Key))
    Z1 = int(time.time()) ^ 0x56739ACD
    s = sum(map(lambda x:int(x, 16), "%x" % Z1)) % 10
    return "%dZ%d%d" % (Z0, Z1, s)
 
def ParsePost(buf):
    Info = struct.unpack('<3L2Q4LQ3L', buf[:0x40])
    flag, CRC, UserSerial, LicenseSerial, MachineID, build_type, \
          Ver_Major, Ver_Minor, Ver_Buildid, Ver_Timestamp, \
          TimeOffset, Kclass, Random2 = Info
    SysInfoData = buf[0x40:]
    assert CRC == binascii.crc32(buf[8:]) & 0xFFFFFFFF
    return Info, SysInfoData
 
def DecodeRc4Str(buf):
    buf = buf.decode('hex')
    i, s = ParsePost(rc4(buf[:8] + RC4_Key2, buf[8:]))
    return i, s
 
def GetJebLicenseKey():
    licdata = ""
    if licdata:
        i, MachineID = DecodeRc4Str(licdata)
        SN = KeygenSN(i[3], i[4])
        print "JEB License Key:", SN
        return SN
 
GetJebLicenseKey()
raw_input("Enter to Exit...")

```

快捷键：
F6进入方法
F7从方法中跳出来
F8
R运行到光标处

## 3.Log插桩

定义：Log插桩指的是反编译APK文件时，在对应的smali文件里，添加相应的smali代码，将程序中的关键信息，以log日志的形式进行输出。

调用命令
```smali

invoke-static {对应寄存器}, Lcom/mtools/LogUtils;->v(Ljava/lang/Object;)V

```



#  四、课后小作业
动态调试获取注册码  
[https://wwl.lanzoub.com/iZ0tt0fzsbpa](https://wwl.lanzoub.com/iZ0tt0fzsbpa)  
作业提交地址：  
《安卓逆向这档事》第五节课后小作业贴  
[https://www.52pojie.cn/thread-1714883-1-1.html](https://www.52pojie.cn/thread-1714883-1-1.html)  
(出处: 吾爱破解论坛)

# 五、答疑
关于jeb动态调试没有进程的问题，请看下面顶置的评论，替换个新的adb
关于永久debug的问题，可以参考zzzznl的方法(具体楼层在224)  
关于MagiskHidePropsConfig设置ro.debuggable，我运气比较好，雷电模拟器中设置成功了几次，操作如下：  
1.cmd中adb shell  
2.su获取root权限  
3.props进入设置，其后是大佬教程中的步骤，注意不要在4中设置，哪怕4中有也在5中新建一下，因为4中设置无法选择设置的时期，而5中可以  
4.重新进入5中设置的ro.debuggable，这时候可以选择设置该参数的时间，我选的延时Delay，Boot Completed之后3秒（随便设的，没测试其他值）
![图片](https://pic.rmb.bdstatic.com/bjh/d0b83f14677ccee75fdeb7891e1886c95009.png)
5.重启n次之后进入模拟器，检查参数
![图片](https://pic.rmb.bdstatic.com/bjh/ff8d9deea26f077ba163581b7baa78e5681.png)
所以我觉得存在一种可能，模块虽然起作用了，但很快又被模拟器重新设回去了，选择较晚期进行设置，存在一点设置成功的可能，大佬可以参考下

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
# 八、参考文档

[Android修改ro.debuggable 的四种方法](https://blog.csdn.net/jinmie0193/article/details/111355867)
[Log简易打印工具，超简单的调用方法](https://www.52pojie.cn/thread-411454-1-1.html)
[JEB动态调试Smali-真机/模拟器（详细，新手必看）](https://www.52pojie.cn/thread-1598242-1-1.html)

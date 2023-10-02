![|300](http://pic.rmb.bdstatic.com/bjh/cc9934d4392e49ed2c51e35cf94ab8e2.png)
# 一、课程目标

1.初识ELF文件格式、常见节区
2.了解NDK开发，写一个简单的so
3.学习IDA Pro工具的使用来分析so文件
4.通过学习ARM基础知识，能进行简单的修改
5.通过Chatgpt&IDA快速分析二进制文件**

# 二、工具

1.教程Demo(更新)
2.MT管理器/NP管理器
3.IDA Pro
4.雷电模拟器
5.Android Studio


# 三、课程内容

## 1. 初识ELF文件格式

ELF（Executable and Linkable Format）是一种可执行和可链接的文件格式，是linux底下二进制文件，可以理解为windows下的`PE文件`，在Android中可以比作`dll`，方便函数的移植，在常用于保护Android软件，增加逆向难度。

ELF文件的主要组成部分包括：
- ELF Header：文件头，描述文件的基本信息
- Program Header Table：程序头表，描述进程映像的布局
- Section Header Table：节区头表，描述文件的各个节区

| 节区名   | 描述                                             |
| -------- | ------------------------------------------------ |
| .text    | 代码段，存放程序的指令                           |
| .data    | 数据段，存放已初始化的全局变量和静态变量         |
| .rodata  | 只读数据段，存放只读数据                         |
| .bss     | 未初始化数据段，存放未初始化的全局变量和静态变量 |
| .symtab  | 符号表，存放符号信息                             |
| .strtab  | 字符串表，存放字符串数据                         |
| .dynsym  | 动态符号表，存放动态链接需要的符号信息           |
| .dynamic | 动态链接信息，存放动态链接器需要的信息           |

## 2.NDK开发

NDK（Native Development Kit）是一套用于开发Android应用程序的工具集，它允许您在C/C++中编写性能关键的部分代码，并将这些代码与Java代码进行连接。

步骤：
1.下载NDK和CMake
![](https://pic.rmb.bdstatic.com/bjh/666c7661bc9de4a54f730bb789af63f74113.png)
![](https://pic.rmb.bdstatic.com/bjh/7a7ad0ff5b441646156f6116cbcf8e2a610.png)
2.新建一个项目,往下拉,找到"c++"这个选项
3.查看CMakeLists.txt和编写native-lib.cpp
下面是cmakelist.txt和native-lib.cpp文件的作用以及简要说明：

| 文件名 | 作用 | 说明 |
| --- | --- | --- |
| CMakeLists.txt | 构建配置文件 | CMakeLists.txt是用于配置NDK项目的构建系统的文件。它指定了构建所需的源文件、依赖项、编译选项等。在构建过程中，CMake会根据该文件的指示生成对应的构建脚本，用于编译本地代码并生成本地库。 |
| native-lib.cpp | 本地代码实现文件 | native-lib.cpp是包含本地代码实现的文件。它定义了通过Java和本地代码之间进行通信的本地方法。该文件中的函数实现将被编译为本地库，供Java代码调用。 |

```java
public class MainActivity extends AppCompatActivity {

    // Used to load the 'ndkdemo' library on application startup.
    static {
        System.loadLibrary("ndkdemo"); // 加载名为"ndkdemo"的库
    }

    private ActivityMainBinding binding; // 声明一个ActivityMainBinding变量

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        binding = ActivityMainBinding.inflate(getLayoutInflater()); // 使用ViewBinding将布局文件解析为一个ActivityMainBinding对象
        setContentView(binding.getRoot()); // 将Activity的布局设置为根布局

        // Example of a call to a native method
        TextView tv = binding.sampleText; // 获取布局文件中的TextView控件
        tv.setText(stringFromJNI()); // 调用本地方法stringFromJNI()并将其返回的字符串设置为TextView的文本内容
    }

    /**
     * A native method that is implemented by the 'ndkdemo' native library,
     * which is packaged with this application.
     */
    public native String stringFromJNI(); // 声明一个native方法stringFromJNI()
}

```

```java
# For more information about using CMake with Android Studio, read the
# documentation: https://d.android.com/studio/projects/add-native-code.html

# 设置构建本地库所需的CMake的最小版本要求
cmake_minimum_required(VERSION 3.22.1)

# 声明和命名项目
project("ndkdemo")

# 创建并命名一个库，设置其类型为STATIC或SHARED，并指定源代码的相对路径
# 可以定义多个库，CMake会为您构建它们
# Gradle会自动将共享库打包到APK中
add_library(
        # 设置库的名称
        ndkdemo

        # 设置库类型为共享库
        SHARED

        # 提供源文件的相对路径
        native-lib.cpp)

# 搜索指定的预构建库并将路径存储为变量。
# 由于CMake默认在搜索路径中包含系统库，因此您只需指定要添加的公共NDK库的名称。
# CMake会在完成构建之前验证该库是否存在。
find_library(
        # 设置路径变量的名称
        log-lib

        # 指定要让CMake定位的NDK库的名称
        log)

# 指定CMake应链接到目标库的库。
# 您可以链接多个库，例如在此构建脚本中定义的库、预构建的第三方库或系统库。
target_link_libraries(
        # 指定目标库
        ndkdemo

        # 将目标库链接到NDK中包含的log库
        ${log-lib})

```

```c++
#include <jni.h> // JNI头文件，提供了JNI函数和数据类型的定义
#include <string> // C++标准库的string类

// 声明一个jni函数，该函数将会被Java代码调用
// JNIEXPORT表示这个函数是可导出的，并且可以被其他代码使用
// jstring表示这个函数返回的是一个Java字符串对象
// JNICALL是JNI函数的调用约定
// Java_com_example_ndkdemo_MainActivity_stringFromJNI是JNI函数的命名规则，与Java中对应的方法名对应
// Java打头，1包名,2类名,3方法名字;"_"号隔开
extern "C" JNIEXPORT jstring JNICALL
Java_com_example_ndkdemo_MainActivity_stringFromJNI(
        JNIEnv* env, // JNIEnv是指向JNI环境的指针，可以用来访问JNI提供的功能
        jobject /* this */) { // jobject是指向Java对象的指针，在本例中并没有使用

    std::string hello = "Hello from C++"; // 创建一个C++字符串对象
    return env->NewStringUTF(hello.c_str()); // 将C++字符串对象转换为Java字符串对象并返回
}


```

### 1.JNI的前世今生
NDK是开发套件，JNI才是调用的框架。所以与其说是NDK开发，不如说是JNI的开发。不过NDK是Android提供的开发套件。JNI可不是，JNI全称Java Native Interface,即Java本地接口，JNI是Java调用Native 语言的一种特性。通过JNI可以使得Java与C/C++机型交互。即可以在Java代码中调用C/C++等语言的代码或者在C/C++代码中调用Java代码。
### 2.JNI的两种注册方式
#### jni静态注册方式
-   优点: 理解和使用方式简单, 属于傻瓜式操作, 使用相关工具按流程操作就行, 出错率低
-   缺点: 当需要更改类名,包名或者方法时, 需要按照之前方法重新生成头文件, 灵活性不高
#### jni动态注册方式
```c++
#include <jni.h>
#include <string>

extern "C" {

JNIEXPORT jstring JNICALL Java_com_example_ndkdemo_MainActivity_nativeGetStringFromJNI(JNIEnv* env, jobject obj) {
    std::string hello = "Hello wuaipojie";
    return env->NewStringUTF(hello.c_str());
}

// 定义本地方法注册函数
JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM* vm, void* reserved) {
    JNIEnv* env;
    if (vm->GetEnv(reinterpret_cast<void**>(&env), JNI_VERSION_1_6) != JNI_OK) {
        return -1;
    }

    // 定义要注册的本地方法
    JNINativeMethod methods[] = {
        {"nativeGetStringFromJNI", "()Ljava/lang/String;", reinterpret_cast<void*>(Java_com_example_ndkdemo_MainActivity_nativeGetStringFromJNI)}
    };

    // 获取类引用
    jclass clazz = env->FindClass("com/example/ndkdemo/MainActivity");
    if (clazz == nullptr) {
        return -1;
    }

    // 注册本地方法
    if (env->RegisterNatives(clazz, methods, sizeof(methods) / sizeof(methods[0])) < 0) {
        return -1;
    }

    return JNI_VERSION_1_6;
}

} // extern "C"


```

####  数据类型
下面是一些常见的C++数据类型和它们在Java中的对应关系，以及它们在JNI动态注册中的数据类型签名（signature）：


| C++ 数据类型 | Java 数据类型     | JNI 数据类型签名 |
| ------------ | ---------------- | ---------------- |
| jint         | int              | "I"              |
| jboolean     | boolean          | "Z"              |
| jbyte        | byte             | "B"              |
| jchar        | char             | "C"              |
| jshort       | short            | "S"              |
| jlong        | long             | "J"              |
| jfloat       | float            | "F"              |
| jdouble      | double           | "D"              |
| jobject      | Object           | "Ljava/lang/Object;" |
| jstring      | String           | "Ljava/lang/String;" |
| jarray       | Array            | "[elementType"    |
| jobjectArray | Object[]         | "[Ljava/lang/Object;" |
| jbooleanArray| boolean[]        | "[Z"             |
| jbyteArray   | byte[]           | "[B"             |
| jcharArray   | char[]           | "[C"             |
| jshortArray  | short[]          | "[S"             |
| jintArray    | int[]            | "[I"             |
| jlongArray   | long[]           | "[J"             |
| jfloatArray  | float[]          | "[F"             |
| jdoubleArray | double[]         | "[D"             |


在JNI动态注册中，需要使用正确的数据类型签名来声明本地方法。例如，如果你要注册一个返回`int`类型的本地方法，其数据类型签名应为`I`。

## 3.IDA Pro使用技巧与Patch

简介：
IDA Pro（Interactive Disassembler Professional）是一款功能强大的交互式反汇编和调试工具，广泛应用于软件逆向工程、漏洞分析和二进制代码分析。它支持多种处理器架构和可执行文件格式，包括但不限于x86、ARM、MIPS、PowerPC等。通过使用IDA Pro，可以对程序进行静态分析、动态调试和代码修改等操作。

快捷键：

| 快捷键      | 功能                         |
| ----------- | ---------------------------- |
| Esc         | 回到上一个位置               |
| Enter       | 跳转到当前光标处的地址       |
| -           | 折叠代码                     |
| +           | 展开代码                     |
| *           | 创建一个结构                 |
| Alt + A     | 手动定义一个数组             |
| Alt + F     | 寻找直接引用的函数           |
| Alt + G     | 跳转到特定的地址             |
| Alt + T     | 显示调用树                   |
| Alt + X     | 重命名                       |
| Ctrl + G    | 快速跳转到指定地址           |
| Ctrl + J    | 显示引用列表                 |
| Ctrl + K    | 显示 XREF 到选中的函数/数据  |
| Ctrl + N    | 创建一个函数                 |
| Ctrl + Q    | 快速重命名                   |
| Ctrl + X    | 显示从选中的函数/数据的 XREF |
| Ctrl + E    | 显示结构类型                 |
| Ctrl + R    | 手动定义一个数据结构         |
| Ctrl + W    | 打开函数列表                 |
| Ctrl + D    | 以十进制显示当前值           |
| Ctrl + B    | 以二进制显示当前值           |
| Ctrl + H    | 以十六进制显示当前值         |
| Space       | 在图形/文本视图中切换        |
| shift + f12 | 打开字符串窗口               |
| F5            |    转伪C代码                          |

### Patch方式
1.keypatch插件快速修补  
快捷键：Ctrl+Alt+k  
录完教程发现Patching这个插件更好用些，下节课再做演示  
Patching - [https://github.com/gaasedelen/patching](https://github.com/gaasedelen/patching)  
2.ARM TO Hex  
[ARM to HEX](https://armconverter.com/)


## 4.ARM基础知识


### 常见寻址方式
| 寻址方式              | 描述                                                         |
|---------------------|------------------------------------------------------------|
| 立即数寻址            | 直接使用立即数值作为操作数，例如：`MOV R0, #5`                |
| 寄存器直接寻址         | 使用寄存器中的值作为操作数，例如：`MOV R0, R1`                |
| 寄存器间接寻址         | 使用寄存器中的值作为内存地址，访问该地址中的数据，例如：`LDR R0, [R1]` |
| 寄存器相对寻址         | 使用寄存器中的值加上一个立即偏移量作为内存地址，例如：`LDR R0, [R1, #4]` |
| 寄存器变址寻址         | 使用两个寄存器中的值相加作为内存地址，例如：`LDR R0, [R1, R2]`     |
| 带有变址寄存器的寄存器相对寻址 | 使用寄存器中的值加上另一个寄存器的值乘以一个比例因子作为内存地址，例如：`LDR R0, [R1, R2, LSL #2]` |
| 堆栈寻址              | 使用堆栈指针寄存器（如SP）进行操作，例如：`PUSH {R0, R1}` 或 `POP {R0, R1}` |
###  压栈和出栈指令
| 指令类型 | 指令示例              | 描述                                  |
|-------|---------------------|-------------------------------------|
| 压栈    | `PUSH {R0, R1}`      | 将寄存器R0和R1的内容压入堆栈中              |
| 压栈    | `PUSH {R0-R5}`       | 将寄存器R0到R5的内容压入堆栈中             |
| 压栈    | `STMDB SP!, {R0-R5}` | 将寄存器R0到R5的内容压入堆栈中（与PUSH等效） |
| 出栈    | `POP {R0, R1}`       | 从堆栈中弹出数据，恢复到寄存器R0和R1中       |
| 出栈    | `POP {R0-R5}`        | 从堆栈中弹出数据，恢复到寄存器R0到R5中      |

### 跳转指令

| 指令类型 | 指令示例       | 描述                                                         |
|-------|--------------|------------------------------------------------------------|
| 无条件跳转 | `B label`     | 无条件跳转到标签`label`指向的位置                             |
| 子程序调用 | `BL label`    | 调用子程序，将当前指令的下一条指令地址存入链接寄存器（LR），然后跳转到标签`label`指向的位置 |
| 子程序返回 | `BX LR`       | 返回子程序调用前的位置，跳转到链接寄存器（LR）中存储的地址         |
| 寄存器跳转 | `BX Rn`       | 跳转到寄存器Rn中存储的地址                                      |



###  算术运算指令
汇编中也可以进行算术运算， 比如加减乘除，常用的运算指令用法如表 所示：

| 指令             | 计算公式          | 备注                |
|----------------|-----------------|-------------------|
| ADD Rd, Rn, Rm   | Rd = Rn + Rm      | 加法运算，指令为 ADD  |
| ADD Rd, Rn, #immed | Rd = Rn + #immed | 加法运算，指令为 ADD  |
| ADC Rd, Rn, Rm   | Rd = Rn + Rm + 进位 | 带进位的加法运算，指令为 ADC |
| ADC Rd, Rn, #immed | Rd = Rn + #immed + 进位 | 带进位的加法运算，指令为 ADC |
| SUB Rd, Rn, Rm   | Rd = Rn - Rm      | 减法                |
| SUB Rd, #immed   | Rd = Rd - #immed  | 减法                |
| SUB Rd, Rn, #immed | Rd = Rn - #immed | 减法                |
| SBC Rd, Rn, #immed | Rd = Rn - #immed - 借位 | 带借位的减法        |
| SBC Rd, Rn ,Rm   | Rd = Rn - Rm - 借位 | 带借位的减法         |
| MUL Rd, Rn, Rm   | Rd = Rn * Rm      | 乘法 (32 位)          |
| UDIV Rd, Rn, Rm  | Rd = Rn / Rm      | 无符号除法            |
| SDIV Rd, Rn, Rm  | Rd = Rn / Rm      | 有符号除法            |


### 逻辑运算
汇编语言的时候也可以使用逻辑运算指令，常用的运算指令用法如表 所示：
![](http://pic.rmb.bdstatic.com/bjh/35d0832fb2523805c2a2165ec5458caa.png)

### 偷懒小插件
[WPeChatGPT](https://github.com/WPeace-HcH/WPeChatGPT)

![](https://pic.rmb.bdstatic.com/bjh/01f4bf013198aea885d9e513ad5e5eec4798.png)
api报错问题，可以参考仓库里的解决方法：
```
pip uninstall urllib3
pip install urllib3==1.25.11
```
如果 urllib3 版本没错或重装 1.25 版本还是存在 API 访问问题的话，那么请下载最新版本，对插件指定代理：
-   将下面三行代码取消注释，然后把代理地址及端口信息填入 _**proxies**_ 变量即可：
```python
print("WPeChatGPT has appointed the proxy.")
proxies = {'http': "http://127.0.0.1:7890", 'https': "http://127.0.0.1:7890"}
openai.proxy = proxies
```
# 四、 课后小作业
1.修改教程demo第五关里的native校验

# 五、答疑

待更新

Obsidian主题：
[Blue-topaz-example](https://github.com/PKM-er/Blue-topaz-example)

推荐书籍:
王爽老师的《汇编语言(第三版)》
《IDA Pro权威指南(第二版)》


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


[官方NDK入门案例](https://developer.android.com/ndk/guides?hl=zh-cn)
[ARM汇编入门指南](https://zhuanlan.zhihu.com/p/388683540)
[ARM汇编基础详解](https://blog.csdn.net/weixin_45309916/article/details/107837561)
[Android so(ELF)文件解析](https://www.52pojie.cn/forum.php?mod=viewthread&tid=1282554)
[小米学安卓逆向一 - NDK开发(1)](https://bbs.kanxue.com/thread-267367.htm)
[WPeChatGPT](https://github.com/WPeace-HcH/WPeChatGPT)
[工具使用-IDA从入门到理解](https://bbs.kanxue.com/thread-266021.htm)
[什么是NDK开发（一）](https://blog.csdn.net/weixin_34583170/article/details/94864797)


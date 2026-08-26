# RFID M1 桌面端技术栈研究

## 1. 研究目的

本文研究 RFID M1 授权加密桌面端可采用的技术栈，为后续选型和最小原型验证提供依据。研究对象为：

- Electron + TypeScript + Node SerialPort；
- C# + .NET + WPF；
- C++ + Qt 6；
- 原生 Windows C++/Win32 作为 C++ 路线的底层实现补充。

本文只比较能力、限制和实施条件，不在研究阶段作最终选型。研究完成后的选择记录在 [ADR-0005：桌面端采用 Electron、React 与串口适配器](../adr/0005-electron-react-desktop-stack.md)。

## 2. 已确认的实施前提

依据现有桌面端子方案，本次研究采用以下前提：

- 桌面端运行于受控的 Windows 工位；
- 读卡器已确认通过 USB 虚拟串口接入；
- 桌面端直接收发既有 `AA` 帧协议，不使用厂商 SDK 或 DLL；
- 桌面端需要完成串口连接、寻卡、认证、块读写、值块初始化/加值/读值、断连及移卡处理；
- 桌面端通过 HTTPS 调用登录、客户和统一密钥材料接口；
- `Key A`、`Key B` 只允许在当前操作的进程内存中短时存在，操作结束后应主动清除，不得进入本地文件、日志、缓存、埋点或错误上报。

因此，厂商 DLL 兼容性不是本次选型维度，也不需要为 DLL 单独设计原型。三条候选路线均通过通用串口接口直接实现 `AA` 帧收发。

## 3. 评价维度

本研究重点评价：

1. 是否适合快速实现当前工位型业务界面和状态流程；
2. Windows 构建、安装及运行时依赖；
3. USB 虚拟串口枚举、打开、异步收发和异常处理；
4. HTTPS、会话及 JSON 接口调用；
5. 明文密钥仅存内存及操作结束后的主动清除；
6. 在不同团队能力条件下的开发周期影响。

“官方事实”来自框架、平台或项目自身文档；“工程推论”是结合本项目边界对这些事实作出的判断。开发周期没有跨技术栈的官方统一基准，本文只给出条件式判断。

## 4. 对比摘要

| 维度 | Electron + TypeScript | C#/.NET + WPF | C++ + Qt 6 |
| --- | --- | --- | --- |
| UI 与业务流程 | 使用 Web UI 技术；适合已有 TypeScript/前端经验的团队。需维护 renderer、preload、main 之间的边界。 | WPF 提供 XAML、控件、布局和数据绑定；UI、串口及 HTTP 可统一使用 C#。 | Qt Widgets 或 QML 均可构建桌面 UI；同时使用 Qt Serial Port 和 Qt Network。需要 C++/Qt 工程经验。 |
| 直接串口 | Node SerialPort 支持 Windows x64 和近期 Electron，底层含原生绑定。 | `System.IO.Ports.SerialPort` 提供同步和事件驱动串口 I/O。 | `QSerialPort` 提供端口枚举、配置、读写和错误事件。 |
| HTTPS | Electron `net` 使用 Chromium 网络栈，支持 HTTP(S) 及系统代理。 | `HttpClient` 是 .NET 标准 HTTP 客户端。 | `QNetworkAccessManager` 提供异步 HTTP(S) 请求；TLS 后端需随部署验证。 |
| 密钥内存边界 | 可用 Node `Buffer` 保存并覆零；必须防止字符串化、renderer IPC 和无意复制。 | 可用 `byte[]`/`Span<byte>`，并调用 `CryptographicOperations.ZeroMemory`。 | 可用专用字节缓冲区并调用 Windows `SecureZeroMemory`；不能只依赖普通 `QByteArray::fill`。 |
| Windows 安装 | Electron Forge 可生成 Windows 安装包；产物包含 Electron/Chromium 运行环境。SerialPort 原生模块需随 Electron 版本验证。 | 可发布为 framework-dependent 或 self-contained；可生成单文件，也可进一步打包为 MSIX。 | `windeployqt` 收集 Qt 库、插件及运行依赖，再交给安装工具打包；还需处理 Qt 许可和 VC++ Runtime。 |
| 条件式周期判断 | 团队熟悉 Web/TypeScript 且接受 Electron 多进程边界时，UI 和接口编排可较快；串口原生模块和安全边界需要专项验证。 | 团队具备 C#/.NET 能力时，当前 Windows-only、串口和业务表单场景所需平台层较少。 | 团队已有 Qt/C++ 桌面经验时可直接使用成熟模块；若从零补齐 C++、Qt、部署和内存管理经验，周期会增加。 |

该表不表示技术栈排名；任何周期判断都依赖团队已有能力、目标 Windows 版本、安装方式和真实读卡器稳定性。

## 5. Electron + TypeScript + Node SerialPort

### 5.1 官方事实

Electron 把 Chromium 和 Node.js 嵌入应用，允许使用 JavaScript、HTML 和 CSS 构建 Windows、macOS 和 Linux 桌面应用。[Electron 官方简介](https://www.electronjs.org/docs/latest/)

Electron 应用至少包含 main 和 renderer 两类进程。main 运行 Node.js 并管理原生桌面能力；renderer 负责 Web 页面，默认不能直接访问 Node.js API。受控能力应由 preload 通过 `contextBridge` 暴露给 renderer。[Electron Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model)

Electron 20 起 renderer 默认启用沙箱；若为 renderer 开启 Node integration，会关闭该进程的沙箱。Electron 同时指出，即使使用 preload，仍需开启 context isolation，避免向不可信页面泄漏特权 API。[Electron Process Sandboxing](https://www.electronjs.org/docs/latest/tutorial/sandbox)

Node SerialPort 使用 `SerialPort` 对象按端口路径和波特率打开串口，提供打开、写入和错误事件。[SerialPort Usage](https://serialport.io/docs/guide-usage/)

SerialPort 项目说明，从 v10 开始其 `@serialport/bindings-cpp` 使用 Node-API，支持近期 Node.js 和 Electron；Windows 10 以上 x64 是其正式支持的平台组合。项目同时说明 Electron 只正式支持最近三个版本，并可能在新 Electron 发布后滞后数周更新构建工具。[SerialPort Supported Environments](https://serialport.io/docs/guide-platform-support/)

Electron `net` 模块可在 main 或 utility process 中发起 HTTP(S) 请求，使用 Chromium 网络栈，并支持系统代理、WPAD/PAC、HTTPS 隧道及多种代理认证方式。[Electron net](https://www.electronjs.org/docs/latest/api/net/)

Electron 官方推荐使用 Electron Forge 打包分发。Forge 的 Squirrel.Windows maker 会生成 `Setup.exe`、更新包和更新元数据，且采用无需管理员权限的安装方式。[Electron Application Packaging](https://www.electronjs.org/docs/latest/tutorial/application-distribution)、[Electron Forge Squirrel.Windows](https://www.electronforge.io/config/makers/squirrel.windows)

Node.js `Buffer` 表示固定长度字节序列；`Buffer.alloc()` 默认零初始化，`buf.fill(0)` 可将当前缓冲区覆零。`Buffer.allocUnsafe()` 可能含有旧内存数据，官方要求使用前完整覆盖或初始化。[Node.js Buffer](https://nodejs.org/api/buffer.html)

### 5.2 对本项目的工程推论

- 串口对象、协议收发、短时密钥材料和 HTTPS/读卡编排应放在 main 或专用 utility process 中；renderer 只接收进度、非敏感卡片字段和成功/失败/结果不确定状态。
- preload 只暴露窄接口，例如“列出端口”“开始授权”“取消当前操作”，不应把原始串口对象、通用文件能力、任意 IPC 或密钥字节暴露给 renderer。
- `AA` 帧解析需要自行实现缓存和状态机，正确处理半帧、粘帧、非法长度、序号不匹配、XOR 错误、超时、移卡和断连；SerialPort 只解决字节流传输，不解决业务协议。
- 密钥应保持为 `Buffer`，不得转成 JavaScript 字符串，不得随 IPC 消息复制到 renderer。完成、取消、超时、注销和退出时，对所有明确持有密钥的 Buffer 调用 `fill(0)`。
- `Buffer.fill(0)`只能清除当前 Buffer。若代码把密钥转换为字符串、创建副本或传给日志/监控，原缓冲区覆零不能清除其他副本，因此需要通过代码结构限制副本产生。
- SerialPort 含原生绑定。虽然 Node-API降低了 ABI 变动影响，仍需把 Electron、SerialPort、Windows 架构和安装包组合纳入每次升级的真实设备回归。

### 5.3 条件式开发周期判断

如果团队已经熟悉 TypeScript、Web UI、状态管理和 Electron 安全边界，客户注册、授权、储值及状态提示界面可以复用前端开发经验。额外工作主要集中在：

- main/preload/renderer 的分层；
- SerialPort 原生依赖的构建和打包；
- `AA` 帧状态机和串口异常恢复；
- 防止密钥跨进程、字符串化或进入日志。

如果团队只熟悉浏览器前端而没有 Electron、Node 原生模块或设备通信经验，不能仅凭“会前端”推断整体开发周期较短。

## 6. C# + .NET + WPF

### 6.1 官方事实

WPF 是 .NET 的 Windows 图形界面框架，提供 XAML、控件、数据绑定、布局、样式等桌面应用能力；WPF 只运行于 Windows。[WPF Overview](https://learn.microsoft.com/en-us/dotnet/desktop/wpf/overview/)

`System.IO.Ports` 命名空间用于控制串口，其中 `SerialPort` 支持同步和事件驱动 I/O、串口驱动属性、引脚状态和 break 状态。[System.IO.Ports](https://learn.microsoft.com/en-us/dotnet/api/system.io.ports)

`.NET` 的 `HttpClient` 用于发送 HTTP 请求和接收响应。Microsoft 建议复用长期存在的客户端并配置连接生命周期，或使用 `IHttpClientFactory`，避免不必要的连接创建和端口耗尽。[HttpClient Guidelines](https://learn.microsoft.com/en-us/dotnet/fundamentals/networking/http/httpclient-guidelines)

`CryptographicOperations.ZeroMemory(Span<byte>)` 会用零填充指定缓冲区；该 API用于防止未来运行时优化删除没有后续读取的内存清除操作。[CryptographicOperations.ZeroMemory](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.cryptographicoperations.zeromemory?view=net-9.0)

.NET 支持 framework-dependent 和 self-contained 的单文件发布。self-contained 会包含运行时和框架库，因此文件更大；单文件产物与目标操作系统和 CPU 架构绑定。[.NET Single-file Deployment](https://learn.microsoft.com/en-us/dotnet/core/deploying/single-file/overview)

WPF、Win32 等桌面应用可使用 Visual Studio 的 Windows Application Packaging Project 生成 MSIX，并可通过企业、Web 或 Microsoft Store 等渠道分发。[MSIX Desktop Packaging](https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-packaging-dot-net)

### 6.2 对本项目的工程推论

- WPF 界面、业务编排、串口适配层和 HTTP 客户端均可使用 C# 实现，不需要额外的 Web/本地进程桥接。
- `SerialPort.DataReceived` 只表示收到字节，不保证一次事件对应一个完整 `AA` 帧；仍需独立的接收缓存和帧解析状态机。
- 串口接收线程不应直接更新 WPF 控件，应将状态切回 UI Dispatcher；协议层不应依赖具体窗口。
- 密钥应从接口响应尽早解析到 `byte[]`，通过 `Span<byte>` 使用，避免生成 `string`。操作退出的所有路径都应在 `finally` 或等效的集中清理路径调用 `CryptographicOperations.ZeroMemory`。
- 主动清零不等于绝对不可取证。进程正在使用密钥时仍可被同权限调试器或恶意代码读取；crash dump、pagefile 和终端管控需作为部署策略另行约束。
- 若采用 self-contained 发布，可避免目标机预装对应 .NET Runtime；是否进一步制作 MSI 或 MSIX，取决于工位安装权限、升级方式和企业部署工具。

### 6.3 WPF 与 WinUI 3 的边界

WinUI 3 是 Windows App SDK 的原生桌面 UI框架，支持 C# 和 C++；Windows App SDK 与 Windows 操作系统分开交付，目标机必须安装相应运行时或由应用一并部署。[WinUI 3 Overview](https://learn.microsoft.com/en-us/windows/apps/get-started/winui-get-started-overview)、[Windows App SDK Deployment Architecture](https://learn.microsoft.com/en-us/windows/apps/windows-app-sdk/deployment-architecture)

对当前项目而言，WinUI 3 主要改变 UI 和部署方式，不改变串口、HTTPS 或密钥生命周期的核心实现能力。若第一版只需要工位型表单、步骤进度和最小状态提示，应分别评估现代 UI 收益与新增 Windows App SDK 部署成本，不应把 WPF 和 WinUI 3 视为完全相同的方案。

### 6.4 条件式开发周期判断

如果团队熟悉 C#、异步编程和 WPF，当前 Windows-only 场景需要的 UI、串口、HTTP 和字节缓冲区能力都由同一平台提供，主要工作集中在业务状态机、`AA` 帧协议和真实设备异常测试。

如果团队没有 WPF/XAML 经验，仍需学习数据绑定、UI 线程和生命周期管理；不能只因 C# API齐全就忽略这部分成本。

## 7. C++ + Qt 6

### 7.1 官方事实

Qt Serial Port 模块提供 `QSerialPort` 和 `QSerialPortInfo`。`QSerialPortInfo` 可枚举端口；`QSerialPort` 可设置端口、以读写模式打开，并配置波特率、数据位、校验、停止位和流控。串口以独占方式打开。[QSerialPort](https://doc.qt.io/qt-6/qserialport.html)、[Qt Serial Port Module](https://doc.qt.io/qt-6/qtserialport-module.html)

Qt Network 提供 `QNetworkAccessManager`、`QNetworkRequest` 和 `QNetworkReply` 等高层网络接口，并通过原生 TLS 后端、OpenSSL 或其他 TLS 插件提供 TLS 能力。`QNetworkAccessManager` 使用异步 API，通常一个实例足以服务整个应用。[Qt Network Programming](https://doc.qt.io/qt-6/qtnetwork-programming.html)、[QNetworkAccessManager](https://doc.qt.io/qt-6/qnetworkaccessmanager.html)

Qt 官方说明，在 Windows 上推荐使用 `windeployqt` 收集应用所需的 Qt 库、插件、QML 模块和运行时依赖，形成可进一步打包的部署目录。对于 MSVC release 构建，安装程序应包含官方 Visual C++ Redistributable。[Qt for Windows Deployment](https://doc.qt.io/qt-6/windows-deployment.html)

Qt 6.11 官方支持 Windows 10 1809+ 和 Windows 11 的 x86-64，并支持 MSVC 2022 和 MinGW-w64；实际采用的 Qt 版本必须按项目目标 Windows 生命周期重新核对。[Qt for Windows](https://doc.qt.io/qt-6/windows.html)

`QByteArray` 是可修改的字节数组，`fill()` 可把数组内容改成指定字节；文档同时说明 `QByteArray` 的赋值、切片和部分操作可能产生共享数据或副本。[QByteArray](https://doc.qt.io/qt-6/qbytearray.html)

Qt 提供商业和开源许可。采用 LGPLv3 时，需要满足动态链接、许可告知、库源码或书面获取方式、允许用户替换和重新链接库等义务；若无法满足，需要评估商业许可。具体合规应由公司法务确认。[Qt Licensing](https://doc.qt.io/qt-6/licensing.html)、[Qt LGPL Obligations](https://www.qt.io/development/open-source-lgpl-obligations)

### 7.2 对本项目的工程推论

- Qt Widgets 更接近传统工位桌面应用；QML 更适合定制化界面。两者都会使用相同的 Qt Serial Port 和 Qt Network 模块，但团队技能和部署内容不同。
- `QSerialPort::readyRead` 仍只表示有字节可读，不能假定一条信号对应一个完整 `AA` 帧；必须实现接收缓存、帧边界、长度、XOR、序号、超时和错误状态机。
- `QNetworkAccessManager` 和 `QSerialPort` 都基于 Qt 事件模型，能够在同一应用中进行异步编排；需要清晰控制对象所属线程和操作取消路径。
- `QByteArray::fill(0)`可以覆盖当前逻辑缓冲区，但 Qt 文档没有把它定义为不会被编译器优化删除的安全清除原语。Windows 目标下，敏感缓冲区应采用明确所有权，并使用 `SecureZeroMemory` 清除底层字节；同时避免隐式共享、临时对象和复制。
- Qt 的 HTTPS 能力需要把实际 TLS 后端纳入安装包验证，避免开发机可用、目标工位缺少插件或库。
- `windeployqt` 生成的是可运行部署目录，不等于完整企业安装器。仍需决定 MSI、MSIX 或其他安装封装、签名、升级和卸载策略。
- Qt 许可会影响发布方式，是 Electron 和 .NET 对比之外的独立实施条件；应在编码前由法务或采购确认开源许可合规或商业许可预算。

### 7.3 条件式开发周期判断

如果团队已经具备 Qt Widgets/QML、QObject 信号槽、CMake 和 Windows Qt 部署经验，串口、网络和 UI 都有现成模块，开发工作可集中在业务和协议层。

如果团队只会一般 C++ 而没有 Qt 经验，还需承担 Qt 对象生命周期、信号槽、UI 线程、构建部署、插件收集和许可确认的学习成本；“使用 C++”本身不能推出开发更快。

## 8. 原生 Windows C++/Win32 补充

原生 Win32 不是本研究的第四个完整 UI 候选，而是说明 C++/Qt 底层依赖之外，Windows 本身也能直接完成串口、HTTPS 和内存清理。

### 8.1 官方事实

Win32 `CreateFile` 可以打开 COM 通信资源；通信资源必须使用 `OPEN_EXISTING`，并以独占方式打开。串口配置可通过 `GetCommState` 读取、修改 DCB 后用 `SetCommState` 设置。[CreateFile Communications Resources](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilea)、[Communications Resource Settings](https://learn.microsoft.com/en-us/windows/win32/devio/modification-of-communications-resource-settings)

Windows 还提供 `ClearCommError`、`PurgeComm` 等通信函数，用于读取错误状态和清除收发缓冲区。[Win32 Communications Functions](https://learn.microsoft.com/en-us/windows/win32/devio/communications-functions)

WinHTTP 为 C/C++ 提供 HTTP 客户端 API，并支持桌面应用；Windows 使用操作系统 Schannel 配置协商 TLS，生产环境不应忽略服务器证书错误。[About WinHTTP](https://learn.microsoft.com/en-us/windows/win32/winhttp/about-winhttp)

`SecureZeroMemory` 是比普通 `ZeroMemory` 更适合敏感数据的清除函数，用于避免编译器删除看似无后续读取的覆零操作。[SecureZeroMemory](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/legacy/aa366877%28v%3Dvs.85%29)

Microsoft 建议部署原生 C++ 应用依赖的 Visual C++ Runtime，并推荐通过官方 Visual C++ Redistributable 进行中央部署，以便运行库独立更新。[Redistribute Visual C++ Files](https://learn.microsoft.com/en-us/cpp/windows/redistributing-visual-cpp-files)

### 8.2 对本项目的工程推论

- 若使用 Qt，通常不需要绕过 `QSerialPort` 和 `QNetworkAccessManager` 直接编写 Win32 通信代码，除非真实设备测试暴露框架无法满足的特定串口行为。
- 纯 Win32 可以最大程度控制句柄、I/O、缓冲区和线程，但需要自行实现更多 UI、异步 I/O、错误转换、JSON 和资源释放代码。
- 当前首要目标是快速走通桌面业务与读卡器流程，因此是否采用原生 Win32 应由明确的设备兼容性证据驱动，而不是预先增加一套底层实现。

## 9. 密钥仅存内存的共同边界

三条候选路线均能实现当前方案要求的基本内存边界：

1. HTTPS 响应中的密钥直接进入字节缓冲区；
2. 不写本地配置、数据库、缓存、会话恢复或下载文件；
3. 不转成用于 UI、JSON 二次序列化或日志输出的字符串；
4. 只把密钥交给当前操作的 RFID 命令构造逻辑；
5. 完成、失败、取消、超时、注销和应用退出走同一集中清理路径；
6. 清理所有明确持有密钥或包含密钥帧的字节缓冲区。

不同技术栈的主要差异是“控制副本的容易程度”，不是是否具备一个覆零 API：

- Electron 应避免 JS 字符串和 renderer IPC，使用 Node Buffer 并主动 `fill(0)`；
- C# 应避免字符串和不必要的数组复制，使用 `byte[]`/`Span<byte>` 和 `CryptographicOperations.ZeroMemory`；
- C++/Qt 应避免 `QByteArray` 隐式共享和临时副本，对明确所有权的缓冲区调用 Windows `SecureZeroMemory`。

以上措施不能抵御同权限调试器、已攻破的桌面端进程或密钥正在使用时的内存读取。现有 ADR 已将受控终端和“进程被攻破时短时密钥可能泄露”作为系统边界，技术栈选型不能改变这一事实。

## 10. 尚需确认的非技术栈条件

以下事项会影响实施周期，但不能仅靠框架文档回答：

- 开发团队当前最熟悉 TypeScript/Electron、C#/WPF 还是 C++/Qt；
- 目标工位的 Windows 最低版本和 CPU 架构，是否可以固定为 Windows 10/11 x64；
- 工位是否允许管理员安装，企业使用 MSI、MSIX、Squirrel 还是统一软件分发系统；
- USB 虚拟串口驱动是否由 Windows 自动提供，是否需要独立驱动安装；
- 云平台登录使用 bearer token、cookie session 还是浏览器 SSO，是否依赖企业代理或客户端证书；
- 是否需要离线安装、内网更新、自动升级和代码签名；
- “密钥仅存内存”的验收是否还包含 crash dump、pagefile 和调试器控制等终端策略。

## 11. 下一步最小 PoC

在不做最终选型前，建议对进入最后比较的候选栈使用相同验收脚本完成最小真实设备 PoC。PoC 只验证技术风险，不实现客户、授权和储值完整界面。

### 11.1 PoC 范围

```text
列出串口并选择真实读卡器
→ 以真实参数打开端口
→ 发送 AA 寻卡帧
→ 处理半帧、粘帧、非法长度、序号和 XOR
→ 读取并显示 UID
→ 移卡后得到明确状态
→ 拔掉读卡器后得到明确断连状态
→ 重新连接并恢复寻卡
→ 连续执行 100 次
```

同时增加两个非设备验证：

- 调用一个 HTTPS 测试接口，验证云平台实际代理、证书和会话方式；
- 在操作模拟结束后检查应用日志、崩溃报告和本地目录，确认不出现测试密钥，并对显式缓冲区执行清零。

### 11.2 统一记录指标

| 指标 | 记录方式 |
| --- | --- |
| 首次跑通时间 | 从空项目到第一次取得真实 UID 的有效工时。 |
| 连续寻卡成功率 | 100 次执行中的正确响应次数。 |
| 断连恢复 | 拔插读卡器后能否不重启应用恢复。 |
| 协议可测试性 | `AA` 帧解析器能否脱离 UI 和真实串口做单元测试。 |
| 安装结果 | 在未安装开发工具的干净 Windows 工位上是否可安装和运行。 |
| 产物依赖 | 安装包、运行时、插件、VC++ Runtime 及驱动的实际清单。 |
| 密钥边界 | 是否只存在于指定字节缓冲区，是否有字符串、IPC 或日志副本。 |
| 团队维护成本 | 团队能否独立调试串口、网络、UI 和安装问题。 |

这些指标用于形成后续选型证据，但本文不预设哪一技术栈必须胜出。

## 12. 研究结论边界

- Electron、C#/.NET/WPF、C++/Qt 6 均有直接访问 Windows USB 虚拟串口、调用 HTTPS 和构建桌面 UI 的可用路径。
- 当前不使用厂商 SDK/DLL，减少了 Electron native addon、C# P/Invoke 和 C++ SDK 链接之间的差异；技术栈差异主要转移到团队能力、多进程或事件模型、安装依赖及密钥副本控制。
- 框架文档可以证明“能够实现”，不能证明“在本团队最快”。最终判断必须结合团队技能、干净工位安装和真实读卡器 PoC 数据。
- 本文不作最终选型或排名。下一步应先确认部署环境和团队技能，再对实际进入最后比较的候选执行同一最小 PoC。

## 13. 主要一手资料

### Electron 与 Node SerialPort

- [Electron Introduction](https://www.electronjs.org/docs/latest/)
- [Electron Process Model](https://www.electronjs.org/docs/latest/tutorial/process-model)
- [Electron Process Sandboxing](https://www.electronjs.org/docs/latest/tutorial/sandbox)
- [Electron net](https://www.electronjs.org/docs/latest/api/net/)
- [Electron Application Packaging](https://www.electronjs.org/docs/latest/tutorial/application-distribution)
- [Electron Forge Squirrel.Windows](https://www.electronforge.io/config/makers/squirrel.windows)
- [Node SerialPort Usage](https://serialport.io/docs/guide-usage/)
- [Node SerialPort Supported Environments](https://serialport.io/docs/guide-platform-support/)
- [Node.js Buffer](https://nodejs.org/api/buffer.html)

### Microsoft .NET、WPF 与 Win32

- [WPF Overview](https://learn.microsoft.com/en-us/dotnet/desktop/wpf/overview/)
- [System.IO.Ports](https://learn.microsoft.com/en-us/dotnet/api/system.io.ports)
- [HttpClient Guidelines](https://learn.microsoft.com/en-us/dotnet/fundamentals/networking/http/httpclient-guidelines)
- [CryptographicOperations.ZeroMemory](https://learn.microsoft.com/en-us/dotnet/api/system.security.cryptography.cryptographicoperations.zeromemory?view=net-9.0)
- [.NET Single-file Deployment](https://learn.microsoft.com/en-us/dotnet/core/deploying/single-file/overview)
- [MSIX Desktop Packaging](https://learn.microsoft.com/en-us/windows/msix/desktop/desktop-to-uwp-packaging-dot-net)
- [WinUI 3 Overview](https://learn.microsoft.com/en-us/windows/apps/get-started/winui-get-started-overview)
- [CreateFile Communications Resources](https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-createfilea)
- [Communications Resource Settings](https://learn.microsoft.com/en-us/windows/win32/devio/modification-of-communications-resource-settings)
- [About WinHTTP](https://learn.microsoft.com/en-us/windows/win32/winhttp/about-winhttp)
- [SecureZeroMemory](https://learn.microsoft.com/en-us/previous-versions/windows/desktop/legacy/aa366877%28v%3Dvs.85%29)
- [Redistribute Visual C++ Files](https://learn.microsoft.com/en-us/cpp/windows/redistributing-visual-cpp-files)

### Qt 6

- [QSerialPort](https://doc.qt.io/qt-6/qserialport.html)
- [Qt Serial Port Module](https://doc.qt.io/qt-6/qtserialport-module.html)
- [Qt Network Programming](https://doc.qt.io/qt-6/qtnetwork-programming.html)
- [QNetworkAccessManager](https://doc.qt.io/qt-6/qnetworkaccessmanager.html)
- [QByteArray](https://doc.qt.io/qt-6/qbytearray.html)
- [Qt for Windows Deployment](https://doc.qt.io/qt-6/windows-deployment.html)
- [Qt for Windows](https://doc.qt.io/qt-6/windows.html)
- [Qt Licensing](https://doc.qt.io/qt-6/licensing.html)
- [Qt LGPL Obligations](https://www.qt.io/development/open-source-lgpl-obligations)

资料检索日期：2026-08-24。

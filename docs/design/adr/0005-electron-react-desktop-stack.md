# 桌面端采用 Electron、React 与串口适配器

RFID M1 授权加密桌面端采用 Electron + TypeScript + React + Vite，目标固定为 Windows 10/11 x64，并由 Node SerialPort 直接实现 USB 虚拟串口上的 `AA` 帧协议。选择该方案是因为实施者已有 React 前端经验、第一目标是快速建立环境和推进开发，且 Electron 可以用可替换适配器方便地模拟后端和读卡器；相比之下，C# + WPF 和 C++ + Qt 都要求从零学习新的 UI 与工程体系。

## Considered Options

- C# + .NET + WPF：Windows 串口、HTTPS 和敏感字节清零接口集中，但实施者没有 C# 或 WPF 经验。
- C++ + Qt 6：串口和网络模块齐全、内存控制更直接，但需要额外承担 C++/Qt、部署和许可成本。
- Electron + TypeScript + React：复用现有 React 能力并提供方便的开发替身，但需要维护 main、preload 和 renderer 的权限边界，安装体积也更大。

## Consequences

- 串口、HTTPS、云平台 token、任务密钥和业务编排只在 Electron 主进程运行；React renderer 只通过窄 IPC 发起操作并接收非敏感状态。
- `BackendClient` 提供真实实现与内存 `MockBackendClient`；`ReaderPort` 只提供真实 Node SerialPort 实现，不建设应用级 `MockReader`。macOS 阶段不装配读卡器端口，只用固定字节帧验证 `AA` 协议编解码；真实接口和真实读卡器从 Windows 阶段开始。后端模拟实现只进入开发构建，生产构建不得启用。
- 云平台使用用户名密码接口登录，token 不持久化，每次启动重新登录；密钥使用主进程 `Buffer`，禁止字符串化、IPC 传递、日志或落盘，并在任务结束时覆零已知缓冲区。
- Electron Forge 的 Squirrel.Windows maker 生成 Windows `Setup.exe`；第一版人工安装和升级，不开发自动更新，也不支持 Windows 7/8、32 位、ARM、厂商 SDK/DLL 或 Web Serial 主路径。

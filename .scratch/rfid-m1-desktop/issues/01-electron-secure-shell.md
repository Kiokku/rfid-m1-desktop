# 01 — 建立 Electron 安全桌面端骨架

**What to build:** 在 macOS 建立可启动的 Electron + React 桌面端，采用 A「引导工作台」作为唯一界面，形成受限的 main、preload 和 renderer 边界，并同步已确认的 macOS/Windows 阶段与无 `MockReader` 决策。

**Blocked by:** None — can start immediately

**Status:** ready-for-agent

- [ ] macOS 上可以用一个开发命令启动 Electron 应用，并能完成生产构建检查。
- [ ] 界面只包含“工作台”和“客户”，不包含“授权记录”“设置”、B/C 方案或原型切换器。
- [ ] renderer 无法直接访问 Node、原始串口、token、密钥或任意 IPC 通道。
- [ ] preload 只暴露允许的业务动作和非敏感状态订阅。
- [ ] 本任务不调用真实接口、不打开串口，也不引入 `MockReader`。
- [ ] 桌面端子方案和相关 ADR 与规格一致：macOS 只使用后端 Mock 和字节帧测试，真实接口及读卡器从 Windows 阶段开始。

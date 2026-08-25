# 05 — 迁移 Windows 环境并连接真实读卡器

**What to build:** 将项目迁移到 Windows 10/11 x64，使桌面端通过 Node SerialPort 连接已经就位的真实读卡器，完成真实寻卡与 UID 展示，建立所有真实集成任务的硬门槛。

**Blocked by:** 04 — 固化 AA 协议并准备 Windows 迁移

**Status:** ready-for-agent

- [ ] Windows 开发环境可以安装依赖、启动 Electron 应用并运行现有测试。
- [ ] 可以枚举、选择、打开和关闭真实 USB 虚拟串口。
- [ ] 使用真实 `AA` 帧寻卡并显示读卡器返回的 UID。
- [ ] 待放卡显示红色，检测到卡片显示绿色，移卡和断连显示明确状态。
- [ ] 不使用厂商 SDK/DLL、Web Serial 或 `MockReader`。

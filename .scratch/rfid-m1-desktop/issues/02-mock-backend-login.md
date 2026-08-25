# 02 — 使用后端 Mock 完成登录纵切

**What to build:** 让系统管理员在 macOS 开发构建中通过用户名密码登录，从 React 表单经过受限 IPC 和主进程业务编排到达 `MockBackendClient`，成功后进入工作台。

**Blocked by:** 01 — 建立 Electron 安全桌面端骨架

**Status:** ready-for-agent

- [ ] 有效开发账号可以登录，无效账号和模拟失效会话被拒绝并显示可理解提示。
- [ ] 开发 token 只存在主进程内存，不进入 renderer、文件、日志或会话恢复数据。
- [ ] 注销和应用退出会清除会话；重新启动必须再次登录。
- [ ] 界面明确显示当前使用后端 Mock，不与生产状态混淆。
- [ ] 本任务不调用真实云平台或 RFID 后端接口。

# RFID M1 授权桌面端

本仓库是 RFID M1 授权桌面端的独立实施与迁移仓库。它只包含桌面端后续开发所需的规格、设计决策、协议资料、原型源码、原型截图和本地 tickets，不包含原始厂商开发包、可执行程序、依赖目录或上级项目中的其他资料。

## 开始实施前

1. 阅读 [`docs/桌面端原型与后端接口清单.md`](./docs/桌面端原型与后端接口清单.md)，确认原型边界、后端接口清单和仍待外部团队定稿的接口项。
2. 阅读 [`.scratch/rfid-m1-desktop/spec.md`](./.scratch/rfid-m1-desktop/spec.md)，它是桌面端实施规格的最高优先级来源。
3. 阅读 [`docs/domain/CONTEXT.md`](./docs/domain/CONTEXT.md) 和 [`docs/design/RFID_M1墨盒授权方案.md`](./docs/design/RFID_M1墨盒授权方案.md)，统一业务术语、卡布局、密钥和协议规则。
4. 按 `.scratch/rfid-m1-desktop/issues/` 的编号及阻塞关系执行 tickets。

## 目录

| 路径 | 内容 |
| --- | --- |
| `.scratch/rfid-m1-desktop/` | 实施规格和 14 个本地 tickets。 |
| `docs/桌面端原型与后端接口清单.md` | 原型截图、后端接口总表、喷码机配置接口和待确认项。 |
| `docs/design/` | 总方案、桌面端/喷码机子方案、ADR、技术选型研究和卡布局图。 |
| `docs/protocol/` | 实施直接依赖的 M1、RFID、通用帧和状态码协议 PDF，以及可搜索文本。 |
| `docs/screenshots/` | 由真实浏览器从本地 React 原型截取的四张验收截图。 |
| `prototype/` | 已选 A「引导工作台」React 原型源码；仅作为视觉与交互参考。 |

## 文档优先级

发生不一致时按以下顺序处理，不得静默选择：

1. `.scratch/rfid-m1-desktop/spec.md`
2. `docs/design/RFID_M1墨盒授权方案.md`
3. 桌面端与喷码机 App 两份子方案
4. ADR
5. 原型源码和截图

协议命令、字节顺序和状态码以 `docs/protocol/` 内对应版本的厂商协议为准。若规格与协议能力冲突，应停止实现并更新设计决策。

## 原型运行

```bash
cd prototype
npm install
npm run dev
```

原型只使用内存数据，不含 Electron、真实后端、真实串口、token 或密钥材料，不得直接作为生产代码。

# RFID M1 授权加密桌面端 V1 可执行规格

Status: ready-for-agent

## Problem Statement

系统管理员需要在受控的 Windows 授权工作站上完成客户注册、单张墨盒授权、墨盒储值和喷码机配置操作。当前已有总体方案、桌面端子方案、架构决策和经过选择的 UI 原型，但它们分别描述业务、安全、技术和界面，尚未汇总成可直接拆分开发任务和验收的统一规格。

实施者只有一人，熟悉 React，但没有桌面端开发经验。第一版先在 macOS 建立 Electron 工程、A「引导工作台」、后端 Mock 和串口协议编解码；macOS 阶段不接入任何真实接口或读卡器，也不提供 `MockReader`。首次需要真实云平台接口、RFID 后端接口、读卡器或喷码机接口时，项目迁移到 Windows 10/11 x64，并在该环境完成后续开发和验收。同时，缩减范围不能破坏已经确定的密钥边界、卡片权限、任务验收和结果不确定处置规则。

## Solution

交付一个面向 Windows 10/11 x64 受控工位的 Electron 桌面端及其所需 RFID 后端能力。桌面端采用 React 的 A「引导工作台」界面，只提供“工作台”和“客户”两个导航入口，以分步状态引导系统管理员完成授权或储值。Electron 主进程统一负责云平台登录会话、RFID 后端调用、串口通信、任务编排和短时密钥材料；renderer 只提交业务意图并展示非敏感状态。

桌面端业务编排只依赖 `BackendClient` 和 `ReaderPort` 两个稳定接口。macOS 阶段只为 `BackendClient` 注入内存替身，并用固定字节帧验证 `AA` 协议编解码；不装配 `ReaderPort`、不打开串口、不执行读写卡。迁移到 Windows 后，`BackendClient` 才开始接入真实云平台及 RFID 后端，`ReaderPort` 才使用 Node SerialPort 连接真实读卡器。项目不提供应用级模拟读卡器，生产构建也不能注入后端 Mock。

授权只有在桌面端完成写卡、双密钥认证和回读验收，并由后端校验完成请求后才成功。储值只允许使用每卡管理密钥执行值块加值，并由后端核对前后余额。跨过不可逆切换点后无法可信验收的墨盒进入“结果不确定”，必须贴标并退出流转，第一版不提供软件恢复。

## User Stories

1. As a 系统管理员, I want to use an existing cloud-platform username and password to log in, so that I do not need a separate RFID account.
2. As a 系统管理员, I want invalid, expired or unauthorized cloud-platform sessions to be rejected, so that only authorized workstations can operate cartridges.
3. As a 系统管理员, I want to log in again after every application restart, so that no reusable token is left on the workstation.
4. As a 云平台管理员, I want to add desktop operator accounts with existing account-management features, so that this project does not duplicate account administration.
5. As a 系统管理员, I want to view and search registered customers, so that I can select the correct customer before an operation.
6. As a 系统管理员, I want customer results to show the cloud-platform identifier, RFID customer number, registration state and fixed key version, so that I can verify the mapping without seeing a key.
7. As a 系统管理员, I want to register a customer through the desktop, so that the customer is created in the cloud platform and initialized for RFID use in one flow.
8. As a 系统管理员, I want a retried customer-registration request not to create another customer mapping or key, so that a partial failure does not duplicate identity or secrets.
9. As a 系统管理员, I want the desktop navigation to contain only “工作台” and “客户”, so that the first version remains focused on required operations.
10. As a 系统管理员, I want the workbench to switch between 墨盒授权 and 墨盒储值, so that both operations share one familiar workspace.
11. As a 系统管理员, I want the workbench to show the current customer, quota input, reader state, task step and result, so that I always know what the workstation will do next.
12. As a 系统管理员, I want the reader indicator to be red while waiting for a cartridge and green after detection, so that physical placement state is immediately visible.
13. As a 系统管理员, I want to select a customer and initial 可喷码次数 before authorization, so that the new 墨盒 is initialized for the intended customer and quota.
14. As a 系统管理员, I want authorization to require a detected F08 卡贴 before execution, so that an empty reader cannot create a misleading successful operation.
15. As a 系统管理员, I want the backend to allocate a unique authorization task and 墨盒 number, so that every attempted authorization is traceable.
16. As a 系统管理员, I want a UID already associated with a successful authorization to be rejected, so that one physical identity is not silently reissued.
17. As a 系统管理员, I want the workstation to authenticate a new cartridge using its transport-state key before writing, so that an incompatible or previously secured cartridge is not overwritten as new.
18. As a 系统管理员, I want authorization to write identity data and authorization metadata before changing the sector keys, so that failures before the irreversible point can be retried in the current operation.
19. As a 系统管理员, I want the initial 可喷码次数 to be created with the M1 value-block command, so that the balance uses the card's supported value semantics.
20. As a 系统管理员, I want the sector trailer to be written last, so that the irreversible key-and-permission transition occurs only after the other data is ready.
21. As a 系统管理员, I want the workstation to authenticate with both the 客户密钥 and 每卡管理密钥 after writing, so that the final permissions and both operational roles are verified.
22. As a 系统管理员, I want blocks 4 and 6 and the value balance to be read back before completion, so that the backend receives evidence of the actual cartridge state.
23. As a 系统管理员, I want authorization to become successful only after backend validation, so that an unverified write is never recorded as an authorized 墨盒.
24. As a 系统管理员, I want a write failure before the irreversible transition to show failure without creating a success record, so that I can retry within the same safe operation.
25. As a 系统管理员, I want a failure after the irreversible transition to show “结果不确定”, so that I do not accidentally retry or ship the 墨盒.
26. As a 系统管理员, I want a result-uncertain screen to instruct me to label and remove the 墨盒 from circulation, so that the manual first-version procedure is unambiguous.
27. As a 系统管理员, I want to start storage-value work by detecting an already authorized 墨盒 and entering an increment, so that the backend can validate eligibility before any change.
28. As a 系统管理员, I want storage value to be rejected when the 墨盒 is not successfully authorized or has an unfinished storage-value task, so that an uncertain balance cannot be incremented again.
29. As a 系统管理员, I want the workstation to authenticate storage-value operations only with the 每卡管理密钥, so that the 客户密钥 cannot grant top-up authority.
30. As a 系统管理员, I want the workstation to validate the UID, magic value, format version, customer, 墨盒 number, key version and CRC32 before incrementing, so that it does not modify the wrong or corrupted cartridge.
31. As a 系统管理员, I want storage value to use the card increment command and immediately read the value back, so that the new balance is based on value-block behavior rather than a direct data write.
32. As a 系统管理员, I want storage value to leave identity, metadata, customer ownership, key version and sector trailer unchanged, so that a top-up cannot reauthorize a cartridge.
33. As a 系统管理员, I want storage value to complete only when the balance difference exactly equals the requested increment, so that the backend records the actual verified change.
34. As a 系统管理员, I want a storage-value interruption after incrementing to become “结果不确定”, so that the cartridge is not incremented twice.
35. As a 系统管理员, I want duplicate completion requests for the same task to return the original result, so that retries do not duplicate authorization or storage-value records.
36. As a 系统管理员, I want card removal and reader disconnection to be visible failures, so that hardware interruptions are not presented as ordinary waiting.
37. As a 系统管理员, I want sensitive task materials to be absent from the UI and operation log, so that shoulder surfing and routine diagnostics do not disclose keys.
38. As a 系统管理员, I want logout, timeout, cancellation and application exit to end the in-memory session and task material lifetime, so that a later operator cannot reuse them.
39. As a developer, I want an in-memory backend replacement, so that I can implement and demonstrate login, customers and task flows before real APIs are ready.
40. As a developer, I want real-interface and real-reader work to begin only after the project moves to Windows, so that macOS development does not depend on unavailable production integrations.
41. As a developer, I want the current backend-Mock state and actual reader state to be visible in development, so that I can distinguish simulated service responses from physical cartridge operations.
42. As a release owner, I want production builds to be unable to enable the backend Mock, so that a workstation cannot create tasks from simulated service data by configuration mistake.
43. As a release owner, I want a `Setup.exe` that installs, starts, upgrades manually and uninstalls on a clean Windows 10/11 x64 workstation, so that deployment does not require developer tooling.
44. As an auditor, I want customer registration, task creation and task completion to record operator, time, identifiers and result without keys or complete card blocks, so that operations are traceable without expanding secret exposure.
45. As a backend operator, I want customer keys and the factory root encrypted at rest under a deployment-managed key, so that ordinary database access does not reveal authorization secrets.
46. As a backend operator, I want every customer to use fixed key version `1` in the first release, so that the delivered flow does not depend on key rotation features.
47. As a backend operator, I want each 每卡管理密钥 to be derived from the factory root and 墨盒 number rather than stored per card, so that the key store does not accumulate plaintext card keys.
48. As a 系统管理员, I want to select a printer and customer and initiate protected printer provisioning, so that the correct customer authorization material reaches a printer during controlled assembly or maintenance.
49. As an auditor, I want printer provisioning creation and result to be audited, so that delivery of a 客户密钥 to a printer is traceable.
50. As a security reviewer, I want the product documentation and UI not to claim strong anti-cloning protection, so that the limitations of M1 Classic/F08 remain explicit.

## Implementation Decisions

- The first release consists of one Electron desktop product plus the RFID backend capabilities that directly support it. The cloud platform remains the source of operator accounts, login sessions and customer master data.
- The supported desktop environment is Windows 10/11 x64. The stack is Electron, TypeScript, React and Vite; Node SerialPort implements direct USB virtual serial communication. Electron Forge with the Squirrel.Windows maker produces the installer.
- Initial development runs on macOS and is limited to the desktop scaffold, prototype-A production UI, `MockBackendClient` flows and fixed-byte serial codec tests. macOS development does not call real cloud, RFID backend or printer APIs and does not open a reader port.
- Windows migration is a hard gate. Every task that needs a real cloud-platform API, real RFID backend API, real printer API or real reader runs only after the project launches successfully on Windows 10/11 x64.
- The adopted UI is prototype A, “引导工作台”. It has only “工作台” and “客户” navigation. “授权记录”, “设置”, prototype variants and the prototype switcher are not part of the product.
- The workbench presents a four-step authorization-oriented hierarchy: select customer, place cartridge, execute operation and verify result. Authorization and storage value share this frame and expose only the controls and non-sensitive state required for the selected operation.
- The no-cartridge reader indicator is red and changes to green after a cartridge is detected. Failure and result uncertainty must remain visually distinct from both states.
- Prototype source is evidence of the selected layout and interaction hierarchy, not production code. Production UI is rewritten with normal type safety, error handling and tests.
- Electron renderer handles forms and displays non-sensitive business state. It cannot access cloud tokens, task keys, raw serial objects, Node APIs or a generic IPC bridge.
- Electron preload exposes a narrow, allow-listed business API. Electron main owns session, serial, HTTPS, task orchestration and key buffers. IPC messages use business commands and sanitized state rather than arbitrary channels or raw responses.
- A desktop business orchestrator is the highest behavioral seam. It coordinates two previously confirmed dependency seams: `BackendClient` for cloud/RFID backend capabilities and `ReaderPort` for cartridge operations. Renderer tests and application workflows target the orchestrator rather than each adapter implementation.
- `BackendClient` has real and in-memory implementations. Its required capabilities are login, logout/session invalidation, customer registration, customer query, authorization task creation/completion, storage-value task creation/completion, and printer-provisioning task creation/result submission.
- `ReaderPort` has only a real Node SerialPort implementation. Its required capabilities are port discovery/open/close, card detection and UID retrieval, sector authentication, block reading/writing, value initialization/increment/read, and disconnect/card-removal reporting. There is no application-level `MockReader`.
- macOS development assembly injects `MockBackendClient` and leaves `ReaderPort` unassembled. Windows development may inject `MockBackendClient` while using the real `ReaderPort` for reader bring-up; production assembly references only the real backend and reader implementations. No runtime flag, hidden UI action or configuration value may switch a production build to the backend Mock.
- `MockBackendClient` covers valid and invalid login, customer query and registration, authorization/storage-value task responses, completion success or rejection, backend interruption and result-uncertain submission paths. Its state and development key material are in memory and reset when the process stops.
- Whenever `MockBackendClient` is active, the UI displays an unmistakable development-state banner. Real-reader writes in this mode are restricted to clearly identified disposable F08 samples; those samples and task results must never enter production shipment or production backend records.
- Cloud login accepts username and password and returns a token. The token is kept only in Electron main memory, never sent to renderer, and is cleared on logout, invalidation or exit. Every application launch requires login.
- Customer registration calls the RFID backend, which calls the existing cloud-platform customer API. After cloud success, the RFID backend stores `cloud_customer_id`, allocates a unique 32-bit `customer_id`, generates a cryptographically random 6-byte 客户密钥 and fixes `key_version` to `1`.
- Customer registration retry uses the returned cloud identifier to resume local initialization. It must not call cloud registration again or generate a second mapping or key.
- The RFID customer boundary uses `POST /api/rfid/customers` for registration and `GET /api/rfid/customers` for query. Actual cloud-platform endpoint paths and authentication fields remain governed by the existing cloud contract.
- The key store saves the 客户密钥 and factory root only as authenticated ciphertext using a vetted storage component. The database does not hold the encryption master key; deployment-protected configuration or a key-management service provides it.
- A 64-bit cryptographically random, globally unique `cartridge_id` is allocated when an authorization task is created. It is never reused, including after result uncertainty.
- Each 6-byte 每卡管理密钥 is the first six bytes of HMAC-SHA-256 over the fixed domain string `M1-ADMIN-v1` and `cartridge_id`, keyed by the factory root. It is derived on demand and is not stored as a plaintext per-card record.
- `POST /api/rfid/authorization-tasks` receives `customer_id` and `initial_quota`, creates an in-progress task, and returns `task_id`, `cartridge_id`, fixed task data, 客户密钥 and derived 每卡管理密钥 in the same HTTPS response. There is no separate task-material endpoint.
- `POST /api/rfid/authorization-tasks/{taskId}/complete` receives UID, blocks 4 and 6 readback, value balance and both authentication results. The backend validates them before creating a successful authorization record.
- `POST /api/rfid/recharge-tasks` receives detected UID and increment. It succeeds only for a successfully authorized 墨盒 with no unfinished storage-value task and returns task data plus the derived 每卡管理密钥, never the 客户密钥.
- `POST /api/rfid/recharge-tasks/{taskId}/complete` receives UID, metadata readback, balance before and after, and authentication result. It succeeds only when the difference exactly equals the task increment.
- A unique constraint on `task_id` guarantees that an authorization or storage-value task produces at most one successful business record. Repeated identical completion returns the original outcome.
- The backend records customer mapping, encrypted key material, authorization tasks and records, storage-value tasks and records, and audit events. Audit events include operator identity, time, customer/task identifiers and outcome but exclude plaintext keys and complete card-block payloads.
- The M1 business sector is sector 1, absolute blocks 4 through 7. Block 4 stores magic `INK1`, format version, 32-bit big-endian `customer_id` and the lower 56 bits of `cartridge_id`. Block 6 stores key version, the high cartridge-ID byte plus reserved bytes, four-byte UID and CRC32 over block 4 plus bytes 0–11 of block 6.
- Block 5 is the authoritative 可喷码次数 value block. Authorization initializes it with the value-block initialization command. Storage value changes it only with the increment command and verifies it with the read-value command; direct writes are prohibited.
- Block 7 contains the 客户密钥, access-control bits and 每卡管理密钥. Authorization writes it last. Its access rules allow both keys to read identity and value data, allow the 客户密钥 to decrement but not increment or rewrite identity, and reserve writes, increment and trailer changes for the 每卡管理密钥.
- The real reader adapter sends `AA` frames with incrementing sequence, big-endian payload length and XOR validation. It correlates sequence and command responses, supports partial and merged serial chunks, and converts protocol status codes into business-safe errors.
- Authorization authenticates the transport state, writes blocks 4 and 6, initializes block 5, writes block 7 last, authenticates with both keys, reads blocks 4 and 6 and the balance, then submits completion.
- Before block 7 is written, a failed authorization step may be retried inside the current operation. After block 7 may have been written, any inability to obtain and submit trusted verification is terminal result uncertainty.
- Storage value authenticates with the 每卡管理密钥, validates identity/metadata/CRC and current balance, increments block 5, immediately reads the new balance, then submits completion. An interruption after the increment may have executed is terminal result uncertainty.
- Result uncertainty never creates a backend success record. The UI requires physical labeling and removal from circulation. For storage value, the unfinished task remains and prevents another storage-value task for the UID.
- Known key-containing values are held as main-process byte buffers, never converted to strings or sent through IPC. On success, failure, cancellation, timeout, logout or exit, every known key-containing and command-frame buffer is overwritten with zero and released. This is an engineering boundary, not a claim that the JavaScript runtime has no unknown copies.
- Task-material HTTP responses disable intermediary and client caching and are excluded from request/response logging, telemetry and error-report payloads. Neither token nor keys enter local storage, session restoration, download files or renderer state.
- Printer provisioning is initiated by the desktop but governed by the printer-App contract. The desktop passes short-lived customer number, key version `1`, 客户密钥 and layout version to the printer's protected configuration interface and submits the result. It never supplies the factory root or 每卡管理密钥.
- Printer provisioning starts through `POST /api/rfid/printer-provisioning-tasks`; its result-submission contract and protected printer-side endpoint must be finalized with the printer App implementation without broadening the desktop's access to factory secrets.
- Installer upgrades are manual in the first release. There is no automatic-update subsystem.

## Testing Decisions

- Good tests assert externally observable business behavior: returned outcomes, visible state, emitted allowed IPC data, persisted backend records, serial bytes and device state. They do not assert React component internals, private helper calls or adapter implementation structure.
- On macOS, the primary desktop test seam is the business orchestrator driven through its allow-listed application API with `MockBackendClient`; reader-dependent actions remain unavailable. After Windows migration, the same seam combines the real `BackendClient` and real `ReaderPort` for hardware-in-the-loop login, customer, authorization and storage-value verification.
- Renderer tests cover the adopted A interface: only “工作台” and “客户” navigation, required form controls, four-step progress, reader red/green state, success/failure/result-uncertain presentation, and absence of key material. They do not preserve prototype-only markup or CSS structure.
- Backend contract tests cover invalid/expired permissions, customer-registration retry, customer mapping uniqueness, task creation response boundaries, authorization verification, storage-value eligibility and balance validation, task idempotency, audit redaction and unfinished-task blocking.
- Database tests verify unique `cloud_customer_id`, unique `customer_id`, unique `cartridge_id`, one completion per `task_id`, fixed key version `1`, and transaction behavior when cloud registration succeeds before local initialization.
- Cryptographic tests use fixed vectors to verify six-byte random-key length handling, authenticated encryption round trips, wrong-master-key rejection, HMAC domain separation and deterministic 每卡管理密钥 derivation. Tests never print live secret values.
- Serial codec tests use fixed byte-frame fixtures for complete, split, merged, bad-XOR, bad-length, unexpected-sequence and protocol-error responses. These fixtures test framing and parsing only and do not provide a simulated `ReaderPort`. Real-reader integration tests verify disconnection behavior, command order, block numbers, authentication modes, value operations, no forbidden direct block-5 writes, and no storage-value writes to blocks 4, 6 or 7.
- Security-boundary tests verify that token and keys never cross the preload API, never appear in renderer state, logs, cache, telemetry or error payloads, and that known buffers are zeroed on every terminal path.
- macOS build tests cover the Electron boundary, adopted UI, backend-Mock flows and serial codec without opening a serial port. Windows development tests add the connected real reader and real interfaces. Production build tests verify that `MockBackendClient` and its activation paths are absent from the packaged application.
- Installer acceptance runs the generated `Setup.exe` on a clean Windows 10/11 x64 workstation without developer tools, then verifies launch, required login, manual replacement upgrade and uninstall.
- Real-device acceptance uses the actual reader and representative F08 samples. It verifies repeated card detection, authentication, block layout, access-control bits, value initialization/increment/read, removal, serial disconnect/reconnect, power-off readback and at least 100 consecutive core read/write cycles.
- End-to-end authorization acceptance verifies correct block 4/6 content, initial balance, 客户密钥 and 每卡管理密钥 authentication, backend success only after readback, and no reuse of an uncertain `cartridge_id`.
- End-to-end storage-value acceptance verifies the exact requested increase, unchanged identity/metadata/trailer blocks, one backend record under repeated completion, and refusal after an unfinished uncertain task.
- Printer-provisioning integration verifies that only the allowed short-lived material reaches the protected printer interface and that the result is audited without the 客户密钥.
- There is no existing production test suite to copy. The prototype's successful build and browser checks are evidence for the UI decision only, not prior art for production correctness.

## Out of Scope

- Building a new operator account, login or customer master-data administration system.
- Persisting a cloud-platform token or supporting login restoration across application launches.
- Customer-key rotation, multiple active key versions or any key-version management interface; the first release uses version `1`.
- Authorization-record browsing, a settings page or reintroducing prototype B/C layouts.
- 待核验任务查询, task recovery, software quarantine, quarantine release or automated handling of result-uncertain cartridges.
- Retrying authorization after the sector trailer may have changed, reusing a previously allocated `cartridge_id`, or starting another storage-value task after an uncertain increment.
- Displaying, exporting or logging plaintext 客户密钥, 每卡管理密钥, factory root or complete card blocks.
- Desktop generation of customer keys, factory root, 每卡管理密钥 or 墨盒 numbers.
- Direct writes to the value block for initialization, storage value or printing balance changes.
- Printer runtime cartridge authentication, print admission, successful-print decrement or failure lockout; these belong to the printer App specification.
- Automatic updates, Windows 7/8, 32-bit Windows, Windows ARM or non-Windows production targets.
- Vendor reader SDK/DLL integration or Web Serial as the primary reader path.
- Strong anti-cloning claims or defenses beyond the documented M1 Classic/F08 risk boundary.
- Production use of prototype code, backend-Mock data, cartridges written under backend-Mock tasks or a runtime Mock-selection control.

## Further Notes

- This specification synthesizes the RFID M1 墨盒 authorization plan, the desktop sub-plan, ADR-0001 through ADR-0005 and the accepted prototype A decision.
- The accepted visual reference is this repository's `prototype/` directory and `docs/screenshots/`; only its A layout and validated interaction conclusions are authoritative.
- The previously confirmed testing/dependency seams are `BackendClient` and `ReaderPort`; the desktop business orchestrator is the preferred high-level entry for behavior tests.
- Exact cloud-platform paths, field names, permission claims and error shapes remain an integration input. They should be captured in the first cloud-integration ticket without changing the business boundary in this specification.
- Exact serial baud rate, timeout values, transport-state default key and device-specific response details remain hardware-integration inputs. They should be taken from the supplied protocol documents and validated against the actual reader and F08 sample before finalizing the real adapter.
- The selected prototype remains available as a visual reference, but its in-memory state model, permissive types and minimal error handling are intentionally not production architecture.
- ADR-0005 and the desktop sub-plan have been aligned with this specification: no simulated reader is built, and real-reader work begins only after the macOS project is migrated to Windows.
- This specification is ready to be passed to `/to-tickets`; individual implementation tickets must declare blocking edges and deliver testable vertical behavior rather than isolated technical layers.

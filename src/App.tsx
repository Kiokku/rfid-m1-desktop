import { useEffect, useState } from 'react'

import type { RuntimeState } from '../shared/runtime-state.js'
import { navigationItems, type Section, workbenchSteps } from './ui-contract.js'

const browserPreviewState: RuntimeState = {
  build: 'development',
  platform: '其他系统',
  backend: '未装配',
  reader: '未装配',
  message: '浏览器预览：Electron preload 仅在桌面应用中可用。',
}

function Icon({ name }: { name: 'rfid' | 'grid' | 'users' | 'card' | 'alert' }) {
  const icons = {
    rfid: '◉',
    grid: '⊞',
    users: '♧',
    card: '▣',
    alert: '!',
  }
  return <span aria-hidden="true" className="icon">{icons[name]}</span>
}

function ReaderStatus() {
  return <span className="reader-status reader-unavailable"><i />读卡器未装配</span>
}

function Workbench({ runtimeState }: { runtimeState: RuntimeState | null }) {
  const isMacOS = runtimeState?.platform === 'macOS'
  const phase = isMacOS ? 'macOS 开发阶段' : '开发阶段'
  return <>
    <section className="step-panel">
      <h1>墨盒操作</h1>
      <p>受控工位 · {phase}</p>
      {workbenchSteps.map((step, index) => <div className={`step ${index === 0 ? 'current' : ''}`} key={step}>
        <i>{index + 1}</i>
        <div><b>{step}</b><span>{index === 0 ? '等待后端接入' : '待进行'}</span></div>
      </div>)}
    </section>
    <main className="workspace">
      <header><div><p>当前任务</p><h2>授权 M1 墨盒卡</h2></div><ReaderStatus /></header>
      <section className="reader-stage">
        <div className="corner top-left" /><div className="corner top-right" />
        <div className="corner bottom-left" /><div className="corner bottom-right" />
        <div className="reader-device"><i /><div><Icon name="rfid" /><b>RFID</b></div></div>
        <strong>当前阶段不装配读卡器</strong>
        <span>{isMacOS ? '真实读卡器将在 Windows 阶段接入；' : ''}本应用不提供 MockReader。</span>
      </section>
      <section className="control-strip" aria-label="授权控制（尚未启用）">
        <div className="segmented"><button className="active" disabled>墨盒授权</button><button disabled>墨盒储值</button></div>
        <label>客户<select disabled><option>等待后端接入</option></select></label>
        <label>初始次数<input value="10" readOnly disabled /></label>
        <button className="primary-button" disabled>执行授权</button>
      </section>
    </main>
    <aside className="detail-panel">
      <h2>任务详情</h2>
      <dl><dt>任务编号</dt><dd>尚未创建</dd><dt>卡片 UID</dt><dd>等待读卡器接入</dd><dt>当前结果</dt><dd>待处理</dd><dt>密钥材料</dt><dd>不向界面暴露</dd></dl>
      <h3>阶段说明</h3>
      <div className="notice"><Icon name="alert" /><span>后端 Mock、真实接口和读卡器均尚未装配；此处仅建立受限 Electron 壳与 UI。</span></div>
    </aside>
  </>
}

function Customers({ runtimeState }: { runtimeState: RuntimeState | null }) {
  const phase = runtimeState?.platform === 'macOS' ? 'macOS 开发阶段' : '开发阶段'
  return <>
    <section className="step-panel">
      <h1>客户管理</h1>
      <p>云平台资料 · {phase} · 等待后端接入</p>
      <div className="customer-step current"><i>1</i><div><b>查看客户</b><span>查询并选择客户资料</span></div></div>
      <div className="customer-step"><i>2</i><div><b>注册客户</b><span>创建云平台映射</span></div></div>
      <div className="side-note">接入后只展示客户编号、状态和固定密钥版本；密钥材料始终不向界面展示。</div>
    </section>
    <main className="customers-workspace">
      <header><div><p>云平台客户资料</p><h2>客户管理</h2></div><button className="primary-button" disabled>＋ 注册客户</button></header>
      <label className="search">查询客户<input disabled placeholder="名称或 RFID 客户编号" /></label>
      <section className="empty-customers"><Icon name="users" /><h3>等待后端接入</h3><p>客户查询与注册将在后续 MockBackendClient ticket 中启用。</p></section>
    </main>
    <aside className="detail-panel">
      <h2>客户详情</h2>
      <div className="customer-avatar">客</div>
      <h3>尚未选择客户</h3>
      <dl><dt>RFID 客户编号</dt><dd>—</dd><dt>云平台标识</dt><dd>—</dd><dt>密钥版本</dt><dd>固定版本 1</dd><dt>注册状态</dt><dd>等待后端接入</dd></dl>
    </aside>
  </>
}

export function App() {
  const [section, setSection] = useState<Section>('workbench')
  const [runtimeState, setRuntimeState] = useState<RuntimeState | null>(null)

  useEffect(() => {
    if (!window.rfidDesktop) {
      setRuntimeState(browserPreviewState)
      return
    }

    void window.rfidDesktop.getRuntimeState().then(setRuntimeState)
  }, [])

  return <div className="app-shell">
    <aside className="navigation">
      <div className="brand"><Icon name="rfid" /><span>RFID M1<br />授权工位</span></div>
      <nav>
        {navigationItems.map((item) => <button className={section === item.section ? 'active' : ''} key={item.section} onClick={() => setSection(item.section)}><Icon name={item.icon} />{item.label}</button>)}
      </nav>
      <div className="sidebar-status"><ReaderStatus /><small>未装配读卡器</small></div>
    </aside>
    <section className="content-grid">{section === 'workbench' ? <Workbench runtimeState={runtimeState} /> : <Customers runtimeState={runtimeState} />}</section>
    <footer className="runtime-banner">{runtimeState ? <><b>{runtimeState.platform} · {runtimeState.build === 'development' ? '开发构建' : '生产构建'}</b><span>后端：{runtimeState.backend}</span><span>读卡器：{runtimeState.reader}</span><span>{runtimeState.message}</span></> : '正在读取非敏感运行状态…'}</footer>
  </div>
}

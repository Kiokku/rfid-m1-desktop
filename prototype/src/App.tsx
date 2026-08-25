import { useMemo, useState } from 'react'

type Operation = '授权' | '储值'
type Scenario = '正常完成' | '写卡失败' | '移卡' | '读卡器断连' | '结果不确定'
type ReaderState = '待放卡' | '已检测' | '写入中' | '已完成' | '异常'
type Result = '待处理' | '成功' | '失败' | '结果不确定'
type AppSection = 'workbench' | 'customers'
type CustomerRecord = { name: string; rfidId: string; cloudId: string; contact: string; status: string }

const initialCustomerRecords: CustomerRecord[] = [
  { name: '佳能华南服务中心', rfidId: 'RFID-00010482', cloudId: 'cloud_customer_20481', contact: '李经理 · 138 0000 5678', status: '已注册' },
  { name: '图盛办公设备有限公司', rfidId: 'RFID-00010483', cloudId: 'cloud_customer_20482', contact: '王女士 · 139 0000 2288', status: '已注册' },
  { name: '深圳文印服务部', rfidId: 'RFID-00010484', cloudId: 'cloud_customer_20483', contact: '陈工 · 136 0000 7788', status: '已注册' },
]

const seedLogs = [
  { time: '10:24:18', text: 'MockBackend：已创建内存授权任务', tone: 'neutral' },
  { time: '10:24:21', text: 'MockReader：模拟读卡器已连接', tone: 'success' },
]

function Icon({ name, size = 20 }: { name: string; size?: number }) {
  const paths: Record<string, string> = {
    rfid: 'M5 4.5A2.5 2.5 0 0 1 7.5 2H16a3 3 0 0 1 3 3v14a3 3 0 0 1-3 3H7.5A2.5 2.5 0 0 1 5 19.5v-15ZM9 8.5a3.5 3.5 0 0 1 0 7m2.5-9.5a6.5 6.5 0 0 1 0 12m2.5-14a9.5 9.5 0 0 1 0 16',
    grid: 'M4 4h6v6H4V4Zm10 0h6v6h-6V4ZM4 14h6v6H4v-6Zm10 0h6v6h-6v-6Z',
    users: 'M16 20v-1.5a4.5 4.5 0 0 0-4.5-4.5h-4A4.5 4.5 0 0 0 3 18.5V20m12-13a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Zm3 5a3 3 0 0 1 3 3v2m-3-9a3 3 0 0 1 0-6',
    check: 'm5 12 4.2 4.2L19 6.5',
    play: 'm9 5 10 7-10 7V5Z',
    alert: 'M12 3 2.8 20h18.4L12 3Zm0 5.2v5.6m0 3.1h.01',
    plus: 'M12 5v14M5 12h14',
    card: 'M3 6.5A2.5 2.5 0 0 1 5.5 4h13A2.5 2.5 0 0 1 21 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5v-11ZM3 10h18',
  }
  return <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name] ?? paths.grid} /></svg>
}

function StatusDot({ readerState }: { readerState: ReaderState }) {
  const label = readerState === '异常' ? '异常' : readerState === '待放卡' ? '等待卡片' : '模拟读卡器在线'
  return <span className={`reader-status ${readerState === '异常' ? 'danger' : ''}`}><i />{label}</span>
}

function MockState({ operation, scenario, readerState, result, customerCount, activeSection }: {
  operation: Operation; scenario: Scenario; readerState: ReaderState; result: Result; customerCount: number; activeSection: AppSection
}) {
  return <div className="mock-state"><span>内存 Mock</span><b>页面：{activeSection === 'customers' ? '客户管理' : '工作台'}</b><b>客户：{customerCount}</b><b>操作：{operation}</b><b>情景：{scenario}</b><b>读卡：{readerState}</b><b>结果：{result}</b></div>
}

function LogList({ logs, compact = false }: { logs: { time: string; text: string; tone: string }[]; compact?: boolean }) {
  return <div className={`logs ${compact ? 'compact' : ''}`}>{logs.slice(0, compact ? 4 : 6).map((log, index) => <div className="log-row" key={`${log.time}-${index}`}><span className={`log-dot ${log.tone}`} /><time>{log.time}</time><span>{log.text}</span></div>)}</div>
}

function ConceptReaderDevice() {
  return <div className="concept-reader-device" aria-hidden="true">
    <i className="reader-led" />
    <div className="reader-screen"><svg viewBox="0 0 96 96" fill="none" stroke="currentColor" strokeLinecap="round"><circle cx="48" cy="48" r="3" fill="currentColor" stroke="none" /><path d="M39 38a14 14 0 0 0 0 20m18-20a14 14 0 0 1 0 20M31 30a25 25 0 0 0 0 36m34-36a25 25 0 0 1 0 36" strokeWidth="2.8" /></svg><span>RFID</span></div>
  </div>
}

function ReaderStage({ readerState, onDetect, conceptDevice = false }: { readerState: ReaderState; onDetect: () => void; conceptDevice?: boolean }) {
  const detected = readerState !== '待放卡' && readerState !== '异常'
  return <section className={`reader-stage ${detected ? 'detected' : ''} ${readerState === '异常' ? 'reader-error' : ''}`}>
    <div className="corner top-left" /><div className="corner top-right" /><div className="corner bottom-left" /><div className="corner bottom-right" />
    {conceptDevice ? <ConceptReaderDevice /> : <div className="reader-visual"><Icon name="rfid" size={64} /></div>}
    <strong>{readerState === '待放卡' ? '请将 M1 墨盒卡放置于读卡区' : readerState === '异常' ? '读卡器连接已中断' : '已检测到 M1 墨盒卡'}</strong>
    <span>{detected ? 'UID 04 A1 B2 C3 D4 5E 6F 80 · MIFARE Classic 1K' : '开发替身：点击下方按钮模拟放卡'}</span>
    <button className="quiet-button" onClick={onDetect}><Icon name="card" />{detected ? '重新模拟读卡' : '模拟放卡'}</button>
  </section>
}

export function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('workbench')
  const [operation, setOperation] = useState<Operation>('授权')
  const [customerRecords, setCustomerRecords] = useState(initialCustomerRecords)
  const [customer, setCustomer] = useState(initialCustomerRecords[0].name)
  const [customerSearch, setCustomerSearch] = useState('')
  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerContact, setNewCustomerContact] = useState('')
  const [count, setCount] = useState(10)
  const [scenario, setScenario] = useState<Scenario>('正常完成')
  const [readerState, setReaderState] = useState<ReaderState>('待放卡')
  const [result, setResult] = useState<Result>('待处理')
  const [logs, setLogs] = useState(seedLogs)

  const now = () => new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(new Date())
  const addLog = (text: string, tone = 'neutral') => setLogs((current) => [{ time: now(), text, tone }, ...current])

  function detectCard() {
    setReaderState('已检测')
    setResult('待处理')
    addLog('MockReader：检测到 M1 墨盒卡 UID 04 A1 B2 C3 D4 5E 6F 80', 'success')
  }

  function runTask() {
    if (readerState === '待放卡') {
      addLog('请先放置墨盒卡，再创建操作任务', 'warning')
      return
    }
    setReaderState('写入中')
    addLog(`MockBackend：创建${operation}任务，客户 ${customer}`, 'neutral')
    window.setTimeout(() => {
      if (scenario === '正常完成') {
        setReaderState('已完成'); setResult('成功'); addLog(`MockReader：${operation}、回读验收与内存任务提交完成`, 'success')
      } else if (scenario === '写卡失败') {
        setReaderState('异常'); setResult('失败'); addLog('MockReader：写卡失败，未越过不可逆切换点', 'danger')
      } else if (scenario === '读卡器断连') {
        setReaderState('异常'); setResult('失败'); addLog('MockReader：串口断连，任务未完成', 'danger')
      } else {
        setReaderState('异常'); setResult('结果不确定'); addLog(scenario === '移卡' ? 'MockReader：写入后移卡，无法完成回读验收' : 'MockBackend：写入后提交中断，结果不确定', 'warning')
      }
    }, 520)
  }

  function registerCustomer() {
    const record: CustomerRecord = {
      name: newCustomerName.trim(),
      rfidId: `RFID-${String(10482 + customerRecords.length + 1).padStart(8, '0')}`,
      cloudId: `cloud_customer_${20481 + customerRecords.length + 1}`,
      contact: newCustomerContact.trim() || '未填写联系人',
      status: '已注册',
    }
    setCustomerRecords((records) => [...records, record])
    setCustomer(record.name)
    setNewCustomerName('')
    setNewCustomerContact('')
    setIsRegistrationOpen(false)
    addLog(`MockBackend：客户 ${record.name} 已注册并分配 RFID 客户编号`, 'success')
  }

  const taskId = useMemo(() => `AUTH-${String(count).padStart(4, '0')}-0724`, [count])
  const props = { operation, setOperation, customer, setCustomer, availableCustomers: customerRecords.map((record) => record.name), count, setCount, scenario, setScenario, readerState, result, logs, detectCard, runTask, taskId, activeSection, setActiveSection, customerRecords, customerSearch, setCustomerSearch, isRegistrationOpen, setIsRegistrationOpen, newCustomerName, setNewCustomerName, newCustomerContact, setNewCustomerContact, registerCustomer }

  return <main className="app-shell variant-a">
    <VariantA {...props} />
    <MockState operation={operation} scenario={scenario} readerState={readerState} result={result} customerCount={customerRecords.length} activeSection={activeSection} />
  </main>
}

function TaskControls({ operation, setOperation, customer, setCustomer, availableCustomers, count, setCount, scenario, setScenario, runTask, compact = false }: any) {
  return <div className={`task-controls ${compact ? 'compact-controls' : ''}`}>
    <div className="segmented"><button className={operation === '授权' ? 'active' : ''} onClick={() => setOperation('授权')}>墨盒授权</button><button className={operation === '储值' ? 'active' : ''} onClick={() => setOperation('储值')}>墨盒储值</button></div>
    <label>客户<select value={customer} onChange={(event) => setCustomer(event.target.value)}>{availableCustomers.map((item: string) => <option key={item}>{item}</option>)}</select></label>
    <label>{operation === '授权' ? '初始次数' : '增加次数'}<input type="number" min="1" value={count} onChange={(event) => setCount(Number(event.target.value))} /></label>
    <label>模拟情景<select value={scenario} onChange={(event) => setScenario(event.target.value as Scenario)}>{(['正常完成', '写卡失败', '移卡', '读卡器断连', '结果不确定'] as Scenario[]).map((item) => <option key={item}>{item}</option>)}</select></label>
    <button className="primary-button" onClick={runTask}><Icon name="play" />执行{operation}</button>
  </div>
}

function ResultPanel({ result, logs, taskId }: { result: Result; logs: any[]; taskId: string }) {
  const uncertain = result === '结果不确定'
  return <aside className={`result-panel ${uncertain ? 'uncertain' : result === '成功' ? 'success-result' : ''}`}>
    <h2>{uncertain ? '结果判定与处置' : '任务详情'}</h2>
    {uncertain ? <><div className="uncertain-box"><Icon name="alert" size={36} /><div><strong>结果不确定</strong><p>回读验收或结果提交未完成。不得再次操作。</p></div></div><ol><li><b>贴标</b><span>标记“结果不确定”</span></li><li><b>退出流转</b><span>交由人工保管或报废</span></li></ol><button className="warning-button">确认贴标并退出流转</button></> : <><dl><dt>任务编号</dt><dd>{taskId}</dd><dt>卡片 UID</dt><dd>04 A1 B2 C3 D4</dd><dt>当前结果</dt><dd className={result === '成功' ? 'success-text' : ''}>{result}</dd><dt>密钥材料</dt><dd>不向界面暴露</dd></dl><h3>操作日志</h3><LogList logs={logs} compact /></>}
  </aside>
}

function CustomerWorkspace(props: any) {
  const records = props.customerRecords.filter((record: CustomerRecord) => record.name.includes(props.customerSearch) || record.rfidId.includes(props.customerSearch))
  return <section className="customer-workspace">
    <header><div><p>云平台客户资料</p><h2>客户管理</h2></div><button className="primary-button" onClick={() => props.setIsRegistrationOpen(true)}><Icon name="plus" />注册客户</button></header>
    <div className="customer-toolbar"><label>查询客户<input aria-label="查询客户" value={props.customerSearch} onChange={(event) => props.setCustomerSearch(event.target.value)} placeholder="名称或 RFID 客户编号" /></label><span>共 {records.length} 个客户</span></div>
    <div className="customer-table"><div className="customer-table-head"><span>客户名称</span><span>RFID 客户编号</span><span>云平台标识</span><span>状态</span></div>{records.map((record: CustomerRecord) => <button key={record.rfidId} className={record.name === props.customer ? 'selected-customer' : ''} onClick={() => props.setCustomer(record.name)}><span><b>{record.name}</b><small>{record.contact}</small></span><span className="mono-cell">{record.rfidId}</span><span className="mono-cell">{record.cloudId}</span><span className="customer-ready">{record.status}</span></button>)}</div>
    {props.isRegistrationOpen && <div className="registration-form"><div><p>新客户</p><h3>注册到云平台并初始化 RFID 映射</h3></div><label>客户名称<input aria-label="新客户名称" value={props.newCustomerName} onChange={(event) => props.setNewCustomerName(event.target.value)} placeholder="例如：华南售后服务中心" /></label><label>联系人<input aria-label="联系人" value={props.newCustomerContact} onChange={(event) => props.setNewCustomerContact(event.target.value)} placeholder="姓名 · 手机号" /></label><div className="form-actions"><button className="text-button" onClick={() => props.setIsRegistrationOpen(false)}>取消</button><button className="primary-button" disabled={!props.newCustomerName.trim()} onClick={props.registerCustomer}>确认注册</button></div></div>}
  </section>
}

function CustomerPanel({ customerRecords, customer, logs }: { customerRecords: CustomerRecord[]; customer: string; logs: any[] }) {
  const record = customerRecords.find((item) => item.name === customer) ?? customerRecords[0]
  return <aside className="customer-panel"><h2>客户详情</h2><div className="customer-avatar">客</div><h3>{record.name}</h3><p>{record.contact}</p><dl><dt>RFID 客户编号</dt><dd>{record.rfidId}</dd><dt>云平台标识</dt><dd>{record.cloudId}</dd><dt>密钥版本</dt><dd>固定版本 1</dd><dt>注册状态</dt><dd className="success-text">{record.status}</dd></dl><div className="customer-panel-note"><Icon name="check" size={17} /><span>可用于新建授权与储值任务<br />密钥材料不向界面展示</span></div><h3>最近操作</h3><LogList logs={logs} compact /></aside>
}

function VariantA(props: any) {
  const steps = ['选择客户', '放置卡片', '执行授权', '验证结果']
  const current = props.readerState === '待放卡' ? 1 : props.result === '成功' ? 4 : props.readerState === '写入中' ? 3 : 2
  const isCustomerPage = props.activeSection === 'customers'
  const navItems: [string, string, AppSection][] = [['grid', '工作台', 'workbench'], ['users', '客户', 'customers']]
  return <div className="wizard-layout">
    <aside className="dark-sidebar"><div className="brand"><Icon name="rfid" size={30} /><span>RFID M1<br />授权工位</span></div><nav>{navItems.map(([icon, label, section]) => <button className={section === props.activeSection ? 'nav-active' : ''} onClick={() => section && props.setActiveSection(section)} key={label}><Icon name={icon} />{label}</button>)}</nav><div className="sidebar-reader"><StatusDot readerState={props.readerState} /><small>Virtual M1 Reader 01</small></div></aside>
    <section className="wizard-steps">{isCustomerPage ? <><h1>客户管理</h1><p>云平台资料 · 开发替身</p><div className="customer-side-step current"><i>1</i><div><b>查看客户</b><span>查询并选择客户资料</span></div></div><div className="customer-side-step"><i>2</i><div><b>注册客户</b><span>创建云平台映射</span></div></div><div className="customer-side-note">注册成功后，系统只展示客户编号、状态和固定密钥版本；不展示密钥材料。</div></> : <><h1>墨盒操作</h1><p>受控工位 · 开发替身</p>{steps.map((step, index) => <div className={`step ${index + 1 === current ? 'current' : index + 1 < current ? 'done' : ''}`} key={step}><i>{index + 1}</i><div><b>{step}</b><span>{index + 1 < current ? '已完成' : index + 1 === current ? '进行中' : '待进行'}</span></div></div>)}</>}</section>
    {isCustomerPage ? <CustomerWorkspace {...props} /> : <section className="wizard-main"><header><div><p>当前任务</p><h2>{props.operation} M1 墨盒卡</h2></div><StatusDot readerState={props.readerState} /></header><ReaderStage readerState={props.readerState} onDetect={props.detectCard} conceptDevice /><div className="wizard-bottom"><TaskControls {...props} compact /></div></section>}
    {isCustomerPage ? <CustomerPanel customerRecords={props.customerRecords} customer={props.customer} logs={props.logs} /> : <ResultPanel result={props.result} logs={props.logs} taskId={props.taskId} />}
  </div>
}

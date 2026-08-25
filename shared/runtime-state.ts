export type RuntimeState = {
  build: 'development' | 'production'
  platform: 'macOS' | 'Windows' | '其他系统'
  backend: BackendState
  reader: '未装配'
  session: SessionState
  message: string
}

export type BackendState = 'MockBackendClient（仅开发）' | '真实后端' | '未装配'

export type SessionState =
  | { status: '未登录' }
  | { status: '已登录'; operatorName: string }

export type LoginRequest = {
  username: string
  password: string
}

export type DesktopEnvironment = {
  isPackaged: boolean
  platform: NodeJS.Platform
}

type RuntimeStateInput = DesktopEnvironment & {
  backend?: RuntimeState['backend']
  session?: SessionState
  message?: string
}

export function createRuntimeState({ isPackaged, platform, backend = '未装配', session = { status: '未登录' }, message }: RuntimeStateInput): RuntimeState {
  const isMacOS = platform === 'darwin'
  return {
    build: isPackaged ? 'production' : 'development',
    platform: isMacOS ? 'macOS' : platform === 'win32' ? 'Windows' : '其他系统',
    backend,
    reader: '未装配',
    session,
    message: message ?? (isMacOS
      ? 'macOS 开发阶段：真实接口与读卡器将在 Windows 阶段接入。'
      : '真实接口与读卡器尚未接入。'),
  }
}

export const runtimeStateChannel = 'rfid-desktop:runtime-state'

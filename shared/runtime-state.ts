export type RuntimeState = {
  build: 'development' | 'production'
  platform: 'macOS' | 'Windows' | '其他系统'
  backend: '未装配'
  reader: '未装配'
  message: string
}

type RuntimeStateInput = {
  isPackaged: boolean
  platform: NodeJS.Platform
}

export function createRuntimeState({ isPackaged, platform }: RuntimeStateInput): RuntimeState {
  const isMacOS = platform === 'darwin'
  return {
    build: isPackaged ? 'production' : 'development',
    platform: isMacOS ? 'macOS' : platform === 'win32' ? 'Windows' : '其他系统',
    backend: '未装配',
    reader: '未装配',
    message: isMacOS
      ? 'macOS 开发阶段：真实接口与读卡器将在 Windows 阶段接入。'
      : '真实接口与读卡器尚未接入。',
  }
}

export const runtimeStateChannel = 'rfid-desktop:runtime-state'

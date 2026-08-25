import { describe, expect, it } from 'vitest'

import { createRuntimeState } from '../shared/runtime-state.js'

describe('createRuntimeState', () => {
  it('reports the macOS scaffold as reader-unavailable without sensitive material', () => {
    const state = createRuntimeState({ isPackaged: false, platform: 'darwin' })

    expect(state).toEqual({
      build: 'development',
      platform: 'macOS',
      backend: '未装配',
      reader: '未装配',
      session: { status: '未登录' },
      message: 'macOS 开发阶段：真实接口与读卡器将在 Windows 阶段接入。',
    })
    expect(JSON.stringify(state)).not.toMatch(/token|key|secret|serial/i)
  })

  it('does not describe the Windows stage as macOS', () => {
    expect(createRuntimeState({ isPackaged: false, platform: 'win32' }).message).toBe('真实接口与读卡器尚未接入。')
  })
})

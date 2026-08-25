import { describe, expect, it } from 'vitest'

import { MockBackendClient } from '../main/mock-backend-client.js'
import { DesktopSession } from '../main/desktop-session.js'

describe('DesktopSession', () => {
  it('accepts the development administrator without exposing its token', async () => {
    const session = new DesktopSession(new MockBackendClient(), { isPackaged: false, platform: 'darwin' })

    const state = await session.login({ username: 'admin', password: 'mock-password' })

    expect(state.session).toEqual({ status: '已登录', operatorName: 'Mock 系统管理员' })
    expect(state.backend).toBe('MockBackendClient（仅开发）')
    expect(JSON.stringify(state)).not.toMatch(/token|mock-token|password/i)
  })

  it('rejects invalid credentials and a simulated expired session with safe messages', async () => {
    const session = new DesktopSession(new MockBackendClient(), { isPackaged: false, platform: 'darwin' })

    await expect(session.login({ username: 'admin', password: 'incorrect' })).resolves.toMatchObject({
      session: { status: '未登录' },
      message: '用户名或密码不正确。',
    })
    await expect(session.login({ username: 'expired-session', password: 'mock-password' })).resolves.toMatchObject({
      session: { status: '未登录' },
      message: '模拟会话已失效，请重新登录。',
    })
  })

  it('rejects malformed IPC input without throwing or starting a session', async () => {
    const session = new DesktopSession(new MockBackendClient(), { isPackaged: false, platform: 'darwin' })

    await expect(session.login(undefined as never)).resolves.toMatchObject({
      session: { status: '未登录' },
      message: '请输入用户名和密码。',
    })
  })

  it('clears the in-memory session when the operator logs out', async () => {
    const session = new DesktopSession(new MockBackendClient(), { isPackaged: false, platform: 'darwin' })
    await session.login({ username: 'admin', password: 'mock-password' })

    const state = await session.logout()

    expect(state.session).toEqual({ status: '未登录' })
  })
})

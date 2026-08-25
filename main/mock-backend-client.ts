import type { LoginRequest } from '../shared/runtime-state.js'

export type BackendLogin = {
  token: string
  operatorName: string
}

export interface BackendClient {
  readonly label: 'MockBackendClient（仅开发）'
  login(request: LoginRequest): Promise<BackendLogin>
  logout(token: string): Promise<void>
}

export class MockBackendClient implements BackendClient {
  readonly label = 'MockBackendClient（仅开发）' as const

  async login({ username, password }: LoginRequest): Promise<BackendLogin> {
    if (username === 'expired-session' && password === 'mock-password') {
      throw new Error('模拟会话已失效，请重新登录。')
    }

    if (username !== 'admin' || password !== 'mock-password') {
      throw new Error('用户名或密码不正确。')
    }

    return { token: `mock-token-${crypto.randomUUID()}`, operatorName: 'Mock 系统管理员' }
  }

  async logout(_token: string): Promise<void> {}
}

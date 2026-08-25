import type { DesktopEnvironment, LoginRequest, RuntimeState, SessionState } from '../shared/runtime-state.js'
import { createRuntimeState } from '../shared/runtime-state.js'
import type { BackendClient } from './mock-backend-client.js'

export class DesktopSession {
  #token: string | undefined
  #operatorName: string | undefined

  constructor(private readonly backend: BackendClient | undefined, private readonly environment: DesktopEnvironment) {}

  getRuntimeState(message?: string): RuntimeState {
    return createRuntimeState({
      ...this.environment,
      backend: this.backend?.label ?? '未装配',
      session: this.sessionState(),
      message: message ?? this.defaultMessage(),
    })
  }

  async login(request: LoginRequest | unknown): Promise<RuntimeState> {
    this.clear()
    if (!isLoginRequest(request) || !request.username.trim() || !request.password) {
      return this.getRuntimeState('请输入用户名和密码。')
    }
    if (!this.backend) {
      return this.getRuntimeState('当前环境尚未装配后端，无法登录。')
    }

    try {
      const login = await this.backend.login(request)
      this.#token = login.token
      this.#operatorName = login.operatorName
      return this.getRuntimeState('Mock 后端登录成功；真实接口尚未接入。')
    } catch (error) {
      return this.getRuntimeState(error instanceof Error ? error.message : '登录失败，请稍后重试。')
    }
  }

  async logout(): Promise<RuntimeState> {
    const token = this.#token
    this.clear()
    if (token && this.backend) await this.backend.logout(token)
    return this.getRuntimeState('已注销，当前会话已从内存清除。')
  }

  clear() {
    this.#token = undefined
    this.#operatorName = undefined
  }

  private sessionState(): SessionState {
    return this.#operatorName ? { status: '已登录', operatorName: this.#operatorName } : { status: '未登录' }
  }

  private defaultMessage() {
    if (this.backend) return 'macOS 开发阶段：正在使用内存 Mock 后端；真实接口与读卡器将在 Windows 阶段接入。'
    return this.environment.platform === 'darwin'
      ? 'macOS 开发阶段：真实接口与读卡器将在 Windows 阶段接入。'
      : '真实接口与读卡器尚未接入。'
  }
}

function isLoginRequest(value: unknown): value is LoginRequest {
  return typeof value === 'object'
    && value !== null
    && 'username' in value
    && 'password' in value
    && typeof value.username === 'string'
    && typeof value.password === 'string'
}

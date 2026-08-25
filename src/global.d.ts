import type { LoginRequest, RuntimeState } from '../shared/runtime-state.js'

declare global {
  interface Window {
    rfidDesktop: {
      getRuntimeState(): Promise<RuntimeState>
      login(request: LoginRequest): Promise<RuntimeState>
      logout(): Promise<RuntimeState>
    }
  }
}

export {}

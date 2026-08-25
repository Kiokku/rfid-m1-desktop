import type { RuntimeState } from '../shared/runtime-state.js'

declare global {
  interface Window {
    rfidDesktop: {
      getRuntimeState(): Promise<RuntimeState>
    }
  }
}

export {}

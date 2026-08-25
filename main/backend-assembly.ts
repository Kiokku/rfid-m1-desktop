import type { DesktopEnvironment } from '../shared/runtime-state.js'
import type { BackendClient } from './backend-client.js'
import { MockBackendClient } from './mock-backend-client.js'

export function createDevelopmentBackend({ isPackaged, platform }: DesktopEnvironment): BackendClient | undefined {
  return !isPackaged && platform === 'darwin' ? new MockBackendClient() : undefined
}

export type SecureWebPreferences = {
  contextIsolation: true
  sandbox: true
  nodeIntegration: false
  preload: string
}

export function createSecureWebPreferences(preload: string): SecureWebPreferences {
  return {
    contextIsolation: true,
    sandbox: true,
    nodeIntegration: false,
    preload,
  }
}

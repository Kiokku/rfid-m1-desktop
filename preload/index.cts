import { contextBridge, ipcRenderer } from 'electron'

import type { LoginRequest, RuntimeState } from '../shared/runtime-state.js'

const runtimeStateChannel = 'rfid-desktop:runtime-state'
const loginChannel = 'rfid-desktop:login'
const logoutChannel = 'rfid-desktop:logout'

const desktopApi = Object.freeze({
  getRuntimeState: () => ipcRenderer.invoke(runtimeStateChannel) as Promise<RuntimeState>,
  login: (request: LoginRequest) => ipcRenderer.invoke(loginChannel, request) as Promise<RuntimeState>,
  logout: () => ipcRenderer.invoke(logoutChannel) as Promise<RuntimeState>,
})

contextBridge.exposeInMainWorld('rfidDesktop', desktopApi)

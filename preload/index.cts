import { contextBridge, ipcRenderer } from 'electron'

import type { RuntimeState } from '../shared/runtime-state.js'

const runtimeStateChannel = 'rfid-desktop:runtime-state'

const desktopApi = Object.freeze({
  getRuntimeState: () => ipcRenderer.invoke(runtimeStateChannel) as Promise<RuntimeState>,
})

contextBridge.exposeInMainWorld('rfidDesktop', desktopApi)

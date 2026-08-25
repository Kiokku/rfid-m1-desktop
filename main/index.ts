import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { runtimeStateChannel } from '../shared/runtime-state.js'
import { createDevelopmentBackend } from './backend-assembly.js'
import { DesktopSession } from './desktop-session.js'
import { createSecureWebPreferences } from './window-options.js'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const loginChannel = 'rfid-desktop:login'
const logoutChannel = 'rfid-desktop:logout'
let desktopSession: DesktopSession

function createWindow() {
  const window = new BrowserWindow({
    width: 1600,
    height: 1000,
    minWidth: 1180,
    minHeight: 760,
    show: false,
    webPreferences: createSecureWebPreferences(path.join(currentDirectory, '../preload/index.cjs')),
  })

  window.once('ready-to-show', () => window.show())

  const rendererUrl = process.env.ELECTRON_RENDERER_URL
  if (rendererUrl) {
    void window.loadURL(rendererUrl)
    return
  }

  void window.loadFile(path.join(currentDirectory, '../../dist/index.html'))
}

app.whenReady().then(() => {
  const environment = { isPackaged: app.isPackaged, platform: process.platform }
  const backend = createDevelopmentBackend(environment)
  desktopSession = new DesktopSession(backend, environment)
  ipcMain.handle(runtimeStateChannel, () => desktopSession.getRuntimeState())
  ipcMain.handle(loginChannel, (_event, request) => desktopSession.login(request))
  ipcMain.handle(logoutChannel, () => desktopSession.logout())
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('before-quit', () => {
  desktopSession?.clear()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

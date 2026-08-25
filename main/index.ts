import { app, BrowserWindow, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

import { createRuntimeState, runtimeStateChannel } from '../shared/runtime-state.js'
import { createSecureWebPreferences } from './window-options.js'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))

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
  const runtimeState = createRuntimeState({ isPackaged: app.isPackaged, platform: process.platform })
  ipcMain.handle(runtimeStateChannel, () => runtimeState)
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

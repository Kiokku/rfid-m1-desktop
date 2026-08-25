import { describe, expect, it } from 'vitest'

import { createSecureWebPreferences } from '../main/window-options.js'
import { navigationItems, workbenchSteps } from '../src/ui-contract.js'

describe('secure Electron shell', () => {
  it('creates a sandboxed window without renderer Node access', () => {
    expect(createSecureWebPreferences('/app/preload.cjs')).toEqual({
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      preload: '/app/preload.cjs',
    })
  })

  it('keeps the adopted A workspace to two entries and four guided steps', () => {
    expect(navigationItems.map((item) => item.label)).toEqual(['工作台', '客户'])
    expect(workbenchSteps).toEqual(['选择客户', '放置卡片', '执行授权', '验证结果'])
  })
})

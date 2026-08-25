import { describe, expect, it } from 'vitest'

import { createDevelopmentBackend } from '../main/backend-assembly.js'

describe('backend assembly', () => {
  it('only assembles MockBackendClient for the macOS development build', () => {
    expect(createDevelopmentBackend({ isPackaged: false, platform: 'darwin' })?.label).toBe('MockBackendClient（仅开发）')
    expect(createDevelopmentBackend({ isPackaged: true, platform: 'darwin' })).toBeUndefined()
    expect(createDevelopmentBackend({ isPackaged: false, platform: 'win32' })).toBeUndefined()
  })
})

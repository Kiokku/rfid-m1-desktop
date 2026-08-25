import { describe, expect, it } from 'vitest'

import { DesktopSession } from '../main/desktop-session.js'
import { MockBackendClient } from '../main/mock-backend-client.js'

describe('customer management', () => {
  it('returns searched customer DTOs without backend credentials or customer keys', async () => {
    const session = new DesktopSession(new MockBackendClient(), { isPackaged: false, platform: 'darwin' })
    await session.login({ username: 'admin', password: 'mock-password' })

    const result = await session.listCustomers('华南')

    expect(result).toEqual({
      customers: [{
        cloudCustomerId: 'cloud_customer_20481',
        customerId: 10482,
        name: '佳能华南服务中心',
        contact: '李经理 · 138 0000 5678',
        status: '已注册',
        keyVersion: 1,
      }],
      message: '已找到 1 个客户。',
    })
    expect(JSON.stringify(result)).not.toMatch(/token|secret|cipher|password/i)

    expect((await session.listCustomers('RFID-00010482')).customers).toEqual(result.customers)
  })

  it('creates one customer mapping for repeated registration requests', async () => {
    const session = new DesktopSession(new MockBackendClient(), { isPackaged: false, platform: 'darwin' })
    await session.login({ username: 'admin', password: 'mock-password' })

    const first = await session.registerCustomer({ name: '华南售后服务中心', contact: '赵工 · 137 0000 1234', idempotencyKey: 'customer-register-1' })
    const repeated = await session.registerCustomer({ name: '华南售后服务中心', contact: '赵工 · 137 0000 1234', idempotencyKey: 'customer-register-1' })
    const customers = await session.listCustomers('华南售后')

    expect(first).toEqual({
      customer: {
        cloudCustomerId: 'cloud_customer_20484',
        customerId: 10485,
        name: '华南售后服务中心',
        contact: '赵工 · 137 0000 1234',
        status: '已注册',
        keyVersion: 1,
      },
      message: '客户已注册并初始化 RFID 映射。',
    })
    expect(repeated).toEqual({ ...first, message: '客户已存在，已返回原有 RFID 映射。' })
    expect(customers.customers).toHaveLength(1)
  })

  it('keeps retry identity separate from visible customer fields and can resume a cloud identifier', async () => {
    const session = new DesktopSession(new MockBackendClient(), { isPackaged: false, platform: 'darwin' })
    await session.login({ username: 'admin', password: 'mock-password' })

    const first = await session.registerCustomer({ name: '同名客户', contact: '同一联系人', idempotencyKey: 'customer-register-1' })
    const separate = await session.registerCustomer({ name: '同名客户', contact: '同一联系人', idempotencyKey: 'customer-register-2' })
    const resumed = await session.registerCustomer({ name: '佳能华南服务中心', contact: '李经理 · 138 0000 5678', idempotencyKey: 'customer-cloud-retry-1', cloudCustomerId: 'cloud_customer_20481' })

    expect(separate.customer?.customerId).toBe((first.customer?.customerId ?? 0) + 1)
    expect(resumed).toMatchObject({ customer: { customerId: 10482, cloudCustomerId: 'cloud_customer_20481' }, message: '客户已存在，已返回原有 RFID 映射。' })
  })
})

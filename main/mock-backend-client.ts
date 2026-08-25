import type { Customer, CustomerRegistrationRequest } from '../shared/customer.js'
import { formatRfidCustomerId } from '../shared/customer.js'
import type { LoginRequest } from '../shared/runtime-state.js'
import type { BackendClient, BackendCustomerRegistration, BackendLogin } from './backend-client.js'

export class MockBackendClient implements BackendClient {
  readonly label = 'MockBackendClient（仅开发）' as const
  readonly #tokens = new Set<string>()
  readonly #registrationMappings = new Map<string, Customer>()
  readonly #customers: Customer[] = [
    { name: '佳能华南服务中心', customerId: 10482, cloudCustomerId: 'cloud_customer_20481', contact: '李经理 · 138 0000 5678', status: '已注册', keyVersion: 1 },
    { name: '图盛办公设备有限公司', customerId: 10483, cloudCustomerId: 'cloud_customer_20482', contact: '王女士 · 139 0000 2288', status: '已注册', keyVersion: 1 },
    { name: '深圳文印服务部', customerId: 10484, cloudCustomerId: 'cloud_customer_20483', contact: '陈工 · 136 0000 7788', status: '已注册', keyVersion: 1 },
  ]

  async login({ username, password }: LoginRequest): Promise<BackendLogin> {
    if (username === 'expired-session' && password === 'mock-password') {
      throw new Error('模拟会话已失效，请重新登录。')
    }

    if (username !== 'admin' || password !== 'mock-password') {
      throw new Error('用户名或密码不正确。')
    }

    const token = `mock-token-${crypto.randomUUID()}`
    this.#tokens.add(token)
    return { token, operatorName: 'Mock 系统管理员' }
  }

  async logout(token: string): Promise<void> {
    this.#tokens.delete(token)
  }

  async listCustomers(token: string, query: string): Promise<Customer[]> {
    this.assertSession(token)
    return this.#customers.filter((customer) => customer.name.includes(query) || formatRfidCustomerId(customer.customerId).includes(query))
  }

  async registerCustomer(token: string, request: CustomerRegistrationRequest): Promise<BackendCustomerRegistration> {
    this.assertSession(token)
    const retry = this.#registrationMappings.get(request.idempotencyKey)
    if (retry) return { customer: retry, reused: true }

    const cloudCustomer = request.cloudCustomerId && this.#customers.find((customer) => customer.cloudCustomerId === request.cloudCustomerId)
    if (cloudCustomer) {
      this.#registrationMappings.set(request.idempotencyKey, cloudCustomer)
      return { customer: cloudCustomer, reused: true }
    }

    const offset = this.#customers.length
    const customer = {
      name: request.name,
      contact: request.contact,
      customerId: 10482 + offset,
      cloudCustomerId: request.cloudCustomerId ?? `cloud_customer_${20481 + offset}`,
      status: '已注册' as const,
      keyVersion: 1 as const,
    }
    this.#customers.push(customer)
    this.#registrationMappings.set(request.idempotencyKey, customer)
    return { customer, reused: false }
  }

  private assertSession(token: string) {
    if (!this.#tokens.has(token)) throw new Error('登录会话已失效，请重新登录。')
  }
}

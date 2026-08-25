import type { Customer, CustomerRegistrationRequest } from '../shared/customer.js'
import type { LoginRequest, BackendState } from '../shared/runtime-state.js'

export type BackendLogin = {
  token: string
  operatorName: string
}

export type BackendCustomerRegistration = {
  customer: Customer
  reused: boolean
}

export interface BackendClient {
  readonly label: Exclude<BackendState, '未装配'>
  login(request: LoginRequest): Promise<BackendLogin>
  logout(token: string): Promise<void>
  listCustomers(token: string, query: string): Promise<Customer[]>
  registerCustomer(token: string, request: CustomerRegistrationRequest): Promise<BackendCustomerRegistration>
}

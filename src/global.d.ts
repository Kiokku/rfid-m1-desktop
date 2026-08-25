import type { CustomerListResult, CustomerRegistrationRequest, CustomerRegistrationResult } from '../shared/customer.js'
import type { LoginRequest, RuntimeState } from '../shared/runtime-state.js'

declare global {
  interface Window {
    rfidDesktop: {
      getRuntimeState(): Promise<RuntimeState>
      login(request: LoginRequest): Promise<RuntimeState>
      logout(): Promise<RuntimeState>
      listCustomers(query: string): Promise<CustomerListResult>
      registerCustomer(request: CustomerRegistrationRequest): Promise<CustomerRegistrationResult>
    }
  }
}

export {}

export type Customer = {
  cloudCustomerId: string
  customerId: number
  name: string
  contact: string
  status: '已注册'
  keyVersion: 1
}

export type CustomerRegistrationRequest = {
  name: string
  contact: string
  idempotencyKey: string
  cloudCustomerId?: string
}

export type CustomerListResult = {
  customers: Customer[]
  message: string
}

export type CustomerRegistrationResult = {
  customer: Customer | undefined
  message: string
}

export function formatRfidCustomerId(customerId: number) {
  return `RFID-${String(customerId).padStart(8, '0')}`
}

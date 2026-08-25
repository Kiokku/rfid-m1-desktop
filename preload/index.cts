import { contextBridge, ipcRenderer } from 'electron'

import type { CustomerListResult, CustomerRegistrationRequest, CustomerRegistrationResult } from '../shared/customer.js'
import type { LoginRequest, RuntimeState } from '../shared/runtime-state.js'

const runtimeStateChannel = 'rfid-desktop:runtime-state'
const loginChannel = 'rfid-desktop:login'
const logoutChannel = 'rfid-desktop:logout'
const listCustomersChannel = 'rfid-desktop:list-customers'
const registerCustomerChannel = 'rfid-desktop:register-customer'

const desktopApi = Object.freeze({
  getRuntimeState: () => ipcRenderer.invoke(runtimeStateChannel) as Promise<RuntimeState>,
  login: (request: LoginRequest) => ipcRenderer.invoke(loginChannel, request) as Promise<RuntimeState>,
  logout: () => ipcRenderer.invoke(logoutChannel) as Promise<RuntimeState>,
  listCustomers: (query: string) => ipcRenderer.invoke(listCustomersChannel, query) as Promise<CustomerListResult>,
  registerCustomer: (request: CustomerRegistrationRequest) => ipcRenderer.invoke(registerCustomerChannel, request) as Promise<CustomerRegistrationResult>,
})

contextBridge.exposeInMainWorld('rfidDesktop', desktopApi)

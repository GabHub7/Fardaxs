// Provider Adapter Pattern — all providers implement this interface

export interface FulfillmentRequest {
  orderId: string
  providerProductCode: string
  target: string
  quantity?: number          // for SMM services (followers/likes/views amount)
  customerInput: Record<string, unknown>
}

export interface FulfillmentResult {
  success: boolean
  providerTransactionId?: string
  message: string
  serialNumber?: string   // for inventory-type products (e.g., voucher codes)
  rawResponse?: unknown
}

export interface BalanceResult {
  success: boolean
  balance: number
  currency: string
  message?: string
}

export interface ProviderAdapter {
  fulfill(request: FulfillmentRequest): Promise<FulfillmentResult>
  checkBalance(): Promise<BalanceResult>
  checkStatus(providerTransactionId: string): Promise<FulfillmentResult>
}

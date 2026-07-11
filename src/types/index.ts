// ============================================================
// FARDAX STORE - GLOBAL TYPE DEFINITIONS
// ============================================================

// ---- API RESPONSE TYPES ----

export interface ApiResponse<T = unknown> {
  success: boolean
  message: string
  data?: T
  errors?: string[]
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number
    limit: number
    total: number
    total_pages: number
  }
}

// ---- USER TYPES ----

export type UserRole = 'MEMBER' | 'RESELLER' | 'ADMIN' | 'SUPER_ADMIN'
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'SUSPENDED'

export interface User {
  id: string
  auth_id: string | null
  email: string
  username: string | null
  full_name: string | null
  phone: string | null
  avatar_url: string | null
  role_id: string | null
  /** Convenience field — not a DB column. Populate by joining `roles(name)`. */
  role?: UserRole
  email_verified: boolean
  status: UserStatus
  last_login_at: string | null
  created_at: string
  updated_at: string
}

// ---- PRODUCT TYPES ----

export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'OUT_OF_STOCK' | 'MAINTENANCE' | 'ARCHIVED'

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  icon_url: string | null
  banner_url: string | null
  color: string | null
  status: string
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Product {
  id: string
  category_id: string
  provider_id: string | null
  name: string
  slug: string
  description: string | null
  short_description: string | null
  image_url: string | null
  thumbnail_url: string | null
  provider_product_code: string | null
  base_cost: number
  selling_price: number
  reseller_price: number
  status: ProductStatus
  is_featured: boolean
  created_at: string
  updated_at: string
  category?: Category
}

// ---- ORDER TYPES ----

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PAID'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED'
  | 'EXPIRED'
  | 'CANCELLED'

export interface Order {
  id: string
  user_id: string
  invoice_id: string | null
  product_id: string
  provider_id: string | null
  order_number: string
  reference_id: string
  customer_input: Record<string, unknown>
  target: string
  quantity: number
  price: number
  cost: number
  profit: number
  status: OrderStatus
  provider_status: string | null
  provider_reference: string | null
  paid_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
  product?: Product
}

export interface OrderStatusLog {
  id: string
  order_id: string
  old_status: OrderStatus | null
  new_status: OrderStatus
  reason: string | null
  created_by: string | null
  created_at: string
}

// ---- PAYMENT TYPES ----

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'EXPIRED' | 'REFUNDED' | 'CANCELLED'

export interface Invoice {
  id: string
  invoice_number: string
  order_id: string
  amount: number
  expired_at: string
  status: PaymentStatus
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  invoice_id: string
  gateway: string
  gateway_transaction_id: string | null
  amount: number
  fee: number
  net_amount: number
  status: PaymentStatus
  paid_at: string | null
  created_at: string
  updated_at: string
}

// ---- PROVIDER TYPES ----

export type ProviderStatus = 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE'

export interface Provider {
  id: string
  name: string
  slug: string
  api_url: string
  status: ProviderStatus
  priority: number
  balance: number
  created_at: string
  updated_at: string
}

// ---- INVENTORY TYPES ----

export type InventoryStatus = 'AVAILABLE' | 'RESERVED' | 'SOLD' | 'DISABLED'

export interface InventoryItem {
  id: string
  product_id: string
  email: string
  status: InventoryStatus
  assigned_order_id: string | null
  created_at: string
  updated_at: string
}

// ---- RESELLER TYPES ----

export interface ResellerProfile {
  user_id: string
  store_name: string | null
  balance: number
  status: string
  created_at: string
  updated_at: string
}

export type BalanceMutationType = 'DEPOSIT' | 'PURCHASE' | 'REFUND' | 'BONUS' | 'ADJUSTMENT'

export interface BalanceMutation {
  id: string
  user_id: string
  type: BalanceMutationType
  amount: number
  before_balance: number
  after_balance: number
  description: string | null
  created_at: string
}

// ---- NOTIFICATION TYPES ----

export type NotificationChannel = 'EMAIL' | 'WHATSAPP' | 'SYSTEM'
export type NotificationStatus = 'PENDING' | 'SENT' | 'READ' | 'FAILED'

export interface Notification {
  id: string
  user_id: string
  title: string
  message: string
  channel: NotificationChannel
  status: NotificationStatus
  created_at: string
}

// ---- CMS TYPES ----

export interface Banner {
  id: string
  title: string
  image_url: string
  link_url: string | null
  sort_order: number
  status: string
  created_at: string
}

export interface Testimonial {
  id: string
  customer_name: string
  avatar_url: string | null
  message: string
  rating: number
  created_at: string
}

export interface FAQ {
  id: string
  question: string
  answer: string
  sort_order: number
  created_at: string
}

// ---- AUDIT LOG TYPES ----

export interface AuditLog {
  id: string
  user_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  ip_address: string | null
  created_at: string
}

// ---- CHECKOUT TYPES ----

export interface CheckoutRequest {
  product_id: string
  target: string
  quantity: number
  payment_method: string
  customer_input?: Record<string, unknown>
}

export interface CheckoutResponse {
  order_id: string
  invoice_id: string
  order_number: string
  payment_url: string | null
  qr_url: string | null
  va_number: string | null
  amount: number
  expired_at: string
}

// ---- WALLET TYPES ----

export type WalletMutationType =
  | 'TOP_UP'
  | 'PURCHASE'
  | 'REFUND'
  | 'BONUS'
  | 'REFERRAL_COMMISSION'
  | 'ADJUSTMENT'

export interface Wallet {
  id: string
  user_id: string
  balance: number
  created_at: string
  updated_at: string
}

export interface WalletMutation {
  id: string
  wallet_id: string
  user_id: string
  type: WalletMutationType
  amount: number
  before_balance: number
  after_balance: number
  reference_type: string | null
  reference_id: string | null
  description: string | null
  created_at: string
}

// ---- MEMBERSHIP TYPES ----

export interface MembershipTier {
  id: string
  name: string
  slug: string
  min_spend: number
  cashback_percent: number
  badge_color: string
  icon: string | null
  sort_order: number
}

// ---- VOUCHER TYPES ----

export type VoucherDiscountType = 'PERCENTAGE' | 'FIXED'
export type UserVoucherStatus = 'AVAILABLE' | 'USED' | 'EXPIRED'

export interface Voucher {
  id: string
  code: string
  title: string
  description: string | null
  discount_type: VoucherDiscountType
  discount_value: number
  max_discount: number | null
  min_purchase: number
  expires_at: string | null
  status: string
}

export interface UserVoucher {
  id: string
  user_id: string
  voucher_id: string
  status: UserVoucherStatus
  used_at: string | null
  claimed_at: string
  voucher?: Voucher
}

// ---- REFERRAL TYPES ----

export type ReferralStatus = 'PENDING' | 'QUALIFIED' | 'REWARDED'

export interface ReferralCode {
  id: string
  user_id: string
  code: string
}

export interface Referral {
  id: string
  referrer_user_id: string
  referred_user_id: string
  referral_code: string
  status: ReferralStatus
  commission_amount: number
  created_at: string
}

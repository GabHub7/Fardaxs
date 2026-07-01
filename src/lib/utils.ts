import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('id-ID').format(num)
}

/**
 * Escapes characters that have special meaning in PostgREST's filter
 * grammar (`,` `(` `)` `%` `*`) before interpolating user input into a
 * `.or("col.ilike.%value%,...")` filter string.
 *
 * Without this, a search term like `x,status.eq.BANNED` or `x)` can inject
 * extra filter clauses / break the expression, since `.or()` takes a raw
 * PostgREST filter string rather than parameterizing each value the way
 * `.eq()` / `.ilike()` do. This isn't classic SQL injection (PostgREST still
 * only ever produces bound, schema-validated queries against Postgres) but
 * it is a filter-syntax injection that can alter which rows match. Always
 * pass search terms through this before building an `.or()` string.
 */
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()%*]/g, '').trim().slice(0, 200)
}


export function formatDate(dateString: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(dateString))
}

export function formatDateTime(dateString: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateString))
}

export function generateOrderNumber(): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 9000) + 1000
  return `FDX${date}${random}`
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

export function isValidPhoneNumber(phone: string): boolean {
  const phoneRegex = /^(\+62|62|0)[0-9]{8,13}$/
  return phoneRegex.test(phone.replace(/[\s-]/g, ''))
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Order statuses
    PENDING_PAYMENT: 'text-yellow-500 bg-yellow-500/10',
    PAID: 'text-blue-500 bg-blue-500/10',
    PROCESSING: 'text-blue-400 bg-blue-400/10',
    SUCCESS: 'text-green-500 bg-green-500/10',
    FAILED: 'text-red-500 bg-red-500/10',
    REFUNDED: 'text-orange-500 bg-orange-500/10',
    EXPIRED: 'text-gray-500 bg-gray-500/10',
    CANCELLED: 'text-gray-500 bg-gray-500/10',
    // Payment statuses
    PENDING: 'text-yellow-500 bg-yellow-500/10',
    // Provider statuses
    ACTIVE: 'text-green-500 bg-green-500/10',
    INACTIVE: 'text-gray-500 bg-gray-500/10',
    MAINTENANCE: 'text-orange-500 bg-orange-500/10',
    // User statuses
    BANNED: 'text-red-500 bg-red-500/10',
    SUSPENDED: 'text-orange-500 bg-orange-500/10',
    // Inventory
    AVAILABLE: 'text-green-500 bg-green-500/10',
    RESERVED: 'text-yellow-500 bg-yellow-500/10',
    SOLD: 'text-blue-500 bg-blue-500/10',
    DISABLED: 'text-gray-500 bg-gray-500/10',
  }
  return colors[status] ?? 'text-gray-500 bg-gray-500/10'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING_PAYMENT: 'Menunggu Pembayaran',
    PAID: 'Dibayar',
    PROCESSING: 'Diproses',
    SUCCESS: 'Sukses',
    FAILED: 'Gagal',
    REFUNDED: 'Dikembalikan',
    EXPIRED: 'Kedaluwarsa',
    CANCELLED: 'Dibatalkan',
    PENDING: 'Menunggu',
    ACTIVE: 'Aktif',
    INACTIVE: 'Tidak Aktif',
    MAINTENANCE: 'Maintenance',
    BANNED: 'Banned',
    SUSPENDED: 'Disuspend',
    AVAILABLE: 'Tersedia',
    RESERVED: 'Direservasi',
    SOLD: 'Terjual',
    DISABLED: 'Dinonaktifkan',
    OUT_OF_STOCK: 'Habis',
    ARCHIVED: 'Diarsipkan',
  }
  return labels[status] ?? status
}

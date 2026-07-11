'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  orderId: string
  currentStatus: string
}

// Polls the order status API every 5s while PENDING_PAYMENT or PAID.
// Redirects when the order moves to a terminal state or to SUCCESS.
export function PaymentStatusPoller({ orderId, currentStatus }: Props) {
  const router = useRouter()
  const statusRef = useRef(currentStatus)

  useEffect(() => {
    if (!['PENDING_PAYMENT', 'PAID', 'PROCESSING'].includes(statusRef.current)) return

    const poll = async () => {
      try {
        const res = await fetch(`/api/orders/${orderId}/status`, { cache: 'no-store' })
        if (!res.ok) return
        const json = await res.json()
        const newStatus: string = json.data?.status ?? statusRef.current

        if (newStatus !== statusRef.current) {
          statusRef.current = newStatus
          // Refresh the server component to show updated state
          router.refresh()

          if (newStatus === 'SUCCESS') {
            router.push(`/pesanan/${orderId}?paid=1`)
          } else if (['FAILED', 'CANCELLED', 'REFUNDED'].includes(newStatus)) {
            router.push(`/pesanan/${orderId}`)
          }
        }
      } catch {
        // network error — keep polling
      }
    }

    const id = setInterval(poll, 5000)
    return () => clearInterval(id)
  }, [orderId, router])

  return null
}

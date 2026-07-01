import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Lazily initialized — only creates client when env vars are present
let redis: Redis | null = null
let ratelimiters: Map<string, Ratelimit> = new Map()

function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null
  }
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  }
  return redis
}

function getLimiter(key: string, requests: number, windowSeconds: number): Ratelimit | null {
  const r = getRedis()
  if (!r) return null

  const cacheKey = `${key}:${requests}:${windowSeconds}`
  if (!ratelimiters.has(cacheKey)) {
    ratelimiters.set(
      cacheKey,
      new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(requests, `${windowSeconds} s`),
        prefix: `fardax:rl:${key}`,
      })
    )
  }
  return ratelimiters.get(cacheKey)!
}

interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

// Auth endpoints: 5 requests per 60 seconds per IP
export async function checkAuthRateLimit(identifier: string): Promise<RateLimitResult> {
  const limiter = getLimiter('auth', 5, 60)
  if (!limiter) return { success: true, limit: 5, remaining: 5, reset: 0 }

  const result = await limiter.limit(identifier)
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}

// Checkout: 10 requests per 60 seconds per user
export async function checkCheckoutRateLimit(identifier: string): Promise<RateLimitResult> {
  const limiter = getLimiter('checkout', 10, 60)
  if (!limiter) return { success: true, limit: 10, remaining: 10, reset: 0 }

  const result = await limiter.limit(identifier)
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}

// API general: 100 requests per 60 seconds per IP
export async function checkApiRateLimit(identifier: string): Promise<RateLimitResult> {
  const limiter = getLimiter('api', 100, 60)
  if (!limiter) return { success: true, limit: 100, remaining: 100, reset: 0 }

  const result = await limiter.limit(identifier)
  return {
    success: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  }
}

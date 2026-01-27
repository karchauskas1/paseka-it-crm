import type { SocialPlatform } from '@prisma/client'

interface RateLimitConfig {
  maxRequests: number
  windowMs: number
}

const RATE_LIMITS: Record<SocialPlatform, RateLimitConfig> = {
  REDDIT: { maxRequests: 60, windowMs: 60 * 1000 }, // 60/min
  HACKERNEWS: { maxRequests: 1000, windowMs: 60 * 1000 }, // Unlimited (pagination до 1000)
  HABR: { maxRequests: 100, windowMs: 60 * 1000 }, // RSS без ограничений
  VCRU: { maxRequests: 100, windowMs: 60 * 1000 }, // RSS без ограничений
  LINKEDIN: { maxRequests: 20, windowMs: 60 * 1000 }, // 20/min for Google Search
  TELEGRAM: { maxRequests: 30, windowMs: 60 * 1000 }, // Bot API 30/sec
  PIKABU: { maxRequests: 60, windowMs: 60 * 1000 }, // TBD
  TWITTER: { maxRequests: 300, windowMs: 15 * 60 * 1000 }, // 300/15min
  THREADS: { maxRequests: 100, windowMs: 60 * 60 * 1000 }, // TBD
  INSTAGRAM: { maxRequests: 200, windowMs: 60 * 60 * 1000 }, // TBD
  WEB: { maxRequests: 30, windowMs: 60 * 1000 }, // 30/min for web search
}

export class SocialAPIRateLimiter {
  private requestCounts = new Map<SocialPlatform, Array<number>>()

  async checkLimit(platform: SocialPlatform): Promise<boolean> {
    const config = RATE_LIMITS[platform]
    const now = Date.now()
    const windowStart = now - config.windowMs

    const requests = this.requestCounts.get(platform) || []
    const recentRequests = requests.filter(t => t > windowStart)

    if (recentRequests.length >= config.maxRequests) {
      return false
    }

    recentRequests.push(now)
    this.requestCounts.set(platform, recentRequests)
    return true
  }

  async waitForSlot(platform: SocialPlatform): Promise<void> {
    while (!(await this.checkLimit(platform))) {
      // Wait 1 second before retrying
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  getTimeUntilNextSlot(platform: SocialPlatform): number {
    const config = RATE_LIMITS[platform]
    const now = Date.now()
    const windowStart = now - config.windowMs

    const requests = this.requestCounts.get(platform) || []
    const recentRequests = requests.filter(t => t > windowStart)

    if (recentRequests.length < config.maxRequests) {
      return 0
    }

    // Time until oldest request exits the window
    const oldestRequest = recentRequests[0]
    return (oldestRequest + config.windowMs) - now
  }
}

// Global rate limiter instance
export const socialRateLimiter = new SocialAPIRateLimiter()

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error as Error

      // Don't retry on non-retryable errors
      if (error instanceof Error && 'retryable' in error && !error.retryable) {
        throw error
      }

      // Wait before retry with exponential backoff
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs * Math.pow(2, i)))
      }
    }
  }

  throw lastError!
}

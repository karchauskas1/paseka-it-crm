interface RateLimitResult {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

interface RateLimitStore {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
// In production, consider using Redis for distributed rate limiting
const rateLimitStore = new Map<string, RateLimitStore>()

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now()
  for (const [key, value] of rateLimitStore.entries()) {
    if (value.resetTime < now) {
      rateLimitStore.delete(key)
    }
  }
}, 60000) // Clean up every minute

interface RateLimitOptions {
  // Number of requests allowed per window
  limit?: number
  // Window size in milliseconds
  windowMs?: number
}

const DEFAULT_LIMIT = 100
const DEFAULT_WINDOW_MS = 60000 // 1 minute

/**
 * Rate limiter for API routes
 * Uses in-memory store (consider Redis for production/multi-instance)
 */
export function rateLimit(
  identifier: string,
  options: RateLimitOptions = {}
): RateLimitResult {
  const { limit = DEFAULT_LIMIT, windowMs = DEFAULT_WINDOW_MS } = options
  const now = Date.now()
  const key = identifier

  const existing = rateLimitStore.get(key)

  // If no existing entry or window has expired, create new entry
  if (!existing || existing.resetTime < now) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    })

    return {
      success: true,
      limit,
      remaining: limit - 1,
      reset: now + windowMs,
    }
  }

  // Increment count
  existing.count++

  // Check if over limit
  if (existing.count > limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      reset: existing.resetTime,
    }
  }

  return {
    success: true,
    limit,
    remaining: limit - existing.count,
    reset: existing.resetTime,
  }
}

/**
 * Get client identifier from request
 * Uses IP address or forwarded header
 */
export function getClientIdentifier(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown'
  return ip
}

/**
 * Rate limit presets for different endpoints
 */
export const rateLimitPresets = {
  // Standard API endpoints
  api: { limit: 100, windowMs: 60000 }, // 100 req/min

  // Auth endpoints (stricter)
  auth: { limit: 10, windowMs: 60000 }, // 10 req/min

  // AI endpoints (most strict due to cost)
  ai: { limit: 20, windowMs: 60000 }, // 20 req/min

  // Search endpoints
  search: { limit: 60, windowMs: 60000 }, // 60 req/min

  // File upload endpoints
  upload: { limit: 10, windowMs: 60000 }, // 10 req/min
}

/**
 * Create rate limit headers for response
 */
export function createRateLimitHeaders(result: RateLimitResult): Headers {
  const headers = new Headers()
  headers.set('X-RateLimit-Limit', result.limit.toString())
  headers.set('X-RateLimit-Remaining', result.remaining.toString())
  headers.set('X-RateLimit-Reset', result.reset.toString())
  return headers
}

/**
 * Higher-order function to wrap API route with rate limiting
 */
export function withRateLimit(
  handler: (req: Request) => Promise<Response>,
  options: RateLimitOptions = rateLimitPresets.api
) {
  return async (req: Request): Promise<Response> => {
    const identifier = getClientIdentifier(req)
    const result = rateLimit(identifier, options)

    if (!result.success) {
      const headers = createRateLimitHeaders(result)
      return new Response(
        JSON.stringify({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            ...Object.fromEntries(headers.entries()),
          },
        }
      )
    }

    const response = await handler(req)

    // Add rate limit headers to successful response
    const rateLimitHeaders = createRateLimitHeaders(result)
    for (const [key, value] of rateLimitHeaders.entries()) {
      response.headers.set(key, value)
    }

    return response
  }
}

import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

interface RateLimitEntry {
  count: number
  firstAttempt: number
  lockedUntil?: number
}

// Store in memory (in production, use Redis)
const loginAttempts = new Map<string, RateLimitEntry>()

// Configuration
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const LOCKOUT_MS = 30 * 60 * 1000 // 30 minutes lockout after max attempts

export default class RateLimiterMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const ip = ctx.request.ip()
    const now = Date.now()

    // Get or create entry
    let entry = loginAttempts.get(ip)

    // Check if locked out
    if (entry?.lockedUntil && now < entry.lockedUntil) {
      const remainingMinutes = Math.ceil((entry.lockedUntil - now) / 60000)
      return ctx.response.tooManyRequests({
        message: `Trop de tentatives. Reessayez dans ${remainingMinutes} minute(s).`,
        retryAfter: remainingMinutes
      })
    }

    // Reset if window expired
    if (entry && now - entry.firstAttempt > WINDOW_MS) {
      loginAttempts.delete(ip)
      entry = undefined
    }

    // Initialize entry if doesn't exist
    if (!entry) {
      entry = { count: 0, firstAttempt: now }
    }

    // Increment attempt count
    entry.count++

    // Check if max attempts reached
    if (entry.count > MAX_ATTEMPTS) {
      entry.lockedUntil = now + LOCKOUT_MS
      loginAttempts.set(ip, entry)

      ctx.logger.warn({
        type: 'rate_limit_exceeded',
        ip,
        attempts: entry.count
      }, 'Rate limit exceeded for IP')

      return ctx.response.tooManyRequests({
        message: 'Trop de tentatives de connexion. Compte temporairement bloque pour 30 minutes.',
        retryAfter: 30
      })
    }

    loginAttempts.set(ip, entry)

    // Add remaining attempts header
    ctx.response.header('X-RateLimit-Remaining', String(MAX_ATTEMPTS - entry.count))

    const output = await next()

    // On successful login, reset the counter
    if (ctx.response.getStatus() === 200) {
      loginAttempts.delete(ip)
    }

    return output
  }

  /**
   * Reset attempts for an IP (can be called after successful verification)
   */
  static resetAttempts(ip: string) {
    loginAttempts.delete(ip)
  }
}

// Cleanup old entries every hour
setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of loginAttempts.entries()) {
    // Remove entries older than lockout period
    if (now - entry.firstAttempt > LOCKOUT_MS + WINDOW_MS) {
      loginAttempts.delete(ip)
    }
  }
}, 60 * 60 * 1000)

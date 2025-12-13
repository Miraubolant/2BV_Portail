import logger from '@adonisjs/core/services/logger'

export interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  maxDelayMs?: number
  backoffMultiplier?: number
  retryableStatuses?: number[]
  onRetry?: (attempt: number, error: Error, delayMs: number) => void
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  retryableStatuses: [408, 429, 500, 502, 503, 504],
}

/**
 * Error class for API errors with status code
 */
export class ApiError extends Error {
  public readonly statusCode: number
  public readonly responseBody: string

  constructor(message: string, statusCode: number, responseBody: string = '') {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.responseBody = responseBody
  }

  isRetryable(retryableStatuses: number[]): boolean {
    return retryableStatuses.includes(this.statusCode)
  }

  isAuthError(): boolean {
    return this.statusCode === 401 || this.statusCode === 403
  }

  isNotFound(): boolean {
    return this.statusCode === 404
  }

  isRateLimited(): boolean {
    return this.statusCode === 429
  }
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number
): number {
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1)
  const jitter = Math.random() * 0.3 * exponentialDelay // Add up to 30% jitter
  const delay = Math.min(exponentialDelay + jitter, maxDelayMs)
  return Math.round(delay)
}

/**
 * Execute a function with retry logic and exponential backoff
 */
export async function withRetry<T>(fn: () => Promise<T>, options: RetryOptions = {}): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry if it's not a retryable error
      if (error instanceof ApiError) {
        if (error.isAuthError()) {
          // Auth errors should not be retried - need re-authentication
          throw error
        }
        if (error.isNotFound()) {
          // Not found errors should not be retried
          throw error
        }
        if (!error.isRetryable(opts.retryableStatuses)) {
          throw error
        }
      }

      // Don't retry if we've exhausted attempts
      if (attempt > opts.maxRetries) {
        throw lastError
      }

      const delayMs = calculateDelay(
        attempt,
        opts.initialDelayMs,
        opts.maxDelayMs,
        opts.backoffMultiplier
      )

      logger.warn(
        { attempt, maxRetries: opts.maxRetries, delayMs, error: lastError.message },
        'Retrying after error'
      )

      if (opts.onRetry) {
        opts.onRetry(attempt, lastError, delayMs)
      }

      await sleep(delayMs)
    }
  }

  throw lastError || new Error('Retry failed')
}

/**
 * Execute a fetch request with retry logic
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options: RetryOptions = {}
): Promise<Response> {
  return withRetry(async () => {
    const response = await fetch(url, init)

    if (!response.ok) {
      const body = await response.text()
      throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status, body)
    }

    return response
  }, options)
}

/**
 * Parse rate limit headers and return delay if rate limited
 */
export function parseRateLimitDelay(response: Response): number | null {
  const retryAfter = response.headers.get('Retry-After')
  if (retryAfter) {
    const seconds = Number.parseInt(retryAfter, 10)
    if (!isNaN(seconds)) {
      return seconds * 1000
    }
    // Try parsing as HTTP date
    const date = Date.parse(retryAfter)
    if (!isNaN(date)) {
      return Math.max(0, date - Date.now())
    }
  }
  return null
}

/**
 * Check if an error indicates a token expiration
 */
export function isTokenExpiredError(error: unknown): boolean {
  if (error instanceof ApiError) {
    if (error.isAuthError()) return true
    // Check for specific OAuth error messages
    const body = error.responseBody.toLowerCase()
    return (
      body.includes('token expired') ||
      body.includes('invalid_token') ||
      body.includes('token has been expired')
    )
  }
  return false
}

/**
 * Check if an error indicates a network issue
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return (
      message.includes('network') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('etimedout') ||
      message.includes('econnreset') ||
      message.includes('fetch failed')
    )
  }
  return false
}

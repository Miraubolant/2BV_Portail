import { defineConfig } from '@adonisjs/cors'
import app from '@adonisjs/core/services/app'

/**
 * Configuration options to tweak the CORS policy. The following
 * options are documented on the official documentation website.
 *
 * https://docs.adonisjs.com/guides/security/cors
 */
const corsConfig = defineConfig({
  enabled: true,
  /**
   * In production, specify exact allowed origins.
   * In development, allow localhost origins for dev server.
   */
  origin: app.inProduction
    ? (requestOrigin) => {
        // Add your production domains here
        const allowedOrigins = [
          process.env.APP_URL || '',
          // Add other allowed domains
        ].filter(Boolean)
        return allowedOrigins.includes(requestOrigin)
      }
    : ['http://localhost:3333', 'http://localhost:5173', 'http://127.0.0.1:3333', 'http://127.0.0.1:5173'],
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  exposeHeaders: ['X-RateLimit-Remaining'],
  credentials: true,
  maxAge: 90,
})

export default corsConfig

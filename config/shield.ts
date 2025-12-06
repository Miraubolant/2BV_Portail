import { defineConfig } from '@adonisjs/shield'
import app from '@adonisjs/core/services/app'

const shieldConfig = defineConfig({
  /**
   * Configure CSP policies for your app. Refer documentation
   * to learn more
   */
  csp: {
    enabled: app.inProduction,
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // unsafe-eval needed for some React deps
      styleSrc: ["'self'", "'unsafe-inline'"], // inline styles for Tailwind
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      fontSrc: ["'self'", 'data:'],
      connectSrc: [
        "'self'",
        'https://graph.microsoft.com',
        'https://www.googleapis.com',
        'https://oauth2.googleapis.com',
        'https://login.microsoftonline.com',
      ],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
    reportOnly: false,
  },

  /**
   * Configure CSRF protection options. Refer documentation
   * to learn more
   */
  csrf: {
    enabled: true,
    exceptRoutes: (ctx) => {
      const url = ctx.request.url()
      // Only exclude specific public API routes
      const exemptRoutes = [
        '/api/admin/auth/login',
        '/api/admin/auth/logout',
        '/api/client/auth/login',
        '/api/client/auth/logout',
        '/api/client/auth/verify-totp',
        '/api/admin/auth/verify-totp',
      ]
      // Allow OAuth callbacks
      if (url.includes('/callback')) {
        return true
      }
      return exemptRoutes.some(route => url.startsWith(route))
    },
    enableXsrfCookie: true,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  },

  /**
   * Control how your website should be embedded inside
   * iFrames
   */
  xFrame: {
    enabled: true,
    action: 'DENY',
  },

  /**
   * Force browser to always use HTTPS
   */
  hsts: {
    enabled: true,
    maxAge: '180 days',
  },

  /**
   * Disable browsers from sniffing the content type of a
   * response and always rely on the "content-type" header.
   */
  contentTypeSniffing: {
    enabled: true,
  },
})

export default shieldConfig

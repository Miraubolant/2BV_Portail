import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware pour authentifier les clients
 */
export default class ClientAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    try {
      await ctx.auth.use('client').authenticate()
      return next()
    } catch {
      return ctx.response.unauthorized({ 
        message: 'Non authentifié' 
      })
    }
  }
}

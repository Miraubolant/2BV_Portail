import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware pour authentifier les clients
 */
export default class ClientAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const isInertiaRequest = ctx.request.header('X-Inertia') === 'true'

    try {
      await ctx.auth.use('client').authenticate()
      return next()
    } catch {
      if (isInertiaRequest) {
        return ctx.response.redirect('/client/login')
      }
      return ctx.response.unauthorized({
        message: 'Non authentifié'
      })
    }
  }
}

import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware pour authentifier les administrateurs
 */
export default class AdminAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const isInertiaRequest = ctx.request.header('X-Inertia') === 'true'

    try {
      await ctx.auth.use('admin').authenticate()

      // Vérifier que l'admin est actif
      const admin = ctx.auth.use('admin').user!
      if (!admin.actif) {
        if (isInertiaRequest) {
          return ctx.response.redirect('/admin/login')
        }
        return ctx.response.unauthorized({
          message: 'Compte désactivé',
        })
      }

      return next()
    } catch {
      if (isInertiaRequest) {
        return ctx.response.redirect('/admin/login')
      }
      return ctx.response.unauthorized({
        message: 'Non authentifié',
      })
    }
  }
}

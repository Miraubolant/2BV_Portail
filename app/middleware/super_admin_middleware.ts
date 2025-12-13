import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware pour vérifier que l'utilisateur est super_admin
 * DOIT être utilisé APRÈS admin_auth_middleware
 */
export default class SuperAdminMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const admin = ctx.auth.use('admin').user

    if (!admin) {
      return ctx.response.unauthorized({
        message: 'Non authentifié',
      })
    }

    if (admin.role !== 'super_admin') {
      return ctx.response.forbidden({
        message: 'Accès réservé aux super administrateurs',
      })
    }

    return next()
  }
}

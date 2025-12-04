import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware pour authentifier les administrateurs
 */
export default class AdminAuthMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    try {
      await ctx.auth.use('admin').authenticate()
      
      // Vérifier que l'admin est actif
      const admin = ctx.auth.use('admin').user!
      if (!admin.actif) {
        return ctx.response.unauthorized({ 
          message: 'Compte désactivé' 
        })
      }
      
      return next()
    } catch {
      return ctx.response.unauthorized({ 
        message: 'Non authentifié' 
      })
    }
  }
}

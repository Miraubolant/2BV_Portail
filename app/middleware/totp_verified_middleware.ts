import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'

/**
 * Middleware pour vérifier que le 2FA est configuré et validé
 * Utilisé principalement pour les clients (2FA obligatoire)
 * DOIT être utilisé APRÈS client_auth_middleware
 */
export default class TotpVerifiedMiddleware {
  async handle(ctx: HttpContext, next: NextFn) {
    const client = ctx.auth.use('client').user
    
    if (!client) {
      return ctx.response.unauthorized({ 
        message: 'Non authentifié' 
      })
    }
    
    // Vérifier que le 2FA est configuré
    if (!client.totpEnabled) {
      return ctx.response.status(428).json({
        message: 'Configuration 2FA requise',
        code: 'TOTP_SETUP_REQUIRED'
      })
    }
    
    // Vérifier que la session a le flag totp_verified
    const totpVerified = ctx.session.get('totp_verified')
    if (!totpVerified) {
      return ctx.response.status(428).json({
        message: 'Vérification 2FA requise',
        code: 'TOTP_VERIFICATION_REQUIRED'
      })
    }
    
    return next()
  }
}

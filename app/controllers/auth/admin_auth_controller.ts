import type { HttpContext } from '@adonisjs/core/http'
import Admin from '#models/admin'
import TotpService from '#services/auth/totp_service'
import hash from '@adonisjs/core/services/hash'
import { DateTime } from 'luxon'
import vine from '@vinejs/vine'

const updateNotificationsValidator = vine.compile(
  vine.object({
    notifEmailDocument: vine.boolean().optional(),
    emailNotification: vine.string().email().optional().nullable(),
    filterByResponsable: vine.boolean().optional(),
  })
)

const changePasswordValidator = vine.compile(
  vine.object({
    currentPassword: vine.string(),
    newPassword: vine.string().minLength(8),
    confirmPassword: vine.string(),
  })
)

export default class AdminAuthController {
  private totpService = new TotpService()

  /**
   * POST /api/admin/auth/login
   * Connexion admin
   */
  async login({ request, auth, session, response }: HttpContext) {
    const { email, password, rememberMe } = request.only(['email', 'password', 'rememberMe'])

    try {
      // Verifier les credentials
      const admin = await Admin.verifyCredentials(email, password)

      // Verifier que l'admin est actif
      if (!admin.actif) {
        return response.unauthorized({ message: 'Compte desactive' })
      }

      // Connecter l'admin avec option "Se souvenir de moi"
      await auth.use('admin').login(admin, !!rememberMe)

      // Mettre a jour last_login
      admin.lastLogin = DateTime.now()
      await admin.save()

      // Si 2FA active, demander verification
      if (admin.totpEnabled) {
        session.put('admin_pending_totp', admin.id)
        return response.ok({
          requireTotp: true,
          message: 'Verification 2FA requise'
        })
      }

      session.put('totp_verified', true)

      return response.ok({
        message: 'Connexion reussie',
        user: {
          id: admin.id,
          email: admin.email,
          nom: admin.nom,
          prenom: admin.prenom,
          role: admin.role,
          totpEnabled: admin.totpEnabled,
        }
      })
    } catch (error) {
      console.error('Login error:', error)
      return response.unauthorized({ message: 'Identifiants invalides' })
    }
  }

  /**
   * POST /api/admin/auth/verify-totp
   * Verification du code TOTP
   */
  async verifyTotp({ request, session, response, auth }: HttpContext) {
    const { code } = request.only(['code'])

    const admin = auth.use('admin').user
    if (!admin) {
      return response.unauthorized({ message: 'Non authentifie' })
    }

    if (!admin.totpSecret) {
      return response.badRequest({ message: '2FA non configure' })
    }

    const isValid = this.totpService.verifyToken(code, admin.totpSecret)
    if (!isValid) {
      return response.unauthorized({ message: 'Code invalide' })
    }

    session.put('totp_verified', true)
    session.forget('admin_pending_totp')

    return response.ok({
      message: 'Verification reussie',
      user: {
        id: admin.id,
        email: admin.email,
        nom: admin.nom,
        prenom: admin.prenom,
        role: admin.role,
        totpEnabled: admin.totpEnabled,
      }
    })
  }

  /**
   * POST /api/admin/auth/setup-totp
   * Configuration du 2FA
   */
  async setupTotp({ auth, response }: HttpContext) {
    const admin = auth.use('admin').user
    if (!admin) {
      return response.unauthorized({ message: 'Non authentifie' })
    }

    if (admin.totpEnabled) {
      return response.badRequest({ message: '2FA deja configure' })
    }

    const secret = this.totpService.generateSecret()
    const qrCode = await this.totpService.generateQRCode(admin.email, secret)

    // Stocker temporairement le secret
    admin.totpSecret = secret
    await admin.save()

    return response.ok({
      secret,
      qrCode,
      message: 'Scannez le QR code avec votre application'
    })
  }

  /**
   * POST /api/admin/auth/confirm-totp
   * Confirmation du setup 2FA
   */
  async confirmTotp({ request, auth, session, response }: HttpContext) {
    const { code } = request.only(['code'])

    const admin = auth.use('admin').user
    if (!admin) {
      return response.unauthorized({ message: 'Non authentifie' })
    }

    if (!admin.totpSecret) {
      return response.badRequest({ message: '2FA non configure' })
    }

    const isValid = this.totpService.verifyToken(code, admin.totpSecret)
    if (!isValid) {
      return response.unauthorized({ message: 'Code invalide' })
    }

    admin.totpEnabled = true
    await admin.save()

    session.put('totp_verified', true)

    return response.ok({ message: '2FA active avec succes' })
  }

  /**
   * POST /api/admin/auth/logout
   * Deconnexion
   */
  async logout({ auth, session, response }: HttpContext) {
    await auth.use('admin').logout()
    session.clear()

    return response.ok({ message: 'Deconnexion reussie' })
  }

  /**
   * GET /api/admin/auth/me
   * Informations utilisateur connecte
   */
  async me({ auth, response }: HttpContext) {
    const admin = auth.use('admin').user
    if (!admin) {
      return response.unauthorized({ message: 'Non authentifie' })
    }

    return response.ok({
      user: {
        id: admin.id,
        email: admin.email,
        nom: admin.nom,
        prenom: admin.prenom,
        username: admin.username,
        role: admin.role,
        totpEnabled: admin.totpEnabled,
        notifEmailDocument: admin.notifEmailDocument,
        emailNotification: admin.emailNotification,
        filterByResponsable: admin.filterByResponsable,
      }
    })
  }

  /**
   * PUT /api/admin/auth/notifications
   * Mettre a jour les preferences de notification
   */
  async updateNotifications({ request, auth, response }: HttpContext) {
    const admin = auth.use('admin').user
    if (!admin) {
      return response.unauthorized({ message: 'Non authentifie' })
    }

    const data = await request.validateUsing(updateNotificationsValidator)
    admin.merge(data)
    await admin.save()

    return response.ok({
      message: 'Preferences mises a jour',
      notifEmailDocument: admin.notifEmailDocument,
      emailNotification: admin.emailNotification,
      filterByResponsable: admin.filterByResponsable,
    })
  }

  /**
   * PUT /api/admin/auth/password
   * Changer son mot de passe
   */
  async changePassword({ request, auth, response }: HttpContext) {
    const admin = auth.use('admin').user
    if (!admin) {
      return response.unauthorized({ message: 'Non authentifie' })
    }

    const data = await request.validateUsing(changePasswordValidator)

    // Verifier que les nouveaux mots de passe correspondent
    if (data.newPassword !== data.confirmPassword) {
      return response.badRequest({ message: 'Les mots de passe ne correspondent pas' })
    }

    // Verifier le mot de passe actuel
    const isCurrentPasswordValid = await hash.verify(admin.password, data.currentPassword)
    if (!isCurrentPasswordValid) {
      return response.badRequest({ message: 'Mot de passe actuel incorrect' })
    }

    // Mettre a jour le mot de passe (le model hashera automatiquement)
    admin.password = data.newPassword
    await admin.save()

    return response.ok({ message: 'Mot de passe modifie avec succes' })
  }
}

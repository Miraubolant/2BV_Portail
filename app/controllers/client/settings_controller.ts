import type { HttpContext } from '@adonisjs/core/http'
import Client from '#models/client'
import TotpService from '#services/auth/totp_service'
import vine from '@vinejs/vine'

const changePasswordValidator = vine.compile(
  vine.object({
    currentPassword: vine.string().minLength(1),
    newPassword: vine.string().minLength(8),
    confirmPassword: vine.string().minLength(8),
  })
)

export default class SettingsController {
  private totpService = new TotpService()

  /**
   * GET /api/client/settings
   * Get current client settings
   */
  async index({ auth, response }: HttpContext) {
    const client = auth.use('client').user
    if (!client) {
      return response.unauthorized({ message: 'Non authentifie' })
    }

    return response.ok({
      email: client.email,
      nom: client.nom,
      prenom: client.prenom,
      telephone: client.telephone,
      totpEnabled: client.totpEnabled,
      notifEmailDocument: client.notifEmailDocument,
      notifEmailEvenement: client.notifEmailEvenement,
    })
  }

  /**
   * POST /api/client/settings/change-password
   * Change client password
   */
  async changePassword({ request, auth, response }: HttpContext) {
    const client = auth.use('client').user
    if (!client) {
      return response.unauthorized({ message: 'Non authentifie' })
    }

    const data = await request.validateUsing(changePasswordValidator)

    // Verify passwords match
    if (data.newPassword !== data.confirmPassword) {
      return response.badRequest({ message: 'Les mots de passe ne correspondent pas' })
    }

    // Verify current password
    try {
      await Client.verifyCredentials(client.email, data.currentPassword)
    } catch {
      return response.badRequest({ message: 'Mot de passe actuel incorrect' })
    }

    // Update password (withAuthFinder will hash it automatically)
    client.password = data.newPassword
    await client.save()

    return response.ok({ message: 'Mot de passe modifie avec succes' })
  }

  /**
   * POST /api/client/settings/enable-totp
   * Start 2FA setup - generate QR code
   */
  async enableTotp({ auth, response }: HttpContext) {
    const client = auth.use('client').user
    if (!client) {
      return response.unauthorized({ message: 'Non authentifie' })
    }

    if (client.totpEnabled) {
      return response.badRequest({ message: '2FA deja active' })
    }

    const secret = this.totpService.generateSecret()
    const qrCode = await this.totpService.generateQRCode(client.email, secret)

    // Store secret temporarily
    client.totpSecret = secret
    await client.save()

    return response.ok({
      secret,
      qrCode,
      message: 'Scannez le QR code avec votre application d\'authentification',
    })
  }

  /**
   * POST /api/client/settings/confirm-totp
   * Confirm 2FA setup with verification code
   */
  async confirmTotp({ request, auth, response }: HttpContext) {
    const { code } = request.only(['code'])

    const client = auth.use('client').user
    if (!client) {
      return response.unauthorized({ message: 'Non authentifie' })
    }

    if (!client.totpSecret) {
      return response.badRequest({ message: 'Aucune configuration 2FA en cours' })
    }

    const isValid = this.totpService.verifyToken(code, client.totpSecret)
    if (!isValid) {
      return response.badRequest({ message: 'Code invalide' })
    }

    client.totpEnabled = true
    await client.save()

    return response.ok({ message: '2FA active avec succes' })
  }

  /**
   * POST /api/client/settings/disable-totp
   * Disable 2FA (requires password confirmation)
   */
  async disableTotp({ request, auth, response }: HttpContext) {
    const { password, code } = request.only(['password', 'code'])

    const client = auth.use('client').user
    if (!client) {
      return response.unauthorized({ message: 'Non authentifie' })
    }

    if (!client.totpEnabled) {
      return response.badRequest({ message: '2FA non active' })
    }

    // Verify password
    try {
      await Client.verifyCredentials(client.email, password)
    } catch {
      return response.badRequest({ message: 'Mot de passe incorrect' })
    }

    // Verify TOTP code
    if (!client.totpSecret || !this.totpService.verifyToken(code, client.totpSecret)) {
      return response.badRequest({ message: 'Code 2FA invalide' })
    }

    // Disable 2FA
    client.totpEnabled = false
    client.totpSecret = null
    await client.save()

    return response.ok({ message: '2FA desactive avec succes' })
  }

  /**
   * PUT /api/client/settings/notifications
   * Update notification preferences
   */
  async updateNotifications({ request, auth, response }: HttpContext) {
    const client = auth.use('client').user
    if (!client) {
      return response.unauthorized({ message: 'Non authentifie' })
    }

    const { notifEmailDocument, notifEmailEvenement } = request.only([
      'notifEmailDocument',
      'notifEmailEvenement',
    ])

    if (notifEmailDocument !== undefined) {
      client.notifEmailDocument = notifEmailDocument
    }
    if (notifEmailEvenement !== undefined) {
      client.notifEmailEvenement = notifEmailEvenement
    }

    await client.save()

    return response.ok({ message: 'Preferences mises a jour' })
  }
}

import type { HttpContext } from '@adonisjs/core/http'
import Client from '#models/client'
import TotpService from '#services/auth/totp_service'
import { DateTime } from 'luxon'

export default class ClientAuthController {
  private totpService = new TotpService()

  /**
   * POST /api/client/auth/login
   * Connexion client
   */
  async login({ request, auth, session, response }: HttpContext) {
    const { email, password, rememberMe } = request.only(['email', 'password', 'rememberMe'])

    try {
      // Verifier les credentials
      const client = await Client.verifyCredentials(email, password)

      // Verifier que le compte est actif
      if (!client.actif) {
        return response.unauthorized({ message: 'Compte desactive. Contactez l\'administration.' })
      }

      // Connecter le client avec option "Se souvenir de moi"
      await auth.use('client').login(client, !!rememberMe)

      // Mettre a jour last_login
      client.lastLogin = DateTime.now()
      await client.save()

      // Si 2FA non configure, demander setup (obligatoire pour clients)
      if (!client.totpEnabled) {
        return response.ok({
          requireTotpSetup: true,
          message: 'Configuration 2FA requise'
        })
      }

      // 2FA configure mais non verifie dans cette session
      session.put('client_pending_totp', client.id)
      return response.ok({
        requireTotp: true,
        message: 'Verification 2FA requise'
      })
    } catch {
      return response.unauthorized({ message: 'Identifiants invalides' })
    }
  }

  /**
   * GET /api/client/auth/totp-status
   * Verifie le statut TOTP et genere le QR si besoin de setup
   */
  async totpStatus({ auth, response }: HttpContext) {
    const client = auth.use('client').user
    if (!client) {
      return response.unauthorized({ message: 'Non authentifie' })
    }

    // Si deja configure, juste verifier
    if (client.totpEnabled) {
      return response.ok({
        needsSetup: false,
        totpEnabled: true
      })
    }

    // Generer le QR code pour le setup
    const secret = this.totpService.generateSecret()
    const qrCode = await this.totpService.generateQRCode(client.email, secret)

    // Stocker temporairement le secret
    client.totpSecret = secret
    await client.save()

    return response.ok({
      needsSetup: true,
      totpEnabled: false,
      secret,
      qrCode,
      message: 'Scannez le QR code avec votre application'
    })
  }

  /**
   * POST /api/client/auth/setup-totp
   * Configuration initiale du 2FA (obligatoire)
   */
  async setupTotp({ auth, response }: HttpContext) {
    const client = auth.use('client').user
    if (!client) {
      return response.unauthorized({ message: 'Non authentifie' })
    }

    if (client.totpEnabled) {
      return response.badRequest({ message: '2FA deja configure' })
    }

    const secret = this.totpService.generateSecret()
    const qrCode = await this.totpService.generateQRCode(client.email, secret)

    // Stocker temporairement le secret
    client.totpSecret = secret
    await client.save()

    return response.ok({
      secret,
      qrCode,
      message: 'Scannez le QR code avec votre application'
    })
  }

  /**
   * POST /api/client/auth/confirm-totp
   * Confirmation du setup 2FA
   */
  async confirmTotp({ request, auth, session, response }: HttpContext) {
    const { code } = request.only(['code'])

    const client = auth.use('client').user
    if (!client) {
      return response.unauthorized({ message: 'Non authentifie' })
    }

    if (!client.totpSecret) {
      return response.badRequest({ message: '2FA non configure' })
    }

    const isValid = this.totpService.verifyToken(code, client.totpSecret)
    if (!isValid) {
      return response.unauthorized({ message: 'Code invalide' })
    }

    client.totpEnabled = true
    await client.save()

    session.put('totp_verified', true)
    session.forget('client_pending_totp')

    return response.ok({
      message: '2FA active avec succes',
      user: {
        id: client.id,
        email: client.email,
        nom: client.nom,
        prenom: client.prenom,
        type: client.type,
      }
    })
  }

  /**
   * POST /api/client/auth/verify-totp
   * Verification du code TOTP
   */
  async verifyTotp({ request, session, response, auth }: HttpContext) {
    const { code } = request.only(['code'])

    const client = auth.use('client').user
    if (!client) {
      return response.unauthorized({ message: 'Non authentifie' })
    }

    if (!client.totpSecret) {
      return response.badRequest({ message: '2FA non configure' })
    }

    const isValid = this.totpService.verifyToken(code, client.totpSecret)
    if (!isValid) {
      return response.unauthorized({ message: 'Code invalide' })
    }

    session.put('totp_verified', true)
    session.forget('client_pending_totp')

    return response.ok({
      message: 'Verification reussie',
      user: {
        id: client.id,
        email: client.email,
        nom: client.nom,
        prenom: client.prenom,
        type: client.type,
      }
    })
  }

  /**
   * POST /api/client/auth/logout
   * Deconnexion
   */
  async logout({ auth, session, response }: HttpContext) {
    await auth.use('client').logout()
    session.clear()

    return response.ok({ message: 'Deconnexion reussie' })
  }

  /**
   * GET /api/client/auth/me
   * Informations utilisateur connecte
   */
  async me({ auth, response }: HttpContext) {
    const client = auth.use('client').user
    if (!client) {
      return response.unauthorized({ message: 'Non authentifie' })
    }

    return response.ok({
      user: {
        id: client.id,
        email: client.email,
        nom: client.nom,
        prenom: client.prenom,
        type: client.type,
        peutUploader: client.peutUploader,
        peutDemanderRdv: client.peutDemanderRdv,
      }
    })
  }
}

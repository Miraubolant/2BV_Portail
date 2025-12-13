import type { HttpContext } from '@adonisjs/core/http'
import Client from '#models/client'
import { createClientValidator, updateClientValidator } from '#validators/client_validator'
import transmit from '@adonisjs/transmit/services/main'
import { randomBytes } from 'crypto'
import { DateTime } from 'luxon'
import emailService from '#services/email_service'
import env from '#start/env'
import logger from '@adonisjs/core/services/logger'

export default class ClientsController {
  /**
   * GET /api/admin/clients
   * Liste des clients
   */
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const search = request.input('search', '')
    const type = request.input('type', '')
    const responsableId = request.input('responsableId', '')

    let query = Client.query()
      .preload('createdBy')
      .preload('responsable')
      .orderBy('created_at', 'desc')

    if (search) {
      query = query.where((builder) => {
        builder
          .whereILike('nom', '%' + search + '%')
          .orWhereILike('prenom', '%' + search + '%')
          .orWhereILike('email', '%' + search + '%')
      })
    }

    if (type) {
      query = query.where('type', type)
    }

    if (responsableId) {
      if (responsableId === 'none') {
        query = query.whereNull('responsable_id')
      } else {
        query = query.where('responsable_id', responsableId)
      }
    }

    const clients = await query.paginate(page, limit)

    return response.ok(clients)
  }

  /**
   * GET /api/admin/clients/:id
   * Detail d'un client
   */
  async show({ params, response }: HttpContext) {
    const client = await Client.query()
      .where('id', params.id)
      .preload('createdBy')
      .preload('responsable')
      .preload('dossiers', (dossiersQuery) => {
        dossiersQuery.preload('documents')
      })
      .firstOrFail()

    return response.ok(client)
  }

  /**
   * POST /api/admin/clients
   * Creer un client
   */
  async store({ request, auth, response }: HttpContext) {
    const data = await request.validateUsing(createClientValidator)
    const admin = auth.use('admin').user!

    // Verifier si l'email existe deja
    const existingClient = await Client.findBy('email', data.email)
    if (existingClient) {
      return response.conflict({
        message: 'Un client avec cette adresse email existe deja',
      })
    }

    // Generer un mot de passe si non fourni
    let password = data.password
    if (!password) {
      password = randomBytes(8).toString('hex')
    }

    // Extraire et convertir la date
    const { dateNaissance, ...restData } = data

    // Ne pas hasher manuellement - withAuthFinder le fait automatiquement
    const client = await Client.create({
      ...restData,
      password,
      createdById: admin.id,
      dateNaissance: dateNaissance ? DateTime.fromISO(dateNaissance) : null,
    })

    // Envoyer email de bienvenue avec credentials
    const portalUrl = env.get('APP_URL', 'http://localhost:3000') + '/client/auth/login'
    const emailResult = await emailService.sendWelcomeEmail({
      clientName: `${client.prenom} ${client.nom}`,
      clientEmail: client.email,
      temporaryPassword: password,
      portalUrl,
    })

    if (!emailResult.success) {
      logger.warn({ error: emailResult.error }, `Failed to send welcome email to ${client.email}`)
    }

    return response.created({
      client,
      generatedPassword: data.password ? undefined : password,
      emailSent: emailResult.success,
    })
  }

  /**
   * PUT /api/admin/clients/:id
   * Modifier un client
   */
  async update({ params, request, response }: HttpContext) {
    const client = await Client.findOrFail(params.id)
    const data = await request.validateUsing(updateClientValidator)

    // Extraire et convertir la date
    const { dateNaissance, ...restData } = data

    client.merge(restData)
    if (dateNaissance !== undefined) {
      client.dateNaissance = dateNaissance ? DateTime.fromISO(dateNaissance) : null
    }
    await client.save()

    // Charger les relations pour la reponse complete
    await client.load('responsable')

    // Broadcast aux autres admins connectes
    transmit.broadcast('admin/clients', {
      type: 'client:updated',
      client: {
        id: client.id,
        nom: client.nom,
        prenom: client.prenom,
        email: client.email,
        telephone: client.telephone,
        type: client.type,
        actif: client.actif,
        peutUploader: client.peutUploader,
        peutDemanderRdv: client.peutDemanderRdv,
        responsableId: client.responsableId,
        responsable: client.responsable ? {
          id: client.responsable.id,
          username: client.responsable.username,
          nom: client.responsable.nom,
          prenom: client.responsable.prenom,
        } : null,
        createdAt: client.createdAt.toISO(),
      },
    })

    return response.ok(client)
  }

  /**
   * DELETE /api/admin/clients/:id
   * Supprimer un client
   */
  async destroy({ params, response }: HttpContext) {
    const client = await Client.findOrFail(params.id)
    await client.delete()

    return response.ok({ message: 'Client supprime' })
  }

  /**
   * POST /api/admin/clients/:id/reset-password
   * Reinitialiser le mot de passe d'un client
   */
  async resetPassword({ params, response }: HttpContext) {
    const client = await Client.findOrFail(params.id)

    const newPassword = randomBytes(8).toString('hex')
    // Ne pas hasher manuellement - withAuthFinder le fait automatiquement
    client.password = newPassword
    await client.save()

    // Envoyer email avec nouveau mot de passe
    const portalUrl = env.get('APP_URL', 'http://localhost:3000') + '/client/auth/login'
    const emailResult = await emailService.sendWelcomeEmail({
      clientName: `${client.prenom} ${client.nom}`,
      clientEmail: client.email,
      temporaryPassword: newPassword,
      portalUrl,
    })

    if (!emailResult.success) {
      logger.warn({ error: emailResult.error }, `Failed to send password reset email to ${client.email}`)
    }

    return response.ok({
      message: 'Mot de passe reinitialise',
      newPassword,
      emailSent: emailResult.success,
    })
  }
}

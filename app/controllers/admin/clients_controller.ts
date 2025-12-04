import type { HttpContext } from '@adonisjs/core/http'
import Client from '#models/client'
import { createClientValidator, updateClientValidator } from '#validators/client_validator'
import hash from '@adonisjs/core/services/hash'
import { randomBytes } from 'crypto'
import { DateTime } from 'luxon'

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
      .preload('dossiers')
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

    // Generer un mot de passe si non fourni
    let password = data.password
    if (!password) {
      password = randomBytes(8).toString('hex')
    }

    const hashedPassword = await hash.make(password)

    // Extraire et convertir la date
    const { dateNaissance, ...restData } = data

    const client = await Client.create({
      ...restData,
      password: hashedPassword,
      createdById: admin.id,
      dateNaissance: dateNaissance ? DateTime.fromISO(dateNaissance) : null,
    })

    // TODO: Envoyer email de bienvenue avec credentials

    return response.created({
      client,
      generatedPassword: data.password ? undefined : password,
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
    client.password = await hash.make(newPassword)
    await client.save()

    // TODO: Envoyer email avec nouveau mot de passe

    return response.ok({
      message: 'Mot de passe reinitialise',
      newPassword,
    })
  }
}

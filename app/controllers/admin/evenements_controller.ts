import type { HttpContext } from '@adonisjs/core/http'
import Evenement from '#models/evenement'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

const createEvenementValidator = vine.compile(
  vine.object({
    dossierId: vine.string().uuid(),
    titre: vine.string().minLength(3).maxLength(255),
    description: vine.string().optional(),
    type: vine.string(),
    dateDebut: vine.string(),
    dateFin: vine.string(),
    journeeEntiere: vine.boolean().optional(),
    lieu: vine.string().optional(),
    adresse: vine.string().optional(),
    salle: vine.string().optional(),
    syncGoogle: vine.boolean().optional(),
  })
)

const updateEvenementValidator = vine.compile(
  vine.object({
    titre: vine.string().minLength(3).maxLength(255).optional(),
    description: vine.string().optional(),
    type: vine.string().optional(),
    dateDebut: vine.string().optional(),
    dateFin: vine.string().optional(),
    journeeEntiere: vine.boolean().optional(),
    lieu: vine.string().optional(),
    adresse: vine.string().optional(),
    salle: vine.string().optional(),
    statut: vine.string().optional(),
    syncGoogle: vine.boolean().optional(),
  })
)

export default class EvenementsController {
  /**
   * GET /api/admin/evenements
   */
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const from = request.input('from', '')
    const to = request.input('to', '')

    let query = (Evenement.query() as any)
      .preload('dossier')
      .orderBy('date_debut', 'asc')

    if (from) {
      query = query.where('date_debut', '>=', from)
    }
    if (to) {
      query = query.where('date_debut', '<=', to)
    }

    const evenements = await query.paginate(page, limit)
    return response.ok(evenements)
  }

  /**
   * GET /api/admin/evenements/:id
   */
  async show({ params, response }: HttpContext) {
    const evenement = await (Evenement.query() as any)
      .where('id', params.id)
      .preload('dossier')
      .firstOrFail()

    return response.ok(evenement)
  }

  /**
   * POST /api/admin/evenements
   */
  async store({ request, auth, response }: HttpContext) {
    const data = await request.validateUsing(createEvenementValidator)
    const admin = auth.use('admin').user!

    // Extraire les dates
    const { dateDebut, dateFin, ...restData } = data

    const evenement = await Evenement.create({
      ...restData,
      dateDebut: DateTime.fromISO(dateDebut),
      dateFin: DateTime.fromISO(dateFin),
      createdById: admin.id,
    })

    await (evenement as any).load('dossier')
    return response.created(evenement)
  }

  /**
   * PUT /api/admin/evenements/:id
   */
  async update({ params, request, response }: HttpContext) {
    const evenement = await Evenement.findOrFail(params.id)
    const data = await request.validateUsing(updateEvenementValidator)

    // Extraire les dates
    const { dateDebut, dateFin, ...restData } = data

    if (dateDebut) evenement.dateDebut = DateTime.fromISO(dateDebut)
    if (dateFin) evenement.dateFin = DateTime.fromISO(dateFin)

    evenement.merge(restData)
    await evenement.save()

    return response.ok(evenement)
  }

  /**
   * DELETE /api/admin/evenements/:id
   */
  async destroy({ params, response }: HttpContext) {
    const evenement = await Evenement.findOrFail(params.id)
    await evenement.delete()
    return response.ok({ message: 'Evenement supprime' })
  }

  /**
   * GET /api/admin/dossiers/:id/evenements
   */
  async byDossier({ params, response }: HttpContext) {
    const evenements = await Evenement.query()
      .where('dossier_id', params.id)
      .orderBy('date_debut', 'asc')

    return response.ok(evenements)
  }
}

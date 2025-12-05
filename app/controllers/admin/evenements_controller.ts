import type { HttpContext } from '@adonisjs/core/http'
import Evenement from '#models/evenement'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import calendarSyncService from '#services/google/calendar_sync_service'
import GoogleToken from '#models/google_token'
import googleConfig from '#config/google'

const createEvenementValidator = vine.compile(
  vine.object({
    dossierId: vine.string().uuid().optional().nullable(),
    titre: vine.string().minLength(3).maxLength(255),
    description: vine.string().optional().nullable(),
    type: vine.string(),
    dateDebut: vine.string(),
    dateFin: vine.string(),
    journeeEntiere: vine.boolean().optional(),
    lieu: vine.string().optional().nullable(),
    adresse: vine.string().optional().nullable(),
    salle: vine.string().optional().nullable(),
    syncGoogle: vine.boolean().optional(),
  })
)

const updateEvenementValidator = vine.compile(
  vine.object({
    dossierId: vine.string().uuid().optional().nullable(),
    titre: vine.string().minLength(3).maxLength(255).optional(),
    description: vine.string().optional().nullable(),
    type: vine.string().optional(),
    dateDebut: vine.string().optional(),
    dateFin: vine.string().optional(),
    journeeEntiere: vine.boolean().optional(),
    lieu: vine.string().optional().nullable(),
    adresse: vine.string().optional().nullable(),
    salle: vine.string().optional().nullable(),
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
    const limit = request.input('limit', 100)
    const from = request.input('from', '')
    const to = request.input('to', '')
    const year = request.input('year')
    const month = request.input('month')
    const responsableId = request.input('responsableId', '')

    let query = Evenement.query()
      .preload('dossier', (dossierQuery) => {
        dossierQuery.preload('client', (clientQuery) => {
          clientQuery.preload('responsable')
        })
      })
      .orderBy('date_debut', 'asc')

    // Support year/month filtering for calendar view
    if (year && month) {
      const startDate = DateTime.fromObject({ year: parseInt(year), month: parseInt(month), day: 1 })
      const endDate = startDate.endOf('month')
      query = query.where('date_debut', '>=', startDate.toSQL())
      query = query.where('date_debut', '<=', endDate.toSQL())
    } else {
      if (from) {
        query = query.where('date_debut', '>=', from)
      }
      if (to) {
        query = query.where('date_debut', '<=', to)
      }
    }

    // Filter by client's responsable (through dossier)
    if (responsableId) {
      if (responsableId === 'none') {
        // Events without dossier OR with dossier whose client has no responsable
        query = query.where((builder) => {
          builder
            .whereNull('dossier_id')
            .orWhereHas('dossier', (dossierQuery) => {
              dossierQuery.whereHas('client', (clientQuery) => {
                clientQuery.whereNull('responsable_id')
              })
            })
        })
      } else {
        // Events with dossier whose client has the specified responsable
        query = query.whereHas('dossier', (dossierQuery) => {
          dossierQuery.whereHas('client', (clientQuery) => {
            clientQuery.where('responsable_id', responsableId)
          })
        })
      }
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

    // Sync to Google Calendar if enabled and sync mode is auto (async, don't block response)
    if (evenement.syncGoogle) {
      const syncMode = await GoogleToken.getSyncMode(googleConfig.serviceKey)
      if (syncMode === 'auto') {
        calendarSyncService.syncEventToGoogle(evenement.id).catch((err) => {
          console.error('Failed to sync event to Google:', err)
        })
      }
    }

    await (evenement as any).load('dossier')
    return response.created(evenement)
  }

  /**
   * PUT /api/admin/evenements/:id
   */
  async update({ params, request, response }: HttpContext) {
    const evenement = await Evenement.findOrFail(params.id)
    const data = await request.validateUsing(updateEvenementValidator)

    // Extraire les dates et dossierId
    const { dateDebut, dateFin, dossierId, ...restData } = data

    if (dateDebut) evenement.dateDebut = DateTime.fromISO(dateDebut)
    if (dateFin) evenement.dateFin = DateTime.fromISO(dateFin)

    // Handle dossierId update (can be null to unassign, or a valid UUID to assign)
    if (dossierId !== undefined) {
      evenement.dossierId = dossierId || null
    }

    evenement.merge(restData)
    await evenement.save()

    // Sync to Google Calendar if enabled and sync mode is auto (async, don't block response)
    if (evenement.syncGoogle) {
      const syncMode = await GoogleToken.getSyncMode(googleConfig.serviceKey)
      if (syncMode === 'auto') {
        calendarSyncService.syncEventToGoogle(evenement.id).catch((err) => {
          console.error('Failed to sync event update to Google:', err)
        })
      }
    }

    return response.ok(evenement)
  }

  /**
   * DELETE /api/admin/evenements/:id
   */
  async destroy({ params, response }: HttpContext) {
    const evenement = await Evenement.findOrFail(params.id)

    // Delete from Google Calendar if synced (async, don't block response)
    if (evenement.googleEventId) {
      calendarSyncService.deleteEventFromGoogle(evenement.googleEventId).catch((err) => {
        console.error('Failed to delete event from Google:', err)
      })
    }

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

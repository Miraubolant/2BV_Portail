import type { HttpContext } from '@adonisjs/core/http'
import Evenement from '#models/evenement'
import Dossier from '#models/dossier'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import calendarSyncService from '#services/google/calendar_sync_service'
import GoogleToken from '#models/google_token'
import GoogleCalendar from '#models/google_calendar'
import googleConfig from '#config/google'
import ActivityLogger from '#services/activity_logger'
import logger from '@adonisjs/core/services/logger'

const EVENEMENT_TYPES = [
  'audience',
  'rdv_client',
  'rdv_adverse',
  'expertise',
  'mediation',
  'echeance',
  'autre',
] as const

const EVENEMENT_STATUTS = ['planifie', 'confirme', 'annule', 'reporte', 'termine'] as const

const createEvenementValidator = vine.compile(
  vine.object({
    dossierId: vine.string().uuid().optional().nullable(),
    titre: vine.string().minLength(3).maxLength(255),
    description: vine.string().optional().nullable(),
    type: vine.enum(EVENEMENT_TYPES),
    dateDebut: vine.string(),
    dateFin: vine.string(),
    journeeEntiere: vine.boolean().optional(),
    lieu: vine.string().optional().nullable(),
    adresse: vine.string().optional().nullable(),
    salle: vine.string().optional().nullable(),
    syncGoogle: vine.boolean().optional(),
    googleCalendarId: vine.string().uuid().optional().nullable(),
  })
)

const updateEvenementValidator = vine.compile(
  vine.object({
    dossierId: vine.string().uuid().optional().nullable(),
    titre: vine.string().minLength(3).maxLength(255).optional(),
    description: vine.string().optional().nullable(),
    type: vine.enum(EVENEMENT_TYPES).optional(),
    dateDebut: vine.string().optional(),
    dateFin: vine.string().optional(),
    journeeEntiere: vine.boolean().optional(),
    lieu: vine.string().optional().nullable(),
    adresse: vine.string().optional().nullable(),
    salle: vine.string().optional().nullable(),
    statut: vine.enum(EVENEMENT_STATUTS).optional(),
    syncGoogle: vine.boolean().optional(),
    googleCalendarId: vine.string().uuid().optional().nullable(),
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
      .preload('dossier' as any, (dossierQuery: any) => {
        dossierQuery.preload('client', (clientQuery: any) => {
          clientQuery.preload('responsable')
        })
      })
      .orderBy('date_debut', 'asc')

    // Support year/month filtering for calendar view
    if (year && month) {
      const startDate = DateTime.fromObject({
        year: Number.parseInt(year),
        month: Number.parseInt(month),
        day: 1,
      })
      const endDate = startDate.endOf('month')
      query = query.where('date_debut', '>=', startDate.toISO()!)
      query = query.where('date_debut', '<=', endDate.toISO()!)
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
          builder.whereNull('dossier_id').orWhereHas('dossier' as any, (dossierQuery: any) => {
            dossierQuery.whereHas('client', (clientQuery: any) => {
              clientQuery.whereNull('responsable_id')
            })
          })
        })
      } else {
        // Events with dossier whose client has the specified responsable
        query = query.whereHas('dossier' as any, (dossierQuery: any) => {
          dossierQuery.whereHas('client', (clientQuery: any) => {
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
  async store(ctx: HttpContext) {
    const { request, auth, response } = ctx
    const data = await request.validateUsing(createEvenementValidator)
    const admin = auth.use('admin').user!

    // Extraire les dates et googleCalendarId
    const { dateDebut, dateFin, googleCalendarId, ...restData } = data

    // Si un dossier est specifie, prefixer le titre avec la reference du dossier
    let finalTitre = restData.titre
    if (restData.dossierId) {
      const dossier = await Dossier.find(restData.dossierId)
      if (dossier) {
        // Verifier si le titre ne commence pas deja par la reference
        if (!finalTitre.startsWith(dossier.reference)) {
          finalTitre = `${dossier.reference} - ${finalTitre}`
        }
      }
    }

    // Si syncGoogle est true mais qu'aucun calendrier n'est specifie, auto-assigner le premier calendrier actif
    let finalGoogleCalendarId = googleCalendarId || null
    if (restData.syncGoogle && !finalGoogleCalendarId) {
      const activeCalendar = await GoogleCalendar.query().where('is_active', true).first()
      if (activeCalendar) {
        finalGoogleCalendarId = activeCalendar.id
        logger.info({ calendarId: activeCalendar.id, calendarName: activeCalendar.calendarName }, 'Auto-assigned Google Calendar for new event')
      } else {
        // Aucun calendrier actif - desactiver syncGoogle
        restData.syncGoogle = false
        logger.warn('No active Google Calendar found, disabling syncGoogle for new event')
      }
    }

    const evenement = await Evenement.create({
      ...restData,
      titre: finalTitre,
      dateDebut: DateTime.fromISO(dateDebut),
      dateFin: DateTime.fromISO(dateFin),
      googleCalendarId: finalGoogleCalendarId,
      createdById: admin.id,
    })

    // Logger la creation de l'evenement
    await ActivityLogger.logEvenementCreated(
      evenement.id,
      admin.id,
      {
        titre: evenement.titre,
        type: evenement.type,
        dossierId: evenement.dossierId,
        dateDebut: evenement.dateDebut.toISO(),
      },
      ctx
    )

    // Sync to Google Calendar if enabled and sync mode is auto (async, don't block response)
    if (evenement.syncGoogle) {
      const syncMode = await GoogleToken.getSyncMode(googleConfig.serviceKey)
      if (syncMode === 'auto') {
        calendarSyncService.syncEventToGoogle(evenement.id).catch((err) => {
          logger.error({ err }, 'Failed to sync event to Google')
        })
      }
    }

    await (evenement as any).load('dossier')
    return response.created(evenement)
  }

  /**
   * PUT /api/admin/evenements/:id
   */
  async update(ctx: HttpContext) {
    const { params, request, auth, response } = ctx
    const evenement = await Evenement.findOrFail(params.id)
    const data = await request.validateUsing(updateEvenementValidator)
    const admin = auth.use('admin').user!

    // Extraire les dates, dossierId et googleCalendarId
    const { dateDebut, dateFin, dossierId, googleCalendarId, titre, ...restData } = data

    if (dateDebut) evenement.dateDebut = DateTime.fromISO(dateDebut)
    if (dateFin) evenement.dateFin = DateTime.fromISO(dateFin)

    // Handle dossierId update (can be null to unassign, or a valid UUID to assign)
    const newDossierId = dossierId !== undefined ? (dossierId || null) : evenement.dossierId
    if (dossierId !== undefined) {
      evenement.dossierId = dossierId || null
    }

    // Si un titre est fourni et un dossier est associe, prefixer avec la reference
    if (titre) {
      let finalTitre = titre
      if (newDossierId) {
        const dossier = await Dossier.find(newDossierId)
        if (dossier && !finalTitre.startsWith(dossier.reference)) {
          finalTitre = `${dossier.reference} - ${finalTitre}`
        }
      }
      evenement.titre = finalTitre
    }

    // Handle googleCalendarId update (can be null to unassign, or a valid UUID to assign)
    if (googleCalendarId !== undefined) {
      evenement.googleCalendarId = googleCalendarId || null
    }

    evenement.merge(restData)
    await evenement.save()

    // Logger la modification de l'evenement
    await ActivityLogger.logEvenementUpdated(
      evenement.id,
      admin.id,
      {
        titre: evenement.titre,
        dossierId: evenement.dossierId,
      },
      ctx
    )

    // Sync to Google Calendar if enabled and sync mode is auto (async, don't block response)
    if (evenement.syncGoogle) {
      const syncMode = await GoogleToken.getSyncMode(googleConfig.serviceKey)
      if (syncMode === 'auto') {
        calendarSyncService.syncEventToGoogle(evenement.id).catch((err) => {
          logger.error({ err }, 'Failed to sync event update to Google')
        })
      }
    }

    return response.ok(evenement)
  }

  /**
   * DELETE /api/admin/evenements/:id
   */
  async destroy(ctx: HttpContext) {
    const { params, auth, response } = ctx
    const evenement = await Evenement.findOrFail(params.id)
    const admin = auth.use('admin').user!

    // Logger la suppression avant de supprimer
    await ActivityLogger.logEvenementDeleted(
      evenement.id,
      admin.id,
      {
        titre: evenement.titre,
        dossierId: evenement.dossierId,
      },
      ctx
    )

    // Delete from Google Calendar if synced (async, don't block response)
    if (evenement.googleEventId) {
      calendarSyncService
        .deleteEventFromGoogle(evenement.googleEventId, evenement.googleCalendarId)
        .catch((err) => {
          logger.error({ err }, 'Failed to delete event from Google')
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

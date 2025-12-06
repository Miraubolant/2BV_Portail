import type { HttpContext } from '@adonisjs/core/http'
import DemandeRdv from '#models/demande_rdv'
import Evenement from '#models/evenement'
import Admin from '#models/admin'
import Dossier from '#models/dossier'
import { DateTime } from 'luxon'

export default class DemandesRdvController {
  /**
   * GET /api/admin/demandes-rdv
   */
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const statut = request.input('statut', '')
    const responsableId = request.input('responsableId', '')
    const dossierId = request.input('dossierId', '')
    const dateFrom = request.input('dateFrom', '')
    const dateTo = request.input('dateTo', '')

    let query = (DemandeRdv.query() as any)
      .preload('client', (clientQuery: any) => {
        clientQuery.preload('responsable')
      })
      .preload('dossier')
      .orderBy('created_at', 'desc')

    if (statut) {
      query = query.where('statut', statut)
    }

    // Filter by responsable (via client)
    if (responsableId) {
      if (responsableId === 'none') {
        query = query.whereHas('client', (clientQuery: any) => {
          clientQuery.whereNull('responsable_id')
        })
      } else {
        query = query.whereHas('client', (clientQuery: any) => {
          clientQuery.where('responsable_id', responsableId)
        })
      }
    }

    // Filter by dossier
    if (dossierId) {
      query = query.where('dossier_id', dossierId)
    }

    // Filter by date range
    if (dateFrom) {
      query = query.where('created_at', '>=', dateFrom)
    }
    if (dateTo) {
      query = query.where('created_at', '<=', `${dateTo} 23:59:59`)
    }

    const demandes = await query.paginate(page, limit)
    return response.ok(demandes)
  }

  /**
   * GET /api/admin/demandes-rdv/filters
   * Get filter options (responsables and dossiers)
   */
  async filters({ response }: HttpContext) {
    const responsables = await Admin.query()
      .where('actif', true)
      .select('id', 'username', 'nom', 'prenom')
      .orderBy('prenom')

    const dossiers = await Dossier.query()
      .where('statut', '!=', 'archive')
      .select('id', 'reference')
      .orderBy('reference')

    return response.ok({
      responsables,
      dossiers,
    })
  }

  /**
   * GET /api/admin/demandes-rdv/:id
   */
  async show({ params, response }: HttpContext) {
    const demande = await (DemandeRdv.query() as any)
      .where('id', params.id)
      .preload('client')
      .preload('dossier')
      .preload('evenement')
      .firstOrFail()

    return response.ok(demande)
  }

  /**
   * POST /api/admin/demandes-rdv/:id/accepter
   */
  async accepter({ params, request, auth, response }: HttpContext) {
    const demande = await DemandeRdv.findOrFail(params.id)
    const admin = auth.use('admin').user!

    const { dateDebut, dateFin, lieu, reponse } = request.only(['dateDebut', 'dateFin', 'lieu', 'reponse'])

    if (!dateDebut || !dateFin) {
      return response.badRequest({ message: 'Les dates de debut et fin sont requises' })
    }

    // Parse dates - try ISO first, then JS Date
    let parsedDateDebut = DateTime.fromISO(dateDebut)
    let parsedDateFin = DateTime.fromISO(dateFin)

    // Fallback to JS Date parsing if ISO fails
    if (!parsedDateDebut.isValid) {
      parsedDateDebut = DateTime.fromJSDate(new Date(dateDebut))
    }
    if (!parsedDateFin.isValid) {
      parsedDateFin = DateTime.fromJSDate(new Date(dateFin))
    }

    // Validate dates
    if (!parsedDateDebut.isValid || !parsedDateFin.isValid) {
      return response.badRequest({ message: 'Format de date invalide' })
    }

    // Creer un evenement
    const evenement = await Evenement.create({
      dossierId: demande.dossierId || null,
      titre: 'RDV: ' + demande.motif.substring(0, 50),
      description: demande.motif,
      type: 'rdv_client',
      dateDebut: parsedDateDebut,
      dateFin: parsedDateFin,
      journeeEntiere: false,
      lieu: lieu || 'Cabinet',
      statut: 'confirme',
      syncGoogle: false,
      rappelEnvoye: false,
      rappelJ7: true,
      rappelJ1: true,
      createdById: admin.id,
    })

    // Mettre a jour la demande
    demande.statut = 'accepte'
    demande.evenementId = evenement.id
    demande.reponseAdmin = reponse || null
    demande.traiteParId = admin.id
    demande.traiteAt = DateTime.now()
    await demande.save()

    // TODO: Envoyer notification au client

    return response.ok({ demande, evenement })
  }

  /**
   * POST /api/admin/demandes-rdv/:id/refuser
   */
  async refuser({ params, request, auth, response }: HttpContext) {
    const demande = await DemandeRdv.findOrFail(params.id)
    const admin = auth.use('admin').user!
    
    const { motif } = request.only(['motif'])

    demande.statut = 'refuse'
    demande.reponseAdmin = motif
    demande.traiteParId = admin.id
    demande.traiteAt = DateTime.now()
    await demande.save()

    // TODO: Envoyer notification au client

    return response.ok(demande)
  }
}

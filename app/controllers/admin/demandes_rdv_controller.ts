import type { HttpContext } from '@adonisjs/core/http'
import DemandeRdv from '#models/demande_rdv'
import Evenement from '#models/evenement'
import { DateTime } from 'luxon'

export default class DemandesRdvController {
  /**
   * GET /api/admin/demandes-rdv
   */
  async index({ request, response }: HttpContext) {
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const statut = request.input('statut', '')

    let query = (DemandeRdv.query() as any)
      .preload('client')
      .preload('dossier')
      .orderBy('created_at', 'desc')

    if (statut) {
      query = query.where('statut', statut)
    }

    const demandes = await query.paginate(page, limit)
    return response.ok(demandes)
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
    
    const { dateDebut, dateFin, lieu } = request.only(['dateDebut', 'dateFin', 'lieu'])

    // Creer un evenement
    const evenement = await Evenement.create({
      dossierId: demande.dossierId!,
      titre: 'RDV: ' + demande.motif.substring(0, 50),
      description: demande.motif,
      type: 'rdv',
      dateDebut: DateTime.fromISO(dateDebut),
      dateFin: DateTime.fromISO(dateFin),
      lieu: lieu || 'Cabinet',
      statut: 'confirme',
      createdById: admin.id,
    })

    // Mettre a jour la demande
    demande.statut = 'accepte'
    demande.evenementId = evenement.id
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

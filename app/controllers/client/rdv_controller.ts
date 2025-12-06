import type { HttpContext } from '@adonisjs/core/http'
import DemandeRdv from '#models/demande_rdv'
import Notification from '#models/notification'
import Client from '#models/client'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

const createDemandeValidator = vine.compile(
  vine.object({
    dossierId: vine.string().uuid().optional(),
    dateSouhaitee: vine.string(),
    creneau: vine.enum(['matin', 'apres_midi', 'fin_journee']),
    motif: vine.string().minLength(10).maxLength(1000),
    urgence: vine.enum(['normal', 'urgent', 'tres_urgent']).optional(),
  })
)

export default class RdvController {
  /**
   * GET /api/client/demandes-rdv
   * Liste de mes demandes de RDV
   */
  async index({ auth, response }: HttpContext) {
    const client = auth.use('client').user!

    const demandes = await (DemandeRdv.query() as any)
      .where('client_id', client.id)
      .preload('dossier')
      .preload('evenement')
      .orderBy('created_at', 'desc')

    return response.ok(demandes)
  }

  /**
   * POST /api/client/demande-rdv
   * Creer une demande de RDV
   */
  async store({ auth, request, response }: HttpContext) {
    const client = auth.use('client').user!

    // Verifier que le client peut demander des RDV
    if (!client.peutDemanderRdv) {
      return response.forbidden({ message: 'Vous ne pouvez pas demander de RDV' })
    }

    const data = await request.validateUsing(createDemandeValidator)

    // Si un dossier est specifie, verifier qu'il appartient au client
    if (data.dossierId) {
      const dossierExists = await client.related('dossiers')
        .query()
        .where('id', data.dossierId)
        .first()
      
      if (!dossierExists) {
        return response.forbidden({ message: 'Dossier non autorise' })
      }
    }

    const demande = await DemandeRdv.create({
      clientId: client.id,
      dossierId: data.dossierId,
      dateSouhaitee: DateTime.fromISO(data.dateSouhaitee),
      creneau: data.creneau,
      motif: data.motif,
      urgence: data.urgence || 'normal',
    })

    // Notifier l'admin responsable du client
    const clientWithResponsable = await Client.query()
      .where('id', client.id)
      .preload('responsable')
      .first()

    if (clientWithResponsable?.responsable) {
      const urgenceLabel = data.urgence === 'tres_urgent' ? ' (TRES URGENT)' :
                          data.urgence === 'urgent' ? ' (URGENT)' : ''

      await Notification.create({
        destinataireType: 'admin',
        destinataireId: clientWithResponsable.responsable.id,
        type: 'demande_rdv',
        titre: `Demande de RDV de ${client.fullName}${urgenceLabel}`,
        message: `Le client ${client.fullName} a fait une demande de RDV: ${data.motif.substring(0, 100)}${data.motif.length > 100 ? '...' : ''}`,
        lien: '/admin/demandes-rdv',
      })
    }

    return response.created(demande)
  }

  /**
   * GET /api/client/demandes-rdv/:id
   */
  async show({ auth, params, response }: HttpContext) {
    const client = auth.use('client').user!

    const demande = await (DemandeRdv.query() as any)
      .where('id', params.id)
      .where('client_id', client.id)
      .preload('dossier')
      .preload('evenement')
      .firstOrFail()

    return response.ok(demande)
  }
}

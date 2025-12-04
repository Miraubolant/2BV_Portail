import type { HttpContext } from '@adonisjs/core/http'
import Dossier from '#models/dossier'

export default class DossiersController {
  /**
   * GET /api/client/dossiers
   * Liste de mes dossiers
   */
  async index({ auth, request, response }: HttpContext) {
    const client = auth.use('client').user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const statut = request.input('statut', '')

    let query = Dossier.query()
      .where('client_id', client.id)
      .orderBy('created_at', 'desc')

    if (statut) {
      if (statut === 'en_cours') {
        query = query.whereIn('statut', ['nouveau', 'en_cours', 'en_attente', 'audience_prevue', 'en_delibere'])
      } else if (statut === 'cloture') {
        query = query.where('statut', 'like', 'cloture%')
      } else {
        query = query.where('statut', statut)
      }
    }

    const dossiers = await query.paginate(page, limit)

    return response.ok(dossiers)
  }

  /**
   * GET /api/client/dossiers/:id
   * Detail d'un de mes dossiers
   */
  async show({ auth, params, response }: HttpContext) {
    const client = auth.use('client').user!

    const dossier = await Dossier.query()
      .where('id', params.id)
      .where('client_id', client.id)
      .preload('documents', (query) => {
        query.where('visible_client', true)
        if (!client.accesDocumentsSensibles) {
          query.where('sensible', false)
        }
      })
      .preload('evenements')
      .firstOrFail()

    return response.ok({
      id: dossier.id,
      reference: dossier.reference,
      intitule: dossier.intitule,
      description: dossier.description,
      typeAffaire: dossier.typeAffaire,
      statut: dossier.statut,
      dateOuverture: dossier.dateOuverture,
      dateCloture: dossier.dateCloture,
      juridiction: dossier.juridiction,
      numeroRg: dossier.numeroRg,
      documents: dossier.documents,
      evenements: dossier.evenements,
    })
  }
}

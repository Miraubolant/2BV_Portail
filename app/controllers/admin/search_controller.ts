import type { HttpContext } from '@adonisjs/core/http'
import Client from '#models/client'
import Dossier from '#models/dossier'
import Document from '#models/document'
import DemandeRdv from '#models/demande_rdv'

interface SearchResult {
  type: 'client' | 'dossier' | 'document' | 'demande_rdv'
  id: string
  title: string
  subtitle: string | null
  url: string
  icon: 'user' | 'folder' | 'file' | 'calendar'
}

export default class SearchController {
  /**
   * GET /api/admin/search?q=term
   * Recherche globale dans clients, dossiers, documents, demandes RDV
   */
  async search({ request, response }: HttpContext) {
    const query = request.input('q', '').trim()

    if (!query || query.length < 2) {
      return response.ok([])
    }

    const searchTerm = `%${query}%`
    const results: SearchResult[] = []

    // Recherche dans les clients
    const clients = await Client.query()
      .where((builder) => {
        builder
          .whereILike('nom', searchTerm)
          .orWhereILike('prenom', searchTerm)
          .orWhereILike('email', searchTerm)
          .orWhereRaw("CONCAT(prenom, ' ', nom) ILIKE ?", [searchTerm])
      })
      .limit(5)

    for (const client of clients) {
      results.push({
        type: 'client',
        id: client.id,
        title: `${client.prenom} ${client.nom}`,
        subtitle: client.email,
        url: `/admin/clients/${client.id}`,
        icon: 'user',
      })
    }

    // Recherche dans les dossiers
    const dossiers = await Dossier.query()
      .where((builder) => {
        builder
          .whereILike('reference', searchTerm)
          .orWhereILike('intitule', searchTerm)
      })
      .preload('client')
      .limit(5)

    for (const dossier of dossiers) {
      results.push({
        type: 'dossier',
        id: dossier.id,
        title: dossier.reference,
        subtitle: dossier.intitule || `${dossier.client?.prenom} ${dossier.client?.nom}`,
        url: `/admin/dossiers/${dossier.id}`,
        icon: 'folder',
      })
    }

    // Recherche dans les documents
    const documents = await (Document.query() as any)
      .whereILike('nom', searchTerm)
      .preload('dossier')
      .limit(5)

    for (const doc of documents) {
      results.push({
        type: 'document',
        id: doc.id,
        title: doc.nom,
        subtitle: doc.dossier?.reference || 'Document',
        url: `/admin/dossiers/${doc.dossierId}`,
        icon: 'file',
      })
    }

    // Recherche dans les demandes RDV
    const demandes = await (DemandeRdv.query() as any)
      .whereILike('motif', searchTerm)
      .preload('client')
      .limit(5)

    for (const demande of demandes) {
      results.push({
        type: 'demande_rdv',
        id: demande.id,
        title: demande.motif.substring(0, 50) + (demande.motif.length > 50 ? '...' : ''),
        subtitle: demande.client ? `${demande.client.prenom} ${demande.client.nom}` : 'Demande RDV',
        url: `/admin/demandes-rdv`,
        icon: 'calendar',
      })
    }

    return response.ok(results)
  }
}

import type { HttpContext } from '@adonisjs/core/http'
import Client from '#models/client'
import Dossier from '#models/dossier'
import DemandeRdv from '#models/demande_rdv'
import Evenement from '#models/evenement'
import { DateTime } from 'luxon'

export default class DashboardController {
  /**
   * GET /api/admin/dashboard
   * Statistiques du dashboard admin
   */
  async index({ response }: HttpContext) {
    // Compter les clients
    const totalClients = await Client.query().count('* as total')

    // Compter les dossiers par statut
    const dossiersEnCours = await Dossier.query()
      .whereIn('statut', ['nouveau', 'en_cours', 'en_attente', 'audience_prevue', 'en_delibere'])
      .count('* as total')

    const dossiersClotures = await Dossier.query()
      .where('statut', 'like', 'cloture%')
      .count('* as total')

    // Demandes RDV en attente
    const demandesEnAttente = await DemandeRdv.query()
      .where('statut', 'en_attente')
      .count('* as total')

    // 5 prochains evenements a venir
    const evenementsAVenir = await (Evenement.query() as any)
      .where('date_debut', '>=', DateTime.now().toSQL())
      .preload('dossier', (query: any) => query.preload('client'))
      .orderBy('date_debut', 'asc')
      .limit(5)

    // Derniers dossiers crees
    const derniersDossiers = await Dossier.query()
      .preload('client')
      .orderBy('created_at', 'desc')
      .limit(5)

    return response.ok({
      stats: {
        totalClients: Number(totalClients[0].$extras.total),
        dossiersEnCours: Number(dossiersEnCours[0].$extras.total),
        dossiersClotures: Number(dossiersClotures[0].$extras.total),
        demandesEnAttente: Number(demandesEnAttente[0].$extras.total),
      },
      evenementsAVenir: evenementsAVenir.map((e: any) => ({
        id: e.id,
        titre: e.titre,
        type: e.type,
        dateDebut: e.dateDebut,
        dateFin: e.dateFin,
        lieu: e.lieu,
        dossier: e.dossier
          ? {
              reference: e.dossier.reference,
              client: {
                nom: e.dossier.client.nom,
                prenom: e.dossier.client.prenom,
              },
            }
          : null,
      })),
      derniersDossiers: derniersDossiers.map((d) => ({
        id: d.id,
        reference: d.reference,
        intitule: d.intitule,
        statut: d.statut,
        createdAt: d.createdAt,
        client: {
          id: d.client.id,
          nom: d.client.nom,
          prenom: d.client.prenom,
        },
      })),
    })
  }
}

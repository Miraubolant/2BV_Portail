import type { HttpContext } from '@adonisjs/core/http'
import Dossier from '#models/dossier'
import Notification from '#models/notification'
import Evenement from '#models/evenement'
import { DateTime } from 'luxon'

export default class DashboardController {
  /**
   * GET /api/client/dashboard
   * Dashboard client
   */
  async index({ auth, response }: HttpContext) {
    const client = auth.use('client').user!

    // Mes dossiers (tous)
    const dossiers = await Dossier.query()
      .where('client_id', client.id)
      .orderBy('created_at', 'desc')

    const dossiersEnCours = dossiers.filter(d => !d.isClosed).length
    const dossiersClotures = dossiers.filter(d => d.isClosed).length

    // Evenements a venir
    const dossierIds = dossiers.map(d => d.id)
    const evenementsAVenir = dossierIds.length > 0
      ? await (Evenement.query() as any)
          .whereIn('dossier_id', dossierIds)
          .where('date_debut', '>=', DateTime.now().toSQL()!)
          .orderBy('date_debut', 'asc')
          .limit(5)
          .preload('dossier')
      : []

    // Notifications non lues
    const notificationsNonLues = await Notification.query()
      .where('destinataire_type', 'client')
      .where('destinataire_id', client.id)
      .where('lu', false)
      .orderBy('created_at', 'desc')
      .limit(5)

    const totalNotifNonLues = await Notification.query()
      .where('destinataire_type', 'client')
      .where('destinataire_id', client.id)
      .where('lu', false)
      .count('* as total')

    return response.ok({
      client: {
        id: client.id,
        nom: client.nom,
        prenom: client.prenom,
      },
      stats: {
        totalDossiers: dossiers.length,
        dossiersEnCours,
        dossiersClotures,
        notificationsNonLues: Number(totalNotifNonLues[0].$extras.total),
      },
      evenementsAVenir: evenementsAVenir.map((e: any) => ({
        id: e.id,
        titre: e.titre,
        type: e.type,
        dateDebut: e.dateDebut,
        lieu: e.lieu,
        dossier: {
          reference: e.dossier.reference,
          intitule: e.dossier.intitule,
        }
      })),
      dernieresNotifications: notificationsNonLues,
    })
  }
}

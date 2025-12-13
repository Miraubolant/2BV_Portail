import type { HttpContext } from '@adonisjs/core/http'
import ActivityLog from '#models/activity_log'
import Admin from '#models/admin'
import Client from '#models/client'
import Document from '#models/document'
import Dossier from '#models/dossier'

interface TimelineEntry {
  id: string
  action: string
  createdAt: string
  user: {
    id: string | null
    type: string
    nom: string
    prenom: string
  } | null
  metadata: Record<string, any>
  icon: string
  color: string
  title: string
  description: string
}

export default class TimelineController {
  /**
   * GET /api/admin/dossiers/:id/timeline
   * Recupere la timeline d'un dossier
   */
  async index({ params, request, response }: HttpContext) {
    const dossierId = params.id
    const limit = request.input('limit', 50)
    const offset = request.input('offset', 0)
    const actionFilter = request.input('action', '')

    // Verifier que le dossier existe
    const dossier = await Dossier.find(dossierId)
    if (!dossier) {
      return response.notFound({ message: 'Dossier non trouve' })
    }

    // Recuperer les IDs des documents de ce dossier
    const documentIds = await Document.query()
      .where('dossier_id', dossierId)
      .select('id')
    const docIds = documentIds.map((d) => d.id)

    // Construire la requete pour les activity logs
    let query = ActivityLog.query()
      .where((builder) => {
        // Activites directement sur le dossier
        builder
          .where((q) => {
            q.where('resource_type', 'dossier').where('resource_id', dossierId)
          })
          // Activites sur les documents du dossier
          .orWhere((q) => {
            q.where('resource_type', 'document')
            if (docIds.length > 0) {
              q.whereIn('resource_id', docIds)
            } else {
              q.whereRaw('1 = 0') // No documents
            }
          })
          // Activites sur les evenements lies au dossier (via metadata)
          .orWhere((q) => {
            q.where('resource_type', 'evenement').whereRaw("metadata->>'dossierId' = ?", [dossierId])
          })
          // Activites sur les notes du dossier (via metadata)
          .orWhere((q) => {
            q.where('resource_type', 'note').whereRaw("metadata->>'dossierId' = ?", [dossierId])
          })
          // Activites sur les taches du dossier (via metadata)
          .orWhere((q) => {
            q.where('resource_type', 'task').whereRaw("metadata->>'dossierId' = ?", [dossierId])
          })
      })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)

    // Filtrer par type d'action si specifie
    if (actionFilter) {
      query = query.where('action', 'like', `${actionFilter}%`)
    }

    const activities = await query

    // Enrichir avec les informations utilisateur
    const enrichedActivities: TimelineEntry[] = []

    for (const activity of activities) {
      let user: TimelineEntry['user'] = null

      if (activity.userId) {
        if (activity.userType === 'admin') {
          const admin = await Admin.find(activity.userId)
          if (admin) {
            user = {
              id: admin.id,
              type: 'admin',
              nom: admin.nom,
              prenom: admin.prenom,
            }
          }
        } else if (activity.userType === 'client') {
          const client = await Client.find(activity.userId)
          if (client) {
            user = {
              id: client.id,
              type: 'client',
              nom: client.nom,
              prenom: client.prenom,
            }
          }
        }
      }

      const { icon, color, title, description } = this.formatActivity(activity)

      enrichedActivities.push({
        id: activity.id,
        action: activity.action,
        createdAt: activity.createdAt.toISO()!,
        user,
        metadata: activity.metadata || {},
        icon,
        color,
        title,
        description,
      })
    }

    return response.ok({
      data: enrichedActivities,
      meta: {
        limit,
        offset,
        hasMore: activities.length === limit,
      },
    })
  }

  /**
   * Formate une activite pour l'affichage
   */
  private formatActivity(activity: ActivityLog): {
    icon: string
    color: string
    title: string
    description: string
  } {
    const metadata = activity.metadata || {}

    switch (activity.action) {
      case 'dossier.created':
        return {
          icon: 'folder-plus',
          color: 'green',
          title: 'Dossier cree',
          description: `Dossier "${metadata.reference}" ouvert`,
        }

      case 'dossier.statut_changed':
        return {
          icon: 'refresh-cw',
          color: 'blue',
          title: 'Statut modifie',
          description: `${metadata.oldStatut || '?'} → ${metadata.newStatut || '?'}`,
        }

      case 'dossier.updated':
        return {
          icon: 'edit',
          color: 'blue',
          title: 'Dossier modifie',
          description: metadata.changes?.length
            ? `Champs modifies: ${metadata.changes.join(', ')}`
            : 'Informations mises a jour',
        }

      case 'document.uploaded': {
        const locationLabel = metadata.dossierLocation === 'client' ? 'CLIENT' : 'CABINET'
        return {
          icon: 'upload',
          color: metadata.dossierLocation === 'client' ? 'green' : 'blue',
          title: `Document ajoute (${locationLabel})`,
          description: metadata.documentName || 'Nouveau document',
        }
      }

      case 'document.deleted': {
        const delLocationLabel = metadata.dossierLocation === 'client' ? 'CLIENT' : 'CABINET'
        return {
          icon: 'trash-2',
          color: 'red',
          title: `Document supprime (${delLocationLabel})`,
          description: metadata.documentName || 'Document',
        }
      }

      case 'evenement.created':
        return {
          icon: 'calendar-plus',
          color: 'purple',
          title: 'Evenement cree',
          description: metadata.titre || 'Nouvel evenement',
        }

      case 'evenement.updated':
        return {
          icon: 'calendar',
          color: 'blue',
          title: 'Evenement modifie',
          description: metadata.titre || 'Evenement',
        }

      case 'evenement.deleted':
        return {
          icon: 'calendar-x',
          color: 'red',
          title: 'Evenement supprime',
          description: metadata.titre || 'Evenement',
        }

      case 'note.created':
        return {
          icon: 'sticky-note',
          color: 'yellow',
          title: 'Note ajoutee',
          description: metadata.preview || 'Nouvelle note',
        }

      case 'note.updated':
        return {
          icon: 'edit-3',
          color: 'yellow',
          title: 'Note modifiee',
          description: 'Note mise a jour',
        }

      case 'task.created':
        return {
          icon: 'check-square',
          color: 'green',
          title: 'Tache creee',
          description: metadata.titre || 'Nouvelle tache',
        }

      case 'task.updated':
        return {
          icon: 'check-square',
          color: 'blue',
          title: 'Tache modifiee',
          description: metadata.titre
            ? `"${metadata.titre}" - ${metadata.changes?.join(', ') || 'mise a jour'}`
            : 'Tache mise a jour',
        }

      case 'task.completed':
        return {
          icon: 'check-circle',
          color: 'green',
          title: 'Tache terminee',
          description: metadata.titre || 'Tache',
        }

      case 'task.reopened':
        return {
          icon: 'rotate-ccw',
          color: 'blue',
          title: 'Tache rouverte',
          description: metadata.titre || 'Tache',
        }

      case 'task.deleted':
        return {
          icon: 'trash-2',
          color: 'red',
          title: 'Tache supprimee',
          description: metadata.titre || 'Tache',
        }

      default:
        return {
          icon: 'activity',
          color: 'gray',
          title: activity.action.replace('.', ' ').replace('_', ' '),
          description: '',
        }
    }
  }
}

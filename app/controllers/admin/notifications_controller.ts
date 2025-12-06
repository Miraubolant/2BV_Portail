import type { HttpContext } from '@adonisjs/core/http'
import Notification from '#models/notification'

export default class NotificationsController {
  /**
   * GET /api/admin/notifications
   * Liste les notifications non lues de l'admin connecte
   */
  async index({ auth, request, response }: HttpContext) {
    const admin = auth.use('admin').user!
    const page = request.input('page', 1)
    const limit = request.input('limit', 20)
    const unreadOnly = request.input('unreadOnly', 'false') === 'true'

    let query = Notification.query()
      .where('destinataire_type', 'admin')
      .where('destinataire_id', admin.id)
      .orderBy('created_at', 'desc')

    if (unreadOnly) {
      query = query.where('lu', false)
    }

    const notifications = await query.paginate(page, limit)
    return response.ok(notifications)
  }

  /**
   * GET /api/admin/notifications/unread-count
   * Nombre de notifications non lues
   */
  async unreadCount({ auth, response }: HttpContext) {
    const admin = auth.use('admin').user!

    const count = await Notification.query()
      .where('destinataire_type', 'admin')
      .where('destinataire_id', admin.id)
      .where('lu', false)
      .count('* as total')
      .first()

    return response.ok({ count: Number(count?.$extras.total || 0) })
  }

  /**
   * POST /api/admin/notifications/:id/read
   * Marquer une notification comme lue
   */
  async markAsRead({ auth, params, response }: HttpContext) {
    const admin = auth.use('admin').user!

    const notification = await Notification.query()
      .where('id', params.id)
      .where('destinataire_type', 'admin')
      .where('destinataire_id', admin.id)
      .first()

    if (!notification) {
      return response.notFound({ message: 'Notification non trouvee' })
    }

    notification.lu = true
    await notification.save()

    return response.ok(notification)
  }

  /**
   * POST /api/admin/notifications/read-all
   * Marquer toutes les notifications comme lues
   */
  async markAllAsRead({ auth, response }: HttpContext) {
    const admin = auth.use('admin').user!

    await Notification.query()
      .where('destinataire_type', 'admin')
      .where('destinataire_id', admin.id)
      .where('lu', false)
      .update({ lu: true })

    return response.ok({ message: 'Toutes les notifications ont ete marquees comme lues' })
  }

  /**
   * DELETE /api/admin/notifications/:id
   * Supprimer une notification
   */
  async destroy({ auth, params, response }: HttpContext) {
    const admin = auth.use('admin').user!

    const notification = await Notification.query()
      .where('id', params.id)
      .where('destinataire_type', 'admin')
      .where('destinataire_id', admin.id)
      .first()

    if (!notification) {
      return response.notFound({ message: 'Notification non trouvee' })
    }

    await notification.delete()

    return response.ok({ message: 'Notification supprimee' })
  }
}

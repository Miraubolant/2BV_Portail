import type { HttpContext } from '@adonisjs/core/http'
import AdminFavori from '#models/admin_favori'
import Dossier from '#models/dossier'
import Client from '#models/client'
import db from '@adonisjs/lucid/services/db'

export default class FavorisController {
  /**
   * GET /api/admin/favoris
   * Liste les favoris de l'admin connecte avec les details
   */
  async index({ auth, response }: HttpContext) {
    const admin = auth.use('admin').user!

    const favoris = await AdminFavori.query()
      .where('adminId', admin.id)
      .orderBy('ordre', 'asc')
      .orderBy('createdAt', 'desc')

    // Charger les details des dossiers et clients
    const dossierIds = favoris.filter((f) => f.favoriType === 'dossier').map((f) => f.favoriId)
    const clientIds = favoris.filter((f) => f.favoriType === 'client').map((f) => f.favoriId)

    const dossiers = dossierIds.length > 0
      ? await Dossier.query().whereIn('id', dossierIds).preload('client')
      : []
    const clients = clientIds.length > 0 ? await Client.query().whereIn('id', clientIds) : []

    const dossiersMap = new Map(dossiers.map((d) => [d.id, d]))
    const clientsMap = new Map(clients.map((c) => [c.id, c]))

    const result = favoris.map((f) => {
      if (f.favoriType === 'dossier') {
        const dossier = dossiersMap.get(f.favoriId)
        return {
          id: f.id,
          type: 'dossier',
          favoriId: f.favoriId,
          ordre: f.ordre,
          label: dossier?.reference || 'Dossier supprime',
          sublabel: dossier?.intitule || null,
          clientName: dossier?.client ? `${dossier.client.prenom} ${dossier.client.nom}` : null,
          exists: !!dossier,
        }
      } else {
        const client = clientsMap.get(f.favoriId)
        return {
          id: f.id,
          type: 'client',
          favoriId: f.favoriId,
          ordre: f.ordre,
          label: client ? `${client.prenom} ${client.nom}` : 'Client supprime',
          sublabel: client?.email || null,
          exists: !!client,
        }
      }
    }).filter((f) => f.exists) // Ne retourner que les favoris qui existent encore

    return response.ok(result)
  }

  /**
   * POST /api/admin/favoris
   * Ajouter un favori
   */
  async store({ auth, request, response }: HttpContext) {
    const admin = auth.use('admin').user!
    const { type, id } = request.only(['type', 'id'])

    if (!type || !id || !['dossier', 'client'].includes(type)) {
      return response.badRequest({ message: 'Type et ID requis' })
    }

    // Verifier que l'item existe
    if (type === 'dossier') {
      const dossier = await Dossier.find(id)
      if (!dossier) {
        return response.notFound({ message: 'Dossier non trouve' })
      }
    } else {
      const client = await Client.find(id)
      if (!client) {
        return response.notFound({ message: 'Client non trouve' })
      }
    }

    // Verifier si deja en favori
    const existing = await AdminFavori.query()
      .where('adminId', admin.id)
      .where('favoriType', type)
      .where('favoriId', id)
      .first()

    if (existing) {
      return response.conflict({ message: 'Deja en favori' })
    }

    // Obtenir le prochain ordre
    const maxOrdre = await db
      .from('admin_favoris')
      .where('admin_id', admin.id)
      .max('ordre as max')
      .first()

    const favori = await AdminFavori.create({
      adminId: admin.id,
      favoriType: type,
      favoriId: id,
      ordre: (maxOrdre?.max || 0) + 1,
    })

    return response.created(favori)
  }

  /**
   * DELETE /api/admin/favoris/:id
   * Supprimer un favori
   */
  async destroy({ auth, params, response }: HttpContext) {
    const admin = auth.use('admin').user!

    const favori = await AdminFavori.query()
      .where('id', params.id)
      .where('adminId', admin.id)
      .first()

    if (!favori) {
      return response.notFound({ message: 'Favori non trouve' })
    }

    await favori.delete()
    return response.ok({ message: 'Favori supprime' })
  }

  /**
   * POST /api/admin/favoris/toggle
   * Toggle un favori (ajouter si absent, supprimer si present)
   */
  async toggle({ auth, request, response }: HttpContext) {
    const admin = auth.use('admin').user!
    const { type, id } = request.only(['type', 'id'])

    if (!type || !id || !['dossier', 'client'].includes(type)) {
      return response.badRequest({ message: 'Type et ID requis' })
    }

    // Verifier si deja en favori
    const existing = await AdminFavori.query()
      .where('adminId', admin.id)
      .where('favoriType', type)
      .where('favoriId', id)
      .first()

    if (existing) {
      await existing.delete()
      return response.ok({ isFavorite: false, message: 'Retire des favoris' })
    }

    // Verifier que l'item existe
    if (type === 'dossier') {
      const dossier = await Dossier.find(id)
      if (!dossier) {
        return response.notFound({ message: 'Dossier non trouve' })
      }
    } else {
      const client = await Client.find(id)
      if (!client) {
        return response.notFound({ message: 'Client non trouve' })
      }
    }

    // Obtenir le prochain ordre
    const maxOrdre = await db
      .from('admin_favoris')
      .where('admin_id', admin.id)
      .max('ordre as max')
      .first()

    await AdminFavori.create({
      adminId: admin.id,
      favoriType: type,
      favoriId: id,
      ordre: (maxOrdre?.max || 0) + 1,
    })

    return response.ok({ isFavorite: true, message: 'Ajoute aux favoris' })
  }

  /**
   * GET /api/admin/favoris/check
   * Verifier si un item est en favori
   */
  async check({ auth, request, response }: HttpContext) {
    const admin = auth.use('admin').user!
    const type = request.input('type')
    const id = request.input('id')

    if (!type || !id) {
      return response.badRequest({ message: 'Type et ID requis' })
    }

    const existing = await AdminFavori.query()
      .where('adminId', admin.id)
      .where('favoriType', type)
      .where('favoriId', id)
      .first()

    return response.ok({ isFavorite: !!existing })
  }
}

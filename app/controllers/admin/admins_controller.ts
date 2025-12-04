import type { HttpContext } from '@adonisjs/core/http'
import Admin from '#models/admin'
import hash from '@adonisjs/core/services/hash'
import vine from '@vinejs/vine'
import { randomBytes } from 'crypto'

const createAdminValidator = vine.compile(
  vine.object({
    email: vine.string().email(),
    nom: vine.string().minLength(2).maxLength(100),
    prenom: vine.string().minLength(2).maxLength(100),
    username: vine.string().minLength(2).maxLength(50),
    role: vine.enum(['admin']), // Seul role possible via API, super_admin uniquement via seed
  })
)

const updateAdminValidator = vine.compile(
  vine.object({
    email: vine.string().email().optional(),
    nom: vine.string().minLength(2).maxLength(100).optional(),
    prenom: vine.string().minLength(2).maxLength(100).optional(),
    username: vine.string().minLength(2).maxLength(50).optional(),
    actif: vine.boolean().optional(),
  })
)

export default class AdminsController {
  /**
   * GET /api/admin/admins
   * Liste des admins (super_admin only)
   */
  async index({ response }: HttpContext) {
    const admins = await Admin.query()
      .where('role', 'admin')
      .orderBy('created_at', 'desc')

    return response.ok(admins.map(a => ({
      id: a.id,
      email: a.email,
      nom: a.nom,
      prenom: a.prenom,
      username: a.username,
      role: a.role,
      actif: a.actif,
      totpEnabled: a.totpEnabled,
      lastLogin: a.lastLogin,
      createdAt: a.createdAt,
    })))
  }

  /**
   * GET /api/admin/admins/:id
   */
  async show({ params, response }: HttpContext) {
    const admin = await Admin.findOrFail(params.id)
    
    return response.ok({
      id: admin.id,
      email: admin.email,
      nom: admin.nom,
      prenom: admin.prenom,
      username: admin.username,
      role: admin.role,
      actif: admin.actif,
      totpEnabled: admin.totpEnabled,
      lastLogin: admin.lastLogin,
      createdAt: admin.createdAt,
    })
  }

  /**
   * POST /api/admin/admins
   * Creer un admin (super_admin only)
   */
  async store({ request, auth, response }: HttpContext) {
    const data = await request.validateUsing(createAdminValidator)
    const superAdmin = auth.use('admin').user!

    // Generer un mot de passe
    const password = randomBytes(8).toString('hex')
    const hashedPassword = await hash.make(password)

    const admin = await Admin.create({
      ...data,
      password: hashedPassword,
      createdById: superAdmin.id,
    })

    // TODO: Envoyer email avec credentials

    return response.created({
      admin: {
        id: admin.id,
        email: admin.email,
        nom: admin.nom,
        prenom: admin.prenom,
        username: admin.username,
        role: admin.role,
      },
      generatedPassword: password,
    })
  }

  /**
   * PUT /api/admin/admins/:id
   */
  async update({ params, request, response }: HttpContext) {
    const admin = await Admin.findOrFail(params.id)
    
    // Empecher la modification d'un super_admin
    if (admin.role === 'super_admin') {
      return response.forbidden({ message: 'Impossible de modifier un super admin' })
    }

    const data = await request.validateUsing(updateAdminValidator)
    admin.merge(data)
    await admin.save()

    return response.ok({
      id: admin.id,
      email: admin.email,
      nom: admin.nom,
      prenom: admin.prenom,
      username: admin.username,
      role: admin.role,
      actif: admin.actif,
    })
  }

  /**
   * DELETE /api/admin/admins/:id
   */
  async destroy({ params, response }: HttpContext) {
    const admin = await Admin.findOrFail(params.id)
    
    // Empecher la suppression d'un super_admin
    if (admin.role === 'super_admin') {
      return response.forbidden({ message: 'Impossible de supprimer un super admin' })
    }

    await admin.delete()
    return response.ok({ message: 'Admin supprime' })
  }

  /**
   * POST /api/admin/admins/:id/toggle-status
   * Activer/desactiver un admin
   */
  async toggleStatus({ params, response }: HttpContext) {
    const admin = await Admin.findOrFail(params.id)
    
    if (admin.role === 'super_admin') {
      return response.forbidden({ message: 'Impossible de desactiver un super admin' })
    }

    admin.actif = !admin.actif
    await admin.save()

    return response.ok({ actif: admin.actif })
  }
}

import type { HttpContext } from '@adonisjs/core/http'
import Task from '#models/task'
import Dossier from '#models/dossier'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

const createTaskValidator = vine.compile(
  vine.object({
    titre: vine.string().minLength(1).maxLength(255),
    description: vine.string().optional().nullable(),
    priorite: vine.enum(['basse', 'normale', 'haute', 'urgente']).optional(),
    assignedToId: vine.string().uuid().optional().nullable(),
    dateEcheance: vine.string().optional().nullable(),
    rappelDate: vine.string().optional().nullable(),
  })
)

const updateTaskValidator = vine.compile(
  vine.object({
    titre: vine.string().minLength(1).maxLength(255).optional(),
    description: vine.string().optional().nullable(),
    priorite: vine.enum(['basse', 'normale', 'haute', 'urgente']).optional(),
    statut: vine.enum(['a_faire', 'en_cours', 'terminee', 'annulee']).optional(),
    assignedToId: vine.string().uuid().optional().nullable(),
    dateEcheance: vine.string().optional().nullable(),
    rappelDate: vine.string().optional().nullable(),
  })
)

export default class TasksController {
  /**
   * GET /api/admin/dossiers/:dossierId/tasks
   * Liste des taches d'un dossier
   */
  async index({ params, response }: HttpContext) {
    const dossierId = params.dossierId

    // Verifier que le dossier existe
    const dossier = await Dossier.find(dossierId)
    if (!dossier) {
      return response.notFound({ message: 'Dossier non trouve' })
    }

    const tasks = await Task.query()
      .where('dossier_id', dossierId)
      .preload('createdBy', (query) => {
        query.select('id', 'nom', 'prenom')
      })
      .preload('assignedTo', (query) => {
        query.select('id', 'nom', 'prenom')
      })
      .orderByRaw(`
        CASE
          WHEN statut = 'a_faire' THEN 1
          WHEN statut = 'en_cours' THEN 2
          WHEN statut = 'terminee' THEN 3
          WHEN statut = 'annulee' THEN 4
        END
      `)
      .orderByRaw(`
        CASE
          WHEN priorite = 'urgente' THEN 1
          WHEN priorite = 'haute' THEN 2
          WHEN priorite = 'normale' THEN 3
          WHEN priorite = 'basse' THEN 4
        END
      `)
      .orderBy('date_echeance', 'asc')

    return response.ok(tasks)
  }

  /**
   * POST /api/admin/dossiers/:dossierId/tasks
   * Creer une tache
   */
  async store({ params, request, auth, response }: HttpContext) {
    const dossierId = params.dossierId
    const admin = auth.use('admin').user!

    // Verifier que le dossier existe
    const dossier = await Dossier.find(dossierId)
    if (!dossier) {
      return response.notFound({ message: 'Dossier non trouve' })
    }

    const data = await request.validateUsing(createTaskValidator)

    // Extraire les dates pour conversion
    const { dateEcheance, rappelDate, ...restData } = data

    const task = await Task.create({
      dossierId,
      createdById: admin.id,
      ...restData,
      dateEcheance: dateEcheance ? DateTime.fromISO(dateEcheance) : null,
      rappelDate: rappelDate ? DateTime.fromISO(rappelDate) : null,
    })

    await task.load('createdBy', (query) => {
      query.select('id', 'nom', 'prenom')
    })
    await task.load('assignedTo', (query) => {
      query.select('id', 'nom', 'prenom')
    })

    return response.created(task)
  }

  /**
   * PUT /api/admin/tasks/:id
   * Modifier une tache
   */
  async update({ params, request, response }: HttpContext) {
    const task = await Task.find(params.id)
    if (!task) {
      return response.notFound({ message: 'Tache non trouvee' })
    }

    const data = await request.validateUsing(updateTaskValidator)

    // Extraire les dates pour conversion
    const { dateEcheance, rappelDate, statut, ...restData } = data

    // Gerer la date de completion
    if (statut) {
      if (statut === 'terminee' && task.statut !== 'terminee') {
        task.completedAt = DateTime.now()
      } else if (statut !== 'terminee' && task.statut === 'terminee') {
        task.completedAt = null
      }
      task.statut = statut
    }

    // Convertir les dates
    if (dateEcheance !== undefined) {
      task.dateEcheance = dateEcheance ? DateTime.fromISO(dateEcheance) : null
    }
    if (rappelDate !== undefined) {
      task.rappelDate = rappelDate ? DateTime.fromISO(rappelDate) : null
      // Reset rappel_envoye si nouvelle date de rappel
      if (rappelDate) {
        task.rappelEnvoye = false
      }
    }

    task.merge(restData)
    await task.save()

    await task.load('createdBy', (query) => {
      query.select('id', 'nom', 'prenom')
    })
    await task.load('assignedTo', (query) => {
      query.select('id', 'nom', 'prenom')
    })

    return response.ok(task)
  }

  /**
   * DELETE /api/admin/tasks/:id
   * Supprimer une tache
   */
  async destroy({ params, response }: HttpContext) {
    const task = await Task.find(params.id)
    if (!task) {
      return response.notFound({ message: 'Tache non trouvee' })
    }

    await task.delete()

    return response.ok({ message: 'Tache supprimee' })
  }

  /**
   * POST /api/admin/tasks/:id/complete
   * Marquer une tache comme terminee
   */
  async complete({ params, response }: HttpContext) {
    const task = await Task.find(params.id)
    if (!task) {
      return response.notFound({ message: 'Tache non trouvee' })
    }

    task.statut = 'terminee'
    task.completedAt = DateTime.now()
    await task.save()

    await task.load('createdBy', (query) => {
      query.select('id', 'nom', 'prenom')
    })
    await task.load('assignedTo', (query) => {
      query.select('id', 'nom', 'prenom')
    })

    return response.ok(task)
  }

  /**
   * POST /api/admin/tasks/:id/reopen
   * Rouvrir une tache terminee
   */
  async reopen({ params, response }: HttpContext) {
    const task = await Task.find(params.id)
    if (!task) {
      return response.notFound({ message: 'Tache non trouvee' })
    }

    task.statut = 'a_faire'
    task.completedAt = null
    await task.save()

    await task.load('createdBy', (query) => {
      query.select('id', 'nom', 'prenom')
    })
    await task.load('assignedTo', (query) => {
      query.select('id', 'nom', 'prenom')
    })

    return response.ok(task)
  }

  /**
   * GET /api/admin/tasks/my
   * Mes taches (assignees a l'admin connecte)
   */
  async myTasks({ auth, request, response }: HttpContext) {
    const admin = auth.use('admin').user!
    const statut = request.input('statut', '')
    const limit = request.input('limit', 20)

    let query = Task.query()
      .where('assigned_to_id', admin.id)
      .preload('dossier', (q) => q.select('id', 'reference', 'intitule'))
      .preload('createdBy', (q) => q.select('id', 'nom', 'prenom'))
      .orderByRaw(`
        CASE
          WHEN priorite = 'urgente' THEN 1
          WHEN priorite = 'haute' THEN 2
          WHEN priorite = 'normale' THEN 3
          WHEN priorite = 'basse' THEN 4
        END
      `)
      .orderBy('date_echeance', 'asc')

    if (statut) {
      query = query.where('statut', statut)
    } else {
      // Par defaut, exclure les taches annulees
      query = query.whereNot('statut', 'annulee')
    }

    const tasks = await query.limit(limit)

    return response.ok(tasks)
  }
}

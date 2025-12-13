import type { HttpContext } from '@adonisjs/core/http'
import Task from '#models/task'
import Dossier from '#models/dossier'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'
import ActivityLogger from '#services/activity_logger'

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
      .orderByRaw(
        `
        CASE
          WHEN statut = 'a_faire' THEN 1
          WHEN statut = 'en_cours' THEN 2
          WHEN statut = 'terminee' THEN 3
          WHEN statut = 'annulee' THEN 4
        END
      `
      )
      .orderByRaw(
        `
        CASE
          WHEN priorite = 'urgente' THEN 1
          WHEN priorite = 'haute' THEN 2
          WHEN priorite = 'normale' THEN 3
          WHEN priorite = 'basse' THEN 4
        END
      `
      )
      .orderBy('date_echeance', 'asc')

    return response.ok(tasks)
  }

  /**
   * POST /api/admin/dossiers/:dossierId/tasks
   * Creer une tache
   */
  async store(ctx: HttpContext) {
    const { params, request, auth, response } = ctx
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

    // Logger la creation de la tache
    await ActivityLogger.logTaskCreated(
      task.id,
      dossierId,
      admin.id,
      {
        titre: task.titre,
        priorite: task.priorite,
        assignedTo: task.assignedToId || undefined,
      },
      ctx
    )

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
  async update(ctx: HttpContext) {
    const { params, request, auth, response } = ctx
    const admin = auth.use('admin').user!

    const task = await Task.find(params.id)
    if (!task) {
      return response.notFound({ message: 'Tache non trouvee' })
    }

    const data = await request.validateUsing(updateTaskValidator)

    // Tracker les changements
    const changes: string[] = []
    const oldStatut = task.statut

    // Extraire les dates pour conversion
    const { dateEcheance, rappelDate, statut, ...restData } = data

    // Gerer la date de completion
    if (statut) {
      if (statut === 'terminee' && task.statut !== 'terminee') {
        task.completedAt = DateTime.now()
        changes.push('statut')
      } else if (statut !== 'terminee' && task.statut === 'terminee') {
        task.completedAt = null
        changes.push('statut')
      } else if (statut !== task.statut) {
        changes.push('statut')
      }
      task.statut = statut
    }

    // Convertir les dates
    if (dateEcheance !== undefined) {
      task.dateEcheance = dateEcheance ? DateTime.fromISO(dateEcheance) : null
      changes.push('dateEcheance')
    }
    if (rappelDate !== undefined) {
      task.rappelDate = rappelDate ? DateTime.fromISO(rappelDate) : null
      // Reset rappel_envoye si nouvelle date de rappel
      if (rappelDate) {
        task.rappelEnvoye = false
      }
      changes.push('rappelDate')
    }

    // Tracker autres changements
    if (restData.titre && restData.titre !== task.titre) changes.push('titre')
    if (restData.description !== undefined && restData.description !== task.description)
      changes.push('description')
    if (restData.priorite && restData.priorite !== task.priorite) changes.push('priorite')
    if (restData.assignedToId !== undefined && restData.assignedToId !== task.assignedToId)
      changes.push('assignedTo')

    task.merge(restData)
    await task.save()

    // Logger la modification
    if (statut === 'terminee' && oldStatut !== 'terminee') {
      await ActivityLogger.logTaskCompleted(
        task.id,
        task.dossierId,
        admin.id,
        { titre: task.titre },
        ctx
      )
    } else if (oldStatut === 'terminee' && statut && statut !== 'terminee') {
      await ActivityLogger.logTaskReopened(
        task.id,
        task.dossierId,
        admin.id,
        { titre: task.titre },
        ctx
      )
    } else if (changes.length > 0) {
      await ActivityLogger.logTaskUpdated(
        task.id,
        task.dossierId,
        admin.id,
        { titre: task.titre, changes },
        ctx
      )
    }

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
  async destroy(ctx: HttpContext) {
    const { params, auth, response } = ctx
    const admin = auth.use('admin').user!

    const task = await Task.find(params.id)
    if (!task) {
      return response.notFound({ message: 'Tache non trouvee' })
    }

    const dossierId = task.dossierId
    const titre = task.titre

    await task.delete()

    // Logger la suppression
    await ActivityLogger.logTaskDeleted(params.id, dossierId, admin.id, { titre }, ctx)

    return response.ok({ message: 'Tache supprimee' })
  }

  /**
   * POST /api/admin/tasks/:id/complete
   * Marquer une tache comme terminee
   */
  async complete(ctx: HttpContext) {
    const { params, auth, response } = ctx
    const admin = auth.use('admin').user!

    const task = await Task.find(params.id)
    if (!task) {
      return response.notFound({ message: 'Tache non trouvee' })
    }

    task.statut = 'terminee'
    task.completedAt = DateTime.now()
    await task.save()

    // Logger la completion
    await ActivityLogger.logTaskCompleted(
      task.id,
      task.dossierId,
      admin.id,
      { titre: task.titre },
      ctx
    )

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
  async reopen(ctx: HttpContext) {
    const { params, auth, response } = ctx
    const admin = auth.use('admin').user!

    const task = await Task.find(params.id)
    if (!task) {
      return response.notFound({ message: 'Tache non trouvee' })
    }

    task.statut = 'a_faire'
    task.completedAt = null
    await task.save()

    // Logger la reouverture
    await ActivityLogger.logTaskReopened(
      task.id,
      task.dossierId,
      admin.id,
      { titre: task.titre },
      ctx
    )

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
      .preload('dossier' as any, (q: any) => q.select('id', 'reference', 'intitule'))
      .preload('createdBy', (q) => q.select('id', 'nom', 'prenom'))
      .orderByRaw(
        `
        CASE
          WHEN priorite = 'urgente' THEN 1
          WHEN priorite = 'haute' THEN 2
          WHEN priorite = 'normale' THEN 3
          WHEN priorite = 'basse' THEN 4
        END
      `
      )
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

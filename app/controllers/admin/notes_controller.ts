import type { HttpContext } from '@adonisjs/core/http'
import Note from '#models/note'
import Dossier from '#models/dossier'
import vine from '@vinejs/vine'
import ActivityLogger from '#services/activity_logger'

const createNoteValidator = vine.compile(
  vine.object({
    contenu: vine.string().minLength(1).maxLength(10000),
    isPinned: vine.boolean().optional(),
  })
)

const updateNoteValidator = vine.compile(
  vine.object({
    contenu: vine.string().minLength(1).maxLength(10000).optional(),
    isPinned: vine.boolean().optional(),
  })
)

export default class NotesController {
  /**
   * GET /api/admin/dossiers/:dossierId/notes
   * Liste des notes d'un dossier
   */
  async index({ params, response }: HttpContext) {
    const dossierId = params.dossierId

    // Verifier que le dossier existe
    const dossier = await Dossier.find(dossierId)
    if (!dossier) {
      return response.notFound({ message: 'Dossier non trouve' })
    }

    const notes = await Note.query()
      .where('dossier_id', dossierId)
      .preload('createdBy', (query) => {
        query.select('id', 'nom', 'prenom')
      })
      .orderBy('is_pinned', 'desc')
      .orderBy('created_at', 'desc')

    return response.ok(notes)
  }

  /**
   * POST /api/admin/dossiers/:dossierId/notes
   * Creer une note
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

    const data = await request.validateUsing(createNoteValidator)

    const note = await Note.create({
      dossierId,
      createdById: admin.id,
      contenu: data.contenu,
      isPinned: data.isPinned || false,
    })

    // Logger la creation de la note
    await ActivityLogger.logNoteCreated(
      note.id,
      dossierId,
      admin.id,
      { preview: note.contenu.substring(0, 100) },
      ctx
    )

    await note.load('createdBy', (query) => {
      query.select('id', 'nom', 'prenom')
    })

    return response.created(note)
  }

  /**
   * PUT /api/admin/notes/:id
   * Modifier une note
   */
  async update(ctx: HttpContext) {
    const { params, request, auth, response } = ctx
    const admin = auth.use('admin').user!

    const note = await Note.find(params.id)
    if (!note) {
      return response.notFound({ message: 'Note non trouvee' })
    }

    const data = await request.validateUsing(updateNoteValidator)

    note.merge(data)
    await note.save()

    // Logger la modification
    await ActivityLogger.logNoteUpdated(
      note.id,
      note.dossierId,
      admin.id,
      ctx
    )

    await note.load('createdBy', (query) => {
      query.select('id', 'nom', 'prenom')
    })

    return response.ok(note)
  }

  /**
   * DELETE /api/admin/notes/:id
   * Supprimer une note
   */
  async destroy({ params, response }: HttpContext) {
    const note = await Note.find(params.id)
    if (!note) {
      return response.notFound({ message: 'Note non trouvee' })
    }

    await note.delete()

    return response.ok({ message: 'Note supprimee' })
  }

  /**
   * POST /api/admin/notes/:id/pin
   * Epingler/desepingler une note
   */
  async togglePin(ctx: HttpContext) {
    const { params, auth, response } = ctx
    const admin = auth.use('admin').user!

    const note = await Note.find(params.id)
    if (!note) {
      return response.notFound({ message: 'Note non trouvee' })
    }

    note.isPinned = !note.isPinned
    await note.save()

    // Logger la modification
    await ActivityLogger.logNoteUpdated(
      note.id,
      note.dossierId,
      admin.id,
      ctx
    )

    await note.load('createdBy', (query) => {
      query.select('id', 'nom', 'prenom')
    })

    return response.ok(note)
  }
}

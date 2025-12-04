import type { HttpContext } from '@adonisjs/core/http'
import Document from '#models/document'
import Dossier from '#models/dossier'
import EmailService from '#services/email_service'
import vine from '@vinejs/vine'
import { DateTime } from 'luxon'

const createDocumentValidator = vine.compile(
  vine.object({
    dossierId: vine.string().uuid(),
    nom: vine.string().minLength(2).maxLength(255),
    nomOriginal: vine.string().maxLength(255).optional(),
    typeDocument: vine.string().maxLength(50).optional(),
    tailleOctets: vine.number().optional(),
    mimeType: vine.string().maxLength(100).optional(),
    extension: vine.string().maxLength(10).optional(),
    sensible: vine.boolean().optional(),
    visibleClient: vine.boolean().optional(),
    dateDocument: vine.string().optional(),
  })
)

const updateDocumentValidator = vine.compile(
  vine.object({
    nom: vine.string().minLength(2).maxLength(255).optional(),
    typeDocument: vine.string().maxLength(50).optional(),
    sensible: vine.boolean().optional(),
    visibleClient: vine.boolean().optional(),
  })
)

export default class DocumentsController {
  /**
   * GET /api/admin/dossiers/:dossierId/documents
   * Liste des documents d'un dossier
   */
  async index({ params, response }: HttpContext) {
    const documents = await Document.query()
      .where('dossier_id', params.dossierId)
      .orderBy('created_at', 'desc')

    return response.ok(documents)
  }

  /**
   * POST /api/admin/dossiers/:dossierId/documents
   * Ajouter un document a un dossier
   */
  async store({ params, request, auth, response }: HttpContext) {
    const data = await request.validateUsing(createDocumentValidator)
    const admin = auth.use('admin').user!

    // Verifier que le dossier existe et charger les relations
    const dossier = await Dossier.query()
      .where('id', params.dossierId)
      .preload('client', (query) => query.preload('responsable'))
      .firstOrFail()

    // Extraire et convertir la date si fournie
    const { dateDocument, ...restData } = data

    const document = await Document.create({
      ...restData,
      dossierId: params.dossierId,
      uploadedById: admin.id,
      uploadedByType: 'admin',
      uploadedByClient: false,
      dateDocument: dateDocument ? DateTime.fromISO(dateDocument) : null,
    })

    // Envoyer notification au client si les notifications sont activees
    const client = dossier.client
    if (client && client.notifEmailDocument && document.visibleClient !== false) {
      try {
        await EmailService.notifyClientNewDocument(
          client.email,
          client.id,
          client.fullName,
          {
            documentName: document.nom,
            dossierName: dossier.intitule,
            dossierReference: dossier.reference,
            uploaderName: admin.username || admin.fullName,
            recipientName: client.fullName,
            portalUrl: '/espace-client/dossiers/' + dossier.id,
          }
        )
      } catch (error) {
        console.error('Error sending notification email to client:', error)
      }
    }

    return response.created(document)
  }

  /**
   * PUT /api/admin/documents/:id
   * Modifier un document
   */
  async update({ params, request, response }: HttpContext) {
    const document = await Document.findOrFail(params.id)
    const data = await request.validateUsing(updateDocumentValidator)

    document.merge(data)
    await document.save()

    return response.ok(document)
  }

  /**
   * DELETE /api/admin/documents/:id
   * Supprimer un document
   */
  async destroy({ params, response }: HttpContext) {
    const document = await Document.findOrFail(params.id)
    await document.delete()

    return response.ok({ message: 'Document supprime' })
  }
}

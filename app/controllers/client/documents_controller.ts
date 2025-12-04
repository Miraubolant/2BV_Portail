import type { HttpContext } from '@adonisjs/core/http'
import Document from '#models/document'
import Dossier from '#models/dossier'
import EmailService from '#services/email_service'
import vine from '@vinejs/vine'

const createDocumentValidator = vine.compile(
  vine.object({
    dossierId: vine.string().uuid(),
    nom: vine.string().minLength(2).maxLength(255),
    nomOriginal: vine.string().maxLength(255).optional(),
    typeDocument: vine.string().maxLength(50).optional(),
    tailleOctets: vine.number().optional(),
    mimeType: vine.string().maxLength(100).optional(),
    extension: vine.string().maxLength(10).optional(),
  })
)

export default class ClientDocumentsController {
  /**
   * POST /api/client/dossiers/:dossierId/documents
   * Client ajoute un document a son dossier
   */
  async store({ params, request, auth, response }: HttpContext) {
    const data = await request.validateUsing(createDocumentValidator)
    const client = auth.use('client').user!

    // Verifier que le dossier appartient au client et charger les relations
    const dossier = await Dossier.query()
      .where('id', params.dossierId)
      .where('client_id', client.id)
      .preload('client', (query) => query.preload('responsable'))
      .firstOrFail()

    // Verifier que le client peut uploader
    if (!client.peutUploader) {
      return response.forbidden({ message: 'Vous n\'etes pas autorise a uploader des documents' })
    }

    const document = await Document.create({
      ...data,
      dossierId: params.dossierId,
      uploadedById: client.id,
      uploadedByType: 'client',
      uploadedByClient: true,
      visibleClient: true,
      sensible: false,
    })

    // Notifier l'admin responsable si les notifications sont activees
    const responsable = dossier.client.responsable
    if (responsable && responsable.notifEmailDocument) {
      try {
        await EmailService.notifyAdminClientUpload(
          responsable.notificationEmail,
          responsable.id,
          responsable.fullName,
          {
            documentName: document.nom,
            dossierName: dossier.intitule,
            dossierReference: dossier.reference,
            uploaderName: client.fullName,
            recipientName: responsable.fullName,
            portalUrl: '/admin/dossiers/' + dossier.id,
          }
        )
      } catch (error) {
        console.error('Error sending notification email to admin:', error)
      }
    }

    return response.created(document)
  }

  /**
   * GET /api/client/dossiers/:dossierId/documents
   * Liste des documents visibles pour le client
   */
  async index({ params, auth, response }: HttpContext) {
    const client = auth.use('client').user!

    // Verifier que le dossier appartient au client
    const dossier = await Dossier.query()
      .where('id', params.dossierId)
      .where('client_id', client.id)
      .firstOrFail()

    let query = Document.query()
      .where('dossier_id', dossier.id)
      .where('visible_client', true)
      .orderBy('created_at', 'desc')

    // Si le client n'a pas acces aux documents sensibles, les exclure
    if (!client.accesDocumentsSensibles) {
      query = query.where('sensible', false)
    }

    const documents = await query

    return response.ok(documents)
  }
}

import type { HttpContext } from '@adonisjs/core/http'
import Document from '#models/document'
import Dossier from '#models/dossier'
import Notification from '#models/notification'
import EmailService from '#services/email_service'
import documentSyncService from '#services/microsoft/document_sync_service'
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
   * Client ajoute un document a son dossier (metadata only - legacy)
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

    // Notifier l'admin responsable
    const responsable = dossier.client.responsable
    if (responsable) {
      // Creer une notification dans la base
      await Notification.create({
        destinataireType: 'admin',
        destinataireId: responsable.id,
        type: 'document_upload',
        titre: `Nouveau document de ${client.fullName}`,
        message: `Le client ${client.fullName} a ajoute le document "${document.nom}" au dossier ${dossier.reference}`,
        lien: `/admin/dossiers/${dossier.id}`,
      })

      // Envoyer email si active
      if (responsable.notifEmailDocument) {
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
    }

    return response.created(document)
  }

  /**
   * POST /api/client/dossiers/:dossierId/documents/upload
   * Client upload un fichier (avec OneDrive)
   */
  async upload({ params, request, auth, response }: HttpContext) {
    const client = auth.use('client').user!

    // Verifier que le client peut uploader
    if (!client.peutUploader) {
      return response.forbidden({ message: 'Vous n\'etes pas autorise a uploader des documents' })
    }

    // Get the uploaded file
    const file = request.file('file', {
      size: '20mb', // Limite plus basse pour les clients
      extnames: ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'txt'],
    })

    if (!file) {
      return response.badRequest({ message: 'Aucun fichier fourni' })
    }

    if (!file.isValid) {
      return response.badRequest({ message: file.errors[0]?.message || 'Fichier invalide' })
    }

    // Verifier que le dossier appartient au client
    const dossier = await Dossier.query()
      .where('id', params.dossierId)
      .where('client_id', client.id)
      .preload('client', (query) => query.preload('responsable'))
      .firstOrFail()

    // Get metadata from request body
    const nom = request.input('nom', file.clientName.replace(/\.[^/.]+$/, ''))
    const typeDocument = request.input('typeDocument', 'piece_client')

    // Upload to OneDrive
    const result = await documentSyncService.uploadDocument(
      params.dossierId,
      file,
      {
        nom,
        typeDocument,
        sensible: false, // Documents clients ne sont jamais sensibles
        visibleClient: true, // Toujours visible pour le client
      },
      {
        id: client.id,
        type: 'client',
      }
    )

    if (!result.success) {
      return response.internalServerError({
        message: 'Erreur lors de l\'upload du document',
        error: result.error,
      })
    }

    // Notifier l'admin responsable
    const responsable = dossier.client.responsable
    if (responsable) {
      // Creer une notification dans la base
      await Notification.create({
        destinataireType: 'admin',
        destinataireId: responsable.id,
        type: 'document_upload',
        titre: `Nouveau document de ${client.fullName}`,
        message: `Le client ${client.fullName} a ajoute le document "${nom}" au dossier ${dossier.reference}`,
        lien: `/admin/dossiers/${dossier.id}`,
      })

      // Envoyer email si active
      if (responsable.notifEmailDocument) {
        try {
          await EmailService.notifyAdminClientUpload(
            responsable.notificationEmail,
            responsable.id,
            responsable.fullName,
            {
              documentName: nom,
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
    }

    return response.created(result.document)
  }

  /**
   * GET /api/client/documents/:id/download
   * Client telecharge un document depuis OneDrive
   */
  async download({ params, auth, response }: HttpContext) {
    const client = auth.use('client').user!

    // Verifier que le document appartient a un dossier du client
    const document = await Document.query()
      .where('id', params.id)
      .preload('dossier' as never)
      .firstOrFail()

    if (document.dossier.clientId !== client.id) {
      return response.forbidden({ message: 'Acces non autorise' })
    }

    // Verifier les permissions
    if (!document.visibleClient) {
      return response.forbidden({ message: 'Document non accessible' })
    }

    if (document.sensible && !client.accesDocumentsSensibles) {
      return response.forbidden({ message: 'Acces aux documents sensibles non autorise' })
    }

    // Download from OneDrive
    const result = await documentSyncService.downloadDocument(params.id)

    if (!result.success) {
      return response.notFound({ message: result.error })
    }

    response.header('Content-Type', result.mimeType!)
    response.header('Content-Disposition', `attachment; filename="${result.filename}"`)
    response.header('Content-Length', result.content!.length.toString())

    return response.send(result.content)
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

  /**
   * GET /api/client/documents/:id/thumbnail
   * Obtenir l'URL de la vignette du document
   */
  async thumbnail({ params, request, auth, response }: HttpContext) {
    const client = auth.use('client').user!

    // Verifier que le document appartient a un dossier du client
    const document = await Document.query()
      .where('id', params.id)
      .preload('dossier' as never)
      .firstOrFail()

    if (document.dossier.clientId !== client.id) {
      return response.forbidden({ message: 'Acces non autorise' })
    }

    // Verifier les permissions
    if (!document.visibleClient) {
      return response.forbidden({ message: 'Document non accessible' })
    }

    if (document.sensible && !client.accesDocumentsSensibles) {
      return response.forbidden({ message: 'Acces aux documents sensibles non autorise' })
    }

    const size = request.input('size', 'medium') as 'small' | 'medium' | 'large'
    const result = await documentSyncService.getThumbnailUrl(params.id, size)

    if (!result.success) {
      return response.notFound({ message: result.error })
    }

    return response.ok({ url: result.url })
  }
}

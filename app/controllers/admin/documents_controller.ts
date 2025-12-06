import type { HttpContext } from '@adonisjs/core/http'
import Document from '#models/document'
import Dossier from '#models/dossier'
import EmailService from '#services/email_service'
import documentSyncService from '#services/microsoft/document_sync_service'
import ActivityLogger from '#services/activity_logger'
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
   * Ajouter un document a un dossier (metadata only - legacy)
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
   * POST /api/admin/dossiers/:dossierId/documents/upload
   * Upload un fichier et l'ajouter au dossier (avec OneDrive)
   */
  async upload(ctx: HttpContext) {
    const { params, request, auth, response } = ctx
    const admin = auth.use('admin').user!

    // Get the uploaded file
    const file = request.file('file', {
      size: '50mb',
      extnames: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'txt', 'csv', 'zip', 'rar'],
    })

    if (!file) {
      return response.badRequest({ message: 'Aucun fichier fourni' })
    }

    if (!file.isValid) {
      return response.badRequest({ message: file.errors[0]?.message || 'Fichier invalide' })
    }

    // Get metadata from request body
    const nom = request.input('nom', file.clientName.replace(/\.[^/.]+$/, ''))
    const typeDocument = request.input('typeDocument', 'autre')
    const sensible = request.input('sensible') === 'true'
    const visibleClient = request.input('visibleClient') !== 'false'
    const dateDocumentStr = request.input('dateDocument')
    const description = request.input('description')

    // Verify dossier exists and load relations
    const dossier = await Dossier.query()
      .where('id', params.dossierId)
      .preload('client', (query) => query.preload('responsable'))
      .firstOrFail()

    // Upload to OneDrive
    const result = await documentSyncService.uploadDocument(
      params.dossierId,
      file,
      {
        nom,
        typeDocument,
        sensible,
        visibleClient,
        dateDocument: dateDocumentStr ? DateTime.fromISO(dateDocumentStr) : null,
        description,
      },
      {
        id: admin.id,
        type: 'admin',
      }
    )

    if (!result.success) {
      return response.internalServerError({
        message: 'Erreur lors de l\'upload du document',
        error: result.error,
      })
    }

    // Log activity for timeline
    if (result.document) {
      await ActivityLogger.logDocumentUploaded(
        result.document.id,
        params.dossierId,
        admin.id,
        'admin',
        {
          documentName: nom,
          documentType: typeDocument,
          mimeType: file.headers['content-type'] || null,
        },
        ctx
      )
    }

    // Send notification to client
    const client = dossier.client
    if (client && client.notifEmailDocument && visibleClient) {
      try {
        await EmailService.notifyClientNewDocument(
          client.email,
          client.id,
          client.fullName,
          {
            documentName: nom,
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

    return response.created(result.document)
  }

  /**
   * GET /api/admin/documents/:id/download
   * Telecharger un document depuis OneDrive
   */
  async download({ params, response }: HttpContext) {
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
   * GET /api/admin/documents/:id/url
   * Obtenir l'URL de telechargement direct OneDrive
   */
  async getDownloadUrl({ params, response }: HttpContext) {
    const result = await documentSyncService.getDownloadUrl(params.id)

    if (!result.success) {
      return response.notFound({ message: result.error })
    }

    return response.ok({ url: result.url })
  }

  /**
   * PUT /api/admin/documents/:id
   * Modifier un document (et renommer sur OneDrive si necessaire)
   */
  async update({ params, request, response }: HttpContext) {
    const document = await Document.findOrFail(params.id)
    const data = await request.validateUsing(updateDocumentValidator)

    // If name is changing and document is on OneDrive, rename it there too
    if (data.nom && data.nom !== document.nom && document.onedriveFileId) {
      const newFileName = data.nom + (document.extension ? `.${document.extension}` : '')
      const renamed = await documentSyncService.renameOnOneDrive(document.onedriveFileId, newFileName)
      if (!renamed) {
        console.warn('Failed to rename document on OneDrive, but continuing with local update')
      }
    }

    document.merge(data)
    await document.save()

    return response.ok(document)
  }

  /**
   * DELETE /api/admin/documents/:id
   * Supprimer un document (aussi sur OneDrive)
   */
  async destroy(ctx: HttpContext) {
    const { params, auth, response } = ctx
    const admin = auth.use('admin').user!

    // Get document info before deleting
    const document = await Document.find(params.id)
    if (!document) {
      return response.notFound({ message: 'Document non trouve' })
    }

    const documentName = document.nom
    const dossierId = document.dossierId

    const result = await documentSyncService.deleteDocument(params.id)

    if (!result.success) {
      return response.notFound({ message: result.error })
    }

    // Log activity for timeline
    await ActivityLogger.logDocumentDeleted(
      params.id,
      dossierId,
      admin.id,
      { documentName },
      ctx
    )

    return response.ok({ message: 'Document supprime' })
  }

  /**
   * GET /api/admin/documents/:id/thumbnail
   * Obtenir l'URL de la vignette du document
   */
  async thumbnail({ params, request, response }: HttpContext) {
    const size = request.input('size', 'medium') as 'small' | 'medium' | 'large'
    const result = await documentSyncService.getThumbnailUrl(params.id, size)

    if (!result.success) {
      return response.notFound({ message: result.error })
    }

    return response.ok({ url: result.url })
  }
}

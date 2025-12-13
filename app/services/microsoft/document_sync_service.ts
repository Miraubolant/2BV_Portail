import oneDriveService from './onedrive_service.js'
import dossierFolderService from './dossier_folder_service.js'
import Document from '#models/document'
import Dossier from '#models/dossier'
import { DateTime } from 'luxon'
import { MultipartFile } from '@adonisjs/core/bodyparser'
import { cuid } from '@adonisjs/core/helpers'
import logger from '@adonisjs/core/services/logger'

interface UploadResult {
  success: boolean
  document?: Document
  error?: string
}

interface DownloadResult {
  success: boolean
  content?: Buffer
  filename?: string
  mimeType?: string
  error?: string
}

/**
 * Service for syncing documents with OneDrive
 * Documents are organized in CABINET (internal) or CLIENT (client-visible) subfolders
 */
class DocumentSyncService {
  /**
   * Upload a document to OneDrive and create the database record
   * @param dossierId - The dossier ID
   * @param file - The uploaded file
   * @param metadata - Document metadata
   * @param uploader - Who is uploading (admin or client)
   * @param location - Where to store: 'cabinet' (internal) or 'client' (client-visible)
   *                   If not specified, defaults based on visibleClient flag
   */
  async uploadDocument(
    dossierId: string,
    file: MultipartFile,
    metadata: {
      nom: string
      typeDocument?: string
      sensible?: boolean
      visibleClient?: boolean
      dateDocument?: DateTime | null
      description?: string
    },
    uploader: {
      id: string
      type: 'admin' | 'client'
    },
    location?: 'cabinet' | 'client'
  ): Promise<UploadResult> {
    // Check OneDrive connection
    const isReady = await oneDriveService.isReady()
    if (!isReady) {
      return { success: false, error: 'OneDrive not connected' }
    }

    // Verify dossier exists
    const dossier = await Dossier.find(dossierId)
    if (!dossier) {
      return { success: false, error: 'Dossier not found' }
    }

    // Determine the location based on visibility if not explicitly specified
    // - If visibleClient is true OR uploader is client -> CLIENT folder
    // - If visibleClient is false (internal document) -> CABINET folder
    const targetLocation: 'cabinet' | 'client' = location
      || (metadata.visibleClient === false ? 'cabinet' : 'client')

    // Ensure dossier has the correct OneDrive subfolder
    const folderId = await dossierFolderService.ensureDossierFolder(dossierId, targetLocation)
    if (!folderId) {
      return { success: false, error: 'Failed to create dossier folder on OneDrive' }
    }

    // Read file content
    const fileBuffer = await this.readFileContent(file)
    if (!fileBuffer) {
      return { success: false, error: 'Failed to read file content' }
    }

    // Generate unique filename to avoid conflicts
    const extension = file.extname || ''
    const uniqueFilename = `${metadata.nom}_${cuid()}${extension ? '.' + extension : ''}`

    // Upload to OneDrive
    const uploadResult = await oneDriveService.uploadFile(
      folderId,
      uniqueFilename,
      fileBuffer,
      file.type || 'application/octet-stream'
    )

    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error }
    }

    // Create document record in database
    const document = await Document.create({
      dossierId,
      nom: metadata.nom,
      nomOriginal: file.clientName,
      typeDocument: metadata.typeDocument || 'autre',
      tailleOctets: file.size,
      mimeType: file.type,
      extension: extension,
      sensible: metadata.sensible || false,
      visibleClient: metadata.visibleClient ?? true,
      uploadedByClient: uploader.type === 'client',
      uploadedById: uploader.id,
      uploadedByType: uploader.type,
      dateDocument: metadata.dateDocument || null,
      description: metadata.description || null,
      dossierLocation: targetLocation,
      onedriveFileId: uploadResult.fileId,
      onedriveWebUrl: uploadResult.webUrl,
      onedriveDownloadUrl: uploadResult.downloadUrl,
    })

    // Update dossier sync timestamp
    dossier.onedriveLastSync = DateTime.now()
    await dossier.save()

    return { success: true, document }
  }

  /**
   * Download a document from OneDrive
   */
  async downloadDocument(documentId: string): Promise<DownloadResult> {
    const document = await Document.find(documentId)
    if (!document) {
      return { success: false, error: 'Document not found' }
    }

    if (!document.onedriveFileId) {
      return { success: false, error: 'Document not synced to OneDrive' }
    }

    // Check OneDrive connection
    const isReady = await oneDriveService.isReady()
    if (!isReady) {
      return { success: false, error: 'OneDrive not connected' }
    }

    // Download from OneDrive
    const downloadResult = await oneDriveService.downloadFile(document.onedriveFileId)
    if (!downloadResult.success) {
      return { success: false, error: downloadResult.error }
    }

    // Build filename
    const extension = document.extension ? `.${document.extension}` : ''
    const filename = `${document.nom}${extension}`

    return {
      success: true,
      content: Buffer.from(downloadResult.content!),
      filename,
      mimeType: document.mimeType || downloadResult.mimeType || 'application/octet-stream',
    }
  }

  /**
   * Delete a document from OneDrive
   */
  async deleteDocument(documentId: string): Promise<{ success: boolean; error?: string }> {
    const document = await Document.find(documentId)
    if (!document) {
      return { success: false, error: 'Document not found' }
    }

    // If document has OneDrive file, delete it
    if (document.onedriveFileId) {
      const isReady = await oneDriveService.isReady()
      if (isReady) {
        await oneDriveService.deleteItem(document.onedriveFileId)
      }
    }

    // Delete database record
    await document.delete()

    return { success: true }
  }

  /**
   * Sync a single document to OneDrive (for documents that failed initial upload)
   */
  async syncDocument(documentId: string, fileContent: Buffer): Promise<{ success: boolean; error?: string }> {
    const document = await Document.query()
      .where('id', documentId)
      .preload('dossier' as never)
      .first()

    if (!document) {
      return { success: false, error: 'Document not found' }
    }

    if (document.onedriveFileId) {
      return { success: true } // Already synced
    }

    const isReady = await oneDriveService.isReady()
    if (!isReady) {
      return { success: false, error: 'OneDrive not connected' }
    }

    // Ensure dossier folder exists with the correct location
    const targetLocation = document.dossierLocation || (document.visibleClient ? 'client' : 'cabinet')
    const folderId = await dossierFolderService.ensureDossierFolder(document.dossierId, targetLocation)
    if (!folderId) {
      return { success: false, error: 'Failed to create dossier folder' }
    }

    // Upload file
    const extension = document.extension ? `.${document.extension}` : ''
    const filename = `${document.nom}_${cuid()}${extension}`

    const uploadResult = await oneDriveService.uploadFile(
      folderId,
      filename,
      fileContent,
      document.mimeType || 'application/octet-stream'
    )

    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error }
    }

    // Update document record
    document.onedriveFileId = uploadResult.fileId!
    document.onedriveWebUrl = uploadResult.webUrl!
    document.onedriveDownloadUrl = uploadResult.downloadUrl!
    document.dossierLocation = targetLocation
    await document.save()

    return { success: true }
  }

  /**
   * Move a document to a different location (CABINET <-> CLIENT)
   */
  async moveDocumentLocation(
    documentId: string,
    newLocation: 'cabinet' | 'client'
  ): Promise<{ success: boolean; error?: string }> {
    const document = await Document.find(documentId)
    if (!document) {
      return { success: false, error: 'Document not found' }
    }

    if (!document.onedriveFileId) {
      // Just update the location field if not on OneDrive
      document.dossierLocation = newLocation
      await document.save()
      return { success: true }
    }

    const isReady = await oneDriveService.isReady()
    if (!isReady) {
      return { success: false, error: 'OneDrive not connected' }
    }

    // Get the target folder
    const targetFolderId = await dossierFolderService.ensureDossierFolder(
      document.dossierId,
      newLocation
    )

    if (!targetFolderId) {
      return { success: false, error: 'Failed to get target folder' }
    }

    // Move the file on OneDrive
    const success = await oneDriveService.moveItem(document.onedriveFileId, targetFolderId)

    if (!success) {
      return { success: false, error: 'Failed to move file on OneDrive' }
    }

    // Update document record
    document.dossierLocation = newLocation
    // Also update visibleClient to match the new location
    document.visibleClient = newLocation === 'client'
    await document.save()

    return { success: true }
  }

  /**
   * Get fresh download URL for a document (OneDrive URLs expire)
   */
  async getDownloadUrl(documentId: string): Promise<{ success: boolean; url?: string; error?: string }> {
    const document = await Document.find(documentId)
    if (!document) {
      return { success: false, error: 'Document not found' }
    }

    if (!document.onedriveFileId) {
      return { success: false, error: 'Document not synced to OneDrive' }
    }

    const isReady = await oneDriveService.isReady()
    if (!isReady) {
      return { success: false, error: 'OneDrive not connected' }
    }

    // Get fresh file info
    const fileInfo = await oneDriveService.getFileInfo(document.onedriveFileId)
    if (!fileInfo) {
      return { success: false, error: 'File not found on OneDrive' }
    }

    const downloadUrl = fileInfo['@microsoft.graph.downloadUrl']
    if (!downloadUrl) {
      return { success: false, error: 'No download URL available' }
    }

    // Update stored URL
    document.onedriveDownloadUrl = downloadUrl
    await document.save()

    return { success: true, url: downloadUrl }
  }

  /**
   * Read file content from MultipartFile
   */
  private async readFileContent(file: MultipartFile): Promise<Buffer | null> {
    try {
      // If file has tmpPath, read from there
      if (file.tmpPath) {
        const fs = await import('node:fs/promises')
        return await fs.readFile(file.tmpPath)
      }

      return null
    } catch (error) {
      logger.error({ err: error }, 'Error reading file')
      return null
    }
  }

  /**
   * Check if a document exists on OneDrive
   */
  async verifyDocument(documentId: string): Promise<{ exists: boolean; synced: boolean }> {
    const document = await Document.find(documentId)
    if (!document) {
      return { exists: false, synced: false }
    }

    if (!document.onedriveFileId) {
      return { exists: true, synced: false }
    }

    const isReady = await oneDriveService.isReady()
    if (!isReady) {
      return { exists: true, synced: false }
    }

    const fileInfo = await oneDriveService.getFileInfo(document.onedriveFileId)
    return { exists: true, synced: fileInfo !== null }
  }

  /**
   * Rename a file on OneDrive
   */
  async renameOnOneDrive(fileId: string, newFileName: string): Promise<boolean> {
    const isReady = await oneDriveService.isReady()
    if (!isReady) {
      return false
    }

    return await oneDriveService.renameItem(fileId, newFileName)
  }

  /**
   * Get thumbnail URL for a document
   */
  async getThumbnailUrl(documentId: string, size: 'small' | 'medium' | 'large' = 'medium'): Promise<{ success: boolean; url?: string; error?: string }> {
    const document = await Document.find(documentId)
    if (!document) {
      return { success: false, error: 'Document not found' }
    }

    if (!document.onedriveFileId) {
      return { success: false, error: 'Document not synced to OneDrive' }
    }

    const isReady = await oneDriveService.isReady()
    if (!isReady) {
      return { success: false, error: 'OneDrive not connected' }
    }

    const thumbnails = await oneDriveService.getThumbnails(document.onedriveFileId)
    if (!thumbnails) {
      return { success: false, error: 'No thumbnail available' }
    }

    const url = thumbnails[size] || thumbnails.medium || thumbnails.small
    if (!url) {
      return { success: false, error: 'No thumbnail available' }
    }

    return { success: true, url }
  }
}

export default new DocumentSyncService()

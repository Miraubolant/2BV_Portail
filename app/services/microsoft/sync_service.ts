import oneDriveService, { DriveItem } from './onedrive_service.js'
import dossierFolderService from './dossier_folder_service.js'
import Dossier from '#models/dossier'
import Document from '#models/document'
import SyncLog from '#models/sync_log'
import { DateTime } from 'luxon'

interface SyncResult {
  success: boolean
  synced: number
  created: number
  updated: number
  deleted: number
  errors: number
  message: string
  details: string[]
}

interface DossierSyncResult extends SyncResult {
  dossierId: string
  dossierReference: string
}

/**
 * Service for bidirectional synchronization with OneDrive
 */
class SyncService {
  /**
   * Sync a single dossier's documents with OneDrive
   * - Detects new files added to OneDrive and imports them
   * - Detects files deleted from OneDrive and marks them
   */
  async syncDossier(dossierId: string, triggeredById?: string): Promise<DossierSyncResult> {
    const startTime = Date.now()
    const details: string[] = []
    let created = 0
    let updated = 0
    let deleted = 0
    let errors = 0

    const dossier = await Dossier.query()
      .where('id', dossierId)
      .preload('client')
      .first()

    if (!dossier) {
      return {
        success: false,
        dossierId,
        dossierReference: 'unknown',
        synced: 0,
        created: 0,
        updated: 0,
        deleted: 0,
        errors: 1,
        message: 'Dossier not found',
        details: ['Dossier not found'],
      }
    }

    const isReady = await oneDriveService.isReady()
    if (!isReady) {
      return {
        success: false,
        dossierId,
        dossierReference: dossier.reference,
        synced: 0,
        created: 0,
        updated: 0,
        deleted: 0,
        errors: 1,
        message: 'OneDrive not connected',
        details: ['OneDrive not connected'],
      }
    }

    try {
      // Ensure dossier has a OneDrive folder
      let folderId = dossier.onedriveFolderId
      if (!folderId) {
        const folderResult = await dossierFolderService.createDossierFolder(dossierId)
        if (!folderResult.success) {
          return {
            success: false,
            dossierId,
            dossierReference: dossier.reference,
            synced: 0,
            created: 0,
            updated: 0,
            deleted: 0,
            errors: 1,
            message: 'Failed to create OneDrive folder',
            details: [folderResult.error || 'Unknown error'],
          }
        }
        folderId = folderResult.folderId!
        // Refresh dossier to get updated fields
        await dossier.refresh()
      }

      // Get files from OneDrive
      const oneDriveFiles = await oneDriveService.listFolder(folderId)
      const oneDriveFileIds = new Set<string>()

      // Get existing documents from database
      const existingDocs = await Document.query().where('dossier_id', dossierId)
      const existingByOnedriveId = new Map<string, Document>()
      existingDocs.forEach(doc => {
        if (doc.onedriveFileId) {
          existingByOnedriveId.set(doc.onedriveFileId, doc)
        }
      })

      // Process files from OneDrive
      for (const item of oneDriveFiles) {
        // Skip folders
        if (item.folder) continue

        oneDriveFileIds.add(item.id)

        // Check if document already exists in database
        const existingDoc = existingByOnedriveId.get(item.id)

        if (!existingDoc) {
          // New file found on OneDrive - import it
          try {
            await this.importFileFromOneDrive(dossier, item)
            created++
            details.push(`Imported: ${item.name}`)
          } catch (error) {
            errors++
            details.push(`Error importing ${item.name}: ${error instanceof Error ? error.message : 'Unknown'}`)
          }
        } else {
          // Check if file was updated
          const oneDriveModified = item.lastModifiedDateTime
            ? DateTime.fromISO(item.lastModifiedDateTime)
            : null

          if (oneDriveModified && existingDoc.createdAt < oneDriveModified) {
            // File was modified on OneDrive - update URL
            existingDoc.onedriveWebUrl = item.webUrl || null
            existingDoc.onedriveDownloadUrl = item['@microsoft.graph.downloadUrl'] || null
            await existingDoc.save()
            updated++
            details.push(`Updated: ${item.name}`)
          }
        }
      }

      // Check for documents deleted from OneDrive
      for (const doc of existingDocs) {
        if (doc.onedriveFileId && !oneDriveFileIds.has(doc.onedriveFileId)) {
          // File was deleted from OneDrive
          // Option: Mark as deleted or actually delete
          // For now, we'll clear the OneDrive references
          doc.onedriveFileId = null
          doc.onedriveWebUrl = null
          doc.onedriveDownloadUrl = null
          await doc.save()
          deleted++
          details.push(`Marked as deleted (removed from OneDrive): ${doc.nom}`)
        }
      }

      // Update dossier sync timestamp
      dossier.onedriveLastSync = DateTime.now()
      await dossier.save()

      // Log sync operation
      const duration = Date.now() - startTime
      await this.logSyncOperation({
        type: 'onedrive',
        mode: triggeredById ? 'manual' : 'auto',
        statut: errors === 0 ? 'success' : (created + updated > 0 ? 'partial' : 'error'),
        elementsTraites: oneDriveFiles.filter(f => !f.folder).length,
        elementsCrees: created,
        elementsModifies: updated,
        elementsSupprimes: deleted,
        elementsErreur: errors,
        message: `Sync completed for ${dossier.reference}`,
        details: { dossierReference: dossier.reference, details },
        dureeMs: duration,
        triggeredById,
      })

      return {
        success: errors === 0,
        dossierId,
        dossierReference: dossier.reference,
        synced: created + updated + deleted,
        created,
        updated,
        deleted,
        errors,
        message: errors === 0 ? 'Sync completed successfully' : 'Sync completed with errors',
        details,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        dossierId,
        dossierReference: dossier.reference,
        synced: 0,
        created,
        updated,
        deleted,
        errors: errors + 1,
        message,
        details: [...details, message],
      }
    }
  }

  /**
   * Import a file from OneDrive into the database
   */
  private async importFileFromOneDrive(dossier: Dossier, item: DriveItem): Promise<Document> {
    // Extract file info
    const fileName = item.name
    const extension = fileName.includes('.') ? fileName.split('.').pop() || '' : ''
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '')

    // Create document record
    const document = await Document.create({
      dossierId: dossier.id,
      nom: nameWithoutExt,
      nomOriginal: fileName,
      typeDocument: this.guessDocumentType(extension),
      tailleOctets: item.size || null,
      mimeType: item.file?.mimeType || null,
      extension: extension || null,
      sensible: false,
      visibleClient: true,
      uploadedByClient: false,
      uploadedById: dossier.createdById || 'system',
      uploadedByType: 'admin',
      onedriveFileId: item.id,
      onedriveWebUrl: item.webUrl || null,
      onedriveDownloadUrl: item['@microsoft.graph.downloadUrl'] || null,
    })

    return document
  }

  /**
   * Guess document type based on extension
   */
  private guessDocumentType(extension: string): string {
    const ext = extension.toLowerCase()

    const typeMap: Record<string, string> = {
      pdf: 'piece_procedure',
      doc: 'piece_procedure',
      docx: 'piece_procedure',
      xls: 'facture',
      xlsx: 'facture',
      jpg: 'photo',
      jpeg: 'photo',
      png: 'photo',
      gif: 'photo',
      txt: 'autre',
      csv: 'autre',
    }

    return typeMap[ext] || 'autre'
  }

  /**
   * Sync all dossiers that have OneDrive folders
   */
  async syncAllDossiers(triggeredById?: string): Promise<SyncResult> {
    const startTime = Date.now()
    const details: string[] = []
    let totalCreated = 0
    let totalUpdated = 0
    let totalDeleted = 0
    let totalErrors = 0

    const isReady = await oneDriveService.isReady()
    if (!isReady) {
      return {
        success: false,
        synced: 0,
        created: 0,
        updated: 0,
        deleted: 0,
        errors: 1,
        message: 'OneDrive not connected',
        details: ['OneDrive not connected'],
      }
    }

    // Get all dossiers with OneDrive folders
    const dossiers = await Dossier.query().whereNotNull('onedriveFolderId')

    for (const dossier of dossiers) {
      const result = await this.syncDossier(dossier.id, triggeredById)
      totalCreated += result.created
      totalUpdated += result.updated
      totalDeleted += result.deleted
      totalErrors += result.errors

      if (result.synced > 0 || result.errors > 0) {
        details.push(`${dossier.reference}: ${result.created} created, ${result.updated} updated, ${result.deleted} deleted, ${result.errors} errors`)
      }
    }

    // Log overall sync operation
    const duration = Date.now() - startTime
    await this.logSyncOperation({
      type: 'onedrive',
      mode: triggeredById ? 'manual' : 'auto',
      statut: totalErrors === 0 ? 'success' : 'partial',
      elementsTraites: dossiers.length,
      elementsCrees: totalCreated,
      elementsModifies: totalUpdated,
      elementsSupprimes: totalDeleted,
      elementsErreur: totalErrors,
      message: `Full sync completed: ${dossiers.length} dossiers processed`,
      details: { totalDossiers: dossiers.length, details },
      dureeMs: duration,
      triggeredById,
    })

    return {
      success: totalErrors === 0,
      synced: totalCreated + totalUpdated + totalDeleted,
      created: totalCreated,
      updated: totalUpdated,
      deleted: totalDeleted,
      errors: totalErrors,
      message: `Sync completed: ${dossiers.length} dossiers processed`,
      details,
    }
  }

  /**
   * Initialize sync for all dossiers (create OneDrive folders)
   */
  async initializeAllDossiers(triggeredById?: string): Promise<SyncResult> {
    const result = await dossierFolderService.syncAllDossiers()

    await this.logSyncOperation({
      type: 'onedrive',
      mode: 'manual',
      statut: result.errors === 0 ? 'success' : 'partial',
      elementsTraites: result.synced + result.errors,
      elementsCrees: result.synced,
      elementsModifies: 0,
      elementsSupprimes: 0,
      elementsErreur: result.errors,
      message: 'Initialization sync completed',
      details: { details: result.details },
      triggeredById,
    })

    return {
      success: result.success,
      synced: result.synced,
      created: result.synced,
      updated: 0,
      deleted: 0,
      errors: result.errors,
      message: `Initialization completed: ${result.synced} folders created`,
      details: result.details,
    }
  }

  /**
   * Log a sync operation to the database
   */
  private async logSyncOperation(data: {
    type: 'onedrive' | 'google_calendar'
    mode: 'auto' | 'manual'
    statut: 'success' | 'partial' | 'error'
    elementsTraites: number
    elementsCrees: number
    elementsModifies: number
    elementsSupprimes: number
    elementsErreur: number
    message?: string
    details?: Record<string, unknown>
    dureeMs?: number
    triggeredById?: string
  }): Promise<void> {
    try {
      await SyncLog.create(data)
    } catch (error) {
      console.error('Failed to log sync operation:', error)
    }
  }

  /**
   * Get sync history
   */
  async getSyncHistory(limit: number = 20): Promise<SyncLog[]> {
    return SyncLog.query()
      .where('type', 'onedrive')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .preload('triggeredBy')
  }
}

export default new SyncService()

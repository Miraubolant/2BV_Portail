import oneDriveService, { DriveItem } from './onedrive_service.js'
import dossierFolderService from './dossier_folder_service.js'
import Dossier from '#models/dossier'
import Document from '#models/document'
import Client from '#models/client'
import SyncLog from '#models/sync_log'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import ActivityLogger from '#services/activity_logger'

const ROOT_FOLDER_NAME = 'Portail Cabinet'
const CLIENTS_FOLDER_NAME = 'Clients'
const CABINET_FOLDER_NAME = 'CABINET'
const CLIENT_FOLDER_NAME = 'CLIENT'

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

interface ReverseSyncResult extends SyncResult {
  unmatchedClients: string[]
  unmatchedDossiers: string[]
  linkedDossiers: number
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

    const dossier = await Dossier.query().where('id', dossierId).preload('client').first()

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
      existingDocs.forEach((doc) => {
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
            details.push(`Importe: ${item.name}`)
          } catch (error) {
            errors++
            details.push(
              `Erreur import ${item.name}: ${error instanceof Error ? error.message : 'Inconnu'}`
            )
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
            details.push(`Mis a jour: ${item.name}`)

            // Log activity for timeline
            await ActivityLogger.logDocumentSyncedFromOneDrive(existingDoc.id, dossier.id, {
              documentName: item.name,
              onedriveFileId: item.id,
              changes: ['Metadata updated from OneDrive'],
            })
          }
        }
      }

      // Check for documents deleted from OneDrive
      for (const doc of existingDocs) {
        if (doc.onedriveFileId && !oneDriveFileIds.has(doc.onedriveFileId)) {
          // File was deleted from OneDrive
          const deletedFileId = doc.onedriveFileId
          const deletedFileName = doc.nom

          // Option: Mark as deleted or actually delete
          // For now, we'll clear the OneDrive references
          doc.onedriveFileId = null
          doc.onedriveWebUrl = null
          doc.onedriveDownloadUrl = null
          await doc.save()
          deleted++
          details.push(`Supprime de OneDrive: ${doc.nom}`)

          // Log activity for timeline
          await ActivityLogger.logDocumentRemovedFromOneDrive(doc.id, dossier.id, {
            documentName: deletedFileName,
            onedriveFileId: deletedFileId,
          })
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
        statut: errors === 0 ? 'success' : created + updated > 0 ? 'partial' : 'error',
        elementsTraites: oneDriveFiles.filter((f) => !f.folder).length,
        elementsCrees: created,
        elementsModifies: updated,
        elementsSupprimes: deleted,
        elementsErreur: errors,
        message: `Sync termine pour ${dossier.reference}`,
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
        message: errors === 0 ? 'Synchronisation terminee' : 'Synchronisation terminee avec erreurs',
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
  private async importFileFromOneDrive(
    dossier: Dossier,
    item: DriveItem,
    location: 'cabinet' | 'client' = 'client'
  ): Promise<Document> {
    // Extract file info
    const fileName = item.name
    const extension = fileName.includes('.') ? fileName.split('.').pop() || '' : ''
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '')
    const typeDocument = this.guessDocumentType(extension)

    // Create document record
    const document = await Document.create({
      dossierId: dossier.id,
      nom: nameWithoutExt,
      nomOriginal: fileName,
      typeDocument,
      tailleOctets: item.size || null,
      mimeType: item.file?.mimeType || null,
      extension: extension || null,
      sensible: false,
      visibleClient: location === 'client',
      uploadedByClient: false,
      uploadedById: dossier.createdById || 'system',
      uploadedByType: 'admin',
      dossierLocation: location,
      onedriveFileId: item.id,
      onedriveWebUrl: item.webUrl || null,
      onedriveDownloadUrl: item['@microsoft.graph.downloadUrl'] || null,
    })

    // Log activity for timeline
    await ActivityLogger.logDocumentImportedFromOneDrive(document.id, dossier.id, {
      documentName: fileName,
      documentType: typeDocument,
      mimeType: item.file?.mimeType || null,
      dossierLocation: location,
      onedriveFileId: item.id,
      source: 'sync',
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
        details.push(
          `${dossier.reference}: ${result.created} created, ${result.updated} updated, ${result.deleted} deleted, ${result.errors} errors`
        )
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
      message: `Sync complet termine: ${dossiers.length} dossiers traites`,
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
      message: `Synchronisation terminee: ${dossiers.length} dossiers traites`,
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
      message: 'Initialisation terminee',
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
      message: `Initialisation terminee: ${result.synced} dossiers crees`,
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
      logger.error({ err: error }, 'Failed to log sync operation')
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

  /**
   * Reverse sync: Scan OneDrive folders and sync to existing dossiers
   * This discovers files added directly to OneDrive and imports them
   *
   * Only syncs to EXISTING clients and dossiers - does not create new ones
   */
  async reverseSyncFromOneDrive(triggeredById?: string): Promise<ReverseSyncResult> {
    const startTime = Date.now()
    const details: string[] = []
    const unmatchedClients: string[] = []
    const unmatchedDossiers: string[] = []
    let created = 0
    let updated = 0
    let linkedDossiers = 0
    let errors = 0

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
        unmatchedClients: [],
        unmatchedDossiers: [],
        linkedDossiers: 0,
      }
    }

    try {
      // Step 1: Find the Clients folder
      const clientsFolderId = await this.findClientsFolderId()
      if (!clientsFolderId) {
        return {
          success: false,
          synced: 0,
          created: 0,
          updated: 0,
          deleted: 0,
          errors: 1,
          message: `Folder /${ROOT_FOLDER_NAME}/${CLIENTS_FOLDER_NAME}/ not found`,
          details: [`Folder /${ROOT_FOLDER_NAME}/${CLIENTS_FOLDER_NAME}/ not found`],
          unmatchedClients: [],
          unmatchedDossiers: [],
          linkedDossiers: 0,
        }
      }

      // Step 2: List all client folders in OneDrive
      const clientFolders = await oneDriveService.listFolder(clientsFolderId)
      const oneDriveClientFolders = clientFolders.filter((item) => item.folder)

      // Step 3: Load all clients from database for matching
      const allClients = await Client.all()
      const clientsByFullName = new Map<string, Client>()
      for (const client of allClients) {
        const fullName = `${client.prenom} ${client.nom}`.toLowerCase().trim()
        clientsByFullName.set(fullName, client)
        // Also try alternative format
        const altName = `${client.nom} ${client.prenom}`.toLowerCase().trim()
        clientsByFullName.set(altName, client)
      }

      // Step 4: Process each client folder
      for (const clientFolder of oneDriveClientFolders) {
        const folderName = clientFolder.name.toLowerCase().trim()
        const matchedClient = clientsByFullName.get(folderName)

        if (!matchedClient) {
          unmatchedClients.push(clientFolder.name)
          details.push(`Client folder not matched: ${clientFolder.name}`)
          continue
        }

        // Step 5: List dossier folders inside client folder
        const dossierFolders = await oneDriveService.listFolder(clientFolder.id)
        const oneDriveDossierFolders = dossierFolders.filter((item) => item.folder)

        // Load dossiers for this client
        const clientDossiers = await Dossier.query()
          .where('client_id', matchedClient.id)
          .preload('client')

        // Create map of dossiers by reference
        const dossiersByRef = new Map<string, Dossier>()
        for (const dossier of clientDossiers) {
          dossiersByRef.set(dossier.reference.toLowerCase(), dossier)
        }

        // Step 6: Match each dossier folder
        for (const dossierFolder of oneDriveDossierFolders) {
          const dossierFolderName = dossierFolder.name

          // Extract reference from folder name (format: "REFERENCE - Intitule")
          const dossierRef = this.extractReferenceFromFolderName(dossierFolderName)

          if (!dossierRef) {
            unmatchedDossiers.push(`${clientFolder.name}/${dossierFolderName}`)
            details.push(`Cannot extract reference from folder: ${dossierFolderName}`)
            continue
          }

          const matchedDossier = dossiersByRef.get(dossierRef.toLowerCase())

          if (!matchedDossier) {
            unmatchedDossiers.push(`${clientFolder.name}/${dossierFolderName}`)
            details.push(`Dossier not found for reference: ${dossierRef}`)
            continue
          }

          // Step 7: Link dossier to OneDrive folder if not already linked
          if (!matchedDossier.onedriveFolderId) {
            matchedDossier.onedriveFolderId = dossierFolder.id
            matchedDossier.onedriveFolderPath = `/${ROOT_FOLDER_NAME}/${CLIENTS_FOLDER_NAME}/${clientFolder.name}/${dossierFolderName}`
            linkedDossiers++
            details.push(`Linked dossier ${matchedDossier.reference} to OneDrive folder`)
          }

          // Step 8: Scan CABINET and CLIENT subfolders
          const subFolders = await oneDriveService.listFolder(dossierFolder.id)

          for (const subFolder of subFolders) {
            if (!subFolder.folder) continue

            const subFolderName = subFolder.name.toUpperCase()
            let location: 'cabinet' | 'client' | null = null

            if (subFolderName === CABINET_FOLDER_NAME) {
              location = 'cabinet'
              if (!matchedDossier.onedriveCabinetFolderId) {
                matchedDossier.onedriveCabinetFolderId = subFolder.id
              }
            } else if (subFolderName === CLIENT_FOLDER_NAME) {
              location = 'client'
              if (!matchedDossier.onedriveClientFolderId) {
                matchedDossier.onedriveClientFolderId = subFolder.id
              }
            }

            if (!location) continue

            // Step 9: Scan files in the subfolder
            const result = await this.syncFilesFromFolder(matchedDossier, subFolder.id, location)

            created += result.created
            updated += result.updated
            errors += result.errors
            details.push(...result.details)
          }

          // Also scan files directly in the dossier folder (not in CABINET/CLIENT)
          const directFiles = await oneDriveService.listFolder(dossierFolder.id)
          for (const item of directFiles) {
            if (item.folder) continue // Skip folders

            // Import as client-visible by default
            const result = await this.importSingleFile(matchedDossier, item, 'client')
            if (result.created) created++
            if (result.error) errors++
            if (result.message) details.push(result.message)
          }

          // Save dossier with updated OneDrive info
          matchedDossier.onedriveLastSync = DateTime.now()
          await matchedDossier.save()
        }
      }

      // Log sync operation
      const duration = Date.now() - startTime
      await this.logSyncOperation({
        type: 'onedrive',
        mode: triggeredById ? 'manual' : 'auto',
        statut: errors === 0 ? 'success' : created > 0 ? 'partial' : 'error',
        elementsTraites: oneDriveClientFolders.length,
        elementsCrees: created,
        elementsModifies: updated,
        elementsSupprimes: 0,
        elementsErreur: errors,
        message: `Sync inverse termine: ${created} fichiers importes, ${linkedDossiers} dossiers lies`,
        details: {
          unmatchedClients,
          unmatchedDossiers,
          linkedDossiers,
          details: details.slice(0, 50), // Limit details
        },
        dureeMs: duration,
        triggeredById,
      })

      return {
        success: errors === 0,
        synced: created + updated,
        created,
        updated,
        deleted: 0,
        errors,
        message: `Sync inverse termine: ${created} fichiers importes, ${linkedDossiers} dossiers lies`,
        details,
        unmatchedClients,
        unmatchedDossiers,
        linkedDossiers,
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error'
      logger.error({ err: error }, 'Reverse sync failed')
      return {
        success: false,
        synced: 0,
        created,
        updated,
        deleted: 0,
        errors: errors + 1,
        message,
        details: [...details, message],
        unmatchedClients,
        unmatchedDossiers,
        linkedDossiers,
      }
    }
  }

  /**
   * Find the Clients folder ID in OneDrive
   */
  private async findClientsFolderId(): Promise<string | null> {
    try {
      // Find root folder
      const rootItems = await oneDriveService.listFolder()
      const rootFolder = rootItems.find(
        (item) => item.folder && item.name.toLowerCase() === ROOT_FOLDER_NAME.toLowerCase()
      )

      if (!rootFolder) {
        logger.warn('Root folder not found')
        return null
      }

      // Find Clients folder
      const rootContents = await oneDriveService.listFolder(rootFolder.id)
      const clientsFolder = rootContents.find(
        (item) => item.folder && item.name.toLowerCase() === CLIENTS_FOLDER_NAME.toLowerCase()
      )

      return clientsFolder?.id || null
    } catch (error) {
      logger.error({ err: error }, 'Failed to find Clients folder')
      return null
    }
  }

  /**
   * Extract dossier reference from folder name
   * Expected format: "REFERENCE - Intitule" (e.g., "DOS-2024-0001 - Divorce Martin")
   */
  private extractReferenceFromFolderName(folderName: string): string | null {
    // Pattern 1: "REFERENCE - Intitule" format
    const dashMatch = folderName.match(/^([A-Z0-9-]+)\s*-\s*/)
    if (dashMatch) {
      return dashMatch[1].trim()
    }

    // Pattern 2: Just the reference (for folders named only with reference)
    const refMatch = folderName.match(/^(DOS-\d{4}-\d{4}|\d{4}-\d{3,4}-[A-Z]{2,4})$/i)
    if (refMatch) {
      return refMatch[1].trim()
    }

    return null
  }

  /**
   * Sync files from a specific OneDrive folder to a dossier
   */
  private async syncFilesFromFolder(
    dossier: Dossier,
    folderId: string,
    location: 'cabinet' | 'client'
  ): Promise<{ created: number; updated: number; errors: number; details: string[] }> {
    const details: string[] = []
    let created = 0
    let updated = 0
    let errors = 0

    try {
      const files = await oneDriveService.listFolder(folderId)

      // Get existing documents for this dossier
      const existingDocs = await Document.query().where('dossier_id', dossier.id)
      const existingByOnedriveId = new Set<string>()
      existingDocs.forEach((doc) => {
        if (doc.onedriveFileId) {
          existingByOnedriveId.add(doc.onedriveFileId)
        }
      })

      for (const item of files) {
        // Skip folders
        if (item.folder) continue

        // Check if already imported
        if (existingByOnedriveId.has(item.id)) {
          continue // Already exists
        }

        // Import new file
        const result = await this.importSingleFile(dossier, item, location)
        if (result.created) created++
        if (result.updated) updated++
        if (result.error) errors++
        if (result.message) details.push(result.message)
      }
    } catch (error) {
      errors++
      details.push(`Erreur scan dossier: ${error instanceof Error ? error.message : 'Inconnu'}`)
    }

    return { created, updated, errors, details }
  }

  /**
   * Import a single file from OneDrive
   */
  private async importSingleFile(
    dossier: Dossier,
    item: DriveItem,
    location: 'cabinet' | 'client'
  ): Promise<{ created: boolean; updated: boolean; error: boolean; message?: string }> {
    try {
      // Check if already exists
      const existing = await Document.query()
        .where('dossier_id', dossier.id)
        .where('onedrive_file_id', item.id)
        .first()

      if (existing) {
        return { created: false, updated: false, error: false }
      }

      // Extract file info
      const fileName = item.name
      const extension = fileName.includes('.') ? fileName.split('.').pop() || '' : ''
      const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '')
      const typeDocument = this.guessDocumentType(extension)

      // Create document record
      const document = await Document.create({
        dossierId: dossier.id,
        nom: nameWithoutExt,
        nomOriginal: fileName,
        typeDocument,
        tailleOctets: item.size || null,
        mimeType: item.file?.mimeType || null,
        extension: extension || null,
        sensible: false,
        visibleClient: location === 'client',
        uploadedByClient: false,
        uploadedById: dossier.createdById || 'system',
        uploadedByType: 'admin',
        dossierLocation: location,
        onedriveFileId: item.id,
        onedriveWebUrl: item.webUrl || null,
        onedriveDownloadUrl: item['@microsoft.graph.downloadUrl'] || null,
      })

      // Log activity for timeline
      await ActivityLogger.logDocumentImportedFromOneDrive(document.id, dossier.id, {
        documentName: fileName,
        documentType: typeDocument,
        mimeType: item.file?.mimeType || null,
        dossierLocation: location,
        onedriveFileId: item.id,
        source: 'sync',
      })

      return {
        created: true,
        updated: false,
        error: false,
        message: `Importe: ${fileName} (${location.toUpperCase()})`,
      }
    } catch (error) {
      return {
        created: false,
        updated: false,
        error: true,
        message: `Erreur import ${item.name}: ${error instanceof Error ? error.message : 'Inconnu'}`,
      }
    }
  }
}

export default new SyncService()

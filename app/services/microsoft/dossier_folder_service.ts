import oneDriveService from './onedrive_service.js'
import Dossier from '#models/dossier'
import Client from '#models/client'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'

const ROOT_FOLDER_NAME = 'Portail Cabinet'
const CLIENTS_FOLDER_NAME = 'Clients'
const CABINET_FOLDER_NAME = 'CABINET'
const CLIENT_FOLDER_NAME = 'CLIENT'

/**
 * Service for managing dossier folder structure in OneDrive
 *
 * Structure:
 * /Portail Cabinet/
 *   └── Clients/
 *       └── {ClientName}/
 *           └── {DossierRef} - {DossierIntitule}/
 *               ├── CABINET/    ← Documents internes (non visibles client)
 *               └── CLIENT/     ← Documents visibles par le client
 */
class DossierFolderService {
  /**
   * Sanitize folder name (remove invalid characters for OneDrive)
   * Invalid chars: " * : < > ? / \ |
   */
  private sanitizeFolderName(name: string): string {
    return name
      .replace(/[\"*:<>?\/\\|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 250) // OneDrive folder name limit
  }

  /**
   * Get the full folder path for a dossier
   */
  getDossierFolderPath(clientName: string, dossierRef: string, dossierIntitule: string): string {
    const sanitizedClientName = this.sanitizeFolderName(clientName)
    const sanitizedDossierName = this.sanitizeFolderName(`${dossierRef} - ${dossierIntitule}`)

    return `/${ROOT_FOLDER_NAME}/${CLIENTS_FOLDER_NAME}/${sanitizedClientName}/${sanitizedDossierName}`
  }

  /**
   * Get the subfolder path for CABINET or CLIENT
   */
  getSubfolderPath(
    clientName: string,
    dossierRef: string,
    dossierIntitule: string,
    location: 'cabinet' | 'client'
  ): string {
    const basePath = this.getDossierFolderPath(clientName, dossierRef, dossierIntitule)
    return `${basePath}/${location === 'cabinet' ? CABINET_FOLDER_NAME : CLIENT_FOLDER_NAME}`
  }

  /**
   * Initialize the root folder structure
   * Creates: /Portail Cabinet/Clients/
   */
  async initializeRootStructure(): Promise<{
    success: boolean
    rootFolderId?: string
    error?: string
  }> {
    const isReady = await oneDriveService.isReady()
    if (!isReady) {
      return { success: false, error: 'OneDrive not connected' }
    }

    // Create root folder
    const rootResult = await oneDriveService.getOrCreateRootFolder(ROOT_FOLDER_NAME)
    if (!rootResult.success) {
      return { success: false, error: rootResult.error }
    }

    // Create Clients subfolder
    const clientsResult = await oneDriveService.createFolder(
      rootResult.folderId!,
      CLIENTS_FOLDER_NAME
    )
    if (!clientsResult.success) {
      return { success: false, error: clientsResult.error }
    }

    return { success: true, rootFolderId: rootResult.folderId }
  }

  /**
   * Create or get the OneDrive folder for a specific dossier
   * Creates the main folder plus CABINET and CLIENT subfolders
   */
  async createDossierFolder(dossierId: string): Promise<{
    success: boolean
    folderId?: string
    folderPath?: string
    cabinetFolderId?: string
    clientFolderId?: string
    error?: string
  }> {
    const isReady = await oneDriveService.isReady()
    if (!isReady) {
      return { success: false, error: 'OneDrive not connected' }
    }

    // Load dossier with client
    const dossier = await Dossier.query().where('id', dossierId).preload('client').first()

    if (!dossier) {
      return { success: false, error: 'Dossier not found' }
    }

    // If all folders already exist, return them
    if (
      dossier.onedriveFolderId &&
      dossier.onedriveCabinetFolderId &&
      dossier.onedriveClientFolderId
    ) {
      // Verify they still exist on OneDrive
      const folderInfo = await oneDriveService.getFolderInfo(dossier.onedriveFolderId)
      if (folderInfo) {
        return {
          success: true,
          folderId: dossier.onedriveFolderId,
          folderPath: dossier.onedriveFolderPath || undefined,
          cabinetFolderId: dossier.onedriveCabinetFolderId,
          clientFolderId: dossier.onedriveClientFolderId,
        }
      }
      // Folders were deleted on OneDrive, recreate them
    }

    // Build folder path
    const clientName = `${dossier.client.prenom} ${dossier.client.nom}`
    const folderPath = this.getDossierFolderPath(clientName, dossier.reference, dossier.intitule)

    // Create the main dossier folder
    const mainResult = await oneDriveService.createFolderByPath(folderPath)

    if (!mainResult.success) {
      return { success: false, error: mainResult.error }
    }

    // Create CABINET subfolder
    const cabinetResult = await oneDriveService.createFolder(
      mainResult.folderId!,
      CABINET_FOLDER_NAME
    )
    if (!cabinetResult.success) {
      logger.error({ error: cabinetResult.error }, 'Failed to create CABINET folder')
    }

    // Create CLIENT subfolder
    const clientResult = await oneDriveService.createFolder(
      mainResult.folderId!,
      CLIENT_FOLDER_NAME
    )
    if (!clientResult.success) {
      logger.error({ error: clientResult.error }, 'Failed to create CLIENT folder')
    }

    // Update dossier with OneDrive info
    dossier.onedriveFolderId = mainResult.folderId!
    dossier.onedriveFolderPath = mainResult.folderPath!
    dossier.onedriveCabinetFolderId = cabinetResult.folderId || null
    dossier.onedriveClientFolderId = clientResult.folderId || null
    dossier.onedriveLastSync = DateTime.now()
    await dossier.save()

    return {
      success: true,
      folderId: mainResult.folderId,
      folderPath: mainResult.folderPath,
      cabinetFolderId: cabinetResult.folderId,
      clientFolderId: clientResult.folderId,
    }
  }

  /**
   * Sync all dossiers that don't have OneDrive folders yet
   */
  async syncAllDossiers(): Promise<{
    success: boolean
    synced: number
    errors: number
    details: string[]
  }> {
    const isReady = await oneDriveService.isReady()
    if (!isReady) {
      return { success: false, synced: 0, errors: 0, details: ['OneDrive not connected'] }
    }

    // Initialize root structure first
    const initResult = await this.initializeRootStructure()
    if (!initResult.success) {
      return {
        success: false,
        synced: 0,
        errors: 0,
        details: [initResult.error || 'Failed to initialize'],
      }
    }

    // Get all dossiers without complete OneDrive folders
    const dossiers = await Dossier.query()
      .where((query) => {
        query
          .whereNull('onedriveFolderId')
          .orWhereNull('onedriveCabinetFolderId')
          .orWhereNull('onedriveClientFolderId')
      })
      .preload('client')

    let synced = 0
    let errors = 0
    const details: string[] = []

    for (const dossier of dossiers) {
      const result = await this.createDossierFolder(dossier.id)

      if (result.success) {
        synced++
        details.push(`Created folder structure for dossier ${dossier.reference}`)
      } else {
        errors++
        details.push(`Failed to create folder for ${dossier.reference}: ${result.error}`)
      }
    }

    return {
      success: errors === 0,
      synced,
      errors,
      details,
    }
  }

  /**
   * Update folder name when dossier is renamed
   */
  async updateDossierFolder(dossierId: string): Promise<boolean> {
    const dossier = await Dossier.query().where('id', dossierId).preload('client').first()

    if (!dossier || !dossier.onedriveFolderId) {
      return false
    }

    const clientName = `${dossier.client.prenom} ${dossier.client.nom}`
    const newFolderName = this.sanitizeFolderName(`${dossier.reference} - ${dossier.intitule}`)

    const success = await oneDriveService.renameItem(dossier.onedriveFolderId, newFolderName)

    if (success) {
      // Update the stored path
      dossier.onedriveFolderPath = this.getDossierFolderPath(
        clientName,
        dossier.reference,
        dossier.intitule
      )
      dossier.onedriveLastSync = DateTime.now()
      await dossier.save()
    }

    return success
  }

  /**
   * Create folder for a client (for organizing multiple dossiers)
   */
  async createClientFolder(clientId: string): Promise<{
    success: boolean
    folderId?: string
    error?: string
  }> {
    const client = await Client.find(clientId)
    if (!client) {
      return { success: false, error: 'Client not found' }
    }

    const isReady = await oneDriveService.isReady()
    if (!isReady) {
      return { success: false, error: 'OneDrive not connected' }
    }

    // Initialize root structure
    const initResult = await this.initializeRootStructure()
    if (!initResult.success) {
      return { success: false, error: initResult.error }
    }

    // Create client folder
    const clientName = this.sanitizeFolderName(`${client.prenom} ${client.nom}`)
    const folderPath = `/${ROOT_FOLDER_NAME}/${CLIENTS_FOLDER_NAME}/${clientName}`

    return await oneDriveService.createFolderByPath(folderPath)
  }

  /**
   * Get the folder ID for a dossier location, creating it if necessary
   * @param dossierId - The dossier ID
   * @param location - 'cabinet' for internal docs, 'client' for client-visible docs
   */
  async ensureDossierFolder(
    dossierId: string,
    location: 'cabinet' | 'client' = 'client'
  ): Promise<string | null> {
    const dossier = await Dossier.find(dossierId)

    if (!dossier) {
      return null
    }

    // Check if we have the specific subfolder ID
    const subFolderId =
      location === 'cabinet' ? dossier.onedriveCabinetFolderId : dossier.onedriveClientFolderId

    if (subFolderId) {
      // Verify folder exists
      const folderInfo = await oneDriveService.getFolderInfo(subFolderId)
      if (folderInfo) {
        return subFolderId
      }
    }

    // Create the folder structure (main + CABINET + CLIENT)
    const result = await this.createDossierFolder(dossierId)

    if (!result.success) {
      return null
    }

    return location === 'cabinet' ? result.cabinetFolderId! : result.clientFolderId!
  }

  /**
   * Migrate existing documents to the new folder structure
   * This moves documents that are visibleClient=false to CABINET
   * and documents that are visibleClient=true to CLIENT
   */
  async migrateExistingDocuments(dossierId: string): Promise<{
    success: boolean
    moved: number
    errors: number
    details: string[]
  }> {
    const dossier = await Dossier.query().where('id', dossierId).preload('documents').first()

    if (!dossier) {
      return { success: false, moved: 0, errors: 0, details: ['Dossier not found'] }
    }

    const isReady = await oneDriveService.isReady()
    if (!isReady) {
      return { success: false, moved: 0, errors: 0, details: ['OneDrive not connected'] }
    }

    // Ensure folder structure exists
    const folderResult = await this.createDossierFolder(dossierId)
    if (!folderResult.success) {
      return {
        success: false,
        moved: 0,
        errors: 0,
        details: [folderResult.error || 'Failed to create folders'],
      }
    }

    let moved = 0
    let errors = 0
    const details: string[] = []

    for (const document of dossier.documents) {
      if (!document.onedriveFileId) {
        continue // Skip documents not on OneDrive
      }

      // Determine target location based on visibility
      const targetLocation: 'cabinet' | 'client' = document.visibleClient ? 'client' : 'cabinet'
      const targetFolderId =
        targetLocation === 'cabinet' ? folderResult.cabinetFolderId : folderResult.clientFolderId

      if (!targetFolderId) {
        errors++
        details.push(`No target folder for ${document.nom}`)
        continue
      }

      // Move the file
      const success = await oneDriveService.moveItem(document.onedriveFileId, targetFolderId)

      if (success) {
        // Update document record
        document.dossierLocation = targetLocation
        await document.save()
        moved++
        details.push(`Moved ${document.nom} to ${targetLocation.toUpperCase()}`)
      } else {
        errors++
        details.push(`Failed to move ${document.nom}`)
      }
    }

    return {
      success: errors === 0,
      moved,
      errors,
      details,
    }
  }
}

export default new DossierFolderService()

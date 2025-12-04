import oneDriveService from './onedrive_service.js'
import Dossier from '#models/dossier'
import Client from '#models/client'
import { DateTime } from 'luxon'

const ROOT_FOLDER_NAME = 'Portail Cabinet'
const CLIENTS_FOLDER_NAME = 'Clients'

/**
 * Service for managing dossier folder structure in OneDrive
 *
 * Structure:
 * /Portail Cabinet/
 *   └── Clients/
 *       └── {ClientName}/
 *           └── {DossierRef} - {DossierIntitule}/
 *               └── [Documents...]
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
   * Initialize the root folder structure
   * Creates: /Portail Cabinet/Clients/
   */
  async initializeRootStructure(): Promise<{ success: boolean; rootFolderId?: string; error?: string }> {
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
    const clientsResult = await oneDriveService.createFolder(rootResult.folderId!, CLIENTS_FOLDER_NAME)
    if (!clientsResult.success) {
      return { success: false, error: clientsResult.error }
    }

    return { success: true, rootFolderId: rootResult.folderId }
  }

  /**
   * Create or get the OneDrive folder for a specific dossier
   */
  async createDossierFolder(dossierId: string): Promise<{
    success: boolean
    folderId?: string
    folderPath?: string
    error?: string
  }> {
    const isReady = await oneDriveService.isReady()
    if (!isReady) {
      return { success: false, error: 'OneDrive not connected' }
    }

    // Load dossier with client
    const dossier = await Dossier.query()
      .where('id', dossierId)
      .preload('client')
      .first()

    if (!dossier) {
      return { success: false, error: 'Dossier not found' }
    }

    // If folder already exists, return it
    if (dossier.onedriveFolderId) {
      // Verify it still exists on OneDrive
      const folderInfo = await oneDriveService.getFolderInfo(dossier.onedriveFolderId)
      if (folderInfo) {
        return {
          success: true,
          folderId: dossier.onedriveFolderId,
          folderPath: dossier.onedriveFolderPath || undefined,
        }
      }
      // Folder was deleted on OneDrive, recreate it
    }

    // Build folder path
    const clientName = `${dossier.client.prenom} ${dossier.client.nom}`
    const folderPath = this.getDossierFolderPath(clientName, dossier.reference, dossier.intitule)

    // Create the folder
    const result = await oneDriveService.createFolderByPath(folderPath)

    if (result.success) {
      // Update dossier with OneDrive info
      dossier.onedriveFolderId = result.folderId!
      dossier.onedriveFolderPath = result.folderPath!
      dossier.onedriveLastSync = DateTime.now()
      await dossier.save()
    }

    return result
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
      return { success: false, synced: 0, errors: 0, details: [initResult.error || 'Failed to initialize'] }
    }

    // Get all dossiers without OneDrive folder
    const dossiers = await Dossier.query()
      .whereNull('onedriveFolderId')
      .preload('client')

    let synced = 0
    let errors = 0
    const details: string[] = []

    for (const dossier of dossiers) {
      const result = await this.createDossierFolder(dossier.id)

      if (result.success) {
        synced++
        details.push(`Created folder for dossier ${dossier.reference}`)
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
    const dossier = await Dossier.query()
      .where('id', dossierId)
      .preload('client')
      .first()

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
   * Get the folder ID for a dossier, creating it if necessary
   */
  async ensureDossierFolder(dossierId: string): Promise<string | null> {
    const dossier = await Dossier.find(dossierId)

    if (!dossier) {
      return null
    }

    if (dossier.onedriveFolderId) {
      // Verify folder exists
      const folderInfo = await oneDriveService.getFolderInfo(dossier.onedriveFolderId)
      if (folderInfo) {
        return dossier.onedriveFolderId
      }
    }

    // Create the folder
    const result = await this.createDossierFolder(dossierId)
    return result.success ? result.folderId! : null
  }
}

export default new DossierFolderService()

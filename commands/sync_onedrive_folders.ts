import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'
import Dossier from '#models/dossier'
import dossierFolderService from '#services/microsoft/dossier_folder_service'

export default class SyncOnedriveFolders extends BaseCommand {
  static commandName = 'onedrive:sync-folders'
  static description = 'Synchronise tous les dossiers existants sur OneDrive (cree les dossiers CABINET/CLIENT)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    this.logger.info('Demarrage de la synchronisation OneDrive...')

    // Recuperer tous les dossiers sans dossier OneDrive
    const dossiers = await Dossier.query()
      .whereNull('onedrive_folder_id')
      .orWhereNull('onedrive_cabinet_folder_id')
      .orWhereNull('onedrive_client_folder_id')
      .preload('client')

    if (dossiers.length === 0) {
      this.logger.success('Tous les dossiers sont deja synchronises sur OneDrive!')
      return
    }

    this.logger.info(`${dossiers.length} dossier(s) a synchroniser...`)

    let successCount = 0
    let errorCount = 0

    for (const dossier of dossiers) {
      const clientName = dossier.client?.fullName || 'Client Inconnu'
      this.logger.info(`  Synchronisation: ${dossier.reference} - ${dossier.intitule} (${clientName})`)

      try {
        const result = await dossierFolderService.createDossierFolder(dossier.id)

        if (result.success) {
          this.logger.success(`    ✓ Dossier cree: ${result.folderPath}`)
          successCount++
        } else {
          this.logger.error(`    ✗ Erreur: ${result.error}`)
          errorCount++
        }
      } catch (error) {
        this.logger.error(`    ✗ Exception: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
        errorCount++
      }
    }

    this.logger.info('')
    this.logger.info('=== Resultats ===')
    this.logger.success(`${successCount} dossier(s) synchronise(s) avec succes`)
    if (errorCount > 0) {
      this.logger.error(`${errorCount} erreur(s)`)
    }
  }
}

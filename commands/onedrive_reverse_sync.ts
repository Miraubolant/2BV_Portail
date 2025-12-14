import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'

export default class OnedriveReverseSync extends BaseCommand {
  static commandName = 'onedrive:reverse-sync'
  static description = 'Scanner les dossiers OneDrive et importer les fichiers vers les dossiers existants'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const { default: syncService } = await import('#services/microsoft/sync_service')

    this.logger.info('Demarrage du sync inverse OneDrive...')
    this.logger.info('Scan du dossier /Portail Cabinet/Clients/...')

    const result = await syncService.reverseSyncFromOneDrive()

    if (result.success) {
      this.logger.success(`Sync inverse termine avec succes!`)
    } else {
      this.logger.warning(`Sync inverse termine avec des erreurs`)
    }

    this.logger.info(`Fichiers importes: ${result.created}`)
    this.logger.info(`Dossiers lies: ${result.linkedDossiers}`)
    this.logger.info(`Erreurs: ${result.errors}`)

    if (result.unmatchedClients.length > 0) {
      this.logger.warning(`Dossiers clients non reconnus: ${result.unmatchedClients.length}`)
      for (const client of result.unmatchedClients) {
        this.logger.info(`  - ${client}`)
      }
    }

    if (result.unmatchedDossiers.length > 0) {
      this.logger.warning(`Dossiers affaires non reconnus: ${result.unmatchedDossiers.length}`)
      for (const dossier of result.unmatchedDossiers) {
        this.logger.info(`  - ${dossier}`)
      }
    }

    // Show some details
    if (result.details.length > 0) {
      this.logger.info('\nDetails:')
      for (const detail of result.details.slice(0, 20)) {
        this.logger.info(`  ${detail}`)
      }
      if (result.details.length > 20) {
        this.logger.info(`  ... et ${result.details.length - 20} autres`)
      }
    }
  }
}

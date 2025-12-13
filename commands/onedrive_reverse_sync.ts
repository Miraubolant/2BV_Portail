import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'

export default class OnedriveReverseSync extends BaseCommand {
  static commandName = 'onedrive:reverse-sync'
  static description = 'Scan OneDrive folders and import files to existing dossiers'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const { default: syncService } = await import('#services/microsoft/sync_service')

    this.logger.info('Starting OneDrive reverse sync...')
    this.logger.info('Scanning /Portail Cabinet/Clients/ folder...')

    const result = await syncService.reverseSyncFromOneDrive()

    if (result.success) {
      this.logger.success(`Reverse sync completed successfully!`)
    } else {
      this.logger.warning(`Reverse sync completed with issues`)
    }

    this.logger.info(`Files imported: ${result.created}`)
    this.logger.info(`Dossiers linked: ${result.linkedDossiers}`)
    this.logger.info(`Errors: ${result.errors}`)

    if (result.unmatchedClients.length > 0) {
      this.logger.warning(`Unmatched client folders: ${result.unmatchedClients.length}`)
      for (const client of result.unmatchedClients) {
        this.logger.info(`  - ${client}`)
      }
    }

    if (result.unmatchedDossiers.length > 0) {
      this.logger.warning(`Unmatched dossier folders: ${result.unmatchedDossiers.length}`)
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
        this.logger.info(`  ... and ${result.details.length - 20} more`)
      }
    }
  }
}

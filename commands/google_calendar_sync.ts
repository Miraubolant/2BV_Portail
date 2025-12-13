import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'

export default class GoogleCalendarSync extends BaseCommand {
  static commandName = 'google:sync'
  static description = 'Synchroniser les événements avec Google Calendar (bidirectionnel)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    try {
      const { default: calendarSyncService } = await import(
        '#services/google/calendar_sync_service'
      )
      const { default: googleOAuthService } = await import('#services/google/google_oauth_service')

      this.logger.info('Demarrage de la synchronisation Google Calendar...')

      // Verifier la connexion
      const isConfigured = googleOAuthService.isConfigured()
      if (!isConfigured) {
        this.logger.warning('Google Calendar non configure. Synchronisation ignoree.')
        this.exitCode = 0
        return
      }

      const isConnected = await googleOAuthService.isConnected()
      if (!isConnected) {
        this.logger.warning('Google Calendar non connecte. Synchronisation ignoree.')
        this.exitCode = 0
        return
      }

      this.logger.info('Envoi des evenements vers Google Calendar...')

      // Push vers Google
      const pushResult = await calendarSyncService.fullSync(undefined, { pullFromGoogle: false })

      if (pushResult.success) {
        this.logger.success('Push termine avec succes')
      } else {
        this.logger.warning('Push termine avec des erreurs')
      }

      this.logger.info(`  - Crees: ${pushResult.created}`)
      this.logger.info(`  - Mis a jour: ${pushResult.updated}`)
      this.logger.info(`  - Erreurs: ${pushResult.errors}`)

      // Pull depuis Google
      this.logger.info('Import des evenements depuis Google Calendar...')

      const pullResult = await calendarSyncService.pullFromGoogle()

      if (pullResult.success) {
        this.logger.success('Import termine avec succes')
      } else {
        this.logger.warning('Import termine avec des erreurs')
      }

      this.logger.info(`  - Importes: ${pullResult.created}`)
      this.logger.info(`  - Existants: ${pullResult.updated}`)
      this.logger.info(`  - Erreurs: ${pullResult.errors}`)

      // Resume
      const totalCreated = pushResult.created + pullResult.created
      const totalUpdated = pushResult.updated + pullResult.updated
      const totalErrors = pushResult.errors + pullResult.errors

      this.logger.info('')
      if (totalErrors === 0) {
        this.logger.success(
          `Synchronisation terminee: ${totalCreated} crees, ${totalUpdated} mis a jour`
        )
      } else {
        this.logger.warning(
          `Synchronisation terminee avec ${totalErrors} erreurs: ${totalCreated} crees, ${totalUpdated} mis a jour`
        )
      }

      // Afficher quelques details
      if (pushResult.details.length > 0 || pullResult.details.length > 0) {
        this.logger.info('')
        this.logger.info('Details:')
        const allDetails = [...pushResult.details.slice(0, 10), ...pullResult.details.slice(0, 10)]
        for (const detail of allDetails) {
          this.logger.info(`  ${detail}`)
        }
        const remaining =
          pushResult.details.length + pullResult.details.length - allDetails.length
        if (remaining > 0) {
          this.logger.info(`  ... et ${remaining} autres operations`)
        }
      }

      this.exitCode = 0
    } catch (error) {
      this.logger.error(`Erreur lors de la synchronisation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`)
      this.exitCode = 1
    }
  }
}

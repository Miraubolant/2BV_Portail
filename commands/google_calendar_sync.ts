import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'

export default class GoogleCalendarSync extends BaseCommand {
  static commandName = 'google:sync'
  static description = 'Synchroniser les événements avec Google Calendar (multi-calendriers)'

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

      // Verifier la configuration
      const isConfigured = googleOAuthService.isConfigured()
      if (!isConfigured) {
        this.logger.warning('Google Calendar non configure. Synchronisation ignoree.')
        await calendarSyncService.logSkippedSync('not_configured', 'auto')
        this.exitCode = 0
        return
      }

      // Verifier s'il y a des comptes connectes
      const accounts = await googleOAuthService.getAllConnectedAccounts()
      if (accounts.length === 0) {
        this.logger.warning('Aucun compte Google connecte. Synchronisation ignoree.')
        await calendarSyncService.logSkippedSync('no_accounts', 'auto')
        this.exitCode = 0
        return
      }

      this.logger.info(`${accounts.length} compte(s) Google connecte(s)`)

      // Compter les calendriers actifs
      const activeCalendars = await googleOAuthService.getAllActiveCalendars()
      if (activeCalendars.length === 0) {
        this.logger.warning('Aucun calendrier actif configure. Synchronisation ignoree.')
        await calendarSyncService.logSkippedSync('no_calendars', 'auto')
        this.exitCode = 0
        return
      }

      this.logger.info(`${activeCalendars.length} calendrier(s) actif(s)`)

      // Synchronisation bidirectionnelle multi-calendriers
      this.logger.info('Synchronisation bidirectionnelle en cours...')

      const result = await calendarSyncService.fullSyncMultiCalendar(undefined, {
        pullFromGoogle: true,
      })

      if (result.success) {
        this.logger.success('Synchronisation terminee avec succes')
      } else {
        this.logger.warning('Synchronisation terminee avec des erreurs')
      }

      this.logger.info(`  - Crees: ${result.created}`)
      this.logger.info(`  - Mis a jour: ${result.updated}`)
      this.logger.info(`  - Supprimes: ${result.deleted}`)
      this.logger.info(`  - Erreurs: ${result.errors}`)

      // Afficher quelques details
      if (result.details.length > 0) {
        this.logger.info('')
        this.logger.info('Details:')
        const displayDetails = result.details.slice(0, 15)
        for (const detail of displayDetails) {
          this.logger.info(`  ${detail}`)
        }
        const remaining = result.details.length - displayDetails.length
        if (remaining > 0) {
          this.logger.info(`  ... et ${remaining} autres operations`)
        }
      }

      this.exitCode = result.success ? 0 : 1
    } catch (error) {
      this.logger.error(
        `Erreur lors de la synchronisation: ${error instanceof Error ? error.message : 'Erreur inconnue'}`
      )
      this.exitCode = 1
    }
  }
}

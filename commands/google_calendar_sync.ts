import { BaseCommand } from '@adonisjs/core/ace'
import { CommandOptions } from '@adonisjs/core/types/ace'

export default class GoogleCalendarSync extends BaseCommand {
  static commandName = 'google:sync'
  static description = 'Synchroniser les événements avec Google Calendar (bidirectionnel)'

  static options: CommandOptions = {
    startApp: true,
  }

  async run() {
    const { default: calendarSyncService } = await import(
      '#services/google/calendar_sync_service'
    )
    const { default: googleOAuthService } = await import('#services/google/google_oauth_service')

    this.logger.info('Démarrage de la synchronisation Google Calendar...')

    // Vérifier la connexion
    const isConfigured = googleOAuthService.isConfigured()
    if (!isConfigured) {
      this.logger.error('Google Calendar non configuré. Veuillez ajouter les clés API dans .env')
      return
    }

    const isConnected = await googleOAuthService.isConnected()
    if (!isConnected) {
      this.logger.error(
        'Google Calendar non connecté. Veuillez vous connecter via les paramètres admin.'
      )
      return
    }

    this.logger.info('Envoi des événements vers Google Calendar...')

    // Push vers Google
    const pushResult = await calendarSyncService.fullSync(undefined, { pullFromGoogle: false })

    if (pushResult.success) {
      this.logger.success('Push terminé avec succès')
    } else {
      this.logger.warning('Push terminé avec des erreurs')
    }

    this.logger.info(`  - Créés: ${pushResult.created}`)
    this.logger.info(`  - Mis à jour: ${pushResult.updated}`)
    this.logger.info(`  - Erreurs: ${pushResult.errors}`)

    // Pull depuis Google
    this.logger.info('Import des événements depuis Google Calendar...')

    const pullResult = await calendarSyncService.pullFromGoogle()

    if (pullResult.success) {
      this.logger.success('Import terminé avec succès')
    } else {
      this.logger.warning('Import terminé avec des erreurs')
    }

    this.logger.info(`  - Importés: ${pullResult.created}`)
    this.logger.info(`  - Existants: ${pullResult.updated}`)
    this.logger.info(`  - Erreurs: ${pullResult.errors}`)

    // Résumé
    const totalCreated = pushResult.created + pullResult.created
    const totalUpdated = pushResult.updated + pullResult.updated
    const totalErrors = pushResult.errors + pullResult.errors

    this.logger.info('')
    if (totalErrors === 0) {
      this.logger.success(
        `Synchronisation terminée: ${totalCreated} créés, ${totalUpdated} mis à jour`
      )
    } else {
      this.logger.warning(
        `Synchronisation terminée avec ${totalErrors} erreurs: ${totalCreated} créés, ${totalUpdated} mis à jour`
      )
    }

    // Afficher quelques détails
    if (pushResult.details.length > 0 || pullResult.details.length > 0) {
      this.logger.info('')
      this.logger.info('Détails:')
      const allDetails = [...pushResult.details.slice(0, 10), ...pullResult.details.slice(0, 10)]
      for (const detail of allDetails) {
        this.logger.info(`  ${detail}`)
      }
      const remaining =
        pushResult.details.length + pullResult.details.length - allDetails.length
      if (remaining > 0) {
        this.logger.info(`  ... et ${remaining} autres opérations`)
      }
    }
  }
}

import googleCalendarService from './google_calendar_service.js'
import Evenement from '#models/evenement'
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

class CalendarSyncService {
  /**
   * Sync a single event to Google Calendar (Portail -> Google)
   * Called after event creation/update
   */
  async syncEventToGoogle(evenementId: string): Promise<{ success: boolean; error?: string }> {
    const evenement = await Evenement.find(evenementId)
    if (!evenement) {
      return { success: false, error: 'Event not found' }
    }

    if (!evenement.syncGoogle) {
      return { success: true } // Sync disabled for this event
    }

    const isReady = await googleCalendarService.isReady()
    if (!isReady) {
      return { success: false, error: 'Google Calendar not connected' }
    }

    try {
      if (evenement.googleEventId) {
        // Update existing event
        const result = await googleCalendarService.updateEvent(evenement)
        if (result.success) {
          evenement.googleLastSync = DateTime.now()
          await evenement.save()
        }
        return result
      } else {
        // Create new event
        const result = await googleCalendarService.createEvent(evenement)
        if (result.success && result.googleEventId) {
          evenement.googleEventId = result.googleEventId
          evenement.googleLastSync = DateTime.now()
          await evenement.save()
        }
        return result
      }
    } catch (error) {
      console.error('Error syncing event to Google:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Delete event from Google when deleted in Portail
   */
  async deleteEventFromGoogle(googleEventId: string): Promise<{ success: boolean; error?: string }> {
    const isReady = await googleCalendarService.isReady()
    if (!isReady) {
      return { success: false, error: 'Google Calendar not connected' }
    }

    return await googleCalendarService.deleteEvent(googleEventId)
  }

  /**
   * Full sync: Push all portal events with syncGoogle=true to Google
   */
  async fullSync(
    triggeredById?: string,
    options?: { pullFromGoogle?: boolean }
  ): Promise<SyncResult> {
    const startTime = Date.now()
    const details: string[] = []
    let created = 0
    let updated = 0
    let deleted = 0
    let errors = 0

    const isReady = await googleCalendarService.isReady()
    if (!isReady) {
      return {
        success: false,
        synced: 0,
        created: 0,
        updated: 0,
        deleted: 0,
        errors: 1,
        message: 'Google Calendar not connected',
        details: ['Google Calendar is not connected. Please connect first.'],
      }
    }

    try {
      // Get all events that should be synced
      const evenements = await Evenement.query()
        .where('sync_google', true)
        .orderBy('date_debut', 'asc')

      details.push(`Found ${evenements.length} events to sync`)

      for (const evenement of evenements) {
        try {
          if (evenement.googleEventId) {
            // Update existing event
            const result = await googleCalendarService.updateEvent(evenement)
            if (result.success) {
              evenement.googleLastSync = DateTime.now()
              await evenement.save()
              updated++
              details.push(`Updated: ${evenement.titre}`)
            } else {
              errors++
              details.push(`Error updating ${evenement.titre}: ${result.error}`)
            }
          } else {
            // Create new event
            const result = await googleCalendarService.createEvent(evenement)
            if (result.success && result.googleEventId) {
              evenement.googleEventId = result.googleEventId
              evenement.googleLastSync = DateTime.now()
              await evenement.save()
              created++
              details.push(`Created: ${evenement.titre}`)
            } else {
              errors++
              details.push(`Error creating ${evenement.titre}: ${result.error}`)
            }
          }
        } catch (error) {
          errors++
          details.push(
            `Error syncing ${evenement.titre}: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      }

      // Optional: Pull events from Google Calendar
      if (options?.pullFromGoogle) {
        const pullResult = await this.pullFromGoogle(triggeredById)
        created += pullResult.created
        updated += pullResult.updated
        errors += pullResult.errors
        details.push(...pullResult.details)
      }

      const duration = Date.now() - startTime
      const success = errors === 0

      // Log sync operation
      await this.logSyncOperation({
        mode: 'manual',
        statut: success ? 'success' : errors < created + updated ? 'partial' : 'error',
        elementsTraites: evenements.length,
        elementsCrees: created,
        elementsModifies: updated,
        elementsSupprimes: deleted,
        elementsErreur: errors,
        message: success
          ? `Sync completed: ${created} created, ${updated} updated`
          : `Sync completed with ${errors} errors`,
        details,
        dureeMs: duration,
        triggeredById,
      })

      return {
        success,
        synced: created + updated,
        created,
        updated,
        deleted,
        errors,
        message: success
          ? `Synchronisation terminee: ${created} crees, ${updated} mis a jour`
          : `Synchronisation terminee avec ${errors} erreurs`,
        details,
      }
    } catch (error) {
      const duration = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      await this.logSyncOperation({
        mode: 'manual',
        statut: 'error',
        elementsTraites: 0,
        elementsCrees: created,
        elementsModifies: updated,
        elementsSupprimes: deleted,
        elementsErreur: 1,
        message: `Sync failed: ${errorMessage}`,
        details: [errorMessage],
        dureeMs: duration,
        triggeredById,
      })

      return {
        success: false,
        synced: 0,
        created,
        updated,
        deleted,
        errors: 1,
        message: `Erreur: ${errorMessage}`,
        details: [errorMessage],
      }
    }
  }

  /**
   * Pull events from Google Calendar to Portail
   * Only processes events that have portalEventId in extendedProperties
   * to avoid duplicates from events created outside portal
   */
  async pullFromGoogle(triggeredById?: string): Promise<SyncResult> {
    const details: string[] = []
    let created = 0
    let updated = 0
    const deleted = 0
    let errors = 0

    const isReady = await googleCalendarService.isReady()
    if (!isReady) {
      return {
        success: false,
        synced: 0,
        created: 0,
        updated: 0,
        deleted: 0,
        errors: 1,
        message: 'Google Calendar not connected',
        details: ['Google Calendar is not connected'],
      }
    }

    try {
      // Get events from Google Calendar (last 6 months to next 6 months)
      const timeMin = DateTime.now().minus({ months: 6 }).toISO()!
      const timeMax = DateTime.now().plus({ months: 6 }).toISO()!

      const googleEvents = await googleCalendarService.listEvents({
        timeMin,
        timeMax,
        maxResults: 500,
      })

      details.push(`Found ${googleEvents.length} events in Google Calendar`)

      // Get all portal events that have a Google event ID
      const portalEvents = await Evenement.query().whereNotNull('google_event_id')

      const portalEventMap = new Map<string, Evenement>()
      for (const event of portalEvents) {
        if (event.googleEventId) {
          portalEventMap.set(event.googleEventId, event)
        }
      }

      // Process Google events - only update existing portal events
      for (const googleEvent of googleEvents) {
        if (!googleEvent.id) continue

        const portalEvent = portalEventMap.get(googleEvent.id)
        if (portalEvent) {
          // Check if Google event is newer than portal event
          // For now, we just log that we found it
          details.push(`Found matching event: ${googleEvent.summary}`)
          updated++
        }
        // We don't create new events from Google to avoid duplicates
        // Events should always be created in the portal first
      }

      return {
        success: true,
        synced: updated,
        created,
        updated,
        deleted,
        errors,
        message: `Import termine: ${updated} evenements trouves`,
        details,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      return {
        success: false,
        synced: 0,
        created,
        updated,
        deleted,
        errors: 1,
        message: `Erreur: ${errorMessage}`,
        details: [errorMessage],
      }
    }
  }

  /**
   * Log sync operation to sync_logs table
   */
  private async logSyncOperation(data: {
    mode: 'auto' | 'manual'
    statut: 'success' | 'partial' | 'error'
    elementsTraites: number
    elementsCrees: number
    elementsModifies: number
    elementsSupprimes: number
    elementsErreur: number
    message: string
    details: string[]
    dureeMs: number
    triggeredById?: string
  }): Promise<void> {
    try {
      await SyncLog.create({
        type: 'google_calendar',
        mode: data.mode,
        statut: data.statut,
        elementsTraites: data.elementsTraites,
        elementsCrees: data.elementsCrees,
        elementsModifies: data.elementsModifies,
        elementsSupprimes: data.elementsSupprimes,
        elementsErreur: data.elementsErreur,
        message: data.message,
        details: data.details,
        dureeMs: data.dureeMs,
        triggeredById: data.triggeredById || null,
      })
    } catch (error) {
      console.error('Failed to log sync operation:', error)
    }
  }

  /**
   * Get sync history for Google Calendar
   */
  async getSyncHistory(limit: number = 50): Promise<SyncLog[]> {
    return await SyncLog.query()
      .where('type', 'google_calendar')
      .orderBy('created_at', 'desc')
      .limit(limit)
  }
}

export default new CalendarSyncService()

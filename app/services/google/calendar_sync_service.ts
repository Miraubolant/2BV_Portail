import googleCalendarService from './google_calendar_service.js'
import Evenement from '#models/evenement'
import SyncLog from '#models/sync_log'
import Dossier from '#models/dossier'
import GoogleCalendar from '#models/google_calendar'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import ActivityLogger from '#services/activity_logger'

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
   * Uses the event's googleCalendarId if set, otherwise falls back to legacy behavior
   */
  async syncEventToGoogle(evenementId: string): Promise<{ success: boolean; error?: string }> {
    const evenement = await Evenement.find(evenementId)
    if (!evenement) {
      return { success: false, error: 'Event not found' }
    }

    if (!evenement.syncGoogle) {
      return { success: true } // Sync disabled for this event
    }

    try {
      // Check if event has a specific calendar target (new multi-calendar mode)
      if (evenement.googleCalendarId) {
        return await this.syncEventToCalendar(evenement, evenement.googleCalendarId)
      }

      // Legacy fallback: use the old single-calendar behavior
      const isReady = await googleCalendarService.isReady()
      if (!isReady) {
        return { success: false, error: 'Google Calendar not connected' }
      }

      if (evenement.googleEventId) {
        // Update existing event
        const result = await googleCalendarService.updateEvent(evenement)
        if (result.success && !result.skipped) {
          evenement.googleLastSync = DateTime.now()
          await evenement.save()
        }
        return { success: result.success, error: result.error }
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
      logger.error({ err: error }, 'Error syncing event to Google')
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Sync a single event to a specific Google Calendar (multi-calendar mode)
   */
  async syncEventToCalendar(
    evenement: Evenement,
    googleCalendarDbId: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      if (evenement.googleEventId) {
        // Update existing event
        const result = await googleCalendarService.updateEventOnCalendar(
          evenement,
          googleCalendarDbId
        )
        if (result.success && !result.skipped) {
          evenement.googleLastSync = DateTime.now()
          await evenement.save()
        }
        return { success: result.success, error: result.error }
      } else {
        // Create new event
        const result = await googleCalendarService.createEventOnCalendar(
          evenement,
          googleCalendarDbId
        )
        if (result.success && result.googleEventId) {
          evenement.googleEventId = result.googleEventId
          evenement.googleCalendarId = googleCalendarDbId
          evenement.googleLastSync = DateTime.now()
          await evenement.save()
        }
        return result
      }
    } catch (error) {
      logger.error({ err: error }, 'Error syncing event to calendar')
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Delete event from Google when deleted in Portail
   * Supports both legacy mode (single calendar) and multi-calendar mode
   */
  async deleteEventFromGoogle(
    googleEventId: string,
    googleCalendarDbId?: string | null
  ): Promise<{ success: boolean; error?: string }> {
    // Multi-calendar mode: delete from specific calendar
    if (googleCalendarDbId) {
      return await googleCalendarService.deleteEventFromCalendar(googleEventId, googleCalendarDbId)
    }

    // Legacy mode: use old single-calendar behavior
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
    let skipped = 0

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
              if (result.skipped) {
                skipped++
                details.push(`Skipped (restricted type): ${evenement.titre}`)
              } else {
                evenement.googleLastSync = DateTime.now()
                await evenement.save()
                updated++
                details.push(`Updated: ${evenement.titre}`)
              }
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
          ? `Sync completed: ${created} created, ${updated} updated${skipped > 0 ? `, ${skipped} skipped` : ''}`
          : `Sync completed with ${errors} errors`,
        details,
        dureeMs: duration,
        triggeredById,
      })

      const skippedMsg = skipped > 0 ? `, ${skipped} ignores` : ''
      return {
        success,
        synced: created + updated,
        created,
        updated,
        deleted,
        errors,
        message: success
          ? `Synchronisation terminee: ${created} crees, ${updated} mis a jour${skippedMsg}`
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
   * Extract dossier reference from event title
   * Supported patterns:
   * - DOS-YYYY-NNNN (e.g., DOS-2025-0001)
   * - YYYY-NNN-CODE (e.g., 2025-001-MIR)
   * - Custom format from parametres
   */
  private extractDossierReference(title: string): string | null {
    // Pattern 1: DOS-YYYY-NNNN format
    const dosPattern = /\b(DOS-\d{4}-\d{4})\b/i
    const dosMatch = title.match(dosPattern)
    if (dosMatch) {
      return dosMatch[1].toUpperCase()
    }

    // Pattern 2: YYYY-NNN-CODE format (old format)
    const codePattern = /\b(\d{4}-\d{3,4}-[A-Z]{2,4})\b/i
    const codeMatch = title.match(codePattern)
    if (codeMatch) {
      return codeMatch[1].toUpperCase()
    }

    return null
  }

  /**
   * Find dossier by reference
   */
  private async findDossierByReference(reference: string): Promise<Dossier | null> {
    return await Dossier.query().where('reference', reference).first()
  }

  /**
   * Pull events from Google Calendar to Portail
   * Creates new events and tries to match them to dossiers by reference in title
   * Events without dossier reference are imported as general events (dossierId = null)
   */
  async pullFromGoogle(
    triggeredById?: string,
    options?: { importAll?: boolean; timeRangeMonths?: number }
  ): Promise<SyncResult> {
    const details: string[] = []
    let created = 0
    let updated = 0
    const deleted = 0
    let errors = 0
    let skipped = 0

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
      // Get events from Google Calendar with extended range
      const rangeMonths = options?.timeRangeMonths || 12
      const timeMin = DateTime.now().minus({ months: 3 }).toISO()!
      const timeMax = DateTime.now().plus({ months: rangeMonths }).toISO()!

      const googleEvents = await googleCalendarService.listEvents({
        timeMin,
        timeMax,
        maxResults: 2500, // Increased to get more events
      })

      details.push(
        `Found ${googleEvents.length} events in Google Calendar (${timeMin.split('T')[0]} to ${timeMax.split('T')[0]})`
      )

      // Get all portal events that have a Google event ID to avoid duplicates
      const portalEvents = await Evenement.query().whereNotNull('google_event_id')

      const portalEventMap = new Map<string, Evenement>()
      for (const event of portalEvents) {
        if (event.googleEventId) {
          portalEventMap.set(event.googleEventId, event)
        }
      }

      // Process Google events
      for (const googleEvent of googleEvents) {
        if (!googleEvent.id || !googleEvent.summary) continue

        const existingPortalEvent = portalEventMap.get(googleEvent.id)

        if (existingPortalEvent) {
          // Event already exists in portal, skip or update if needed
          details.push(`Existing event: ${googleEvent.summary}`)
          updated++
        } else {
          // New event from Google - try to import it
          try {
            // Check if this event was created by portal (has portalEventId in extendedProperties)
            const isFromPortal =
              googleEvent.extendedProperties?.private?.portalEventId !== undefined

            if (isFromPortal) {
              // Skip - this was created by portal but somehow lost the link
              details.push(`Skipped (portal origin): ${googleEvent.summary}`)
              continue
            }

            // Try to extract dossier reference from title
            const dossierRef = this.extractDossierReference(googleEvent.summary)
            let dossierId: string | null = null
            let dossierInfo = ''

            if (dossierRef) {
              const dossier = await this.findDossierByReference(dossierRef)
              if (dossier) {
                dossierId = dossier.id
                dossierInfo = ` -> Dossier: ${dossierRef}`
              } else {
                dossierInfo = ` (ref ${dossierRef} non trouvee)`
              }
            }

            // Import event (with or without dossier - can be assigned later)
            // Parse dates
            let dateDebut: DateTime
            let dateFin: DateTime
            let journeeEntiere = false

            if (googleEvent.start?.dateTime) {
              dateDebut = DateTime.fromISO(googleEvent.start.dateTime)
            } else if (googleEvent.start?.date) {
              dateDebut = DateTime.fromISO(googleEvent.start.date)
              journeeEntiere = true
            } else {
              details.push(`Skipped (no start date): ${googleEvent.summary}`)
              skipped++
              continue
            }

            if (googleEvent.end?.dateTime) {
              dateFin = DateTime.fromISO(googleEvent.end.dateTime)
            } else if (googleEvent.end?.date) {
              dateFin = DateTime.fromISO(googleEvent.end.date).minus({ days: 1 }) // Google uses exclusive end date
            } else {
              dateFin = dateDebut.plus({ hours: 1 })
            }

            // Create the event (dossierId can be null - will be assigned later by admin)
            const newEvent = await Evenement.create({
              dossierId,
              titre: googleEvent.summary,
              description: googleEvent.description || null,
              type: 'autre', // Default type for imported events
              dateDebut,
              dateFin,
              journeeEntiere,
              lieu: googleEvent.location || null,
              googleEventId: googleEvent.id,
              syncGoogle: true,
              googleLastSync: DateTime.now(),
              createdById: triggeredById || null,
            })

            // Log activity for timeline
            await ActivityLogger.logEvenementImportedFromGoogle(newEvent.id, dossierId, {
              titre: newEvent.titre,
              googleEventId: googleEvent.id,
              source: 'sync',
            })

            created++
            details.push(`Importe: ${newEvent.titre}${dossierInfo}`)
          } catch (error) {
            errors++
            details.push(
              `Error importing ${googleEvent.summary}: ${error instanceof Error ? error.message : 'Unknown error'}`
            )
          }
        }
      }

      return {
        success: errors === 0,
        synced: created + updated,
        created,
        updated,
        deleted,
        errors,
        message: `Import termine: ${created} importes, ${updated} existants${skipped > 0 ? `, ${skipped} ignores` : ''}`,
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
        details: { logs: data.details },
        dureeMs: data.dureeMs,
        triggeredById: data.triggeredById || null,
      })
    } catch (error) {
      logger.error({ err: error }, 'Failed to log sync operation')
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

  /**
   * Log a skipped sync operation (when no calendars are configured, etc.)
   * This allows the sync history to show when automatic syncs ran but had nothing to do
   */
  async logSkippedSync(
    reason: 'not_configured' | 'no_accounts' | 'no_calendars',
    mode: 'auto' | 'manual' = 'auto'
  ): Promise<void> {
    const messages: Record<string, string> = {
      not_configured: 'Google Calendar non configure',
      no_accounts: 'Aucun compte Google connecte',
      no_calendars: 'Aucun calendrier actif configure',
    }

    await this.logSyncOperation({
      mode,
      statut: 'success',
      elementsTraites: 0,
      elementsCrees: 0,
      elementsModifies: 0,
      elementsSupprimes: 0,
      elementsErreur: 0,
      message: messages[reason] + ' - synchronisation ignoree',
      details: [messages[reason]],
      dureeMs: 0,
    })
  }

  // ======================================================================
  // MULTI-CALENDAR SUPPORT
  // ======================================================================

  /**
   * Pull events from all active calendars
   * Imports events and associates them with the source calendar
   */
  async pullFromAllActiveCalendars(
    triggeredById?: string,
    options?: { timeRangeMonths?: number }
  ): Promise<SyncResult> {
    const startTime = Date.now()
    const details: string[] = []
    let created = 0
    let updated = 0
    const deleted = 0
    let errors = 0
    let skipped = 0

    try {
      const activeCalendars = await GoogleCalendar.findAllActive()

      if (activeCalendars.length === 0) {
        return {
          success: true,
          synced: 0,
          created: 0,
          updated: 0,
          deleted: 0,
          errors: 0,
          message: 'Aucun calendrier actif configure',
          details: ['No active calendars configured'],
        }
      }

      details.push(`Found ${activeCalendars.length} active calendars`)

      const rangeMonths = options?.timeRangeMonths || 12
      const timeMin = DateTime.now().minus({ months: 3 }).toISO()!
      const timeMax = DateTime.now().plus({ months: rangeMonths }).toISO()!

      // Get all portal events that have a Google event ID to avoid duplicates
      const portalEvents = await Evenement.query().whereNotNull('google_event_id')
      const portalEventMap = new Map<string, Evenement>()
      for (const event of portalEvents) {
        if (event.googleEventId) {
          portalEventMap.set(event.googleEventId, event)
        }
      }

      // Process each active calendar
      for (const calendar of activeCalendars) {
        details.push(`--- Processing: ${calendar.calendarName} (${calendar.tokenAccountEmail || 'Unknown'}) ---`)

        const googleEvents = await googleCalendarService.listEventsFromCalendar(calendar.id, {
          timeMin,
          timeMax,
          maxResults: 500,
        })

        details.push(`  Found ${googleEvents.length} events`)

        for (const googleEvent of googleEvents) {
          if (!googleEvent.id || !googleEvent.summary) continue

          const existingPortalEvent = portalEventMap.get(googleEvent.id)

          if (existingPortalEvent) {
            // Event already exists
            details.push(`  Existing: ${googleEvent.summary}`)
            updated++
          } else {
            try {
              // Check if event was created by portal
              const isFromPortal =
                googleEvent.extendedProperties?.private?.portalEventId !== undefined

              if (isFromPortal) {
                details.push(`  Skipped (portal origin): ${googleEvent.summary}`)
                skipped++
                continue
              }

              // Try to extract dossier reference from title
              const dossierRef = this.extractDossierReference(googleEvent.summary)
              let dossierId: string | null = null
              let dossierInfo = ''

              if (dossierRef) {
                const dossier = await this.findDossierByReference(dossierRef)
                if (dossier) {
                  dossierId = dossier.id
                  dossierInfo = ` -> Dossier: ${dossierRef}`
                } else {
                  dossierInfo = ` (ref ${dossierRef} non trouvee)`
                }
              }

              // Parse dates
              let dateDebut: DateTime
              let dateFin: DateTime
              let journeeEntiere = false

              if (googleEvent.start?.dateTime) {
                dateDebut = DateTime.fromISO(googleEvent.start.dateTime)
              } else if (googleEvent.start?.date) {
                dateDebut = DateTime.fromISO(googleEvent.start.date)
                journeeEntiere = true
              } else {
                details.push(`  Skipped (no start date): ${googleEvent.summary}`)
                skipped++
                continue
              }

              if (googleEvent.end?.dateTime) {
                dateFin = DateTime.fromISO(googleEvent.end.dateTime)
              } else if (googleEvent.end?.date) {
                dateFin = DateTime.fromISO(googleEvent.end.date).minus({ days: 1 })
              } else {
                dateFin = dateDebut.plus({ hours: 1 })
              }

              // Create the event with calendar reference
              const newEvent = await Evenement.create({
                dossierId,
                titre: googleEvent.summary,
                description: googleEvent.description || null,
                type: 'autre',
                dateDebut,
                dateFin,
                journeeEntiere,
                lieu: googleEvent.location || null,
                googleEventId: googleEvent.id,
                googleCalendarId: calendar.id, // Link to source calendar
                syncGoogle: true,
                googleLastSync: DateTime.now(),
                createdById: triggeredById || null,
              })

              // Log activity for timeline
              await ActivityLogger.logEvenementImportedFromGoogle(newEvent.id, dossierId, {
                titre: newEvent.titre,
                googleEventId: googleEvent.id,
                googleCalendarId: calendar.id,
                googleCalendarName: calendar.calendarName,
                source: 'sync',
              })

              created++
              details.push(`  Importe: ${newEvent.titre}${dossierInfo}`)
              portalEventMap.set(googleEvent.id, newEvent) // Prevent duplicate imports
            } catch (error) {
              errors++
              details.push(
                `  Error importing ${googleEvent.summary}: ${error instanceof Error ? error.message : 'Unknown error'}`
              )
            }
          }
        }
      }

      const duration = Date.now() - startTime
      const success = errors === 0

      // Log sync operation
      await this.logSyncOperation({
        mode: 'manual',
        statut: success ? 'success' : errors < created + updated ? 'partial' : 'error',
        elementsTraites: created + updated + skipped,
        elementsCrees: created,
        elementsModifies: updated,
        elementsSupprimes: deleted,
        elementsErreur: errors,
        message: success
          ? `Import multi-calendriers: ${created} crees, ${updated} existants${skipped > 0 ? `, ${skipped} ignores` : ''}`
          : `Import avec ${errors} erreurs`,
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
        message: `Import termine: ${created} importes, ${updated} existants${skipped > 0 ? `, ${skipped} ignores` : ''}`,
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
        message: `Import failed: ${errorMessage}`,
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
   * Full sync for multi-calendar mode:
   * - Push all portal events with syncGoogle=true to their target calendars
   * - Pull events from all active calendars
   */
  async fullSyncMultiCalendar(
    triggeredById?: string,
    options?: { pullFromGoogle?: boolean }
  ): Promise<SyncResult> {
    const startTime = Date.now()
    const details: string[] = []
    let created = 0
    let updated = 0
    let deleted = 0
    let errors = 0
    let skipped = 0

    try {
      // Get all events that should be synced and have a target calendar
      const evenements = await Evenement.query()
        .where('sync_google', true)
        .whereNotNull('google_calendar_id')
        .orderBy('date_debut', 'asc')

      details.push(`Found ${evenements.length} events with target calendars`)

      for (const evenement of evenements) {
        try {
          const result = await this.syncEventToCalendar(evenement, evenement.googleCalendarId!)
          if (result.success) {
            if (evenement.googleEventId) {
              updated++
              details.push(`Updated: ${evenement.titre}`)
            } else {
              created++
              details.push(`Created: ${evenement.titre}`)
            }
          } else {
            errors++
            details.push(`Error: ${evenement.titre} - ${result.error}`)
          }
        } catch (error) {
          errors++
          details.push(
            `Error syncing ${evenement.titre}: ${error instanceof Error ? error.message : 'Unknown error'}`
          )
        }
      }

      // Optional: Pull events from all active calendars
      if (options?.pullFromGoogle) {
        const pullResult = await this.pullFromAllActiveCalendars(triggeredById)
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
          ? `Sync multi-calendriers: ${created} crees, ${updated} mis a jour${skipped > 0 ? `, ${skipped} ignores` : ''}`
          : `Sync avec ${errors} erreurs`,
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
}

export default new CalendarSyncService()

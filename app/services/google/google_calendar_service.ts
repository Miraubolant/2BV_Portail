import googleOAuthService from './google_oauth_service.js'
import googleConfig from '#config/google'
import GoogleToken from '#models/google_token'
import Evenement from '#models/evenement'
import logger from '@adonisjs/core/services/logger'

const CALENDAR_API_BASE = googleConfig.calendarApiBase

// Google Calendar Event interface
export interface GoogleCalendarEvent {
  id?: string
  summary: string
  description?: string
  location?: string
  start: {
    dateTime?: string // For timed events (ISO format)
    date?: string // For all-day events (YYYY-MM-DD)
    timeZone?: string
  }
  end: {
    dateTime?: string
    date?: string
    timeZone?: string
  }
  extendedProperties?: {
    private?: {
      portalEventId?: string
      type?: string
      dossierId?: string
    }
  }
  status?: string // 'confirmed', 'tentative', 'cancelled'
  eventType?: string // 'default', 'birthday', 'focusTime', 'outOfOffice', 'workingLocation'
}

// Event types that cannot be modified via API
const RESTRICTED_EVENT_TYPES = ['birthday', 'focusTime', 'outOfOffice', 'workingLocation']

export interface CalendarListEntry {
  id: string
  summary: string
  description?: string
  primary?: boolean
  accessRole: string
  backgroundColor?: string
}

class GoogleCalendarService {
  private connectionHealthy: boolean = true
  private lastHealthCheck: Date | null = null

  /**
   * Get authenticated headers for API calls
   */
  private async getHeaders(): Promise<Record<string, string> | null> {
    const accessToken = await googleOAuthService.getValidAccessToken()
    if (!accessToken) {
      this.connectionHealthy = false
      return null
    }
    return {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    }
  }

  /**
   * Check if Google Calendar is connected and ready
   */
  async isReady(): Promise<boolean> {
    const accessToken = await googleOAuthService.getValidAccessToken()
    if (!accessToken) {
      this.connectionHealthy = false
      return false
    }
    this.connectionHealthy = true
    return true
  }

  /**
   * Get connection health status
   */
  getHealthStatus(): { healthy: boolean; lastCheck: Date | null } {
    return {
      healthy: this.connectionHealthy,
      lastCheck: this.lastHealthCheck,
    }
  }

  /**
   * Perform a health check on the Google Calendar connection
   */
  async checkHealth(): Promise<{ healthy: boolean; error?: string; calendarsCount?: number }> {
    const headers = await this.getHeaders()
    if (!headers) {
      this.connectionHealthy = false
      this.lastHealthCheck = new Date()
      return { healthy: false, error: 'Not authenticated' }
    }

    try {
      const response = await fetch(`${CALENDAR_API_BASE}/users/me/calendarList?maxResults=10`, {
        headers,
      })

      if (!response.ok) {
        this.connectionHealthy = false
        this.lastHealthCheck = new Date()
        return { healthy: false, error: `HTTP ${response.status}` }
      }

      const data = await response.json() as { items?: unknown[] }
      this.connectionHealthy = true
      this.lastHealthCheck = new Date()

      return {
        healthy: true,
        calendarsCount: data.items?.length || 0,
      }
    } catch (error) {
      this.connectionHealthy = false
      this.lastHealthCheck = new Date()
      return { healthy: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * List available calendars for selection
   */
  async listCalendars(): Promise<CalendarListEntry[]> {
    const headers = await this.getHeaders()
    if (!headers) return []

    try {
      const response = await fetch(`${CALENDAR_API_BASE}/users/me/calendarList`, {
        headers,
      })

      if (!response.ok) {
        logger.error({ response: await response.text() }, 'Failed to list calendars')
        return []
      }

      const data = (await response.json()) as { items?: CalendarListEntry[] }
      return data.items || []
    } catch (error) {
      logger.error({ err: error }, 'Error listing calendars')
      return []
    }
  }

  /**
   * Get the selected calendar ID (or primary as fallback)
   */
  async getSelectedCalendarId(): Promise<string | null> {
    const token = await GoogleToken.findByService(googleConfig.serviceKey)
    if (!token) return null
    return token.selectedCalendarId || 'primary'
  }

  /**
   * Set the selected calendar
   */
  async setSelectedCalendar(calendarId: string, calendarName: string): Promise<void> {
    await GoogleToken.updateSelectedCalendar(googleConfig.serviceKey, calendarId, calendarName)
  }

  // ======================================================================
  // EVENT OPERATIONS (Portal -> Google)
  // ======================================================================

  /**
   * Create an event on Google Calendar
   */
  async createEvent(
    evenement: Evenement
  ): Promise<{ success: boolean; googleEventId?: string; error?: string }> {
    const headers = await this.getHeaders()
    if (!headers) {
      return { success: false, error: 'Not connected to Google Calendar' }
    }

    const calendarId = await this.getSelectedCalendarId()
    if (!calendarId) {
      return { success: false, error: 'No calendar selected' }
    }

    const googleEvent = this.evenementToGoogleEvent(evenement)

    try {
      const response = await fetch(
        `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(googleEvent),
        }
      )

      if (!response.ok) {
        const error = await response.text()
        logger.error({ response: error }, 'Failed to create Google event')
        return { success: false, error }
      }

      const created = (await response.json()) as { id: string }
      return { success: true, googleEventId: created.id }
    } catch (error) {
      logger.error({ err: error }, 'Error creating Google event')
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Update an event on Google Calendar
   */
  async updateEvent(evenement: Evenement): Promise<{ success: boolean; error?: string; skipped?: boolean }> {
    if (!evenement.googleEventId) {
      return { success: false, error: 'No Google event ID' }
    }

    const headers = await this.getHeaders()
    if (!headers) {
      return { success: false, error: 'Not connected to Google Calendar' }
    }

    const calendarId = await this.getSelectedCalendarId()
    if (!calendarId) {
      return { success: false, error: 'No calendar selected' }
    }

    // First, fetch the existing event to check its type
    const existingEvent = await this.getEvent(evenement.googleEventId)
    if (existingEvent && existingEvent.eventType && RESTRICTED_EVENT_TYPES.includes(existingEvent.eventType)) {
      // Skip updating special event types (birthday, focus time, etc.)
      logger.info({ eventType: existingEvent.eventType, title: evenement.titre }, 'Skipping restricted event type')
      return { success: true, skipped: true }
    }

    const googleEvent = this.evenementToGoogleEvent(evenement)

    try {
      const response = await fetch(
        `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(evenement.googleEventId)}`,
        {
          method: 'PUT',
          headers,
          body: JSON.stringify(googleEvent),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()

        // Check if it's an eventType restriction error - skip gracefully
        if (errorText.includes('eventTypeRestriction') || errorText.includes('Event type cannot be changed')) {
          logger.info({ title: evenement.titre }, 'Skipping event due to type restriction')
          return { success: true, skipped: true }
        }

        logger.error({ response: errorText }, 'Failed to update Google event')
        return { success: false, error: errorText }
      }

      return { success: true }
    } catch (error) {
      logger.error({ err: error }, 'Error updating Google event')
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Delete an event from Google Calendar
   */
  async deleteEvent(googleEventId: string): Promise<{ success: boolean; error?: string }> {
    const headers = await this.getHeaders()
    if (!headers) {
      return { success: false, error: 'Not connected to Google Calendar' }
    }

    const calendarId = await this.getSelectedCalendarId()
    if (!calendarId) {
      return { success: false, error: 'No calendar selected' }
    }

    try {
      const response = await fetch(
        `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
        {
          method: 'DELETE',
          headers,
        }
      )

      // 204 No Content or 410 Gone are both success
      if (!response.ok && response.status !== 204 && response.status !== 410) {
        const error = await response.text()
        logger.error({ response: error }, 'Failed to delete Google event')
        return { success: false, error }
      }

      return { success: true }
    } catch (error) {
      logger.error({ err: error }, 'Error deleting Google event')
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  }

  /**
   * Get an event from Google Calendar
   */
  async getEvent(googleEventId: string): Promise<GoogleCalendarEvent | null> {
    const headers = await this.getHeaders()
    if (!headers) return null

    const calendarId = await this.getSelectedCalendarId()
    if (!calendarId) return null

    try {
      const response = await fetch(
        `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(googleEventId)}`,
        { headers }
      )

      if (!response.ok) {
        return null
      }

      return (await response.json()) as GoogleCalendarEvent
    } catch (error) {
      logger.error({ err: error }, 'Error getting Google event')
      return null
    }
  }

  // ======================================================================
  // SYNC OPERATIONS (Google -> Portal)
  // ======================================================================

  /**
   * List events from Google Calendar (for sync)
   */
  async listEvents(options?: {
    timeMin?: string // ISO date
    timeMax?: string
    maxResults?: number
  }): Promise<GoogleCalendarEvent[]> {
    const headers = await this.getHeaders()
    if (!headers) return []

    const calendarId = await this.getSelectedCalendarId()
    if (!calendarId) return []

    const params = new URLSearchParams()
    if (options?.timeMin) params.append('timeMin', options.timeMin)
    if (options?.timeMax) params.append('timeMax', options.timeMax)
    if (options?.maxResults) params.append('maxResults', options.maxResults.toString())
    params.append('singleEvents', 'true')
    params.append('orderBy', 'startTime')

    try {
      const response = await fetch(
        `${CALENDAR_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events?${params.toString()}`,
        { headers }
      )

      if (!response.ok) {
        logger.error({ response: await response.text() }, 'Failed to list Google events')
        return []
      }

      const data = (await response.json()) as { items?: GoogleCalendarEvent[] }
      return data.items || []
    } catch (error) {
      logger.error({ err: error }, 'Error listing Google events')
      return []
    }
  }

  /**
   * Convert Evenement to Google Calendar Event format
   */
  private evenementToGoogleEvent(evenement: Evenement): GoogleCalendarEvent {
    const event: GoogleCalendarEvent = {
      summary: evenement.titre,
      description: evenement.description || undefined,
      location: this.buildLocation(evenement),
      extendedProperties: {
        private: {
          portalEventId: evenement.id,
          type: evenement.type,
          dossierId: evenement.dossierId || undefined,
        },
      },
      start: {},
      end: {},
    }

    if (evenement.journeeEntiere) {
      // All-day event: use date format (YYYY-MM-DD)
      event.start = { date: evenement.dateDebut.toISODate()! }
      // Google requires end date to be exclusive (day after)
      event.end = { date: evenement.dateFin.plus({ days: 1 }).toISODate()! }
    } else {
      // Timed event: use dateTime format
      event.start = {
        dateTime: evenement.dateDebut.toISO()!,
        timeZone: 'Europe/Paris',
      }
      event.end = {
        dateTime: evenement.dateFin.toISO()!,
        timeZone: 'Europe/Paris',
      }
    }

    return event
  }

  /**
   * Build location string from Evenement
   */
  private buildLocation(evenement: Evenement): string | undefined {
    const parts = [evenement.lieu, evenement.salle, evenement.adresse].filter(Boolean)
    return parts.length > 0 ? parts.join(' - ') : undefined
  }

  /**
   * Convert Google Calendar Event to Evenement data
   * Used for importing events from Google Calendar
   */
  googleEventToEvenementData(event: GoogleCalendarEvent): {
    titre: string
    description: string | null
    lieu: string | null
    dateDebut: string
    dateFin: string
    journeeEntiere: boolean
    googleEventId?: string
  } {
    const isAllDay = !!event.start.date

    let dateDebut: string
    let dateFin: string

    if (isAllDay) {
      // All-day events
      dateDebut = event.start.date!
      // Google end date is exclusive, subtract one day
      const endDate = new Date(event.end.date!)
      endDate.setDate(endDate.getDate() - 1)
      dateFin = endDate.toISOString().split('T')[0]
    } else {
      dateDebut = event.start.dateTime!
      dateFin = event.end.dateTime!
    }

    return {
      titre: event.summary || 'Sans titre',
      description: event.description || null,
      lieu: event.location || null,
      dateDebut,
      dateFin,
      journeeEntiere: isAllDay,
      googleEventId: event.id,
    }
  }
}

export default new GoogleCalendarService()

import type { HttpContext } from '@adonisjs/core/http'
import googleOAuthService from '#services/google/google_oauth_service'
import googleCalendarService from '#services/google/google_calendar_service'
import calendarSyncService from '#services/google/calendar_sync_service'

export default class GoogleOAuthController {
  /**
   * GET /api/admin/google/status
   * Get Google Calendar connection status
   */
  async status({ response }: HttpContext) {
    if (!googleOAuthService.isConfigured()) {
      return response.ok({
        configured: false,
        connected: false,
        message:
          'Google OAuth not configured. Please add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env',
      })
    }

    const status = await googleOAuthService.getConnectionStatus()
    return response.ok({
      configured: true,
      ...status,
    })
  }

  /**
   * GET /api/admin/google/authorize
   * Initiate OAuth flow - get auth URL
   */
  async authorize({ response }: HttpContext) {
    if (!googleOAuthService.isConfigured()) {
      return response.badRequest({
        message: 'Google OAuth not configured',
      })
    }

    const authUrl = googleOAuthService.getAuthorizationUrl()
    return response.ok({ authUrl })
  }

  /**
   * GET /api/admin/google/callback (PUBLIC)
   * OAuth callback - handle authorization code
   */
  async callback({ request, response }: HttpContext) {
    const code = request.input('code')
    const error = request.input('error')
    const errorDescription = request.input('error_description')

    // Redirect URL for frontend
    const frontendUrl = '/admin/parametres?tab=integrations'

    if (error) {
      console.error('Google OAuth error:', error, errorDescription)
      return response.redirect(
        `${frontendUrl}&google_error=${encodeURIComponent(errorDescription || error)}`
      )
    }

    if (!code) {
      return response.redirect(`${frontendUrl}&google_error=${encodeURIComponent('No code provided')}`)
    }

    try {
      await googleOAuthService.completeOAuthFlow(code)
      return response.redirect(`${frontendUrl}&google_success=true`)
    } catch (err) {
      console.error('Google OAuth callback error:', err)
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      return response.redirect(`${frontendUrl}&google_error=${encodeURIComponent(errorMessage)}`)
    }
  }

  /**
   * POST /api/admin/google/disconnect
   * Disconnect Google Calendar
   */
  async disconnect({ response }: HttpContext) {
    try {
      await googleOAuthService.disconnect()
      return response.ok({ message: 'Google Calendar disconnected successfully' })
    } catch (error) {
      console.error('Error disconnecting Google:', error)
      return response.internalServerError({
        message: 'Failed to disconnect Google Calendar',
      })
    }
  }

  /**
   * GET /api/admin/google/test
   * Test connection by fetching calendar info
   */
  async test({ response }: HttpContext) {
    try {
      const isConnected = await googleOAuthService.isConnected()
      if (!isConnected) {
        return response.ok({
          success: false,
          message: 'Google Calendar not connected',
        })
      }

      const calendars = await googleCalendarService.listCalendars()
      if (calendars.length === 0) {
        return response.ok({
          success: false,
          message: 'Could not access Google Calendar. Token may be invalid.',
        })
      }

      return response.ok({
        success: true,
        message: 'Connection successful',
        calendarsCount: calendars.length,
      })
    } catch (error) {
      console.error('Error testing Google connection:', error)
      return response.ok({
        success: false,
        message: error instanceof Error ? error.message : 'Connection test failed',
      })
    }
  }

  /**
   * GET /api/admin/google/calendars
   * List available calendars for selection
   */
  async listCalendars({ response }: HttpContext) {
    try {
      const isConnected = await googleOAuthService.isConnected()
      if (!isConnected) {
        return response.unauthorized({
          message: 'Google Calendar not connected',
        })
      }

      const calendars = await googleCalendarService.listCalendars()
      return response.ok({ calendars })
    } catch (error) {
      console.error('Error listing calendars:', error)
      return response.internalServerError({
        message: 'Failed to list calendars',
      })
    }
  }

  /**
   * POST /api/admin/google/select-calendar
   * Select which calendar to use for sync
   */
  async selectCalendar({ request, response }: HttpContext) {
    const { calendarId, calendarName } = request.only(['calendarId', 'calendarName'])

    if (!calendarId || !calendarName) {
      return response.badRequest({
        message: 'Calendar ID and name are required',
      })
    }

    try {
      await googleCalendarService.setSelectedCalendar(calendarId, calendarName)
      return response.ok({
        message: 'Calendar selected successfully',
        calendarId,
        calendarName,
      })
    } catch (error) {
      console.error('Error selecting calendar:', error)
      return response.internalServerError({
        message: 'Failed to select calendar',
      })
    }
  }

  /**
   * POST /api/admin/google/sync
   * Trigger full sync
   */
  async syncAll({ auth, request, response }: HttpContext) {
    const admin = auth.use('admin').user!
    const pullFromGoogle = request.input('pullFromGoogle', false)

    try {
      const result = await calendarSyncService.fullSync(admin.id, { pullFromGoogle })
      return response.ok(result)
    } catch (error) {
      console.error('Error syncing calendar:', error)
      return response.internalServerError({
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed',
      })
    }
  }

  /**
   * GET /api/admin/google/sync-history
   * Get sync history
   */
  async syncHistory({ response }: HttpContext) {
    try {
      const history = await calendarSyncService.getSyncHistory(50)
      return response.ok(history)
    } catch (error) {
      console.error('Error fetching sync history:', error)
      return response.internalServerError({
        message: 'Failed to fetch sync history',
      })
    }
  }
}

import type { HttpContext } from '@adonisjs/core/http'
import googleOAuthService from '#services/google/google_oauth_service'
import googleCalendarService from '#services/google/google_calendar_service'
import calendarSyncService from '#services/google/calendar_sync_service'
import GoogleToken from '#models/google_token'
import GoogleCalendar from '#models/google_calendar'
import googleConfig from '#config/google'
import logger from '@adonisjs/core/services/logger'

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
      logger.error({ error, errorDescription }, 'Google OAuth error')
      return response.redirect(
        `${frontendUrl}&google_error=${encodeURIComponent(errorDescription || error)}`
      )
    }

    if (!code) {
      return response.redirect(
        `${frontendUrl}&google_error=${encodeURIComponent('No code provided')}`
      )
    }

    try {
      await googleOAuthService.completeOAuthFlow(code)
      return response.redirect(`${frontendUrl}&google_success=true`)
    } catch (err) {
      logger.error({ err }, 'Google OAuth callback error')
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
      logger.error({ err: error }, 'Error disconnecting Google')
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
      logger.error({ err: error }, 'Error testing Google connection')
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
      logger.error({ err: error }, 'Error listing calendars')
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
      logger.error({ err: error }, 'Error selecting calendar')
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
      logger.error({ err: error }, 'Error syncing calendar')
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
      logger.error({ err: error }, 'Error fetching sync history')
      return response.internalServerError({
        message: 'Failed to fetch sync history',
      })
    }
  }

  /**
   * POST /api/admin/google/sync-mode
   * Update sync mode (auto or manual)
   */
  async updateSyncMode({ request, response }: HttpContext) {
    const { mode } = request.only(['mode'])

    if (!mode || !['auto', 'manual'].includes(mode)) {
      return response.badRequest({
        message: 'Invalid sync mode. Must be "auto" or "manual".',
      })
    }

    try {
      await GoogleToken.updateSyncMode(googleConfig.serviceKey, mode)
      return response.ok({
        message: `Sync mode updated to "${mode}"`,
        syncMode: mode,
      })
    } catch (error) {
      logger.error({ err: error }, 'Error updating sync mode')
      return response.internalServerError({
        message: 'Failed to update sync mode',
      })
    }
  }

  // ======================================================================
  // MULTI-ACCOUNT / MULTI-CALENDAR ENDPOINTS
  // ======================================================================

  /**
   * GET /api/admin/google/accounts
   * List all connected Google accounts
   */
  async listAccounts({ response }: HttpContext) {
    try {
      const accounts = await googleOAuthService.getAllConnectedAccounts()
      return response.ok({ accounts })
    } catch (error) {
      logger.error({ err: error }, 'Error listing Google accounts')
      return response.internalServerError({
        message: 'Failed to list accounts',
      })
    }
  }

  /**
   * DELETE /api/admin/google/accounts/:tokenId
   * Remove a Google account
   */
  async removeAccount({ params, response }: HttpContext) {
    const { tokenId } = params

    try {
      await googleOAuthService.removeAccount(tokenId)
      return response.ok({ message: 'Account removed successfully' })
    } catch (error) {
      logger.error({ err: error }, 'Error removing Google account')
      return response.internalServerError({
        message: 'Failed to remove account',
      })
    }
  }

  /**
   * GET /api/admin/google/accounts/:tokenId/calendars
   * List calendars for a specific account
   */
  async listAccountCalendars({ params, response }: HttpContext) {
    const { tokenId } = params

    try {
      const calendars = await googleCalendarService.listCalendarsForAccount(tokenId)
      return response.ok({ calendars })
    } catch (error) {
      logger.error({ err: error }, 'Error listing calendars for account')
      return response.internalServerError({
        message: 'Failed to list calendars',
      })
    }
  }

  /**
   * POST /api/admin/google/accounts/:tokenId/calendars/activate
   * Activate a calendar for sync
   */
  async activateCalendar({ params, request, response }: HttpContext) {
    const { tokenId } = params
    const { calendarId, calendarName, calendarColor } = request.only([
      'calendarId',
      'calendarName',
      'calendarColor',
    ])

    if (!calendarId || !calendarName) {
      return response.badRequest({
        message: 'Calendar ID and name are required',
      })
    }

    try {
      const calendar = await googleCalendarService.activateCalendar(
        tokenId,
        calendarId,
        calendarName,
        calendarColor
      )
      return response.ok({
        message: 'Calendar activated',
        calendar: {
          id: calendar.id,
          calendarId: calendar.calendarId,
          calendarName: calendar.calendarName,
          calendarColor: calendar.calendarColor,
          isActive: calendar.isActive,
        },
      })
    } catch (error) {
      logger.error({ err: error }, 'Error activating calendar')
      return response.internalServerError({
        message: 'Failed to activate calendar',
      })
    }
  }

  /**
   * POST /api/admin/google/calendars/:id/deactivate
   * Deactivate a calendar from sync
   */
  async deactivateCalendar({ params, response }: HttpContext) {
    const { id } = params

    try {
      await googleCalendarService.deactivateCalendar(id)
      return response.ok({ message: 'Calendar deactivated' })
    } catch (error) {
      logger.error({ err: error }, 'Error deactivating calendar')
      return response.internalServerError({
        message: 'Failed to deactivate calendar',
      })
    }
  }

  /**
   * DELETE /api/admin/google/calendars/:id
   * Remove a calendar entirely
   */
  async removeCalendar({ params, response }: HttpContext) {
    const { id } = params

    try {
      const calendar = await GoogleCalendar.find(id)
      if (calendar) {
        await calendar.delete()
      }
      return response.ok({ message: 'Calendar removed' })
    } catch (error) {
      logger.error({ err: error }, 'Error removing calendar')
      return response.internalServerError({
        message: 'Failed to remove calendar',
      })
    }
  }

  /**
   * GET /api/admin/google/active-calendars
   * Get all active calendars across all accounts
   */
  async listActiveCalendars({ response }: HttpContext) {
    try {
      const calendars = await googleOAuthService.getAllActiveCalendars()
      return response.ok({ calendars })
    } catch (error) {
      logger.error({ err: error }, 'Error listing active calendars')
      return response.internalServerError({
        message: 'Failed to list active calendars',
      })
    }
  }

  /**
   * POST /api/admin/google/sync-multi
   * Trigger full sync for multi-calendar mode
   */
  async syncAllMultiCalendar({ auth, request, response }: HttpContext) {
    const admin = auth.use('admin').user!
    const pullFromGoogle = request.input('pullFromGoogle', false)

    try {
      const result = await calendarSyncService.fullSyncMultiCalendar(admin.id, { pullFromGoogle })
      return response.ok(result)
    } catch (error) {
      logger.error({ err: error }, 'Error syncing calendars')
      return response.internalServerError({
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed',
      })
    }
  }

  /**
   * POST /api/admin/google/pull-all
   * Pull events from all active calendars
   */
  async pullFromAllCalendars({ auth, response }: HttpContext) {
    const admin = auth.use('admin').user!

    try {
      const result = await calendarSyncService.pullFromAllActiveCalendars(admin.id)
      return response.ok(result)
    } catch (error) {
      logger.error({ err: error }, 'Error pulling from calendars')
      return response.internalServerError({
        success: false,
        message: error instanceof Error ? error.message : 'Pull failed',
      })
    }
  }
}

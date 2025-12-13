import type { HttpContext } from '@adonisjs/core/http'
import microsoftOAuthService from '#services/microsoft/microsoft_oauth_service'
import syncService from '#services/microsoft/sync_service'
import logger from '@adonisjs/core/services/logger'

export default class MicrosoftOAuthController {
  /**
   * Get OneDrive connection status
   */
  async status({ response }: HttpContext) {
    if (!microsoftOAuthService.isConfigured()) {
      return response.ok({
        configured: false,
        connected: false,
        message:
          'Microsoft OAuth not configured. Please add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET to .env',
      })
    }

    const status = await microsoftOAuthService.getConnectionStatus()
    return response.ok({
      configured: true,
      ...status,
    })
  }

  /**
   * Initiate OAuth flow - redirect to Microsoft login
   */
  async authorize({ response }: HttpContext) {
    if (!microsoftOAuthService.isConfigured()) {
      return response.badRequest({
        message: 'Microsoft OAuth not configured',
      })
    }

    const authUrl = microsoftOAuthService.getAuthorizationUrl()
    return response.ok({ authUrl })
  }

  /**
   * OAuth callback - handle authorization code
   */
  async callback({ request, response }: HttpContext) {
    const code = request.input('code')
    const error = request.input('error')
    const errorDescription = request.input('error_description')

    // Handle errors from Microsoft
    if (error) {
      logger.error({ error, errorDescription }, 'Microsoft OAuth error')
      // Redirect to settings page with error
      return response.redirect(
        `/admin/parametres?onedrive_error=${encodeURIComponent(errorDescription || error)}`
      )
    }

    if (!code) {
      return response.redirect('/admin/parametres?onedrive_error=no_code')
    }

    try {
      await microsoftOAuthService.completeOAuthFlow(code)
      // Redirect to settings page with success
      return response.redirect('/admin/parametres?onedrive_success=true')
    } catch (err) {
      logger.error({ err }, 'Microsoft OAuth callback error')
      const message = err instanceof Error ? err.message : 'Unknown error'
      return response.redirect(`/admin/parametres?onedrive_error=${encodeURIComponent(message)}`)
    }
  }

  /**
   * Disconnect OneDrive
   */
  async disconnect({ response }: HttpContext) {
    try {
      await microsoftOAuthService.disconnect()
      return response.ok({
        success: true,
        message: 'OneDrive disconnected successfully',
      })
    } catch (error) {
      logger.error({ err: error }, 'Error disconnecting OneDrive')
      return response.internalServerError({
        message: 'Failed to disconnect OneDrive',
      })
    }
  }

  /**
   * Test connection by fetching user info
   */
  async test({ response }: HttpContext) {
    try {
      const accessToken = await microsoftOAuthService.getValidAccessToken()

      if (!accessToken) {
        return response.ok({
          success: false,
          message: 'Not connected or token expired',
        })
      }

      // Test by fetching root drive info
      const driveResponse = await fetch('https://graph.microsoft.com/v1.0/me/drive', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      })

      if (!driveResponse.ok) {
        return response.ok({
          success: false,
          message: 'Failed to access OneDrive',
        })
      }

      const driveInfo = (await driveResponse.json()) as {
        id: string
        driveType: string
        quota?: { used?: number; total?: number; remaining?: number }
      }

      return response.ok({
        success: true,
        message: 'Connection successful',
        driveInfo: {
          id: driveInfo.id,
          driveType: driveInfo.driveType,
          quota: {
            used: driveInfo.quota?.used,
            total: driveInfo.quota?.total,
            remaining: driveInfo.quota?.remaining,
          },
        },
      })
    } catch (error) {
      logger.error({ err: error }, 'Error testing OneDrive connection')
      return response.ok({
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  /**
   * Sync all dossiers with OneDrive
   */
  async syncAll({ auth, response }: HttpContext) {
    const admin = auth.use('admin').user!

    try {
      const result = await syncService.syncAllDossiers(admin.id)
      return response.ok(result)
    } catch (error) {
      logger.error({ err: error }, 'Error syncing all dossiers')
      return response.internalServerError({
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed',
      })
    }
  }

  /**
   * Sync a single dossier with OneDrive
   */
  async syncDossier({ params, auth, response }: HttpContext) {
    const admin = auth.use('admin').user!

    try {
      const result = await syncService.syncDossier(params.dossierId, admin.id)
      return response.ok(result)
    } catch (error) {
      logger.error({ err: error }, 'Error syncing dossier')
      return response.internalServerError({
        success: false,
        message: error instanceof Error ? error.message : 'Sync failed',
      })
    }
  }

  /**
   * Initialize OneDrive folders for all dossiers
   */
  async initialize({ auth, response }: HttpContext) {
    const admin = auth.use('admin').user!

    try {
      const result = await syncService.initializeAllDossiers(admin.id)
      return response.ok(result)
    } catch (error) {
      logger.error({ err: error }, 'Error initializing OneDrive')
      return response.internalServerError({
        success: false,
        message: error instanceof Error ? error.message : 'Initialization failed',
      })
    }
  }

  /**
   * Get sync history
   */
  async syncHistory({ response }: HttpContext) {
    try {
      const history = await syncService.getSyncHistory(50)
      return response.ok(history)
    } catch (error) {
      logger.error({ err: error }, 'Error fetching sync history')
      return response.internalServerError({
        message: 'Failed to fetch sync history',
      })
    }
  }

  /**
   * Reverse sync: Import files added directly to OneDrive
   * Scans /Portail Cabinet/Clients/ and imports new files to existing dossiers
   */
  async reverseSync({ auth, response }: HttpContext) {
    const admin = auth.use('admin').user!

    try {
      const result = await syncService.reverseSyncFromOneDrive(admin.id)
      return response.ok(result)
    } catch (error) {
      logger.error({ err: error }, 'Error performing reverse sync')
      return response.internalServerError({
        success: false,
        message: error instanceof Error ? error.message : 'Reverse sync failed',
      })
    }
  }
}

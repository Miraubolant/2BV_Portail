import oneDriveService from '#services/microsoft/onedrive_service'
import googleCalendarService from '#services/google/google_calendar_service'
import microsoftOAuthService from '#services/microsoft/microsoft_oauth_service'
import googleOAuthService from '#services/google/google_oauth_service'
import SyncLog from '#models/sync_log'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'

export interface IntegrationStatus {
  name: string
  type: 'onedrive' | 'google_calendar'
  configured: boolean
  connected: boolean
  healthy: boolean
  lastHealthCheck: Date | null
  accountEmail?: string | null
  accountName?: string | null
  error?: string
  details?: Record<string, unknown>
}

export interface SyncHistoryEntry {
  id: string
  type: 'onedrive' | 'google_calendar'
  mode: 'auto' | 'manual'
  status: 'success' | 'partial' | 'error'
  itemsProcessed: number
  itemsCreated: number
  itemsUpdated: number
  itemsDeleted: number
  itemsError: number
  message: string | null
  duration: number | null
  createdAt: DateTime
}

export interface IntegrationHealthReport {
  timestamp: Date
  overallHealthy: boolean
  integrations: IntegrationStatus[]
  recentSyncHistory: SyncHistoryEntry[]
}

class IntegrationHealthService {
  private lastReport: IntegrationHealthReport | null = null
  private reportCacheMs: number = 30 * 1000 // 30 seconds cache

  /**
   * Get the status of OneDrive integration
   */
  async getOneDriveStatus(): Promise<IntegrationStatus> {
    const configured = microsoftOAuthService.isConfigured()
    if (!configured) {
      return {
        name: 'OneDrive / Microsoft',
        type: 'onedrive',
        configured: false,
        connected: false,
        healthy: false,
        lastHealthCheck: null,
        error:
          'OneDrive not configured. Add MICROSOFT_CLIENT_ID and MICROSOFT_CLIENT_SECRET to .env',
      }
    }

    const connectionStatus = await microsoftOAuthService.getConnectionStatus()
    if (!connectionStatus.connected) {
      return {
        name: 'OneDrive / Microsoft',
        type: 'onedrive',
        configured: true,
        connected: false,
        healthy: false,
        lastHealthCheck: null,
      }
    }

    const healthCheck = await oneDriveService.checkHealth()
    const healthStatus = oneDriveService.getHealthStatus()

    return {
      name: 'OneDrive / Microsoft',
      type: 'onedrive',
      configured: true,
      connected: true,
      healthy: healthCheck.healthy,
      lastHealthCheck: healthStatus.lastCheck,
      accountEmail: connectionStatus.accountEmail,
      accountName: connectionStatus.accountName,
      error: healthCheck.error,
      details: healthCheck.quota
        ? {
            quotaUsed: healthCheck.quota.used,
            quotaTotal: healthCheck.quota.total,
            quotaPercentage:
              healthCheck.quota.total > 0
                ? Math.round((healthCheck.quota.used / healthCheck.quota.total) * 100)
                : 0,
          }
        : undefined,
    }
  }

  /**
   * Get the status of Google Calendar integration
   */
  async getGoogleCalendarStatus(): Promise<IntegrationStatus> {
    const configured = googleOAuthService.isConfigured()
    if (!configured) {
      return {
        name: 'Google Calendar',
        type: 'google_calendar',
        configured: false,
        connected: false,
        healthy: false,
        lastHealthCheck: null,
        error:
          'Google Calendar not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env',
      }
    }

    const connectionStatus = await googleOAuthService.getConnectionStatus()
    if (!connectionStatus.connected) {
      return {
        name: 'Google Calendar',
        type: 'google_calendar',
        configured: true,
        connected: false,
        healthy: false,
        lastHealthCheck: null,
      }
    }

    const healthCheck = await googleCalendarService.checkHealth()
    const healthStatus = googleCalendarService.getHealthStatus()

    return {
      name: 'Google Calendar',
      type: 'google_calendar',
      configured: true,
      connected: true,
      healthy: healthCheck.healthy,
      lastHealthCheck: healthStatus.lastCheck,
      accountEmail: connectionStatus.accountEmail,
      accountName: connectionStatus.accountName,
      error: healthCheck.error,
      details: {
        calendarsCount: healthCheck.calendarsCount,
        selectedCalendarId: connectionStatus.selectedCalendarId,
        selectedCalendarName: connectionStatus.selectedCalendarName,
        syncMode: connectionStatus.syncMode,
      },
    }
  }

  /**
   * Get recent sync history for all integrations
   */
  async getSyncHistory(limit: number = 20): Promise<SyncHistoryEntry[]> {
    try {
      const logs = await SyncLog.query().orderBy('created_at', 'desc').limit(limit)

      return logs.map((log) => ({
        id: log.id,
        type: log.type as 'onedrive' | 'google_calendar',
        mode: log.mode as 'auto' | 'manual',
        status: log.statut as 'success' | 'partial' | 'error',
        itemsProcessed: log.elementsTraites,
        itemsCreated: log.elementsCrees,
        itemsUpdated: log.elementsModifies,
        itemsDeleted: log.elementsSupprimes,
        itemsError: log.elementsErreur,
        message: log.message,
        duration: log.dureeMs,
        createdAt: log.createdAt,
      }))
    } catch (error) {
      logger.error({ err: error }, 'Error fetching sync history')
      return []
    }
  }

  /**
   * Get full health report for all integrations
   */
  async getHealthReport(forceRefresh: boolean = false): Promise<IntegrationHealthReport> {
    // Return cached report if available and not expired
    if (
      !forceRefresh &&
      this.lastReport &&
      Date.now() - this.lastReport.timestamp.getTime() < this.reportCacheMs
    ) {
      return this.lastReport
    }

    const [oneDriveStatus, googleStatus, syncHistory] = await Promise.all([
      this.getOneDriveStatus(),
      this.getGoogleCalendarStatus(),
      this.getSyncHistory(10),
    ])

    const integrations = [oneDriveStatus, googleStatus]
    const overallHealthy = integrations.every((i) => !i.configured || (i.connected && i.healthy))

    const report: IntegrationHealthReport = {
      timestamp: new Date(),
      overallHealthy,
      integrations,
      recentSyncHistory: syncHistory,
    }

    this.lastReport = report
    return report
  }

  /**
   * Perform health checks on all connected integrations
   */
  async performHealthChecks(): Promise<{
    oneDrive: { healthy: boolean; error?: string }
    googleCalendar: { healthy: boolean; error?: string }
  }> {
    const results = {
      oneDrive: { healthy: false as boolean, error: undefined as string | undefined },
      googleCalendar: { healthy: false as boolean, error: undefined as string | undefined },
    }

    // Check OneDrive
    if (microsoftOAuthService.isConfigured()) {
      const isConnected = await microsoftOAuthService.isConnected()
      if (isConnected) {
        const healthCheck = await oneDriveService.checkHealth()
        results.oneDrive = { healthy: healthCheck.healthy, error: healthCheck.error }
      } else {
        results.oneDrive = { healthy: false, error: 'Not connected' }
      }
    } else {
      results.oneDrive = { healthy: false, error: 'Not configured' }
    }

    // Check Google Calendar
    if (googleOAuthService.isConfigured()) {
      const isConnected = await googleOAuthService.isConnected()
      if (isConnected) {
        const healthCheck = await googleCalendarService.checkHealth()
        results.googleCalendar = { healthy: healthCheck.healthy, error: healthCheck.error }
      } else {
        results.googleCalendar = { healthy: false, error: 'Not connected' }
      }
    } else {
      results.googleCalendar = { healthy: false, error: 'Not configured' }
    }

    return results
  }

  /**
   * Get sync statistics for the dashboard
   */
  async getSyncStatistics(days: number = 7): Promise<{
    totalSyncs: number
    successfulSyncs: number
    failedSyncs: number
    itemsProcessed: number
    averageDuration: number
  }> {
    try {
      const since = DateTime.now().minus({ days })
      const logs = await SyncLog.query().where('created_at', '>=', since.toJSDate())

      const totalSyncs = logs.length
      const successfulSyncs = logs.filter((l) => l.statut === 'success').length
      const failedSyncs = logs.filter((l) => l.statut === 'error').length
      const itemsProcessed = logs.reduce((sum, l) => sum + l.elementsTraites, 0)
      const totalDuration = logs.reduce((sum, l) => sum + (l.dureeMs || 0), 0)
      const averageDuration = totalSyncs > 0 ? Math.round(totalDuration / totalSyncs) : 0

      return {
        totalSyncs,
        successfulSyncs,
        failedSyncs,
        itemsProcessed,
        averageDuration,
      }
    } catch (error) {
      logger.error({ err: error }, 'Error fetching sync statistics')
      return {
        totalSyncs: 0,
        successfulSyncs: 0,
        failedSyncs: 0,
        itemsProcessed: 0,
        averageDuration: 0,
      }
    }
  }
}

export default new IntegrationHealthService()

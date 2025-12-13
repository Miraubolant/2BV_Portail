import type { HttpContext } from '@adonisjs/core/http'
import integrationHealthService from '#services/integration_health_service'
import SyncLog from '#models/sync_log'
import logger from '@adonisjs/core/services/logger'

export default class IntegrationsController {
  /**
   * GET /api/admin/integrations/health
   * Get comprehensive health status of all integrations
   */
  async health({ request, response }: HttpContext) {
    const forceRefresh = request.input('refresh') === 'true'

    try {
      const report = await integrationHealthService.getHealthReport(forceRefresh)
      return response.ok(report)
    } catch (error) {
      logger.error({ err: error }, 'Error fetching integration health')
      return response.internalServerError({
        message: 'Failed to fetch integration health',
      })
    }
  }

  /**
   * GET /api/admin/integrations/sync-history
   * Get sync history for all integrations
   */
  async syncHistory({ request, response }: HttpContext) {
    const limit = Math.min(parseInt(request.input('limit', '50')), 100)
    const type = request.input('type') as 'onedrive' | 'google_calendar' | undefined

    try {
      let query = SyncLog.query().orderBy('created_at', 'desc').limit(limit)

      if (type) {
        query = query.where('type', type)
      }

      const logs = await query

      const history = logs.map((log) => ({
        id: log.id,
        type: log.type,
        mode: log.mode,
        status: log.statut,
        itemsProcessed: log.elementsTraites,
        itemsCreated: log.elementsCrees,
        itemsUpdated: log.elementsModifies,
        itemsDeleted: log.elementsSupprimes,
        itemsError: log.elementsErreur,
        message: log.message,
        details: log.details,
        duration: log.dureeMs,
        createdAt: log.createdAt.toISO(),
      }))

      return response.ok({ history })
    } catch (error) {
      logger.error({ err: error }, 'Error fetching sync history')
      return response.internalServerError({
        message: 'Failed to fetch sync history',
      })
    }
  }

  /**
   * GET /api/admin/integrations/statistics
   * Get sync statistics for dashboard
   */
  async statistics({ request, response }: HttpContext) {
    const days = Math.min(parseInt(request.input('days', '7')), 30)

    try {
      const stats = await integrationHealthService.getSyncStatistics(days)
      return response.ok(stats)
    } catch (error) {
      logger.error({ err: error }, 'Error fetching sync statistics')
      return response.internalServerError({
        message: 'Failed to fetch sync statistics',
      })
    }
  }

  /**
   * POST /api/admin/integrations/health-check
   * Trigger health checks on all connected integrations
   */
  async performHealthCheck({ response }: HttpContext) {
    try {
      const results = await integrationHealthService.performHealthChecks()
      return response.ok(results)
    } catch (error) {
      logger.error({ err: error }, 'Error performing health check')
      return response.internalServerError({
        message: 'Failed to perform health check',
      })
    }
  }
}

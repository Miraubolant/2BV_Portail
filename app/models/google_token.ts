import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'crypto'
import Admin from './admin.js'

export default class GoogleToken extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare service: string

  @column()
  declare adminId: string | null

  @belongsTo(() => Admin)
  declare admin: BelongsTo<typeof Admin>

  @column({ serializeAs: null })
  declare accessToken: string

  @column({ serializeAs: null })
  declare refreshToken: string

  @column.dateTime()
  declare expiresAt: DateTime

  @column()
  declare accountEmail: string | null

  @column()
  declare accountName: string | null

  @column()
  declare scopes: string | null

  @column()
  declare selectedCalendarId: string | null

  @column()
  declare selectedCalendarName: string | null

  @column()
  declare syncMode: string // 'auto' | 'manual'

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(token: GoogleToken) {
    if (!token.id) {
      token.id = randomUUID()
    }
  }

  // Check if token is expired
  get isExpired(): boolean {
    return this.expiresAt < DateTime.now()
  }

  // Check if token will expire soon (in 5 minutes)
  get willExpireSoon(): boolean {
    return this.expiresAt < DateTime.now().plus({ minutes: 5 })
  }

  /**
   * Find token by service key (global/cabinet level)
   */
  static async findByService(service: string): Promise<GoogleToken | null> {
    return await this.query().where('service', service).whereNull('admin_id').first()
  }

  /**
   * Find token by service and admin (per-admin token)
   */
  static async findByServiceAndAdmin(service: string, adminId: string): Promise<GoogleToken | null> {
    return await this.query().where('service', service).where('admin_id', adminId).first()
  }

  /**
   * Find all tokens for a service (global + per-admin)
   */
  static async findAllByService(service: string): Promise<GoogleToken[]> {
    return await this.query().where('service', service).preload('admin')
  }

  /**
   * Save or update token for a service (supports per-admin)
   */
  static async saveToken(
    service: string,
    data: {
      accessToken: string
      refreshToken: string
      expiresIn: number
      accountEmail?: string | null
      accountName?: string | null
      scopes?: string | null
      selectedCalendarId?: string | null
      selectedCalendarName?: string | null
      adminId?: string | null
    }
  ): Promise<GoogleToken> {
    const adminId = data.adminId || null
    const existing = adminId
      ? await this.findByServiceAndAdmin(service, adminId)
      : await this.findByService(service)
    const expiresAt = DateTime.now().plus({ seconds: data.expiresIn })

    if (existing) {
      existing.accessToken = data.accessToken
      existing.refreshToken = data.refreshToken
      existing.expiresAt = expiresAt
      if (data.accountEmail !== undefined) existing.accountEmail = data.accountEmail
      if (data.accountName !== undefined) existing.accountName = data.accountName
      if (data.scopes !== undefined) existing.scopes = data.scopes
      if (data.selectedCalendarId !== undefined) existing.selectedCalendarId = data.selectedCalendarId
      if (data.selectedCalendarName !== undefined)
        existing.selectedCalendarName = data.selectedCalendarName
      await existing.save()
      return existing
    }

    return await this.create({
      service,
      adminId,
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      expiresAt,
      accountEmail: data.accountEmail || null,
      accountName: data.accountName || null,
      scopes: data.scopes || null,
      selectedCalendarId: data.selectedCalendarId || null,
      selectedCalendarName: data.selectedCalendarName || null,
    })
  }

  /**
   * Delete token for a service (global)
   */
  static async deleteByService(service: string): Promise<void> {
    await this.query().where('service', service).whereNull('admin_id').delete()
  }

  /**
   * Delete token for a service and admin
   */
  static async deleteByServiceAndAdmin(service: string, adminId: string): Promise<void> {
    await this.query().where('service', service).where('admin_id', adminId).delete()
  }

  /**
   * Update selected calendar for a service
   */
  static async updateSelectedCalendar(
    service: string,
    calendarId: string,
    calendarName: string,
    adminId?: string | null
  ): Promise<void> {
    let query = this.query().where('service', service)
    if (adminId) {
      query = query.where('admin_id', adminId)
    } else {
      query = query.whereNull('admin_id')
    }
    await query.update({
      selectedCalendarId: calendarId,
      selectedCalendarName: calendarName,
    })
  }

  /**
   * Update sync mode for a service
   */
  static async updateSyncMode(service: string, mode: 'auto' | 'manual', adminId?: string | null): Promise<void> {
    let query = this.query().where('service', service)
    if (adminId) {
      query = query.where('admin_id', adminId)
    } else {
      query = query.whereNull('admin_id')
    }
    await query.update({
      syncMode: mode,
    })
  }

  /**
   * Get sync mode for a service (defaults to 'auto')
   */
  static async getSyncMode(service: string, adminId?: string | null): Promise<'auto' | 'manual'> {
    const token = adminId
      ? await this.findByServiceAndAdmin(service, adminId)
      : await this.findByService(service)
    return (token?.syncMode as 'auto' | 'manual') || 'auto'
  }
}

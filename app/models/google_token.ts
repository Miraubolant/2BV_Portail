import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, column } from '@adonisjs/lucid/orm'
import { randomUUID } from 'crypto'

export default class GoogleToken extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare service: string

  @column()
  declare accessToken: string

  @column()
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
   * Find token by service key
   */
  static async findByService(service: string): Promise<GoogleToken | null> {
    return await this.query().where('service', service).first()
  }

  /**
   * Save or update token for a service
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
    }
  ): Promise<GoogleToken> {
    const existing = await this.findByService(service)
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
   * Delete token for a service
   */
  static async deleteByService(service: string): Promise<void> {
    await this.query().where('service', service).delete()
  }

  /**
   * Update selected calendar for a service
   */
  static async updateSelectedCalendar(
    service: string,
    calendarId: string,
    calendarName: string
  ): Promise<void> {
    await this.query().where('service', service).update({
      selectedCalendarId: calendarId,
      selectedCalendarName: calendarName,
    })
  }
}

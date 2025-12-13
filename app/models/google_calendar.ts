import { DateTime } from 'luxon'
import { BaseModel, beforeCreate, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import { randomUUID } from 'node:crypto'
import GoogleToken from './google_token.js'

export default class GoogleCalendar extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare googleTokenId: string

  @belongsTo(() => GoogleToken)
  declare googleToken: BelongsTo<typeof GoogleToken>

  @column()
  declare calendarId: string // Google Calendar ID

  @column()
  declare calendarName: string // Display name

  @column()
  declare calendarColor: string | null // Google calendar color

  @column()
  declare isActive: boolean // Active for sync

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  @beforeCreate()
  static assignUuid(calendar: GoogleCalendar) {
    if (!calendar.id) {
      calendar.id = randomUUID()
    }
  }

  /**
   * Find all active calendars
   */
  static async findAllActive(): Promise<GoogleCalendar[]> {
    return await this.query().where('is_active', true).preload('googleToken')
  }

  /**
   * Find all calendars for a token
   */
  static async findByTokenId(tokenId: string): Promise<GoogleCalendar[]> {
    return await this.query().where('google_token_id', tokenId)
  }

  /**
   * Find calendar by Google Calendar ID
   */
  static async findByCalendarId(calendarId: string): Promise<GoogleCalendar | null> {
    return await this.query().where('calendar_id', calendarId).first()
  }

  /**
   * Add or update a calendar for a token
   */
  static async upsert(
    tokenId: string,
    data: {
      calendarId: string
      calendarName: string
      calendarColor?: string | null
      isActive?: boolean
    }
  ): Promise<GoogleCalendar> {
    const existing = await this.query()
      .where('google_token_id', tokenId)
      .where('calendar_id', data.calendarId)
      .first()

    if (existing) {
      existing.calendarName = data.calendarName
      if (data.calendarColor !== undefined) existing.calendarColor = data.calendarColor
      if (data.isActive !== undefined) existing.isActive = data.isActive
      await existing.save()
      return existing
    }

    return await this.create({
      googleTokenId: tokenId,
      calendarId: data.calendarId,
      calendarName: data.calendarName,
      calendarColor: data.calendarColor || null,
      isActive: data.isActive ?? true,
    })
  }

  /**
   * Activate a calendar
   */
  static async activate(id: string): Promise<void> {
    await this.query().where('id', id).update({ isActive: true })
  }

  /**
   * Deactivate a calendar
   */
  static async deactivate(id: string): Promise<void> {
    await this.query().where('id', id).update({ isActive: false })
  }

  /**
   * Delete all calendars for a token
   */
  static async deleteByTokenId(tokenId: string): Promise<void> {
    await this.query().where('google_token_id', tokenId).delete()
  }
}

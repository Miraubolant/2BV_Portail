import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class ActivityLog extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare userType: string

  @column()
  declare userId: string | null

  @column()
  declare action: string

  @column()
  declare resourceType: string | null

  @column()
  declare resourceId: string | null

  @column()
  declare ipAddress: string | null

  @column()
  declare userAgent: string | null

  @column()
  declare metadata: Record<string, any> | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}

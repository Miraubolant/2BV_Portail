import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Admin from './admin.js'

export default class AdminToken extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare adminId: string

  @column()
  declare type: string

  @column()
  declare token: string

  @column.dateTime()
  declare expiresAt: DateTime

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  // Relations
  @belongsTo(() => Admin)
  declare admin: BelongsTo<typeof Admin>

  // Check if token is expired
  get isExpired(): boolean {
    return this.expiresAt < DateTime.now()
  }
}

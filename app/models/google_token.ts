import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

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

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Check if token is expired
  get isExpired(): boolean {
    return this.expiresAt < DateTime.now()
  }

  // Check if token will expire soon (in 5 minutes)
  get willExpireSoon(): boolean {
    return this.expiresAt < DateTime.now().plus({ minutes: 5 })
  }
}

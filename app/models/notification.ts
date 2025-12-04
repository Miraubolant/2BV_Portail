import { DateTime } from 'luxon'
import { BaseModel, column } from '@adonisjs/lucid/orm'

export default class Notification extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare destinataireType: string

  @column()
  declare destinataireId: string

  @column()
  declare type: string

  @column()
  declare titre: string

  @column()
  declare message: string | null

  @column()
  declare lien: string | null

  @column()
  declare lu: boolean

  @column()
  declare emailEnvoye: boolean

  @column.dateTime()
  declare emailEnvoyeAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}

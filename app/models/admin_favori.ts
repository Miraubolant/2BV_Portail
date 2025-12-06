import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Admin from './admin.js'

export default class AdminFavori extends BaseModel {
  static table = 'admin_favoris'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare adminId: string

  @column()
  declare favoriType: 'dossier' | 'client'

  @column()
  declare favoriId: string

  @column()
  declare ordre: number

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  // Relations
  @belongsTo(() => Admin)
  declare admin: BelongsTo<typeof Admin>
}

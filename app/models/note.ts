import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Dossier from '#models/dossier'
import Admin from '#models/admin'

export default class Note extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare dossierId: string

  @column()
  declare createdById: string

  @column()
  declare contenu: string

  @column()
  declare isPinned: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => Dossier)
  declare dossier: BelongsTo<typeof Dossier>

  @belongsTo(() => Admin, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof Admin>
}

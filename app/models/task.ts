import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Dossier from '#models/dossier'
import Admin from '#models/admin'

export default class Task extends BaseModel {
  static table = 'tasks'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare dossierId: string

  @column()
  declare createdById: string

  @column()
  declare assignedToId: string | null

  @column()
  declare titre: string

  @column()
  declare description: string | null

  @column()
  declare priorite: 'basse' | 'normale' | 'haute' | 'urgente'

  @column()
  declare statut: 'a_faire' | 'en_cours' | 'terminee' | 'annulee'

  @column.dateTime()
  declare dateEcheance: DateTime | null

  @column.dateTime()
  declare rappelDate: DateTime | null

  @column()
  declare rappelEnvoye: boolean

  @column.dateTime()
  declare completedAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => Dossier)
  declare dossier: BelongsTo<typeof Dossier>

  @belongsTo(() => Admin, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof Admin>

  @belongsTo(() => Admin, { foreignKey: 'assignedToId' })
  declare assignedTo: BelongsTo<typeof Admin>
}

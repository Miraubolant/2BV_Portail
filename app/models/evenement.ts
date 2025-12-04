import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Dossier from './dossier.js'
import Admin from './admin.js'

export default class Evenement extends BaseModel {
  static table = 'evenements'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare dossierId: string

  @column()
  declare titre: string

  @column()
  declare description: string | null

  @column()
  declare type: string

  @column.dateTime()
  declare dateDebut: DateTime

  @column.dateTime()
  declare dateFin: DateTime

  @column()
  declare journeeEntiere: boolean

  @column()
  declare lieu: string | null

  @column()
  declare adresse: string | null

  @column()
  declare salle: string | null

  @column()
  declare statut: string

  // Google Calendar
  @column()
  declare googleEventId: string | null

  @column.dateTime()
  declare googleLastSync: DateTime | null

  @column()
  declare syncGoogle: boolean

  // Rappels
  @column()
  declare rappelEnvoye: boolean

  @column()
  declare rappelJ7: boolean

  @column()
  declare rappelJ1: boolean

  @column()
  declare createdById: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => Dossier)
  declare dossier: BelongsTo<typeof Dossier>

  @belongsTo(() => Admin, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof Admin>

  // Computed
  get isPast(): boolean {
    return this.dateFin < DateTime.now()
  }

  get isToday(): boolean {
    const now = DateTime.now()
    return this.dateDebut.hasSame(now, 'day')
  }

  get duree(): string {
    const diff = this.dateFin.diff(this.dateDebut, ['hours', 'minutes'])
    if (diff.hours > 0) {
      return diff.hours + 'h' + (diff.minutes > 0 ? diff.minutes + 'min' : '')
    }
    return diff.minutes + 'min'
  }
}

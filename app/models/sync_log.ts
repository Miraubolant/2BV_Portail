import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Admin from './admin.js'

export default class SyncLog extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare type: 'onedrive' | 'google_calendar'

  @column()
  declare mode: 'auto' | 'manual'

  @column()
  declare statut: 'success' | 'partial' | 'error'

  @column()
  declare elementsTraites: number

  @column()
  declare elementsCrees: number

  @column()
  declare elementsModifies: number

  @column()
  declare elementsSupprimes: number

  @column()
  declare elementsErreur: number

  @column()
  declare message: string | null

  @column()
  declare details: Record<string, any> | null

  @column()
  declare dureeMs: number | null

  @column()
  declare triggeredById: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  // Relations
  @belongsTo(() => Admin, { foreignKey: 'triggeredById' })
  declare triggeredBy: BelongsTo<typeof Admin>

  // Computed
  get dureeFormatee(): string {
    if (!this.dureeMs) return 'N/A'
    if (this.dureeMs < 1000) return this.dureeMs + 'ms'
    return (this.dureeMs / 1000).toFixed(1) + 's'
  }

  get isSuccess(): boolean {
    return this.statut === 'success'
  }
}

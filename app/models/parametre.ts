import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Admin from './admin.js'

export default class Parametre extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare cle: string

  @column()
  declare valeur: string | null

  @column()
  declare type: string

  @column()
  declare categorie: string | null

  @column()
  declare description: string | null

  @column.dateTime({ autoUpdate: true })
  declare updatedAt: DateTime

  @column()
  declare updatedById: string | null

  // Relations
  @belongsTo(() => Admin, { foreignKey: 'updatedById' })
  declare updatedBy: BelongsTo<typeof Admin>

  // Get typed value
  get typedValue(): string | number | boolean | object | null {
    if (this.valeur === null) return null

    switch (this.type) {
      case 'boolean':
        return this.valeur === 'true'
      case 'number':
        return Number(this.valeur)
      case 'json':
        try {
          return JSON.parse(this.valeur)
        } catch {
          return this.valeur
        }
      default:
        return this.valeur
    }
  }
}

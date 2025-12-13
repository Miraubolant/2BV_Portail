import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Dossier from './dossier.js'

export default class Document extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare dossierId: string

  @column()
  declare nom: string

  @column()
  declare nomOriginal: string | null

  @column()
  declare typeDocument: string

  // OneDrive
  @column()
  declare onedriveFileId: string | null

  @column()
  declare onedriveWebUrl: string | null

  @column()
  declare onedriveDownloadUrl: string | null

  // Fichier
  @column()
  declare tailleOctets: number | null

  @column()
  declare mimeType: string | null

  @column()
  declare extension: string | null

  // Flags
  @column()
  declare sensible: boolean

  @column()
  declare visibleClient: boolean

  @column()
  declare uploadedByClient: boolean

  // Location in OneDrive folder structure ('cabinet' or 'client')
  @column()
  declare dossierLocation: 'cabinet' | 'client'

  // Qui a uploade
  @column()
  declare uploadedById: string

  @column()
  declare uploadedByType: 'admin' | 'client'

  @column()
  declare description: string | null

  @column.date()
  declare dateDocument: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  // Relations
  @belongsTo(() => Dossier)
  declare dossier: BelongsTo<typeof Dossier>

  // Computed
  get tailleFormatee(): string {
    if (!this.tailleOctets) return 'N/A'
    const units = ['o', 'Ko', 'Mo', 'Go']
    let size = this.tailleOctets
    let unitIndex = 0
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }
    return size.toFixed(1) + ' ' + units[unitIndex]
  }
}

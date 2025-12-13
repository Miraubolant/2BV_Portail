import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'
import Client from '#models/client'
import Admin from '#models/admin'
import Document from '#models/document'
import Evenement from '#models/evenement'

export default class Dossier extends BaseModel {
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare clientId: string

  @column()
  declare reference: string

  @column()
  declare intitule: string

  @column()
  declare description: string | null

  @column()
  declare typeAffaire: string | null

  @column()
  declare statut: string

  @column.date()
  declare dateOuverture: DateTime | null

  @column.date()
  declare dateCloture: DateTime | null

  @column.date()
  declare datePrescription: DateTime | null

  // Financier
  @column()
  declare honorairesEstimes: number | null

  @column()
  declare honorairesFactures: number

  @column()
  declare honorairesPayes: number

  // OneDrive
  @column()
  declare onedriveFolderId: string | null

  @column()
  declare onedriveFolderPath: string | null

  @column()
  declare onedriveCabinetFolderId: string | null

  @column()
  declare onedriveClientFolderId: string | null

  @column.dateTime()
  declare onedriveLastSync: DateTime | null

  // Détails juridiques
  @column()
  declare juridiction: string | null

  @column()
  declare numeroRg: string | null

  @column()
  declare adversaireNom: string | null

  @column()
  declare adversaireAvocat: string | null

  @column()
  declare notesInternes: string | null

  // Relations IDs
  @column()
  declare createdById: string | null

  @column()
  declare assignedAdminId: string | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @belongsTo(() => Client)
  declare client: BelongsTo<typeof Client>

  @belongsTo(() => Admin, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof Admin>

  @belongsTo(() => Admin, { foreignKey: 'assignedAdminId' })
  declare assignedAdmin: BelongsTo<typeof Admin>

  @hasMany(() => Document)
  declare documents: HasMany<typeof Document>

  @hasMany(() => Evenement)
  declare evenements: HasMany<typeof Evenement>

  // Computed
  get isClosed(): boolean {
    return this.statut.startsWith('cloture') || this.statut === 'archive'
  }

  get honorairesRestants(): number {
    return (this.honorairesFactures || 0) - (this.honorairesPayes || 0)
  }
}

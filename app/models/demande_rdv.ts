import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Client from './client.js'
import Dossier from './dossier.js'
import Evenement from './evenement.js'
import Admin from './admin.js'

export default class DemandeRdv extends BaseModel {
  static table = 'demandes_rdv'

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare clientId: string

  @column()
  declare dossierId: string | null

  @column.date()
  declare dateSouhaitee: DateTime

  @column()
  declare creneau: string

  @column()
  declare motif: string

  @column()
  declare urgence: string

  @column()
  declare statut: string

  @column()
  declare reponseAdmin: string | null

  @column()
  declare evenementId: string | null

  @column()
  declare traiteParId: string | null

  @column.dateTime()
  declare traiteAt: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  // Relations
  @belongsTo(() => Client)
  declare client: BelongsTo<typeof Client>

  @belongsTo(() => Dossier)
  declare dossier: BelongsTo<typeof Dossier>

  @belongsTo(() => Evenement)
  declare evenement: BelongsTo<typeof Evenement>

  @belongsTo(() => Admin, { foreignKey: 'traiteParId' })
  declare traitePar: BelongsTo<typeof Admin>

  // Computed
  get isPending(): boolean {
    return this.statut === 'en_attente'
  }

  get isAccepted(): boolean {
    return this.statut === 'accepte'
  }

  get isRejected(): boolean {
    return this.statut === 'refuse'
  }
}

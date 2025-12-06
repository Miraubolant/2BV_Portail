import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import ClientToken from './client_token.js'
import Dossier from './dossier.js'
import Admin from './admin.js'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class Client extends compose(BaseModel, AuthFinder) {
  static rememberMeTokens = DbRememberMeTokensProvider.forModel(Client)

  @column({ isPrimary: true })
  declare id: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  // Identité
  @column()
  declare civilite: string | null

  @column()
  declare nom: string

  @column()
  declare prenom: string

  @column.date()
  declare dateNaissance: DateTime | null

  @column()
  declare lieuNaissance: string | null

  @column()
  declare nationalite: string

  // Contact
  @column()
  declare telephone: string | null

  @column()
  declare telephoneSecondaire: string | null

  @column({ columnName: 'adresse_ligne1' })
  declare adresseLigne1: string | null

  @column({ columnName: 'adresse_ligne2' })
  declare adresseLigne2: string | null

  @column()
  declare codePostal: string | null

  @column()
  declare ville: string | null

  @column()
  declare pays: string

  // Professionnel
  @column()
  declare type: 'particulier' | 'institutionnel'

  @column()
  declare societeNom: string | null

  @column()
  declare societeSiret: string | null

  @column()
  declare societeFonction: string | null

  // 2FA
  @column()
  declare totpSecret: string | null

  @column()
  declare totpEnabled: boolean

  // Permissions
  @column()
  declare peutUploader: boolean

  @column()
  declare peutDemanderRdv: boolean

  @column()
  declare accesDocumentsSensibles: boolean

  // Notifications
  @column()
  declare notifEmailDocument: boolean

  @column()
  declare notifEmailEvenement: boolean

  // Statut
  @column()
  declare actif: boolean

  // Métadonnées
  @column()
  declare notesInternes: string | null

  @column()
  declare tags: string[] | null

  @column()
  declare sourceAcquisition: string | null

  @column()
  declare createdById: string | null

  @column()
  declare responsableId: string | null

  @column.dateTime()
  declare lastLogin: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @hasMany(() => ClientToken)
  declare tokens: HasMany<typeof ClientToken>

  @hasMany(() => Dossier)
  declare dossiers: HasMany<typeof Dossier>

  @belongsTo(() => Admin, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof Admin>

  @belongsTo(() => Admin, { foreignKey: 'responsableId' })
  declare responsable: BelongsTo<typeof Admin>

  // Computed
  get fullName(): string {
    return `${this.prenom} ${this.nom}`
  }

  get fullAddress(): string | null {
    if (!this.adresseLigne1) return null
    const parts = [this.adresseLigne1]
    if (this.adresseLigne2) parts.push(this.adresseLigne2)
    if (this.codePostal && this.ville) parts.push(`${this.codePostal} ${this.ville}`)
    if (this.pays && this.pays !== 'France') parts.push(this.pays)
    return parts.join(', ')
  }
}

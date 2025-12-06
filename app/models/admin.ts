import { DateTime } from 'luxon'
import hash from '@adonisjs/core/services/hash'
import { compose } from '@adonisjs/core/helpers'
import { BaseModel, column, hasMany, belongsTo } from '@adonisjs/lucid/orm'
import { withAuthFinder } from '@adonisjs/auth/mixins/lucid'
import { DbRememberMeTokensProvider } from '@adonisjs/auth/session'
import type { HasMany, BelongsTo } from '@adonisjs/lucid/types/relations'
import AdminToken from './admin_token.js'

const AuthFinder = withAuthFinder(() => hash.use('scrypt'), {
  uids: ['email'],
  passwordColumnName: 'password',
})

export default class Admin extends compose(BaseModel, AuthFinder) {
  static rememberMeTokens = DbRememberMeTokensProvider.forModel(Admin)
  @column({ isPrimary: true })
  declare id: string

  @column()
  declare email: string

  @column({ serializeAs: null })
  declare password: string

  @column()
  declare nom: string

  @column()
  declare prenom: string

  @column()
  declare username: string | null

  @column()
  declare role: 'super_admin' | 'admin'

  @column()
  declare totpSecret: string | null

  @column()
  declare totpEnabled: boolean

  @column()
  declare actif: boolean

  // Notification preferences
  @column()
  declare notifEmailDocument: boolean

  @column()
  declare emailNotification: string | null

  // Filter preferences
  @column()
  declare filterByResponsable: boolean

  @column()
  declare createdById: string | null

  @column.dateTime()
  declare lastLogin: DateTime | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime

  // Relations
  @hasMany(() => AdminToken)
  declare tokens: HasMany<typeof AdminToken>

  @belongsTo(() => Admin, { foreignKey: 'createdById' })
  declare createdBy: BelongsTo<typeof Admin>

  // Computed
  get fullName(): string {
    return `${this.prenom} ${this.nom}`
  }

  get isSuperAdmin(): boolean {
    return this.role === 'super_admin'
  }

  get notificationEmail(): string {
    return this.emailNotification || this.email
  }
}

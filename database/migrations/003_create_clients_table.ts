import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'clients'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('email', 255).notNullable().unique()
      table.string('password', 255).notNullable()
      
      // Identité
      table.string('civilite', 10).nullable()
      table.string('nom', 100).notNullable()
      table.string('prenom', 100).notNullable()
      table.date('date_naissance').nullable()
      table.string('lieu_naissance', 100).nullable()
      table.string('nationalite', 50).defaultTo('Française')
      
      // Contact
      table.string('telephone', 20).nullable()
      table.string('telephone_secondaire', 20).nullable()
      table.string('adresse_ligne1', 255).nullable()
      table.string('adresse_ligne2', 255).nullable()
      table.string('code_postal', 10).nullable()
      table.string('ville', 100).nullable()
      table.string('pays', 50).defaultTo('France')
      
      // Professionnel (si institutionnel)
      table.enum('type', ['particulier', 'institutionnel']).defaultTo('particulier')
      table.string('societe_nom', 255).nullable()
      table.string('societe_siret', 20).nullable()
      table.string('societe_fonction', 100).nullable()
      
      // 2FA
      table.string('totp_secret', 255).nullable()
      table.boolean('totp_enabled').defaultTo(false)
      
      // Permissions
      table.boolean('peut_uploader').defaultTo(true)
      table.boolean('peut_demander_rdv').defaultTo(true)
      table.boolean('acces_documents_sensibles').defaultTo(false)
      
      // Notifications
      table.boolean('notif_email_document').defaultTo(true)
      table.boolean('notif_email_evenement').defaultTo(true)

      // Statut
      table.boolean('actif').defaultTo(true)

      // Métadonnées
      table.text('notes_internes').nullable()
      table.specificType('tags', 'text[]').nullable()
      table.string('source_acquisition', 50).nullable()
      
      // Relations
      table.uuid('created_by_id').nullable().references('id').inTable('admins').onDelete('SET NULL')
      
      table.timestamp('last_login', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })

    this.schema.raw('CREATE INDEX idx_clients_email ON clients(email)')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

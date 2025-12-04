import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notifications'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      
      table.string('destinataire_type', 10).notNullable()
      table.uuid('destinataire_id').notNullable()
      
      table.string('type', 50).notNullable()
      table.string('titre', 255).notNullable()
      table.text('message').nullable()
      table.string('lien', 500).nullable()
      
      table.boolean('lu').defaultTo(false)
      table.boolean('email_envoye').defaultTo(false)
      table.timestamp('email_envoye_at', { useTz: true }).nullable()
      
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
    })

    this.schema.raw('CREATE INDEX idx_notif_destinataire ON notifications(destinataire_type, destinataire_id, lu)')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

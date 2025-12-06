import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Supprimer les tables separees
    this.schema.dropTableIfExists('admin_remember_me_tokens')
    this.schema.dropTableIfExists('client_remember_me_tokens')

    // Creer une table unique avec type polymorphique
    this.schema.createTable('remember_me_tokens', (table) => {
      table.increments('id')
      table.string('tokenable_type', 50).notNullable() // 'admin' ou 'client'
      table.uuid('tokenable_id').notNullable()
      table.string('hash').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
      table.timestamp('expires_at').notNullable()

      table.index(['tokenable_type', 'tokenable_id'])
    })
  }

  async down() {
    this.schema.dropTable('remember_me_tokens')
  }
}

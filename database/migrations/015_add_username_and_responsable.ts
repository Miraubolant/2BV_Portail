import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Add username to admins
    this.schema.alterTable('admins', (table) => {
      table.string('username', 50).nullable().unique()
    })

    // Add responsable_id to clients
    this.schema.alterTable('clients', (table) => {
      table
        .uuid('responsable_id')
        .nullable()
        .references('id')
        .inTable('admins')
        .onDelete('SET NULL')
    })

    this.schema.raw('CREATE INDEX idx_clients_responsable ON clients(responsable_id)')
  }

  async down() {
    this.schema.alterTable('clients', (table) => {
      table.dropColumn('responsable_id')
    })

    this.schema.alterTable('admins', (table) => {
      table.dropColumn('username')
    })
  }
}

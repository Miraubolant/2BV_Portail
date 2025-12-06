import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Table pour les tokens "Se souvenir de moi" des admins
    this.schema.createTable('admin_remember_me_tokens', (table) => {
      table.increments('id')
      table
        .uuid('tokenable_id')
        .notNullable()
        .references('id')
        .inTable('admins')
        .onDelete('CASCADE')
      table.string('hash').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
      table.timestamp('expires_at').notNullable()
    })

    // Table pour les tokens "Se souvenir de moi" des clients
    this.schema.createTable('client_remember_me_tokens', (table) => {
      table.increments('id')
      table
        .uuid('tokenable_id')
        .notNullable()
        .references('id')
        .inTable('clients')
        .onDelete('CASCADE')
      table.string('hash').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
      table.timestamp('expires_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('admin_remember_me_tokens')
    this.schema.dropTable('client_remember_me_tokens')
  }
}

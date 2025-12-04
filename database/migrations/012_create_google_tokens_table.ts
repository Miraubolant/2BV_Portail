import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'google_tokens'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('service', 50).notNullable().unique()
      table.text('access_token').notNullable()
      table.text('refresh_token').notNullable()
      table.timestamp('expires_at', { useTz: true }).notNullable()
      table.string('account_email', 255).nullable()
      table.string('account_name', 255).nullable()
      table.text('scopes').nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

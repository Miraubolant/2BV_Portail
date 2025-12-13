import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'google_calendars'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('google_token_id').notNullable().references('id').inTable('google_tokens').onDelete('CASCADE')
      table.string('calendar_id', 255).notNullable() // Google Calendar ID
      table.string('calendar_name', 255).notNullable() // Display name
      table.string('calendar_color', 20).nullable() // Google calendar color
      table.boolean('is_active').defaultTo(true) // Active for sync
      table.timestamp('created_at', { useTz: true }).defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).defaultTo(this.now())

      // Each calendar can only be added once per token
      table.unique(['google_token_id', 'calendar_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

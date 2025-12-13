import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'evenements'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Reference to the google_calendars table for multi-calendar support
      table
        .uuid('google_calendar_id')
        .nullable()
        .references('id')
        .inTable('google_calendars')
        .onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropForeign(['google_calendar_id'])
      table.dropColumn('google_calendar_id')
    })
  }
}

import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'google_tokens'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('selected_calendar_id', 255).nullable()
      table.string('selected_calendar_name', 255).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('selected_calendar_id')
      table.dropColumn('selected_calendar_name')
    })
  }
}

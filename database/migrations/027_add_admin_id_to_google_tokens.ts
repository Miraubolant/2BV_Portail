import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'google_tokens'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Add admin_id for per-admin calendar support
      table.uuid('admin_id').nullable().references('id').inTable('admins').onDelete('CASCADE')

      // Drop unique constraint on service
      table.dropUnique(['service'])

      // Add composite unique constraint (service + admin_id)
      // null admin_id = global/cabinet-level token
      // non-null admin_id = per-admin token
      table.unique(['service', 'admin_id'])
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropUnique(['service', 'admin_id'])
      table.dropForeign(['admin_id'])
      table.dropColumn('admin_id')
      table.unique(['service'])
    })
  }
}

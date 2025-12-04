import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'admins'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Notification preferences
      table.boolean('notif_email_document').defaultTo(true)
      table.string('email_notification', 255).nullable()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('notif_email_document')
      table.dropColumn('email_notification')
    })
  }
}

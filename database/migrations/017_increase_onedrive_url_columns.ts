import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'documents'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.text('onedrive_web_url').alter()
      table.text('onedrive_download_url').alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('onedrive_web_url', 1000).alter()
      table.string('onedrive_download_url', 1000).alter()
    })
  }
}

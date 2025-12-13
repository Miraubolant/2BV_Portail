import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Add folder IDs for CABINET and CLIENT subfolders to dossiers
    this.schema.alterTable('dossiers', (table) => {
      table.string('onedrive_cabinet_folder_id', 255).nullable()
      table.string('onedrive_client_folder_id', 255).nullable()
    })

    // Add location field to documents to track which folder they're in
    this.schema.alterTable('documents', (table) => {
      table.enum('dossier_location', ['cabinet', 'client']).defaultTo('client').notNullable()
    })

    // Create index for filtering documents by location
    this.schema.raw('CREATE INDEX idx_documents_location ON documents(dossier_location)')
  }

  async down() {
    this.schema.alterTable('dossiers', (table) => {
      table.dropColumn('onedrive_cabinet_folder_id')
      table.dropColumn('onedrive_client_folder_id')
    })

    this.schema.raw('DROP INDEX IF EXISTS idx_documents_location')

    this.schema.alterTable('documents', (table) => {
      table.dropColumn('dossier_location')
    })
  }
}

import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'documents'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('dossier_id').notNullable().references('id').inTable('dossiers').onDelete('CASCADE')
      
      table.string('nom', 255).notNullable()
      table.string('nom_original', 255).nullable()
      table.string('type_document', 50).notNullable()
      
      // OneDrive
      table.string('onedrive_file_id', 255).nullable()
      table.string('onedrive_web_url', 1000).nullable()
      table.string('onedrive_download_url', 1000).nullable()
      
      // Fichier
      table.bigInteger('taille_octets').nullable()
      table.string('mime_type', 100).nullable()
      table.string('extension', 20).nullable()
      
      // Flags
      table.boolean('sensible').defaultTo(false)
      table.boolean('visible_client').defaultTo(true)
      table.boolean('uploaded_by_client').defaultTo(false)
      
      // Qui a uploadé
      table.uuid('uploaded_by_id').notNullable()
      table.enum('uploaded_by_type', ['admin', 'client']).notNullable()
      
      table.text('description').nullable()
      table.date('date_document').nullable()
      
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
    })

    this.schema.raw('CREATE INDEX idx_documents_dossier ON documents(dossier_id)')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

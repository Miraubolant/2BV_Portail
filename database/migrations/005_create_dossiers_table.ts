import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'dossiers'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('client_id').notNullable().references('id').inTable('clients').onDelete('CASCADE')
      
      table.string('reference', 50).notNullable().unique()
      table.string('intitule', 255).notNullable()
      table.text('description').nullable()
      table.string('type_affaire', 50).nullable()
      
      table.string('statut', 30).defaultTo('nouveau')
      
      table.date('date_ouverture').defaultTo(this.raw('CURRENT_DATE'))
      table.date('date_cloture').nullable()
      table.date('date_prescription').nullable()
      
      // Financier
      table.decimal('honoraires_estimes', 10, 2).nullable()
      table.decimal('honoraires_factures', 10, 2).defaultTo(0)
      table.decimal('honoraires_payes', 10, 2).defaultTo(0)
      
      // OneDrive
      table.string('onedrive_folder_id', 255).nullable()
      table.string('onedrive_folder_path', 500).nullable()
      table.timestamp('onedrive_last_sync', { useTz: true }).nullable()
      
      // Détails juridiques
      table.string('juridiction', 100).nullable()
      table.string('numero_rg', 50).nullable()
      table.string('adversaire_nom', 255).nullable()
      table.string('adversaire_avocat', 255).nullable()
      table.text('notes_internes').nullable()
      
      // Relations
      table.uuid('created_by_id').nullable().references('id').inTable('admins').onDelete('SET NULL')
      table.uuid('assigned_admin_id').nullable().references('id').inTable('admins').onDelete('SET NULL')
      
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })

    this.schema.raw('CREATE INDEX idx_dossiers_client ON dossiers(client_id)')
    this.schema.raw('CREATE INDEX idx_dossiers_reference ON dossiers(reference)')
    this.schema.raw('CREATE INDEX idx_dossiers_statut ON dossiers(statut)')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

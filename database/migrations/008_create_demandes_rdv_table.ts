import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'demandes_rdv'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('client_id').notNullable().references('id').inTable('clients').onDelete('CASCADE')
      table.uuid('dossier_id').nullable().references('id').inTable('dossiers').onDelete('SET NULL')
      
      table.date('date_souhaitee').notNullable()
      table.string('creneau', 20).notNullable()
      table.text('motif').notNullable()
      table.string('urgence', 20).defaultTo('normal')
      
      table.string('statut', 20).defaultTo('en_attente')
      
      table.text('reponse_admin').nullable()
      table.uuid('evenement_id').nullable().references('id').inTable('evenements').onDelete('SET NULL')
      
      table.uuid('traite_par_id').nullable().references('id').inTable('admins').onDelete('SET NULL')
      table.timestamp('traite_at', { useTz: true }).nullable()
      
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
    })

    this.schema.raw('CREATE INDEX idx_demandes_client ON demandes_rdv(client_id)')
    this.schema.raw('CREATE INDEX idx_demandes_statut ON demandes_rdv(statut)')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

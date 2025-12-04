import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'sync_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('type', 20).notNullable() // 'onedrive' | 'google_calendar'
      table.string('mode', 20).notNullable() // 'auto' | 'manual'
      table.string('statut', 20).notNullable() // 'success' | 'partial' | 'error'
      
      table.integer('elements_traites').defaultTo(0)
      table.integer('elements_crees').defaultTo(0)
      table.integer('elements_modifies').defaultTo(0)
      table.integer('elements_supprimes').defaultTo(0)
      table.integer('elements_erreur').defaultTo(0)
      
      table.text('message').nullable()
      table.jsonb('details').nullable()
      table.integer('duree_ms').nullable()
      
      table.uuid('triggered_by_id').nullable().references('id').inTable('admins').onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
    })

    this.schema.raw('CREATE INDEX idx_sync_logs ON sync_logs(type, created_at DESC)')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

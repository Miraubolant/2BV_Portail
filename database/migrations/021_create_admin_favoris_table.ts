import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'admin_favoris'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.uuid('admin_id').notNullable().references('id').inTable('admins').onDelete('CASCADE')
      table.string('favori_type', 20).notNullable() // 'dossier' | 'client'
      table.uuid('favori_id').notNullable() // ID du dossier ou client
      table.integer('ordre').defaultTo(0) // Pour ordonner les favoris
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())

      // Un admin ne peut avoir qu'un seul favori par item
      table.unique(['admin_id', 'favori_type', 'favori_id'])
    })

    this.schema.raw('CREATE INDEX idx_admin_favoris_admin ON admin_favoris(admin_id)')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'notes'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('dossier_id')
        .notNullable()
        .references('id')
        .inTable('dossiers')
        .onDelete('CASCADE')
      table
        .uuid('created_by_id')
        .notNullable()
        .references('id')
        .inTable('admins')
        .onDelete('CASCADE')
      table.text('contenu').notNullable()
      table.boolean('is_pinned').defaultTo(false)
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['dossier_id'])
      table.index(['created_by_id'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

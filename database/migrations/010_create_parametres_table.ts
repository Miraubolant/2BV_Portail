import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'parametres'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('cle', 100).notNullable().unique()
      table.text('valeur').nullable()
      table.string('type', 20).defaultTo('string')
      table.string('categorie', 50).nullable()
      table.text('description').nullable()
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.uuid('updated_by_id').nullable().references('id').inTable('admins').onDelete('SET NULL')
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

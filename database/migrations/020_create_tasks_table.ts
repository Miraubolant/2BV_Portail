import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'tasks'

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
      table
        .uuid('assigned_to_id')
        .nullable()
        .references('id')
        .inTable('admins')
        .onDelete('SET NULL')
      table.string('titre', 255).notNullable()
      table.text('description').nullable()
      table.enum('priorite', ['basse', 'normale', 'haute', 'urgente']).defaultTo('normale')
      table.enum('statut', ['a_faire', 'en_cours', 'terminee', 'annulee']).defaultTo('a_faire')
      table.timestamp('date_echeance', { useTz: true }).nullable()
      table.timestamp('rappel_date', { useTz: true }).nullable()
      table.boolean('rappel_envoye').defaultTo(false)
      table.timestamp('completed_at', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable()
      table.timestamp('updated_at', { useTz: true }).notNullable()

      table.index(['dossier_id'])
      table.index(['assigned_to_id'])
      table.index(['statut'])
      table.index(['date_echeance'])
      table.index(['rappel_date'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

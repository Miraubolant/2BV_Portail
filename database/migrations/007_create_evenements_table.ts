import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'evenements'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table
        .uuid('dossier_id')
        .notNullable()
        .references('id')
        .inTable('dossiers')
        .onDelete('CASCADE')

      table.string('titre', 255).notNullable()
      table.text('description').nullable()
      table.string('type', 30).notNullable()

      table.timestamp('date_debut', { useTz: true }).notNullable()
      table.timestamp('date_fin', { useTz: true }).notNullable()
      table.boolean('journee_entiere').defaultTo(false)

      table.string('lieu', 255).nullable()
      table.text('adresse').nullable()
      table.string('salle', 100).nullable()

      table.string('statut', 20).defaultTo('confirme')

      // Google Calendar
      table.string('google_event_id', 255).nullable()
      table.timestamp('google_last_sync', { useTz: true }).nullable()
      table.boolean('sync_google').defaultTo(true)

      // Rappels
      table.boolean('rappel_envoye').defaultTo(false)
      table.boolean('rappel_j7').defaultTo(false)
      table.boolean('rappel_j1').defaultTo(false)

      table.uuid('created_by_id').nullable().references('id').inTable('admins').onDelete('SET NULL')
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })

    this.schema.raw('CREATE INDEX idx_evenements_dossier ON evenements(dossier_id)')
    this.schema.raw('CREATE INDEX idx_evenements_date ON evenements(date_debut)')
    this.schema.raw('CREATE INDEX idx_evenements_google ON evenements(google_event_id)')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

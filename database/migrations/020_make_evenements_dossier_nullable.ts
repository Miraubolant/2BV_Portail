import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'evenements'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // Make dossier_id nullable to support events without a case (imported from Google)
      table.uuid('dossier_id').nullable().alter()
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      // Revert to not nullable (warning: this will fail if there are null values)
      table.uuid('dossier_id').notNullable().alter()
    })
  }
}

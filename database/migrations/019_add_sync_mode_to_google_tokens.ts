import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'google_tokens'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      // 'auto' = sync automatiquement a chaque creation/modification
      // 'manual' = sync uniquement via le bouton Synchroniser
      table.string('sync_mode', 20).defaultTo('auto')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('sync_mode')
    })
  }
}

import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  async up() {
    // Supprimer la table avec la mauvaise structure
    this.schema.dropTableIfExists('remember_me_tokens')

    // Recreer avec la structure correcte pour AdonisJS
    this.schema.createTable('remember_me_tokens', (table) => {
      table.increments('id')
      table.uuid('tokenable_id').notNullable()
      table.string('hash').notNullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').notNullable()
      table.timestamp('expires_at').notNullable()
    })
  }

  async down() {
    this.schema.dropTable('remember_me_tokens')
  }
}

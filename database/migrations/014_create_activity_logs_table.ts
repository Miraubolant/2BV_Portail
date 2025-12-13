import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'activity_logs'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))

      table.string('user_type', 20).notNullable()
      table.uuid('user_id').nullable()

      table.string('action', 100).notNullable()
      table.string('resource_type', 50).nullable()
      table.uuid('resource_id').nullable()

      table.string('ip_address', 45).nullable()
      table.text('user_agent').nullable()
      table.jsonb('metadata').nullable()

      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
    })

    this.schema.raw(
      'CREATE INDEX idx_activity_logs ON activity_logs(user_type, user_id, created_at DESC)'
    )
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

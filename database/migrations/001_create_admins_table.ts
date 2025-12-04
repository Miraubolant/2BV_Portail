import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'admins'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.uuid('id').primary().defaultTo(this.raw('gen_random_uuid()'))
      table.string('email', 255).notNullable().unique()
      table.string('password', 255).notNullable()
      table.string('nom', 100).notNullable()
      table.string('prenom', 100).notNullable()
      table.enum('role', ['super_admin', 'admin']).notNullable().defaultTo('admin')
      table.string('totp_secret', 255).nullable()
      table.boolean('totp_enabled').defaultTo(false)
      table.boolean('actif').defaultTo(true)
      table.uuid('created_by_id').nullable().references('id').inTable('admins').onDelete('SET NULL')
      table.timestamp('last_login', { useTz: true }).nullable()
      table.timestamp('created_at', { useTz: true }).notNullable().defaultTo(this.now())
      table.timestamp('updated_at', { useTz: true }).notNullable().defaultTo(this.now())
    })

    this.schema.raw('CREATE INDEX idx_admins_role ON admins(role)')
    this.schema.raw('CREATE INDEX idx_admins_email ON admins(email)')
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}

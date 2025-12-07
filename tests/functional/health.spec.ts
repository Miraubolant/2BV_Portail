import { test } from '@japa/runner'

test.group('Health check', () => {
  test('should return server health status', async ({ assert, client }) => {
    const response = await client.get('/api/health')

    response.assertStatus(200)
    assert.equal(response.body().status, 'ok')
    assert.isString(response.body().timestamp)

    // Verify timestamp is in ISO format
    const timestamp = new Date(response.body().timestamp)
    assert.isFalse(Number.isNaN(timestamp.getTime()))
  })
})

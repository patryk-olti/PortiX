const request = require('supertest')
const { randomUUID } = require('crypto')
const { newDb } = require('pg-mem')

const mockPgMem = newDb({ autoCreateForeignKeyIndices: true })
const { Pool } = mockPgMem.adapters.createPg()
const mockPool = new Pool()

mockPgMem.public.registerFunction({
  name: 'gen_random_uuid',
  returns: 'uuid',
  implementation: () => randomUUID(),
})

mockPgMem.public.registerFunction({
  name: 'trim',
  args: ['text'],
  returns: 'text',
  implementation: value => (typeof value === 'string' ? value.trim() : value),
})

jest.mock('../src/lib/db', () => ({
  pool: mockPool,
  __db: mockPgMem,
}))

const app = require('../src/index.js')

const ensureSchema = app.ensureSchema

async function resetDatabase() {
  const { __db } = require('../src/lib/db')
  try {
    await __db.public.none(`delete from users;`)
  } catch (error) {
    // Ignore if table doesn't exist yet
  }
}

beforeAll(async () => {
  await ensureSchema()
})

beforeEach(async () => {
  await resetDatabase()
})

describe('Users API', () => {
  test('creates a user', async () => {
    const payload = {
      username: 'testuser',
      password: 'testpass123',
      role: 'user',
      canViewPortfolio: true,
      canViewIdeas: true,
    }

    const response = await request(app).post('/api/users').send(payload)

    expect(response.status).toBe(201)
    expect(response.body).toHaveProperty('data')
    expect(response.body.data).toMatchObject({
      username: 'testuser',
      role: 'user',
      canViewPortfolio: true,
      canViewIdeas: true,
    })
    expect(response.body.data).toHaveProperty('id')
    expect(response.body.data).not.toHaveProperty('password')
    expect(response.body.data).toHaveProperty('createdAt')
    expect(response.body.data).toHaveProperty('updatedAt')
  })

  test('rejects user with missing username', async () => {
    const payload = {
      password: 'testpass123',
    }

    const response = await request(app).post('/api/users').send(payload)

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      error: 'Username is required',
    })
  })

  test('rejects user with missing password', async () => {
    const payload = {
      username: 'testuser',
    }

    const response = await request(app).post('/api/users').send(payload)

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      error: 'Password is required',
    })
  })

  test('rejects user with invalid role', async () => {
    const payload = {
      username: 'testuser',
      password: 'testpass123',
      role: 'invalid',
    }

    const response = await request(app).post('/api/users').send(payload)

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('error')
    expect(response.body).toHaveProperty('allowed')
  })

  test('lists users', async () => {
    // Create some users
    await request(app).post('/api/users').send({
      username: 'user1',
      password: 'pass1',
    })

    await request(app).post('/api/users').send({
      username: 'user2',
      password: 'pass2',
    })

    const response = await request(app).get('/api/users')

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body.data)).toBe(true)
    expect(response.body.data.length).toBeGreaterThanOrEqual(2)
  })

  test('lists users with limit', async () => {
    // Create multiple users
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/users').send({
        username: `user${i}`,
        password: `pass${i}`,
      })
    }

    const response = await request(app).get('/api/users?limit=3')

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body.data)).toBe(true)
    expect(response.body.data.length).toBeLessThanOrEqual(3)
  })

  test('gets a single user by id', async () => {
    const createResponse = await request(app).post('/api/users').send({
      username: 'testuser',
      password: 'testpass',
      role: 'admin',
    })

    const userId = createResponse.body.data.id

    const response = await request(app).get(`/api/users/${userId}`)

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      username: 'testuser',
      role: 'admin',
    })
    expect(response.body.data).not.toHaveProperty('password')
  })

  test('returns 404 when getting non-existent user', async () => {
    const fakeId = randomUUID()

    const response = await request(app).get(`/api/users/${fakeId}`)

    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({
      error: 'User not found',
    })
  })

  test('updates a user', async () => {
    const createResponse = await request(app).post('/api/users').send({
      username: 'originaluser',
      password: 'originalpass',
      role: 'user',
    })

    const userId = createResponse.body.data.id

    const updateResponse = await request(app).put(`/api/users/${userId}`).send({
      username: 'updateduser',
      role: 'admin',
      canViewPortfolio: true,
    })

    expect(updateResponse.status).toBe(200)
    expect(updateResponse.body.data).toMatchObject({
      username: 'updateduser',
      role: 'admin',
      canViewPortfolio: true,
    })
  })

  test('returns 404 when updating non-existent user', async () => {
    const fakeId = randomUUID()

    const response = await request(app).put(`/api/users/${fakeId}`).send({
      username: 'updateduser',
    })

    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({
      error: 'User not found',
    })
  })

  test('deletes a user', async () => {
    const createResponse = await request(app).post('/api/users').send({
      username: 'usertodelete',
      password: 'pass',
    })

    const userId = createResponse.body.data.id

    const deleteResponse = await request(app).delete(`/api/users/${userId}`)

    expect(deleteResponse.status).toBe(200)
    expect(deleteResponse.body).toMatchObject({
      success: true,
    })

    // Verify it's deleted
    const getResponse = await request(app).get(`/api/users/${userId}`)
    expect(getResponse.status).toBe(404)
  })

  test('returns 404 when deleting non-existent user', async () => {
    const fakeId = randomUUID()

    const response = await request(app).delete(`/api/users/${fakeId}`)

    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({
      error: 'User not found',
    })
  })

  test('batch updates users', async () => {
    const user1 = await request(app).post('/api/users').send({
      username: 'user1',
      password: 'pass1',
    })
    const user2 = await request(app).post('/api/users').send({
      username: 'user2',
      password: 'pass2',
    })

    const updates = [
      {
        id: user1.body.data.id,
        role: 'admin',
      },
      {
        id: user2.body.data.id,
        canViewPortfolio: true,
      },
    ]

    const response = await request(app).post('/api/users/batch-update').send({ updates })

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body.data)).toBe(true)
    expect(response.body.data.length).toBe(2)
    expect(response.body.data[0]).toMatchObject({
      id: user1.body.data.id,
      role: 'admin',
    })
    expect(response.body.data[1]).toMatchObject({
      id: user2.body.data.id,
      canViewPortfolio: true,
    })
  })
})


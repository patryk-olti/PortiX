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

describe('Auth API', () => {
  test('logs in with correct credentials', async () => {
    // Create a user first
    await request(app).post('/api/users').send({
      username: 'testuser',
      password: 'testpass123',
    })

    const response = await request(app).post('/api/auth/login').send({
      username: 'testuser',
      password: 'testpass123',
    })

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('data')
    expect(response.body.data).toMatchObject({
      username: 'testuser',
    })
    expect(response.body.data).not.toHaveProperty('password')
    expect(response.body.data).toHaveProperty('id')
  })

  test('rejects login with missing username', async () => {
    const response = await request(app).post('/api/auth/login').send({
      password: 'testpass123',
    })

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      error: 'Username is required',
    })
  })

  test('rejects login with missing password', async () => {
    const response = await request(app).post('/api/auth/login').send({
      username: 'testuser',
    })

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      error: 'Password is required',
    })
  })

  test('rejects login with incorrect username', async () => {
    // Create a user
    await request(app).post('/api/users').send({
      username: 'testuser',
      password: 'testpass123',
    })

    const response = await request(app).post('/api/auth/login').send({
      username: 'wronguser',
      password: 'testpass123',
    })

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({
      error: 'Invalid username or password',
    })
  })

  test('rejects login with incorrect password', async () => {
    // Create a user
    await request(app).post('/api/users').send({
      username: 'testuser',
      password: 'testpass123',
    })

    const response = await request(app).post('/api/auth/login').send({
      username: 'testuser',
      password: 'wrongpass',
    })

    expect(response.status).toBe(401)
    expect(response.body).toMatchObject({
      error: 'Invalid username or password',
    })
  })

  test('returns user role and permissions on successful login', async () => {
    // Create a user with specific permissions
    await request(app).post('/api/users').send({
      username: 'adminuser',
      password: 'adminpass',
      role: 'admin',
      canViewPortfolio: true,
      canViewIdeas: true,
      canViewClosedPositions: true,
    })

    const response = await request(app).post('/api/auth/login').send({
      username: 'adminuser',
      password: 'adminpass',
    })

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      username: 'adminuser',
      role: 'admin',
      canViewPortfolio: true,
      canViewIdeas: true,
      canViewClosedPositions: true,
    })
  })
})


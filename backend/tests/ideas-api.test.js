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
    await __db.public.none(`delete from ideas;`)
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

describe('Ideas API', () => {
  test('creates an idea', async () => {
    const payload = {
      symbol: 'BTCUSDT',
      market: 'Cryptocurrency',
      entryLevel: '42000',
      stopLoss: '40000',
      description: 'Buy BTC at support level',
      targetTp: '45000',
      entryStrategy: 'level',
    }

    const response = await request(app).post('/api/ideas').send(payload)

    expect(response.status).toBe(201)
    expect(response.body).toHaveProperty('data')
    expect(response.body.data).toMatchObject({
      symbol: 'BTCUSDT',
      market: 'Cryptocurrency',
      entryLevel: '42000',
      stopLoss: '40000',
      description: 'Buy BTC at support level',
      targetTp: '45000',
      entryStrategy: 'level',
    })
    expect(response.body.data).toHaveProperty('id')
    expect(response.body.data).toHaveProperty('createdAt')
    expect(response.body.data).toHaveProperty('updatedAt')
  })

  test('rejects idea with missing symbol', async () => {
    const payload = {
      market: 'Cryptocurrency',
      entryLevel: '42000',
      stopLoss: '40000',
      description: 'Buy BTC at support level',
    }

    const response = await request(app).post('/api/ideas').send(payload)

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      error: 'Symbol is required',
    })
  })

  test('rejects idea with missing market', async () => {
    const payload = {
      symbol: 'BTCUSDT',
      entryLevel: '42000',
      stopLoss: '40000',
      description: 'Buy BTC at support level',
    }

    const response = await request(app).post('/api/ideas').send(payload)

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      error: 'Market is required',
    })
  })

  test('rejects idea with missing description', async () => {
    const payload = {
      symbol: 'BTCUSDT',
      market: 'Cryptocurrency',
      entryLevel: '42000',
      stopLoss: '40000',
    }

    const response = await request(app).post('/api/ideas').send(payload)

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      error: 'Description is required',
    })
  })

  test('rejects idea with invalid entry strategy', async () => {
    const payload = {
      symbol: 'BTCUSDT',
      market: 'Cryptocurrency',
      entryLevel: '42000',
      stopLoss: '40000',
      description: 'Buy BTC at support level',
      entryStrategy: 'invalid',
    }

    const response = await request(app).post('/api/ideas').send(payload)

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('error')
    expect(response.body).toHaveProperty('allowed')
  })

  test('lists ideas', async () => {
    // Create some ideas
    await request(app).post('/api/ideas').send({
      symbol: 'BTCUSDT',
      market: 'Cryptocurrency',
      entryLevel: '42000',
      stopLoss: '40000',
      description: 'Idea 1',
    })

    await request(app).post('/api/ideas').send({
      symbol: 'ETHUSDT',
      market: 'Cryptocurrency',
      entryLevel: '2500',
      stopLoss: '2300',
      description: 'Idea 2',
    })

    const response = await request(app).get('/api/ideas')

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body.data)).toBe(true)
    expect(response.body.data.length).toBeGreaterThanOrEqual(2)
  })

  test('lists ideas with limit', async () => {
    // Create multiple ideas
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/ideas').send({
        symbol: `SYMBOL${i}`,
        market: 'Market',
        entryLevel: '100',
        stopLoss: '90',
        description: `Idea ${i}`,
      })
    }

    const response = await request(app).get('/api/ideas?limit=3')

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body.data)).toBe(true)
    expect(response.body.data.length).toBeLessThanOrEqual(3)
  })

  test('gets a single idea by id', async () => {
    const createResponse = await request(app).post('/api/ideas').send({
      symbol: 'BTCUSDT',
      market: 'Cryptocurrency',
      entryLevel: '42000',
      stopLoss: '40000',
      description: 'Test idea',
    })

    const ideaId = createResponse.body.data.id

    const response = await request(app).get(`/api/ideas/${ideaId}`)

    expect(response.status).toBe(200)
    expect(response.body.data).toMatchObject({
      symbol: 'BTCUSDT',
      description: 'Test idea',
    })
  })

  test('returns 404 when getting non-existent idea', async () => {
    const fakeId = randomUUID()

    const response = await request(app).get(`/api/ideas/${fakeId}`)

    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({
      error: 'Idea not found',
    })
  })

  test('updates an idea', async () => {
    const createResponse = await request(app).post('/api/ideas').send({
      symbol: 'BTCUSDT',
      market: 'Cryptocurrency',
      entryLevel: '42000',
      stopLoss: '40000',
      description: 'Original description',
    })

    const ideaId = createResponse.body.data.id

    const updateResponse = await request(app).put(`/api/ideas/${ideaId}`).send({
      symbol: 'ETHUSDT',
      description: 'Updated description',
      entryStrategy: 'candlePattern',
    })

    expect(updateResponse.status).toBe(200)
    expect(updateResponse.body.data).toMatchObject({
      symbol: 'ETHUSDT',
      description: 'Updated description',
      entryStrategy: 'candlePattern',
    })
  })

  test('returns 404 when updating non-existent idea', async () => {
    const fakeId = randomUUID()

    const response = await request(app).put(`/api/ideas/${fakeId}`).send({
      description: 'Updated description',
    })

    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({
      error: 'Idea not found',
    })
  })

  test('deletes an idea', async () => {
    const createResponse = await request(app).post('/api/ideas').send({
      symbol: 'BTCUSDT',
      market: 'Cryptocurrency',
      entryLevel: '42000',
      stopLoss: '40000',
      description: 'Idea to delete',
    })

    const ideaId = createResponse.body.data.id

    const deleteResponse = await request(app).delete(`/api/ideas/${ideaId}`)

    expect(deleteResponse.status).toBe(200)
    expect(deleteResponse.body).toMatchObject({
      success: true,
    })

    // Verify it's deleted
    const getResponse = await request(app).get(`/api/ideas/${ideaId}`)
    expect(getResponse.status).toBe(404)
  })

  test('returns 404 when deleting non-existent idea', async () => {
    const fakeId = randomUUID()

    const response = await request(app).delete(`/api/ideas/${fakeId}`)

    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({
      error: 'Idea not found',
    })
  })
})


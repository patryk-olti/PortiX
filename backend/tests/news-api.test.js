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
    await __db.public.none(`delete from news;`)
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

describe('News API', () => {
  test('creates a news item', async () => {
    const payload = {
      title: 'Test News',
      summary: 'This is a test news item',
      importance: 'high',
      publishedOn: '2024-01-15T10:00:00.000Z',
    }

    const response = await request(app).post('/api/news').send(payload)

    expect(response.status).toBe(201)
    expect(response.body).toHaveProperty('data')
    expect(response.body.data).toMatchObject({
      title: 'Test News',
      summary: 'This is a test news item',
      importance: 'high',
    })
    expect(response.body.data).toHaveProperty('id')
    expect(response.body.data).toHaveProperty('createdAt')
    expect(response.body.data).toHaveProperty('updatedAt')
  })

  test('rejects news item with missing title', async () => {
    const payload = {
      summary: 'This is a test news item',
      importance: 'high',
    }

    const response = await request(app).post('/api/news').send(payload)

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      error: 'Title is required',
    })
  })

  test('rejects news item with missing summary', async () => {
    const payload = {
      title: 'Test News',
      importance: 'high',
    }

    const response = await request(app).post('/api/news').send(payload)

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      error: 'Summary is required',
    })
  })

  test('rejects news item with invalid importance', async () => {
    const payload = {
      title: 'Test News',
      summary: 'This is a test news item',
      importance: 'invalid',
    }

    const response = await request(app).post('/api/news').send(payload)

    expect(response.status).toBe(400)
    expect(response.body).toHaveProperty('error')
    expect(response.body).toHaveProperty('allowed')
  })

  test('lists news items', async () => {
    // Create some news items
    await request(app).post('/api/news').send({
      title: 'News 1',
      summary: 'Summary 1',
      importance: 'high',
    })

    await request(app).post('/api/news').send({
      title: 'News 2',
      summary: 'Summary 2',
      importance: 'medium',
    })

    const response = await request(app).get('/api/news')

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body.data)).toBe(true)
    expect(response.body.data.length).toBeGreaterThanOrEqual(2)
  })

  test('lists news items with limit', async () => {
    // Create multiple news items
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/news').send({
        title: `News ${i}`,
        summary: `Summary ${i}`,
        importance: 'low',
      })
    }

    const response = await request(app).get('/api/news?limit=3')

    expect(response.status).toBe(200)
    expect(Array.isArray(response.body.data)).toBe(true)
    expect(response.body.data.length).toBeLessThanOrEqual(3)
  })

  test('updates a news item', async () => {
    const createResponse = await request(app).post('/api/news').send({
      title: 'Original Title',
      summary: 'Original Summary',
      importance: 'low',
    })

    const newsId = createResponse.body.data.id

    const updateResponse = await request(app).put(`/api/news/${newsId}`).send({
      title: 'Updated Title',
      summary: 'Updated Summary',
      importance: 'high',
    })

    expect(updateResponse.status).toBe(200)
    expect(updateResponse.body.data).toMatchObject({
      title: 'Updated Title',
      summary: 'Updated Summary',
      importance: 'high',
    })
  })

  test('returns 404 when updating non-existent news item', async () => {
    const fakeId = randomUUID()

    const response = await request(app).put(`/api/news/${fakeId}`).send({
      title: 'Updated Title',
    })

    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({
      error: 'News item not found',
    })
  })

  test('deletes a news item', async () => {
    const createResponse = await request(app).post('/api/news').send({
      title: 'News to Delete',
      summary: 'This will be deleted',
      importance: 'low',
    })

    const newsId = createResponse.body.data.id

    const deleteResponse = await request(app).delete(`/api/news/${newsId}`)

    expect(deleteResponse.status).toBe(200)
    expect(deleteResponse.body).toMatchObject({
      success: true,
    })

    // Verify it's deleted
    const getResponse = await request(app).get('/api/news')
    const found = getResponse.body.data.find(item => item.id === newsId)
    expect(found).toBeUndefined()
  })

  test('returns 404 when deleting non-existent news item', async () => {
    const fakeId = randomUUID()

    const response = await request(app).delete(`/api/news/${fakeId}`)

    expect(response.status).toBe(404)
    expect(response.body).toMatchObject({
      error: 'News item not found',
    })
  })
})


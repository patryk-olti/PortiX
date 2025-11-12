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

jest.mock('../src/lib/tradingview', () => ({
  fetchTradingViewQuotes: jest.fn(async symbols =>
    symbols.map(symbol => ({
      symbol,
      price: 123.45,
      currency: 'USD',
      name: `Mock ${symbol}`,
      description: `Quote for ${symbol}`,
      exchange: 'MOCK',
    })),
  ),
}))

jest.mock('../src/lib/providers/coingecko', () => ({
  fetchCoinPrices: jest.fn(async (ids, vsCurrency) => {
    const result = {}
    ids.forEach(id => {
      result[id] = {
        [vsCurrency]: 42000,
      }
    })
    return result
  }),
}))

jest.mock('../src/lib/providers/alphaVantage', () => ({
  fetchGlobalQuote: jest.fn(async () => ({
    '05. price': '150.25',
  })),
}))

const app = require('../src/index.js')

const ensureSchema = app.ensureSchema

async function resetDatabase() {
  const { __db } = require('../src/lib/db')
  await __db.public.none(`
    truncate table portfolio_position_snapshots restart identity cascade;
    truncate table portfolio_position_analyses restart identity cascade;
    truncate table portfolio_positions restart identity cascade;
    truncate table news restart identity cascade;
  `)
}

async function createPosition(overrides = {}) {
  const payload = {
    symbol: 'TEST',
    name: 'Test Asset',
    category: 'stock',
    positionType: 'long',
    purchasePrice: '100 USD',
    currentPrice: '105 USD',
    returnValue: '5%',
    positionSizeType: 'capital',
    positionCurrency: 'USD',
    positionSizeLabel: '1000 USD',
    analysis: {
      trend: 'bullish',
      stopLoss: '90 USD',
      summary: 'Baseline analysis',
      entryStrategy: 'level',
    },
    ...overrides,
  }

  if (overrides.analysis) {
    payload.analysis = {
      ...payload.analysis,
      ...overrides.analysis,
    }
  }

  const response = await request(app).post('/api/positions').send(payload)
  expect(response.status).toBe(201)
  expect(response.body).toHaveProperty('data')
  return response.body.data
}

beforeAll(async () => {
  await ensureSchema()
})

beforeEach(async () => {
  await resetDatabase()
})

describe('Portfolio positions API', () => {
  test('creates a position with analysis data', async () => {
    const position = await createPosition()

    expect(position).toMatchObject({
      symbol: 'TEST',
      category: 'stock',
      positionType: 'long',
      positionSizeType: 'capital',
      positionCurrency: 'USD',
    })
    expect(position.quoteSymbol).toBe('NASDAQ:TEST')
    expect(position.analysis).toMatchObject({
      trend: 'bullish',
      stopLoss: '90 USD',
      summary: 'Baseline analysis',
      entryStrategy: 'level',
      completed: false,
      positionClosed: false,
    })
    expect(position.positionTotalValue).toBe(1000)
    expect(position.databaseId).toBeDefined()
  })

  test('lists positions including latest price snapshot and analysis', async () => {
    await createPosition({
      symbol: 'BTCUSDT',
      category: 'cryptocurrency',
      purchasePrice: '25000 USDT',
      currentPrice: '26000 USDT',
      positionSizeType: 'units',
      positionSizeValue: 2,
    })

    const response = await request(app).get('/api/positions')
    expect(response.status).toBe(200)
    expect(Array.isArray(response.body.data)).toBe(true)
    expect(response.body.data).toHaveLength(1)
    const [position] = response.body.data
    expect(position.category).toBe('cryptocurrency')
    expect(position.currentPriceValue).toEqual(expect.any(Number))
    expect(position.analysis).not.toBeNull()
    expect(position.analysis.entryStrategy).toBe('level')
  })

  test('updates and deletes analysis for a position', async () => {
    const position = await createPosition()
    const updatePayload = {
      trend: 'bearish',
      stopLoss: '95 USD',
      summary: 'Updated plan',
      completed: true,
      completionNote: 'Take profit reached',
      completionDate: '2024-01-10T12:00:00.000Z',
      positionClosed: true,
      positionClosedNote: 'Closed manually',
      positionClosedDate: '2024-01-11T08:30:00.000Z',
      entryStrategy: 'candlePattern',
    }

    const updateResponse = await request(app)
      .put(`/api/positions/${position.databaseId}/analysis`)
      .send(updatePayload)

    expect(updateResponse.status).toBe(200)
    const updated = updateResponse.body.data
    expect(updated.analysis).toMatchObject({
      trend: 'bearish',
      summary: 'Updated plan',
      completed: true,
      completionNote: 'Take profit reached',
      entryStrategy: 'candlePattern',
      positionClosed: true,
    })

    const deleteResponse = await request(app).delete(`/api/positions/${position.databaseId}/analysis`)
    expect(deleteResponse.status).toBe(200)
    expect(deleteResponse.body.data.analysis).toBeNull()
  })

  test('deletes a position with related data', async () => {
    const position = await createPosition({
      symbol: 'OIL',
      category: 'commodity',
      positionType: 'short',
      positionSizeType: 'pips',
      positionSizeValue: 50,
      positionSizePerPipLabel: '10 USD',
    })

    const response = await request(app).delete(`/api/positions/${position.databaseId}`)
    expect(response.status).toBe(200)
    expect(response.body).toMatchObject({
      success: true,
    })

    const listResponse = await request(app).get('/api/positions')
    expect(listResponse.status).toBe(200)
    expect(listResponse.body.data).toHaveLength(0)
  })

  test('rejects invalid position size type', async () => {
    const payload = {
      symbol: 'BAD',
      name: 'Invalid Position',
      category: 'stock',
      positionType: 'long',
      purchasePrice: '10 USD',
      currentPrice: '11 USD',
      returnValue: '10%',
      positionSizeType: 'invalid',
      positionSizeLabel: '100 USD',
      analysis: {
        trend: 'bullish',
        stopLoss: '9 USD',
        summary: 'Test',
        entryStrategy: 'level',
      },
    }

    const response = await request(app).post('/api/positions').send(payload)
    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({
      error: 'Invalid position size type',
    })
  })

  test('resolves quote symbol suggestions automatically', async () => {
    const response = await request(app).post('/api/positions/resolve-symbol').send({
      symbol: 'BTCUSDT',
      category: 'cryptocurrency',
    })

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('data')
    expect(response.body.data).toMatchObject({
      quoteSymbol: 'BINANCE:BTCUSDT',
      source: expect.any(String),
    })
  })

  test('returns validation error when symbol is missing in resolver', async () => {
    const response = await request(app).post('/api/positions/resolve-symbol').send({
      category: 'stock',
    })

    expect(response.status).toBe(400)
    expect(response.body).toMatchObject({ error: 'Symbol is required' })
  })
})


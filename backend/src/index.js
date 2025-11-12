require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { pool } = require('./lib/db')
const { ensureSchema } = require('./lib/schema')
const {
  createPosition,
  listPositions,
  POSITION_CATEGORY_VALUES,
  POSITION_TYPE_VALUES,
} = require('./lib/positions')
const { fetchTradingViewQuotes } = require('./lib/tradingview')
const { createNewsItem, IMPORTANCE_VALUES, listNewsItems, updateNewsItem, deleteNewsItem } = require('./lib/news')

const app = express()
const PORT = process.env.PORT || 3000

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
  'http://localhost:3000',
  'http://127.0.0.1:3000',
]

const configuredOrigins =
  typeof process.env.CORS_ORIGINS === 'string' && process.env.CORS_ORIGINS.trim().length > 0
    ? process.env.CORS_ORIGINS.split(',')
        .map(origin => origin.trim())
        .filter(origin => origin.length > 0)
    : undefined

const allowedOrigins = configuredOrigins ?? DEFAULT_ALLOWED_ORIGINS
const allowAll = process.env.CORS_ALLOW_ALL === 'true'

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true)
        return
      }
      if (allowAll || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error(`Not allowed by CORS: ${origin}`))
    },
    credentials: true,
  }),
)

app.use(express.json())

app.get('/health', async (_req, res) => {
  try {
    const result = await pool.query('select 1 as ok')
    res.json({ status: 'ok', db: result.rows[0]?.ok === 1 ? 'connected' : 'unknown' })
  } catch (error) {
    console.error('Health check failed:', error)
    const errorDetails = {}
    if (error && typeof error === 'object') {
      Object.getOwnPropertyNames(error).forEach(key => {
        errorDetails[key] = error[key]
      })
      console.error('Serialized error fields:', errorDetails)
    }
    res.status(500).json({
      status: 'error',
      message: 'Database connection failed',
      details: {
        message: error instanceof Error ? error.message : String(error),
        fields: errorDetails,
      },
    })
  }
})

app.get('/api/positions', async (_req, res) => {
  try {
    const data = await listPositions()
    res.json({ data })
  } catch (error) {
    console.error('Failed to fetch positions:', error)
    res.status(500).json({
      error: 'Failed to fetch positions',
      details: error instanceof Error ? error.message : String(error),
    })
  }
})

app.post('/api/prices', async (req, res) => {
  const { symbols } = req.body ?? {}

  if (!Array.isArray(symbols) || !symbols.length) {
    res.status(400).json({ error: 'Provide an array of symbols' })
    return
  }

  try {
    const quotes = await fetchTradingViewQuotes(symbols)
    const data = quotes
      .filter(item => item && typeof item.symbol === 'string')
      .map(item => ({
        symbol: item.symbol,
        price: typeof item.price === 'number' ? item.price : null,
        currency: item.currency,
        name: item.name,
        description: item.description,
        exchange: item.exchange,
        updatedAt: new Date().toISOString(),
      }))

    res.json({ data })
  } catch (error) {
    console.error('Failed to fetch TradingView quotes:', error)
    res.status(502).json({
      error: 'Failed to fetch quotes from TradingView',
      details: error instanceof Error ? error.message : String(error),
    })
  }
})

app.post('/api/positions', async (req, res) => {
  const payload = req.body ?? {}

  try {
    const position = await createPosition(payload)
    res.status(201).json({ data: position })
  } catch (error) {
    if (error?.code === 'INVALID_SYMBOL') {
      res.status(400).json({ error: 'Symbol is required' })
      return
    }

    if (error?.code === 'INVALID_PURCHASE_PRICE') {
      res.status(400).json({ error: 'Purchase price is required' })
      return
    }

    if (error?.code === 'INVALID_CATEGORY') {
      res.status(400).json({
        error: 'Invalid category value',
        allowed: POSITION_CATEGORY_VALUES,
      })
      return
    }

    if (error?.code === 'INVALID_POSITION_TYPE') {
      res.status(400).json({
        error: 'Invalid position type value',
        allowed: POSITION_TYPE_VALUES,
      })
      return
    }

    if (error?.code === 'POSITION_EXISTS') {
      res.status(409).json({ error: 'Position with this symbol already exists' })
      return
    }

    console.error('Failed to create position:', error)
    res.status(500).json({
      error: 'Failed to create position',
      details: error instanceof Error ? error.message : String(error),
    })
  }
})

app.post('/api/news', async (req, res) => {
  const { title, summary, importance, publishedOn } = req.body ?? {}

  if (!title || typeof title !== 'string') {
    return res.status(400).json({ error: 'Title is required' })
  }
  if (!summary || typeof summary !== 'string') {
    return res.status(400).json({ error: 'Summary is required' })
  }
  if (!importance || typeof importance !== 'string') {
    return res.status(400).json({ error: 'Importance is required' })
  }

  try {
    const newsItem = await createNewsItem({ title, summary, importance, publishedOn })
    res.status(201).json({ data: newsItem })
  } catch (error) {
    if (error?.code === 'INVALID_IMPORTANCE') {
      return res.status(400).json({
        error: 'Invalid importance value',
        allowed: IMPORTANCE_VALUES,
      })
    }

    console.error('Failed to create news:', error)
    res.status(500).json({
      error: 'Failed to create news item',
      details: error instanceof Error ? error.message : String(error),
    })
  }
})

app.get('/api/news', async (req, res) => {
  const limitParam = req.query.limit
  const limit = typeof limitParam === 'string' ? Number.parseInt(limitParam, 10) : 20

  try {
    const data = await listNewsItems(Number.isNaN(limit) || limit <= 0 ? 20 : Math.min(limit, 100))
    res.json({ data })
  } catch (error) {
    console.error('Failed to fetch news:', error)
    res.status(500).json({
      error: 'Failed to fetch news',
      details: error instanceof Error ? error.message : String(error),
    })
  }
})

app.put('/api/news/:id', async (req, res) => {
  const { id } = req.params
  if (!id) {
    res.status(400).json({ error: 'Missing news id' })
    return
  }

  const { title, summary, importance, publishedOn } = req.body ?? {}

  if (
    (typeof title !== 'string' || !title.trim()) &&
    (typeof summary !== 'string' || !summary.trim()) &&
    (typeof importance !== 'string' || !importance.trim()) &&
    (typeof publishedOn !== 'string' || !publishedOn.trim())
  ) {
    res.status(400).json({ error: 'Provide at least one field to update' })
    return
  }

  try {
    const updated = await updateNewsItem(id, { title, summary, importance, publishedOn })
    if (!updated) {
      res.status(404).json({ error: 'News item not found' })
      return
    }
    res.json({ data: updated })
  } catch (error) {
    if (error?.code === 'INVALID_IMPORTANCE') {
      res.status(400).json({ error: 'Invalid importance value', allowed: IMPORTANCE_VALUES })
      return
    }

    console.error('Failed to update news:', error)
    res.status(500).json({
      error: 'Failed to update news',
      details: error instanceof Error ? error.message : String(error),
    })
  }
})

app.delete('/api/news/:id', async (req, res) => {
  const { id } = req.params
  if (!id) {
    res.status(400).json({ error: 'Missing news id' })
    return
  }
  try {
    const deleted = await deleteNewsItem(id)
    if (!deleted) {
      res.status(404).json({ error: 'News item not found' })
      return
    }
    res.json({ success: true })
  } catch (error) {
    console.error('Failed to delete news:', error)
    res.status(500).json({
      error: 'Failed to delete news',
      details: error instanceof Error ? error.message : String(error),
    })
  }
})

ensureSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`PortiX backend listening on port ${PORT}`)
    })
  })
  .catch(error => {
    console.error('Failed to initialize database schema:', error)
    process.exit(1)
  })

module.exports = app


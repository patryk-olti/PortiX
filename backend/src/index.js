require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { pool } = require('./lib/db')
const { ensureSchema, POSITION_SIZE_TYPE_VALUES } = require('./lib/schema')
const {
  createPosition,
  listPositions,
  POSITION_CATEGORY_VALUES,
  POSITION_TYPE_VALUES,
  upsertPositionAnalysis,
  deletePositionAnalysis,
  deletePosition,
  updatePositionQuoteSymbol,
  previewQuoteSymbol,
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

app.use(express.json({ limit: '25mb' }))
app.use(express.urlencoded({ limit: '25mb', extended: true }))

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

    if (error?.code === 'INVALID_ANALYSIS') {
      res.status(400).json({ error: 'Analysis payload is invalid' })
      return
    }

    if (error?.code === 'INVALID_ANALYSIS_TREND') {
      res.status(400).json({
        error: 'Invalid analysis trend value',
        allowed: error.allowed,
      })
      return
    }

    if (error?.code === 'INVALID_ANALYSIS_STOP_LOSS') {
      res.status(400).json({ error: 'Analysis stop loss is required' })
      return
    }

    if (error?.code === 'INVALID_ANALYSIS_SUMMARY') {
      res.status(400).json({ error: 'Analysis summary is required' })
      return
    }

    if (error?.code === 'INVALID_POSITION_SIZE_TYPE') {
      res.status(400).json({
        error: 'Invalid position size type',
        allowed: POSITION_SIZE_TYPE_VALUES,
      })
      return
    }

    if (error?.code === 'INVALID_POSITION_SIZE_VALUE') {
      res.status(400).json({ error: 'Invalid position size value' })
      return
    }

    if (error?.code === 'INVALID_POSITION_SIZE_PER_PIP') {
      res.status(400).json({ error: 'Invalid per-pip value' })
      return
    }

    if (error?.code === 'INVALID_PURCHASE_PRICE_VALUE') {
      res.status(400).json({ error: 'Unable to compute position value from purchase price' })
      return
    }

    console.error('Failed to create position:', error)
    res.status(500).json({
      error: 'Failed to create position',
      details: error instanceof Error ? error.message : String(error),
    })
  }
})

app.post('/api/positions/resolve-symbol', (req, res) => {
  const { symbol, category, hint, quoteSymbol } = req.body ?? {}
  if (typeof symbol !== 'string' || !symbol.trim()) {
    res.status(400).json({ error: 'Symbol is required' })
    return
  }

  const resolved = previewQuoteSymbol({
    symbol,
    category,
    hint: typeof hint === 'string' && hint.trim() ? hint : quoteSymbol,
  })

  res.json({ data: resolved })
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

app.put('/api/positions/:id/analysis', async (req, res) => {
  const { id } = req.params
  if (!id) {
    res.status(400).json({ error: 'Missing position id' })
    return
  }

  const payload = req.body ?? {}
  const analysisPayload =
    payload && typeof payload === 'object' && payload.analysis && typeof payload.analysis === 'object'
      ? payload.analysis
      : payload

  try {
    const position = await upsertPositionAnalysis(id, analysisPayload)
    if (!position) {
      res.status(404).json({ error: 'Position not found' })
      return
    }
    res.json({ data: position })
  } catch (error) {
    if (error?.code === 'POSITION_NOT_FOUND') {
      res.status(404).json({ error: 'Position not found' })
      return
    }

    if (error?.code === 'INVALID_ANALYSIS') {
      res.status(400).json({ error: 'Analysis payload is invalid' })
      return
    }

    if (error?.code === 'INVALID_ANALYSIS_TREND') {
      res.status(400).json({ error: 'Invalid analysis trend value', allowed: error.allowed })
      return
    }

    if (error?.code === 'INVALID_ANALYSIS_STOP_LOSS') {
      res.status(400).json({ error: 'Analysis stop loss is required' })
      return
    }

    if (error?.code === 'INVALID_ANALYSIS_SUMMARY') {
      res.status(400).json({ error: 'Analysis summary is required' })
      return
    }

    console.error('Failed to update analysis:', error)
    res.status(500).json({
      error: 'Failed to update analysis',
      details: error instanceof Error ? error.message : String(error),
    })
  }
})

app.delete('/api/positions/:id/analysis', async (req, res) => {
  const { id } = req.params
  if (!id) {
    res.status(400).json({ error: 'Missing position id' })
    return
  }

  try {
    const position = await deletePositionAnalysis(id)
    if (!position) {
      res.status(404).json({ error: 'Position not found' })
      return
    }
    res.json({ data: position })
  } catch (error) {
    if (error?.code === 'POSITION_NOT_FOUND') {
      res.status(404).json({ error: 'Position not found' })
      return
    }

    console.error('Failed to delete analysis:', error)
    res.status(500).json({
      error: 'Failed to delete analysis',
      details: error instanceof Error ? error.message : String(error),
    })
  }
})

app.delete('/api/positions/:id', async (req, res) => {
  const { id } = req.params
  if (!id) {
    res.status(400).json({ error: 'Missing position id' })
    return
  }

  try {
    const result = await deletePosition(id)
    res.json({ success: true, data: result })
  } catch (error) {
    if (error?.code === 'POSITION_NOT_FOUND') {
      res.status(404).json({ error: 'Position not found' })
      return
    }

    console.error('Failed to delete position:', error)
    res.status(500).json({
      error: 'Failed to delete position',
      details: error instanceof Error ? error.message : String(error),
    })
  }
})

app.patch('/api/positions/:id', async (req, res) => {
  const { id } = req.params
  if (!id) {
    res.status(400).json({ error: 'Missing position id' })
    return
  }

  const { quoteSymbol } = req.body ?? {}

  try {
    const position = await updatePositionQuoteSymbol(id, quoteSymbol)
    if (!position) {
      res.status(404).json({ error: 'Position not found' })
      return
    }
    res.json({ data: position })
  } catch (error) {
    if (error?.code === 'POSITION_NOT_FOUND') {
      res.status(404).json({ error: 'Position not found' })
      return
    }

    console.error('Failed to update position metadata:', error)
    res.status(500).json({
      error: 'Failed to update position metadata',
      details: error instanceof Error ? error.message : String(error),
    })
  }
})

const isTestEnv = process.env.NODE_ENV === 'test'

if (!isTestEnv) {
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
}

app.ensureSchema = ensureSchema

module.exports = app


require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { pool } = require('./lib/db')
const { ensureNewsTable } = require('./lib/schema')
const { createNewsItem, IMPORTANCE_VALUES, listNewsItems } = require('./lib/news')

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

ensureNewsTable()
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


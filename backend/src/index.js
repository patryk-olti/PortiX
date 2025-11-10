require('dotenv').config()
const express = require('express')
const { pool } = require('./lib/db')
const { ensureNewsTable } = require('./lib/schema')
const { createNewsItem, IMPORTANCE_VALUES } = require('./lib/news')

const app = express()
const PORT = process.env.PORT || 3000

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


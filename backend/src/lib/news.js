const { pool } = require('./db')
const { IMPORTANCE_VALUES } = require('./schema')

const IMPORTANCE_SET = new Set(IMPORTANCE_VALUES)

function validateImportance(value) {
  return IMPORTANCE_SET.has(value)
}

async function createNewsItem({ title, summary, importance, publishedOn }) {
  const normalizedTitle = title.trim()
  const normalizedSummary = summary.trim()
  const importanceValue = importance.trim().toLowerCase()
  if (!validateImportance(importanceValue)) {
    throw Object.assign(new Error('Invalid importance value'), {
      code: 'INVALID_IMPORTANCE',
      allowed: IMPORTANCE_VALUES,
    })
  }

  const publishedDate =
    publishedOn && !Number.isNaN(Date.parse(publishedOn))
      ? publishedOn
      : new Date().toISOString().slice(0, 10)

  const result = await pool.query(
    `
      insert into news (title, summary, importance, published_on)
      values ($1, $2, $3, $4::date)
      returning
        id,
        title,
        summary,
        importance,
        published_on::text as "publishedOn",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    [normalizedTitle, normalizedSummary, importanceValue, publishedDate],
  )

  return result.rows[0]
}

async function listNewsItems(limit = 20) {
  const result = await pool.query(
    `
      select
        id,
        title,
        summary,
        importance,
        published_on::text as "publishedOn",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from news
      order by published_on desc, created_at desc
      limit $1
    `,
    [limit],
  )

  return result.rows
}

module.exports = {
  createNewsItem,
  validateImportance,
  IMPORTANCE_VALUES,
  listNewsItems,
}


const { pool } = require('./db')
const { ANALYSIS_ENTRY_STRATEGY_VALUES } = require('./schema')

const ENTRY_STRATEGY_SET = new Set(ANALYSIS_ENTRY_STRATEGY_VALUES)

function validateEntryStrategy(value) {
  return !value || ENTRY_STRATEGY_SET.has(value)
}

async function createIdea({
  symbol,
  market,
  entryLevel,
  stopLoss,
  description,
  targetTp,
  entryStrategy,
  tradingviewImage,
}) {
  const normalizedSymbol = symbol.trim()
  const normalizedMarket = market.trim()
  const normalizedEntryLevel = entryLevel.trim()
  const normalizedStopLoss = stopLoss.trim()
  const normalizedDescription = description.trim()
  const normalizedTargetTp = targetTp ? targetTp.trim() : null
  const normalizedEntryStrategy = entryStrategy && entryStrategy.trim() ? entryStrategy.trim() : null

  if (normalizedEntryStrategy && !validateEntryStrategy(normalizedEntryStrategy)) {
    throw Object.assign(new Error('Invalid entry strategy value'), {
      code: 'INVALID_ENTRY_STRATEGY',
      allowed: ANALYSIS_ENTRY_STRATEGY_VALUES,
    })
  }

  // Data publikacji jest automatycznie ustawiana na dzisiaj
  const publishedDate = new Date().toISOString().slice(0, 10)

  const result = await pool.query(
    `
      insert into portfolio_ideas (
        symbol, name, market, entry_level, stop_loss, description,
        target_tp, entry_strategy, tradingview_image, published_on
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::date)
      returning
        id,
        symbol,
        name,
        market,
        entry_level as "entryLevel",
        stop_loss as "stopLoss",
        description,
        target_tp as "targetTp",
        entry_strategy as "entryStrategy",
        tradingview_image as "tradingviewImage",
        published_on::text as "publishedOn",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    [
      normalizedSymbol,
      normalizedSymbol, // name = symbol (dla kompatybilności z bazą)
      normalizedMarket,
      normalizedEntryLevel,
      normalizedStopLoss,
      normalizedDescription,
      normalizedTargetTp,
      normalizedEntryStrategy,
      tradingviewImage || null,
      publishedDate,
    ],
  )

  return result.rows[0]
}

async function listIdeas(limit = 50) {
  const result = await pool.query(
    `
      select
        id,
        symbol,
        name,
        market,
        entry_level as "entryLevel",
        stop_loss as "stopLoss",
        description,
        target_tp as "targetTp",
        entry_strategy as "entryStrategy",
        tradingview_image as "tradingviewImage",
        published_on::text as "publishedOn",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from portfolio_ideas
      order by published_on desc, created_at desc
      limit $1
    `,
    [limit],
  )

  return result.rows
}

async function getIdeaById(id) {
  const result = await pool.query(
    `
      select
        id,
        symbol,
        name,
        market,
        entry_level as "entryLevel",
        stop_loss as "stopLoss",
        description,
        target_tp as "targetTp",
        entry_strategy as "entryStrategy",
        tradingview_image as "tradingviewImage",
        published_on::text as "publishedOn",
        created_at as "createdAt",
        updated_at as "updatedAt"
      from portfolio_ideas
      where id = $1::uuid
    `,
    [id],
  )

  return result.rows[0] ?? null
}

async function updateIdea(id, {
  symbol,
  market,
  entryLevel,
  stopLoss,
  description,
  targetTp,
  entryStrategy,
  tradingviewImage,
}) {
  const fields = []
  const values = []

  if (typeof symbol === 'string') {
    fields.push('symbol = $' + (fields.length + 1))
    values.push(symbol.trim())
    // Aktualizuj również name (dla kompatybilności z bazą)
    fields.push('name = $' + (fields.length + 1))
    values.push(symbol.trim())
  }

  if (typeof market === 'string') {
    fields.push('market = $' + (fields.length + 1))
    values.push(market.trim())
  }

  if (typeof entryLevel === 'string') {
    fields.push('entry_level = $' + (fields.length + 1))
    values.push(entryLevel.trim())
  }

  if (typeof stopLoss === 'string') {
    fields.push('stop_loss = $' + (fields.length + 1))
    values.push(stopLoss.trim())
  }

  if (typeof description === 'string') {
    fields.push('description = $' + (fields.length + 1))
    values.push(description.trim())
  }

  if (typeof targetTp === 'string') {
    const trimmed = targetTp.trim()
    if (trimmed) {
      fields.push('target_tp = $' + (fields.length + 1))
      values.push(trimmed)
    } else {
      fields.push('target_tp = $' + (fields.length + 1))
      values.push(null)
    }
  } else if (targetTp === null) {
    fields.push('target_tp = $' + (fields.length + 1))
    values.push(null)
  }

  if (typeof entryStrategy === 'string') {
    const trimmed = entryStrategy.trim()
    if (trimmed) {
      if (!validateEntryStrategy(trimmed)) {
        throw Object.assign(new Error('Invalid entry strategy value'), {
          code: 'INVALID_ENTRY_STRATEGY',
          allowed: ANALYSIS_ENTRY_STRATEGY_VALUES,
        })
      }
      fields.push('entry_strategy = $' + (fields.length + 1))
      values.push(trimmed)
    } else {
      fields.push('entry_strategy = $' + (fields.length + 1))
      values.push(null)
    }
  } else if (entryStrategy === null) {
    fields.push('entry_strategy = $' + (fields.length + 1))
    values.push(null)
  }

  if (typeof tradingviewImage === 'string') {
    const trimmed = tradingviewImage.trim()
    if (trimmed) {
      fields.push('tradingview_image = $' + (fields.length + 1))
      values.push(trimmed)
    } else {
      fields.push('tradingview_image = $' + (fields.length + 1))
      values.push(null)
    }
  } else if (tradingviewImage === null) {
    fields.push('tradingview_image = $' + (fields.length + 1))
    values.push(null)
  }

  // Data publikacji nie jest aktualizowana - pozostaje pierwotna

  if (!fields.length) {
    return null
  }

  values.push(id)

  const result = await pool.query(
    `
      update portfolio_ideas
      set ${fields.join(', ')}, updated_at = now()
      where id = $${values.length}::uuid
      returning
        id,
        symbol,
        name,
        market,
        entry_level as "entryLevel",
        stop_loss as "stopLoss",
        description,
        target_tp as "targetTp",
        entry_strategy as "entryStrategy",
        tradingview_image as "tradingviewImage",
        published_on::text as "publishedOn",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `,
    values,
  )

  return result.rows[0] ?? null
}

async function deleteIdea(id) {
  const result = await pool.query(
    `
      delete from portfolio_ideas
      where id = $1::uuid
      returning id
    `,
    [id],
  )
  return result.rowCount > 0
}

module.exports = {
  createIdea,
  listIdeas,
  getIdeaById,
  updateIdea,
  deleteIdea,
  validateEntryStrategy,
  ANALYSIS_ENTRY_STRATEGY_VALUES,
}


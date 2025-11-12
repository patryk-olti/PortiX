const { pool } = require('./db')
const { POSITION_CATEGORY_VALUES, POSITION_TYPE_VALUES } = require('./schema')

const CATEGORY_SET = new Set(POSITION_CATEGORY_VALUES)
const POSITION_TYPE_SET = new Set(POSITION_TYPE_VALUES)

const CATEGORY_LABELS = {
  stock: 'Akcje',
  commodity: 'Surowiec',
  hedge: 'Zabezpieczenie',
  cash: 'Gotówka',
}

function normalizeSymbol(value) {
  return value.trim().toUpperCase()
}

function normalizeName(value, fallbackSymbol) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : fallbackSymbol
}

function parseReturnValue(value) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string') {
    const normalized = value.replace('%', '').trim()
    const parsed = Number.parseFloat(normalized)
    if (Number.isFinite(parsed)) {
      return parsed
    }
  }
  return 0
}

function formatReturnLabel(value) {
  const rounded = Math.round(value * 10) / 10
  const prefix = rounded > 0 ? '+' : ''
  return `${prefix}${rounded.toFixed(1)}%`
}

function mapRowToPosition(row) {
  const category = row.category
  const returnValue = Number.isFinite(Number(row.return_value)) ? Number(row.return_value) : 0

  return {
    id: row.slug ?? row.id,
    symbol: row.symbol,
    name: row.name,
    category,
    categoryName: CATEGORY_LABELS[category] ?? category,
    purchasePrice: row.purchase_price_label,
    currentPrice: row.current_price_label ?? row.purchase_price_label,
    return: row.return_label ?? formatReturnLabel(returnValue),
    returnValue,
    positionType: row.position_type,
  }
}

async function createPosition(payload) {
  const symbolInput = typeof payload.symbol === 'string' ? payload.symbol : ''
  const nameInput = typeof payload.name === 'string' ? payload.name : symbolInput
  const categoryInput = typeof payload.category === 'string' ? payload.category.toLowerCase() : ''
  const positionTypeInput =
    typeof payload.positionType === 'string' ? payload.positionType.toLowerCase() : ''
  const purchasePriceInput =
    typeof payload.purchasePrice === 'string' ? payload.purchasePrice.trim() : ''
  const currentPriceInput =
    typeof payload.currentPrice === 'string' && payload.currentPrice.trim().length > 0
      ? payload.currentPrice.trim()
      : undefined
  const returnValueInput = parseReturnValue(payload.returnValue)

  if (!symbolInput.trim()) {
    throw Object.assign(new Error('Symbol is required'), { code: 'INVALID_SYMBOL' })
  }

  if (!purchasePriceInput) {
    throw Object.assign(new Error('Purchase price is required'), { code: 'INVALID_PURCHASE_PRICE' })
  }

  if (!CATEGORY_SET.has(categoryInput)) {
    throw Object.assign(new Error('Invalid category value'), {
      code: 'INVALID_CATEGORY',
      allowed: POSITION_CATEGORY_VALUES,
    })
  }

  if (!POSITION_TYPE_SET.has(positionTypeInput)) {
    throw Object.assign(new Error('Invalid position type value'), {
      code: 'INVALID_POSITION_TYPE',
      allowed: POSITION_TYPE_VALUES,
    })
  }

  const symbol = normalizeSymbol(symbolInput)
  const name = normalizeName(nameInput, symbol)
  const slug = symbol.toLowerCase()

  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const positionResult = await client.query(
      `
        insert into portfolio_positions (slug, symbol, name, category, position_type, purchase_price_label)
        values ($1, $2, $3, $4, $5, $6)
        returning id, slug, symbol, name, category, position_type, purchase_price_label
      `,
      [slug, symbol, name, categoryInput, positionTypeInput, purchasePriceInput],
    )

    const position = positionResult.rows[0]
    const currentPriceLabel = currentPriceInput ?? purchasePriceInput
    const normalizedReturnValue = Number.isFinite(returnValueInput) ? returnValueInput : 0
    const returnLabel = formatReturnLabel(normalizedReturnValue)

    const snapshotResult = await client.query(
      `
        insert into portfolio_position_snapshots (
          position_id,
          current_price_label,
          return_value,
          return_label
        )
        values ($1, $2, $3, $4)
        returning current_price_label, return_value, return_label
      `,
      [position.id, currentPriceLabel, normalizedReturnValue, returnLabel],
    )

    await client.query('COMMIT')

    return mapRowToPosition({
      ...position,
      current_price_label: snapshotResult.rows[0].current_price_label,
      return_value: snapshotResult.rows[0].return_value,
      return_label: snapshotResult.rows[0].return_label,
    })
  } catch (error) {
    await client.query('ROLLBACK')
    if (error && typeof error === 'object' && error.code === '23505') {
      throw Object.assign(new Error('Position with this symbol already exists'), {
        code: 'POSITION_EXISTS',
      })
    }
    throw error
  } finally {
    client.release()
  }
}

async function listPositions() {
  const result = await pool.query(
    `
      select
        p.id,
        p.slug,
        p.symbol,
        p.name,
        p.category,
        p.position_type,
        p.purchase_price_label,
        snapshot.current_price_label,
        snapshot.return_value,
        snapshot.return_label
      from portfolio_positions p
      left join lateral (
        select
          s.current_price_label,
          s.return_value,
          s.return_label
        from portfolio_position_snapshots s
        where s.position_id = p.id
        order by s.recorded_at desc
        limit 1
      ) snapshot on true
      order by p.created_at desc
    `,
  )

  return result.rows.map(mapRowToPosition)
}

module.exports = {
  createPosition,
  listPositions,
  POSITION_CATEGORY_VALUES,
  POSITION_TYPE_VALUES,
}



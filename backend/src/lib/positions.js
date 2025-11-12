const { pool } = require('./db')
const { POSITION_CATEGORY_VALUES, POSITION_TYPE_VALUES } = require('./schema')
const { fetchTradingViewQuotes } = require('./tradingview')

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

function normalizeQuoteSymbol(value, fallbackSymbol) {
  if (typeof value !== 'string') {
    return fallbackSymbol
  }
  const trimmed = value.trim().toUpperCase()
  return trimmed.length > 0 ? trimmed : fallbackSymbol
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

function formatPriceLabel(value, currency) {
  if (!Number.isFinite(value)) {
    return null
  }
  const formatter = new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: value >= 100 ? 2 : 3,
    maximumFractionDigits: value >= 100 ? 2 : 4,
  })
  const formatted = formatter.format(value)
  return currency && currency.trim().length ? `${formatted} ${currency}` : formatted
}

function parsePriceValue(label) {
  if (!label || typeof label !== 'string') {
    return null
  }

  const match = label.replace(/\s+/g, '').replace(',', '.').match(/-?\d+(\.\d+)?/)
  if (!match) {
    return null
  }

  const value = Number.parseFloat(match[0])
  return Number.isFinite(value) ? value : null
}

function inferCurrencyFromLabel(label) {
  if (!label || typeof label !== 'string') {
    return null
  }
  const match = label.trim().match(/([A-Za-z]{3})$/)
  if (!match) {
    return null
  }
  return match[1].toUpperCase()
}

function mapRowToPosition(row) {
  const category = row.category
  const returnValue = Number.isFinite(Number(row.return_value)) ? Number(row.return_value) : 0

  const priceValue =
    row.latest_price_value ??
    row.current_price_value ??
    parsePriceValue(row.latest_price_label ?? row.current_price_label)

  const priceCurrency =
    row.latest_price_currency ??
    row.current_price_currency ??
    inferCurrencyFromLabel(row.latest_price_label ?? row.current_price_label ?? row.purchase_price_label)

  const priceLabel =
    row.latest_price_label ??
    row.current_price_label ??
    formatPriceLabel(priceValue ?? parsePriceValue(row.purchase_price_label), priceCurrency) ??
    row.purchase_price_label

  const computedReturnValue =
    row.latest_return_value ??
    row.return_value ??
    (Number.isFinite(Number(returnValue)) ? Number(returnValue) : 0)

  const returnLabel =
    row.latest_return_label ??
    row.return_label ??
    formatReturnLabel(Number.isFinite(Number(computedReturnValue)) ? Number(computedReturnValue) : returnValue)

  return {
    id: row.slug ?? row.id,
    symbol: row.symbol,
    quoteSymbol: row.quote_symbol ?? row.symbol,
    name: row.name,
    category,
    categoryName: CATEGORY_LABELS[category] ?? category,
    purchasePrice: row.purchase_price_label,
    currentPrice: priceLabel,
    currentPriceValue: typeof priceValue === 'number' ? priceValue : null,
    currentPriceCurrency: priceCurrency ?? null,
    return: returnLabel,
    returnValue: Number.isFinite(Number(computedReturnValue)) ? Number(computedReturnValue) : 0,
    latestPriceUpdatedAt: row.latest_price_updated_at,
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
  const quoteSymbol = normalizeQuoteSymbol(payload.quoteSymbol, symbol)

  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const positionResult = await client.query(
      `
        insert into portfolio_positions (slug, symbol, quote_symbol, name, category, position_type, purchase_price_label)
        values ($1, $2, $3, $4, $5, $6, $7)
        returning id, slug, symbol, quote_symbol, name, category, position_type, purchase_price_label
      `,
      [slug, symbol, quoteSymbol, name, categoryInput, positionTypeInput, purchasePriceInput],
    )

    const position = positionResult.rows[0]
    const currentPriceLabel = currentPriceInput ?? purchasePriceInput
    const normalizedReturnValue = Number.isFinite(returnValueInput) ? returnValueInput : 0
    const returnLabel = formatReturnLabel(normalizedReturnValue)
    const initialPriceValue = parsePriceValue(currentPriceLabel)
    const initialCurrency =
      inferCurrencyFromLabel(currentPriceInput) ?? inferCurrencyFromLabel(purchasePriceInput)

    const snapshotResult = await client.query(
      `
        insert into portfolio_position_snapshots (
          position_id,
          current_price_value,
          current_price_currency,
          current_price_label,
          return_value,
          return_label
        )
        values ($1, $2, $3, $4, $5, $6)
        returning current_price_value, current_price_currency, current_price_label, return_value, return_label
      `,
      [position.id, initialPriceValue, initialCurrency, currentPriceLabel, normalizedReturnValue, returnLabel],
    )

    const latestPriceLabel =
      snapshotResult.rows[0].current_price_label ??
      formatPriceLabel(snapshotResult.rows[0].current_price_value, snapshotResult.rows[0].current_price_currency) ??
      currentPriceLabel

    await client.query(
      `
        update portfolio_positions
        set
          latest_price_value = $2,
          latest_price_currency = $3,
          latest_price_label = $4,
          latest_return_value = $5,
          latest_return_label = $6,
          latest_price_updated_at = now()
        where id = $1
      `,
      [
        position.id,
        snapshotResult.rows[0].current_price_value,
        snapshotResult.rows[0].current_price_currency,
        latestPriceLabel,
        snapshotResult.rows[0].return_value,
        snapshotResult.rows[0].return_label,
      ],
    )

    await client.query('COMMIT')

    return mapRowToPosition({
      ...position,
      latest_price_value: snapshotResult.rows[0].current_price_value,
      latest_price_currency: snapshotResult.rows[0].current_price_currency,
      latest_price_label: latestPriceLabel,
      latest_return_value: snapshotResult.rows[0].return_value,
      latest_return_label: snapshotResult.rows[0].return_label,
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
        p.quote_symbol,
        p.name,
        p.category,
        p.position_type,
        p.purchase_price_label,
        p.latest_price_value,
        p.latest_price_currency,
        p.latest_price_label,
        p.latest_return_value,
        p.latest_return_label,
        p.latest_price_updated_at,
        snapshot.current_price_value,
        snapshot.current_price_currency,
        snapshot.current_price_label,
        snapshot.return_value,
        snapshot.return_label
      from portfolio_positions p
      left join lateral (
        select
          s.current_price_value,
          s.current_price_currency,
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

  const positions = result.rows.map(mapRowToPosition)
  const symbolsToFetch = Array.from(
    new Set(
      positions
        .map(position => position.quoteSymbol)
        .filter(symbol => typeof symbol === 'string' && symbol.trim().length > 0),
    ),
  )

  if (!symbolsToFetch.length) {
    return positions
  }

  try {
    const quotes = await fetchTradingViewQuotes(symbolsToFetch)
    const quoteBySymbol = new Map(quotes.map(quote => [quote.symbol, quote]))

    const updatedPositions = positions.map(position => {
      const quote = quoteBySymbol.get(position.quoteSymbol)
      if (!quote || typeof quote.price !== 'number' || !Number.isFinite(quote.price)) {
        return position
      }

      const currentPriceCurrency = quote.currency ?? position.currentPriceCurrency ?? null
      const currentPriceValue = quote.price
      const currentPrice = formatPriceLabel(currentPriceValue, currentPriceCurrency)

      const purchaseValue = parseReturnValue(position.purchasePrice)
      const returnValue =
        typeof purchaseValue === 'number' && purchaseValue !== 0
          ? ((currentPriceValue - purchaseValue) / purchaseValue) * 100
          : position.returnValue

      const normalizedReturnValue = Number.isFinite(returnValue) ? returnValue : position.returnValue

      return {
        ...position,
        currentPrice: currentPrice ?? position.currentPrice,
        currentPriceValue,
        currentPriceCurrency,
        returnValue: normalizedReturnValue,
        return: formatReturnLabel(normalizedReturnValue),
      }
    })

    const updates = updatedPositions
      .map(position => {
        const original = positions.find(item => item.id === position.id)
        if (!original) {
          return null
        }

        if (
          original.currentPriceValue === position.currentPriceValue &&
          original.returnValue === position.returnValue &&
          original.currentPriceCurrency === position.currentPriceCurrency
        ) {
          return null
        }

        return {
          id: position.id,
          priceValue: position.currentPriceValue,
          priceCurrency: position.currentPriceCurrency,
          priceLabel: position.currentPrice,
          returnValue: position.returnValue,
          returnLabel: position.return,
        }
      })
      .filter(item => item !== null)

    if (updates.length) {
      await pool.query('BEGIN')
      try {
        for (const update of updates) {
          await pool.query(
            `
              insert into portfolio_position_snapshots (
                position_id,
                current_price_value,
                current_price_currency,
                current_price_label,
                return_value,
                return_label
              )
              values ($1, $2, $3, $4, $5, $6)
            `,
            [
              update.id,
              update.priceValue,
              update.priceCurrency,
              update.priceLabel,
              update.returnValue,
              update.returnLabel,
            ],
          )

          await pool.query(
            `
              update portfolio_positions
              set
                latest_price_value = $2,
                latest_price_currency = $3,
                latest_price_label = $4,
                latest_return_value = $5,
                latest_return_label = $6,
                latest_price_updated_at = now()
              where id = $1
            `,
            [
              update.id,
              update.priceValue,
              update.priceCurrency,
              update.priceLabel,
              update.returnValue,
              update.returnLabel,
            ],
          )
        }
        await pool.query('COMMIT')
      } catch (updateError) {
        await pool.query('ROLLBACK')
        console.error('Failed to persist TradingView quotes:', updateError)
      }
    }

    return updatedPositions
  } catch (error) {
    console.error('Failed to fetch TradingView quotes in listPositions:', error)
    return positions
  }
}

module.exports = {
  createPosition,
  listPositions,
  POSITION_CATEGORY_VALUES,
  POSITION_TYPE_VALUES,
}



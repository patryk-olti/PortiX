const { pool } = require('./db')
const {
  POSITION_CATEGORY_VALUES,
  POSITION_TYPE_VALUES,
  ANALYSIS_TREND_VALUES,
  POSITION_SIZE_TYPE_VALUES,
  ANALYSIS_ENTRY_STRATEGY_VALUES,
} = require('./schema')
const { fetchTradingViewQuotes } = require('./tradingview')
const { fetchCoinPrices } = require('./providers/coingecko')
const { fetchGlobalQuote } = require('./providers/alphaVantage')

const CATEGORY_SET = new Set(POSITION_CATEGORY_VALUES)
const POSITION_TYPE_SET = new Set(POSITION_TYPE_VALUES)
const POSITION_SIZE_TYPE_SET = new Set(POSITION_SIZE_TYPE_VALUES)
const ANALYSIS_TREND_SET = new Set(ANALYSIS_TREND_VALUES)
const ENTRY_STRATEGY_SET = new Set(ANALYSIS_ENTRY_STRATEGY_VALUES)

const DEFAULT_QUOTE_SYMBOLS = {
  soxx: 'NASDAQ:SOXX',
  msft: 'NASDAQ:MSFT',
  dax: 'INDEX:DEU40',
  gold: 'TVC:GOLD',
  cash: 'OANDA:USDCAD',
  wticousd: 'TVC:USOIL',
  'wticousd(2)': 'TVC:USOIL',
  btc: 'BINANCE:BTCUSDT',
  eth: 'BINANCE:ETHUSDT',
  btcusdt: 'BINANCE:BTCUSDT',
  ethusdt: 'BINANCE:ETHUSDT',
}

const QUOTES_CONFIG = {
  'BINANCE:BTCUSDT': { provider: 'coingecko', coinId: 'bitcoin', vsCurrency: 'usd', targetCurrency: 'USDT' },
  'BINANCE:ETHUSDT': { provider: 'coingecko', coinId: 'ethereum', vsCurrency: 'usd', targetCurrency: 'USDT' },
  'TVC:USOIL': { provider: 'alphaVantage', symbol: 'CL=F', currency: 'USD' },
  'NASDAQ:MSFT': { provider: 'alphaVantage', symbol: 'MSFT', currency: 'USD' },
  'NASDAQ:SOXX': { provider: 'alphaVantage', symbol: 'SOXX', currency: 'USD' },
}

const CATEGORY_LABELS = {
  stock: 'Akcje',
  commodity: 'Surowiec',
  hedge: 'Zabezpieczenie',
  cash: 'Gotówka',
  cryptocurrency: 'Kryptowaluty',
}

function normalizeSymbol(value) {
  return value.trim().toUpperCase()
}

function normalizeQuoteInput(value) {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim()
  if (!trimmed) {
    return undefined
  }

  if (/^(ALPHA|COINGECKO):/i.test(trimmed)) {
    return trimmed.toUpperCase()
  }

  const upperTrimmed = trimmed.toUpperCase()
  if (upperTrimmed.includes(':')) {
    return upperTrimmed
  }
  const lower = upperTrimmed.toLowerCase()
  if (DEFAULT_QUOTE_SYMBOLS[lower]) {
    return DEFAULT_QUOTE_SYMBOLS[lower]
  }
  return undefined
}

function getDefaultQuoteSymbol(symbol, category, incoming) {
  if (incoming && /^(ALPHA|COINGECKO):/i.test(incoming)) {
    return incoming.toUpperCase()
  }

  const lower = symbol.toLowerCase()
  if (DEFAULT_QUOTE_SYMBOLS[lower]) {
    return DEFAULT_QUOTE_SYMBOLS[lower]
  }

  if (symbol.includes(':')) {
    return symbol.toUpperCase()
  }

  const upper = symbol.toUpperCase()
  switch (category) {
    case 'commodity':
      return `TVC:${upper}`
    case 'hedge':
      return `INDEX:${upper}`
    case 'cash':
      return `FX:${upper}`
    case 'stock':
      return `NASDAQ:${upper}`
    case 'cryptocurrency':
      if (upper.endsWith('USDT')) {
        return `BINANCE:${upper}`
      }
      return `BINANCE:${upper}USDT`
    default:
      return upper
  }
}

function resolveQuoteSymbol(symbol, category, incoming) {
  return normalizeQuoteInput(incoming) ?? getDefaultQuoteSymbol(symbol, category, incoming)
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

  const analysis = mapAnalysisFromRow(row)

  return {
    id: row.slug ?? row.id,
    databaseId: row.id,
    symbol: row.symbol,
    quoteSymbol: resolveQuoteSymbol(row.symbol, row.category, row.quote_symbol),
    name: row.name,
    category,
    categoryName: CATEGORY_LABELS[category] ?? category,
    purchasePrice: row.purchase_price_label,
    positionSizeType: row.position_size_type ?? null,
    positionSizeValue: row.position_size_value !== null ? Number(row.position_size_value) : null,
    positionSizeLabel: row.position_size_label ?? null,
    positionSizePerPipValue:
      row.position_size_per_pip !== null && row.position_size_per_pip !== undefined
        ? Number(row.position_size_per_pip)
        : null,
    positionSizePerPipLabel: row.position_size_per_pip_label ?? null,
    positionTotalValue:
      row.position_total_value !== null && row.position_total_value !== undefined
        ? Number(row.position_total_value)
        : null,
    positionTotalValueCurrency: row.position_total_value_currency ?? null,
    positionTotalValueLabel: row.position_total_value_label ?? null,
    currentPrice: priceLabel,
    currentPriceValue: typeof priceValue === 'number' ? priceValue : null,
    currentPriceCurrency: priceCurrency ?? null,
    return: returnLabel,
    returnValue: Number.isFinite(Number(computedReturnValue)) ? Number(computedReturnValue) : 0,
    latestPriceUpdatedAt: row.latest_price_updated_at,
    positionType: row.position_type,
    analysis,
  }
}

function mapAnalysisFromRow(row) {
  if (!row.analysis_trend) {
    return null
  }

  const completionDate = row.analysis_completion_date
    ? new Date(row.analysis_completion_date).toISOString()
    : undefined
  const positionClosedDate = row.analysis_position_closed_date
    ? new Date(row.analysis_position_closed_date).toISOString()
    : undefined

  const entryStrategy =
    typeof row.entry_strategy === 'string' && ENTRY_STRATEGY_SET.has(row.entry_strategy)
      ? row.entry_strategy
      : 'level'

  return {
    trend: row.analysis_trend,
    targets: {
      ...(row.analysis_target_tp1 ? { tp1: row.analysis_target_tp1 } : {}),
      ...(row.analysis_target_tp2 ? { tp2: row.analysis_target_tp2 } : {}),
      ...(row.analysis_target_tp3 ? { tp3: row.analysis_target_tp3 } : {}),
    },
    stopLoss: row.analysis_stop_loss ?? '',
    summary: row.analysis_summary ?? '',
    analysisImage: row.analysis_image ?? undefined,
    completed: row.analysis_completed ?? false,
    completionNote: row.analysis_completion_note ?? undefined,
    completionDate,
    positionClosed: row.analysis_position_closed ?? false,
    positionClosedNote: row.analysis_position_closed_note ?? undefined,
    positionClosedDate,
    entryStrategy,
  }
}

function normalizeTimestamp(value) {
  if (!value) {
    return null
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value
  }

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) {
      return null
    }
    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) {
      return parsed
    }
  }

  return null
}

function normalizeAnalysisPayload(input) {
  if (!input || typeof input !== 'object') {
    throw Object.assign(new Error('Analysis payload is required'), {
      code: 'INVALID_ANALYSIS',
    })
  }

  const rawTrend = typeof input.trend === 'string' ? input.trend.trim().toLowerCase() : ''
  if (!ANALYSIS_TREND_SET.has(rawTrend)) {
    throw Object.assign(new Error('Invalid analysis trend value'), {
      code: 'INVALID_ANALYSIS_TREND',
      allowed: Array.from(ANALYSIS_TREND_SET),
    })
  }

  const stopLoss = typeof input.stopLoss === 'string' ? input.stopLoss.trim() : ''
  if (!stopLoss) {
    throw Object.assign(new Error('Analysis stop loss is required'), {
      code: 'INVALID_ANALYSIS_STOP_LOSS',
    })
  }

  const summary = typeof input.summary === 'string' ? input.summary.trim() : ''
  if (!summary) {
    throw Object.assign(new Error('Analysis summary is required'), {
      code: 'INVALID_ANALYSIS_SUMMARY',
    })
  }

  const targets = input.targets && typeof input.targets === 'object' ? input.targets : {}
  const normalizeTarget = value =>
    typeof value === 'string' && value.trim().length ? value.trim() : null

  const analysisImage =
    typeof input.analysisImage === 'string' && input.analysisImage.trim().length
      ? input.analysisImage.trim()
      : null

  const completed = Boolean(input.completed)
  const completionNote =
    completed && typeof input.completionNote === 'string' && input.completionNote.trim().length
      ? input.completionNote.trim()
      : null
  const completionDate = completed ? normalizeTimestamp(input.completionDate) : null

  const positionClosed = Boolean(input.positionClosed)
  const positionClosedNote =
    positionClosed &&
    typeof input.positionClosedNote === 'string' &&
    input.positionClosedNote.trim().length
      ? input.positionClosedNote.trim()
      : null
  const positionClosedDate = positionClosed ? normalizeTimestamp(input.positionClosedDate) : null

  const rawEntryStrategy = typeof input.entryStrategy === 'string' ? input.entryStrategy.trim() : ''
  const entryStrategy = ENTRY_STRATEGY_SET.has(rawEntryStrategy) ? rawEntryStrategy : 'level'

  return {
    trend: rawTrend,
    stopLoss,
    summary,
    targetTp1: normalizeTarget(targets.tp1),
    targetTp2: normalizeTarget(targets.tp2),
    targetTp3: normalizeTarget(targets.tp3),
    analysisImage,
    completed,
    completionNote,
    completionDate,
    positionClosed,
    positionClosedNote,
    positionClosedDate,
    entryStrategy,
  }
}

async function savePositionAnalysis(client, positionId, analysis) {
  await client.query(
    `
      insert into portfolio_position_analyses (
        position_id,
        trend,
        target_tp1,
        target_tp2,
        target_tp3,
        stop_loss,
        summary,
        analysis_image,
        completed,
        completion_note,
        completion_date,
        position_closed,
        position_closed_note,
        position_closed_date,
        entry_strategy
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      on conflict (position_id) do update set
        trend = excluded.trend,
        target_tp1 = excluded.target_tp1,
        target_tp2 = excluded.target_tp2,
        target_tp3 = excluded.target_tp3,
        stop_loss = excluded.stop_loss,
        summary = excluded.summary,
        analysis_image = excluded.analysis_image,
        completed = excluded.completed,
        completion_note = excluded.completion_note,
        completion_date = excluded.completion_date,
        position_closed = excluded.position_closed,
        position_closed_note = excluded.position_closed_note,
        position_closed_date = excluded.position_closed_date,
        entry_strategy = excluded.entry_strategy,
        updated_at = now()
    `,
    [
      positionId,
      analysis.trend,
      analysis.targetTp1,
      analysis.targetTp2,
      analysis.targetTp3,
      analysis.stopLoss,
      analysis.summary,
      analysis.analysisImage,
      analysis.completed,
      analysis.completionNote,
      analysis.completionDate,
      analysis.positionClosed,
      analysis.positionClosedNote,
      analysis.positionClosedDate,
      analysis.entryStrategy,
    ],
  )
}

async function createPosition(payload) {
  const symbolInput = typeof payload.symbol === 'string' ? payload.symbol : ''
  const nameInput = typeof payload.name === 'string' ? payload.name : symbolInput
  const categoryInput = typeof payload.category === 'string' ? payload.category.toLowerCase() : ''
  const positionTypeInput =
    typeof payload.positionType === 'string' ? payload.positionType.toLowerCase() : ''
  const purchasePriceInputRaw = typeof payload.purchasePrice === 'string' ? payload.purchasePrice.trim() : ''
  const positionCurrencyInput =
    typeof payload.positionCurrency === 'string' ? payload.positionCurrency.trim().toUpperCase() : ''
  const currentPriceInputRaw =
    typeof payload.currentPrice === 'string' && payload.currentPrice.trim().length > 0
      ? payload.currentPrice.trim()
      : undefined
  const returnValueInput = parseReturnValue(payload.returnValue)
  const analysisInput = payload.analysis && typeof payload.analysis === 'object' ? payload.analysis : null
  const normalizedAnalysis = analysisInput ? normalizeAnalysisPayload(analysisInput) : null

  if (!symbolInput.trim()) {
    throw Object.assign(new Error('Symbol is required'), { code: 'INVALID_SYMBOL' })
  }

  if (!purchasePriceInputRaw) {
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

  const sizeTypeInput =
    typeof payload.positionSizeType === 'string' ? payload.positionSizeType.trim().toLowerCase() : ''
  const positionSizeType = POSITION_SIZE_TYPE_SET.has(sizeTypeInput) ? sizeTypeInput : null
  if (!positionSizeType) {
    throw Object.assign(new Error('Invalid position size type'), {
      code: 'INVALID_POSITION_SIZE_TYPE',
      allowed: POSITION_SIZE_TYPE_VALUES,
    })
  }

  const preferredCurrency = positionCurrencyInput.length === 3 ? positionCurrencyInput : null

  const appendCurrencyIfMissing = (label, currency) => {
    if (!label) {
      return label
    }
    const trimmed = label.trim()
    if (!trimmed) {
      return trimmed
    }
    return /[A-Za-z]{3}$/.test(trimmed) ? trimmed : `${trimmed} ${currency}`
  }

  const purchasePriceInput = appendCurrencyIfMissing(purchasePriceInputRaw, preferredCurrency ?? 'PLN')
  const currentPriceInput = currentPriceInputRaw
    ? appendCurrencyIfMissing(currentPriceInputRaw, preferredCurrency ?? 'PLN')
    : undefined

  const symbol = normalizeSymbol(symbolInput)
  const name = normalizeName(nameInput, symbol)
  const slug = symbol.toLowerCase()
  const quoteSymbol = resolveQuoteSymbol(symbol, categoryInput, payload.quoteSymbol)

  const purchasePriceValue = parsePriceValue(purchasePriceInput)
  const purchasePriceCurrency = inferCurrencyFromLabel(purchasePriceInput) ?? preferredCurrency ?? 'PLN'

  const sizeValueRaw =
    typeof payload.positionSizeValue === 'number'
      ? payload.positionSizeValue
      : typeof payload.positionSizeValue === 'string'
        ? Number.parseFloat(payload.positionSizeValue)
        : null
  const sizeLabelInput =
    typeof payload.positionSizeLabel === 'string' ? payload.positionSizeLabel.trim() : ''
  const sizePerPipLabelInputRaw =
    typeof payload.positionSizePerPipLabel === 'string' ? payload.positionSizePerPipLabel.trim() : ''

  let positionCurrency = preferredCurrency ?? purchasePriceCurrency ?? 'PLN'
  let positionSizeValue = null
  let positionSizeLabel = null
  let positionSizePerPipValue = null
  let positionSizePerPipLabel = null
  let positionTotalValue = null
  let positionTotalValueCurrency = null
  let positionTotalValueLabel = null

  const formatOrFallback = (value, currency, fallbackLabel) => {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return formatPriceLabel(value, currency) ?? fallbackLabel
    }
    return fallbackLabel
  }

  if (positionSizeType === 'capital') {
    if (!sizeLabelInput) {
      throw Object.assign(new Error('Investment amount is required'), {
        code: 'INVALID_POSITION_SIZE_VALUE',
      })
    }
    const capitalLabel = appendCurrencyIfMissing(sizeLabelInput, positionCurrency)
    positionSizeLabel = capitalLabel
    const capitalValue = parsePriceValue(capitalLabel)
    if (typeof capitalValue === 'number' && Number.isFinite(capitalValue)) {
      positionSizeValue = capitalValue
      positionTotalValue = capitalValue
      positionTotalValueCurrency = inferCurrencyFromLabel(capitalLabel) ?? positionCurrency
      positionCurrency = positionTotalValueCurrency ?? positionCurrency
      positionTotalValueLabel = formatOrFallback(positionTotalValue, positionTotalValueCurrency, capitalLabel)
    } else {
      positionTotalValueLabel = capitalLabel
      positionTotalValueCurrency = positionCurrency
    }
  } else if (positionSizeType === 'units') {
    const units = Number(sizeValueRaw)
    if (!Number.isFinite(units) || units <= 0) {
      throw Object.assign(new Error('Invalid units amount'), {
        code: 'INVALID_POSITION_SIZE_VALUE',
      })
    }
    if (typeof purchasePriceValue !== 'number' || !Number.isFinite(purchasePriceValue)) {
      throw Object.assign(new Error('Unable to compute position value from purchase price'), {
        code: 'INVALID_PURCHASE_PRICE_VALUE',
      })
    }
    const total = units * purchasePriceValue
    positionSizeValue = units
    positionSizeLabel = `${units}`
    positionTotalValue = Number.isFinite(total) ? total : null
    positionTotalValueCurrency = purchasePriceCurrency
    positionCurrency = positionCurrency || purchasePriceCurrency
    positionTotalValueLabel = formatOrFallback(total, positionTotalValueCurrency, `${units} * ${purchasePriceInput}`)
  } else if (positionSizeType === 'pips') {
    const pipCount = Number(sizeValueRaw)
    if (!Number.isFinite(pipCount) || pipCount <= 0) {
      throw Object.assign(new Error('Invalid pip count'), {
        code: 'INVALID_POSITION_SIZE_VALUE',
      })
    }
    const pipLabel = appendCurrencyIfMissing(sizePerPipLabelInputRaw, positionCurrency)
    const perPipValue = parsePriceValue(pipLabel)
    if (typeof perPipValue !== 'number' || !Number.isFinite(perPipValue)) {
      throw Object.assign(new Error('Invalid per-pip value'), {
        code: 'INVALID_POSITION_SIZE_PER_PIP',
      })
    }
    const perPipCurrency = inferCurrencyFromLabel(pipLabel) ?? positionCurrency
    const total = perPipValue * pipCount
    positionSizeValue = pipCount
    positionSizeLabel = `${pipCount} pips`
    positionSizePerPipValue = perPipValue
    positionSizePerPipLabel = pipLabel
    positionTotalValue = Number.isFinite(total) ? total : null
    positionTotalValueCurrency = perPipCurrency
    positionCurrency = perPipCurrency ?? positionCurrency
    positionTotalValueLabel = formatOrFallback(total, perPipCurrency, `${pipCount} * ${pipLabel}`)
  }

  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    const positionResult = await client.query(
      `
        insert into portfolio_positions (
          slug,
          symbol,
          quote_symbol,
          name,
          category,
          position_type,
          purchase_price_label,
          position_currency,
          position_size_type,
          position_size_value,
          position_size_label,
          position_size_per_pip,
          position_size_per_pip_label,
          position_total_value,
          position_total_value_currency,
          position_total_value_label
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        returning
          id,
          slug,
          symbol,
          quote_symbol,
          name,
          category,
          position_type,
          purchase_price_label,
          position_currency,
          position_size_type,
          position_size_value,
          position_size_label,
          position_size_per_pip,
          position_size_per_pip_label,
          position_total_value,
          position_total_value_currency,
          position_total_value_label
      `,
      [
        slug,
        symbol,
        quoteSymbol,
        name,
        categoryInput,
        positionTypeInput,
        purchasePriceInput,
        positionCurrency,
        positionSizeType,
        positionSizeValue,
        positionSizeLabel,
        positionSizePerPipValue,
        positionSizePerPipLabel,
        positionTotalValue,
        positionTotalValueCurrency,
        positionTotalValueLabel,
      ],
    )

    const position = positionResult.rows[0]
    const currentPriceLabel = currentPriceInput ?? purchasePriceInput
    const normalizedReturnValue = Number.isFinite(returnValueInput) ? returnValueInput : 0
    const returnLabel = formatReturnLabel(normalizedReturnValue)
    const initialPriceValue = parsePriceValue(currentPriceLabel)
    const initialCurrency = inferCurrencyFromLabel(currentPriceLabel) ?? positionCurrency ?? 'PLN'

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

    if (normalizedAnalysis) {
      await savePositionAnalysis(client, position.id, normalizedAnalysis)
    }

    await client.query('COMMIT')

    const fullPosition = await fetchPositionWithDetailsByDbId(position.id)
    if (fullPosition) {
      return fullPosition
    }

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
        p.position_currency,
        p.position_size_type,
        p.position_size_value,
        p.position_size_label,
        p.position_size_per_pip,
        p.position_size_per_pip_label,
        p.position_total_value,
        p.position_total_value_currency,
        p.position_total_value_label,
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
        snapshot.return_label,
        analysis.trend as analysis_trend,
        analysis.target_tp1 as analysis_target_tp1,
        analysis.target_tp2 as analysis_target_tp2,
        analysis.target_tp3 as analysis_target_tp3,
        analysis.stop_loss as analysis_stop_loss,
        analysis.summary as analysis_summary,
        analysis.analysis_image as analysis_image,
        analysis.completed as analysis_completed,
        analysis.completion_note as analysis_completion_note,
        analysis.completion_date as analysis_completion_date,
        analysis.position_closed as analysis_position_closed,
        analysis.position_closed_note as analysis_position_closed_note,
        analysis.position_closed_date as analysis_position_closed_date,
        analysis.entry_strategy as entry_strategy
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
      left join portfolio_position_analyses analysis on analysis.position_id = p.id
      order by p.created_at desc
    `,
  )

  const positions = result.rows.map(mapRowToPosition)
  const updates = await fetchQuoteUpdates(positions)

  if (!updates.size) {
    return positions
  }

  const updatedPositions = applyQuoteUpdates(positions, updates)
  await persistQuoteUpdates(updatedPositions, positions)

  return updatedPositions
}

function resolveQuoteConfig(position) {
  const raw = position.quoteSymbol
  if (!raw) {
    return null
  }

  const alphaMatch = raw.match(/^ALPHA:([^:]+)(?::([A-Z]{3}))?$/i)
  if (alphaMatch) {
    return {
      provider: 'alphaVantage',
      symbol: alphaMatch[1],
      currency: alphaMatch[2] || position.positionCurrency || inferCurrencyFromLabel(position.purchasePrice) || 'USD',
    }
  }

  const coingeckoMatch = raw.match(/^COINGECKO:([^:]+):([^:]+)$/i)
  if (coingeckoMatch) {
    return {
      provider: 'coingecko',
      coinId: coingeckoMatch[1].toLowerCase(),
      vsCurrency: coingeckoMatch[2].toLowerCase(),
      targetCurrency: coingeckoMatch[2].toUpperCase(),
    }
  }

  const predefined = QUOTES_CONFIG[raw]
  if (predefined) {
    return predefined
  }

  return null
}

async function fetchQuoteUpdates(positions) {
  const updates = new Map()

  const coingeckoItems = []
  const alphaItems = []
  const tradingViewSymbols = new Map()

  positions.forEach(position => {
    if (!position.quoteSymbol) {
      return
    }

    const config = resolveQuoteConfig(position)
    if (config) {
      if (config.provider === 'coingecko') {
        coingeckoItems.push({ position, config })
        return
      }
      if (config.provider === 'alphaVantage') {
        alphaItems.push({ position, config })
        return
      }
    }

    const symbol = position.quoteSymbol
    if (!tradingViewSymbols.has(symbol)) {
      tradingViewSymbols.set(symbol, [])
    }
    tradingViewSymbols.get(symbol).push(position)
  })

  if (coingeckoItems.length) {
    const groupedByCurrency = new Map()
    coingeckoItems.forEach(item => {
      const vsCurrency = item.config.vsCurrency ?? 'usd'
      if (!groupedByCurrency.has(vsCurrency)) {
        groupedByCurrency.set(vsCurrency, [])
      }
      groupedByCurrency.get(vsCurrency).push(item)
    })

    for (const [vsCurrency, items] of groupedByCurrency.entries()) {
      try {
        const ids = Array.from(new Set(items.map(item => item.config.coinId)))
        const prices = await fetchCoinPrices(ids, vsCurrency)

        items.forEach(item => {
          const raw = prices?.[item.config.coinId]?.[vsCurrency]
          if (typeof raw === 'number' && Number.isFinite(raw)) {
            updates.set(item.position.id, {
              priceValue: raw,
              priceCurrency: (item.config.targetCurrency ?? vsCurrency).toUpperCase(),
            })
          }
        })
      } catch (error) {
        console.error('Failed to fetch CoinGecko prices:', error)
      }
    }
  }

  if (alphaItems.length) {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY
    if (!apiKey) {
      console.warn('ALPHA_VANTAGE_API_KEY is not set, falling back to TradingView for alpha-prefixed symbols')
      alphaItems.forEach(item => {
        const symbol = item.position.quoteSymbol
        if (!tradingViewSymbols.has(symbol)) {
          tradingViewSymbols.set(symbol, [])
        }
        tradingViewSymbols.get(symbol).push(item.position)
      })
    } else {
      for (const item of alphaItems) {
        try {
          const quote = await fetchGlobalQuote(item.config.symbol, apiKey)
          if (quote) {
            const price = Number.parseFloat(quote['05. price'])
            if (Number.isFinite(price)) {
              updates.set(item.position.id, {
                priceValue: price,
                priceCurrency: item.config.currency ?? 'USD',
              })
              continue
            }
          }
        } catch (error) {
          console.error(`Failed to fetch Alpha Vantage quote for ${item.config.symbol}:`, error)
        }

        const symbol = item.position.quoteSymbol
        if (!tradingViewSymbols.has(symbol)) {
          tradingViewSymbols.set(symbol, [])
        }
        tradingViewSymbols.get(symbol).push(item.position)
      }
    }
  }

  if (tradingViewSymbols.size) {
    try {
      const quotes = await fetchTradingViewQuotes(Array.from(tradingViewSymbols.keys()))
      quotes.forEach(quote => {
        if (!quote || typeof quote.price !== 'number' || !Number.isFinite(quote.price)) {
          return
        }
        const positionsForSymbol = tradingViewSymbols.get(quote.symbol)
        if (!positionsForSymbol?.length) {
          return
        }
        positionsForSymbol.forEach(position => {
          updates.set(position.id, {
            priceValue: quote.price,
            priceCurrency: quote.currency ?? position.currentPriceCurrency ?? null,
          })
        })
      })
    } catch (error) {
      console.error('Failed to fetch TradingView quotes in listPositions:', error)
    }
  }

  return updates
}

function applyQuoteUpdates(positions, updates) {
  return positions.map(position => {
    const update = updates.get(position.id)
    if (!update) {
      return position
    }

    const currentPriceCurrency = update.priceCurrency ?? position.currentPriceCurrency ?? null
    const currentPriceValue = update.priceValue
    const currentPrice =
      update.priceLabel ?? formatPriceLabel(currentPriceValue, currentPriceCurrency) ?? position.currentPrice

    const purchaseValue = parsePriceValue(position.purchasePrice)
    const returnValue =
      typeof purchaseValue === 'number' && purchaseValue !== 0
        ? ((currentPriceValue - purchaseValue) / purchaseValue) * 100
        : position.returnValue

    const normalizedReturnValue = Number.isFinite(returnValue) ? returnValue : position.returnValue

    return {
      ...position,
      currentPrice,
      currentPriceValue,
      currentPriceCurrency,
      returnValue: normalizedReturnValue,
      return: formatReturnLabel(normalizedReturnValue),
    }
  })
}

async function persistQuoteUpdates(updatedPositions, originalPositions) {
  const updates = updatedPositions
    .map(position => {
      const original = originalPositions.find(item => item.id === position.id)
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
      const databaseId = position.databaseId ?? original.databaseId
      if (!databaseId) {
        return null
      }
      return {
        databaseId,
        slug: position.id,
        priceValue: position.currentPriceValue,
        priceCurrency: position.currentPriceCurrency,
        priceLabel: position.currentPrice,
        returnValue: position.returnValue,
        returnLabel: position.return,
      }
    })
    .filter(item => item !== null)

  if (!updates.length) {
    return
  }

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
          update.databaseId,
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
          update.databaseId,
          update.priceValue,
          update.priceCurrency,
          update.priceLabel,
          update.returnValue,
          update.returnLabel,
        ],
      )
    }
    await pool.query('COMMIT')
  } catch (error) {
    await pool.query('ROLLBACK')
    console.error('Failed to persist quotes:', error)
  }
}

async function fetchPositionWithDetailsByDbId(dbId) {
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
        p.position_currency,
        p.position_size_type,
        p.position_size_value,
        p.position_size_label,
        p.position_size_per_pip,
        p.position_size_per_pip_label,
        p.position_total_value,
        p.position_total_value_currency,
        p.position_total_value_label,
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
        snapshot.return_label,
        analysis.trend as analysis_trend,
        analysis.target_tp1 as analysis_target_tp1,
        analysis.target_tp2 as analysis_target_tp2,
        analysis.target_tp3 as analysis_target_tp3,
        analysis.stop_loss as analysis_stop_loss,
        analysis.summary as analysis_summary,
        analysis.analysis_image as analysis_image,
        analysis.completed as analysis_completed,
        analysis.completion_note as analysis_completion_note,
        analysis.completion_date as analysis_completion_date,
        analysis.position_closed as analysis_position_closed,
        analysis.position_closed_note as analysis_position_closed_note,
        analysis.position_closed_date as analysis_position_closed_date,
        analysis.entry_strategy as entry_strategy
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
      left join portfolio_position_analyses analysis on analysis.position_id = p.id
      where p.id = $1
      limit 1
    `,
    [dbId],
  )

  if (!result.rows.length) {
    return null
  }

  return mapRowToPosition(result.rows[0])
}

async function findPositionRecord(identifier) {
  if (!identifier || typeof identifier !== 'string') {
    return null
  }

  const trimmed = identifier.trim()
  if (!trimmed) {
    return null
  }

  const slug = trimmed.toLowerCase()
  const result = await pool.query(
    `
      select id, slug
      from portfolio_positions
      where slug = $1 or id::text = $2
      limit 1
    `,
    [slug, trimmed],
  )

  if (!result.rows.length) {
    return null
  }

  return result.rows[0]
}

async function upsertPositionAnalysis(identifier, payload) {
  const normalized = normalizeAnalysisPayload(payload)
  const record = await findPositionRecord(identifier)
  if (!record) {
    throw Object.assign(new Error('Position not found'), {
      code: 'POSITION_NOT_FOUND',
    })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await savePositionAnalysis(client, record.id, normalized)
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  return fetchPositionWithDetailsByDbId(record.id)
}

async function deletePositionAnalysis(identifier) {
  const record = await findPositionRecord(identifier)
  if (!record) {
    throw Object.assign(new Error('Position not found'), {
      code: 'POSITION_NOT_FOUND',
    })
  }

  const deleteResult = await pool.query(
    'delete from portfolio_position_analyses where position_id = $1 returning 1',
    [record.id],
  )

  if (!deleteResult.rowCount) {
    return fetchPositionWithDetailsByDbId(record.id)
  }

  return fetchPositionWithDetailsByDbId(record.id)
}

async function deletePosition(identifier) {
  const record = await findPositionRecord(identifier)
  if (!record) {
    throw Object.assign(new Error('Position not found'), {
      code: 'POSITION_NOT_FOUND',
    })
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('delete from portfolio_positions where id = $1', [record.id])
    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  return { id: record.id, slug: record.slug }
}

async function updatePositionQuoteSymbol(identifier, incomingQuoteSymbol) {
  const record = await findPositionRecord(identifier)
  if (!record) {
    throw Object.assign(new Error('Position not found'), {
      code: 'POSITION_NOT_FOUND',
    })
  }

  const detailsResult = await pool.query(
    'select symbol, category from portfolio_positions where id = $1 limit 1',
    [record.id],
  )

  if (!detailsResult.rows.length) {
    throw Object.assign(new Error('Position not found'), {
      code: 'POSITION_NOT_FOUND',
    })
  }

  const { symbol, category } = detailsResult.rows[0]

  let normalizedQuoteSymbol = null
  if (typeof incomingQuoteSymbol === 'string' && incomingQuoteSymbol.trim().length > 0) {
    normalizedQuoteSymbol =
      normalizeQuoteInput(incomingQuoteSymbol) ?? resolveQuoteSymbol(symbol, category, incomingQuoteSymbol)
  } else {
    normalizedQuoteSymbol = getDefaultQuoteSymbol(symbol, category)
  }

  await pool.query(
    `
      update portfolio_positions
      set quote_symbol = $2, updated_at = now()
      where id = $1
    `,
    [record.id, normalizedQuoteSymbol],
  )

  return fetchPositionWithDetailsByDbId(record.id)
}

module.exports = {
  createPosition,
  listPositions,
  POSITION_CATEGORY_VALUES,
  POSITION_TYPE_VALUES,
  upsertPositionAnalysis,
  deletePositionAnalysis,
  deletePosition,
  updatePositionQuoteSymbol,
}



const fetch = require('node-fetch')

const TRADINGVIEW_SCAN_URL = 'https://scanner.tradingview.com/global/scan'
const DEFAULT_COLUMNS = ['close', 'currency', 'pricescale', 'name', 'description', 'exchange']

function normalizeSymbols(input) {
  if (!Array.isArray(input)) {
    return []
  }

  const seen = new Set()
  const result = []

  input.forEach(value => {
    if (typeof value !== 'string') {
      return
    }
    const trimmed = value.trim()
    if (!trimmed) {
      return
    }
    if (seen.has(trimmed)) {
      return
    }
    seen.add(trimmed)
    result.push(trimmed)
  })

  return result
}

function derivePrice(close, pricescale) {
  if (typeof close === 'number') {
    if (typeof pricescale === 'number' && pricescale > 0) {
      return close / pricescale
    }
    return close
  }
  return null
}

async function fetchTradingViewQuotes(symbols, options = {}) {
  const tickers = normalizeSymbols(symbols)
  if (!tickers.length) {
    return []
  }

  const columns = Array.isArray(options.columns) && options.columns.length ? options.columns : DEFAULT_COLUMNS

  const response = await fetch(TRADINGVIEW_SCAN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'PortiX Backend/1.0',
    },
    body: JSON.stringify({
      symbols: { tickers },
      columns,
    }),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    const error = new Error(`TradingView request failed with status ${response.status}`)
    error.status = response.status
    error.body = text
    throw error
  }

  const json = await response.json()
  if (!json || typeof json !== 'object') {
    return []
  }

  const data = Array.isArray(json.data) ? json.data : []

  return data.map(item => {
    const values = Array.isArray(item?.d) ? item.d : []
    const [
      close,
      currency,
      pricescale,
      name,
      description,
      exchange,
    ] = values

    const price = derivePrice(close, pricescale)

    return {
      symbol: item?.s ?? null,
      price,
      rawClose: close,
      pricescale: typeof pricescale === 'number' ? pricescale : null,
      currency: typeof currency === 'string' ? currency : null,
      name: typeof name === 'string' ? name : null,
      description: typeof description === 'string' ? description : null,
      exchange: typeof exchange === 'string' ? exchange : null,
    }
  })
}

module.exports = {
  fetchTradingViewQuotes,
}



const fetch = require('node-fetch')

const TRADINGVIEW_SCAN_URL = 'https://scanner.tradingview.com/global/scan'
const DEFAULT_COLUMNS = ['close', 'currency', 'pricescale', 'name', 'description', 'exchange']
const REQUEST_HEADERS = {
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
  Referer: 'https://www.tradingview.com/',
  Origin: 'https://www.tradingview.com',
}

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

function derivePrice(close) {
  if (typeof close === 'number') {
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
    headers: REQUEST_HEADERS,
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



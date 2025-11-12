const fetch = require('node-fetch')

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query'

async function fetchGlobalQuote(symbol, apiKey) {
  if (!apiKey) {
    throw new Error('ALPHA_VANTAGE_API_KEY is not set')
  }

  const params = new URLSearchParams({
    function: 'GLOBAL_QUOTE',
    symbol,
    apikey: apiKey,
  })

  const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}?${params.toString()}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    const error = new Error(`Alpha Vantage request failed with status ${response.status}`)
    error.status = response.status
    error.body = text
    throw error
  }

  const json = await response.json()

  if (!json || typeof json !== 'object' || !json['Global Quote']) {
    return null
  }

  return json['Global Quote']
}

module.exports = {
  fetchGlobalQuote,
}



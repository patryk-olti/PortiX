const fetch = require('node-fetch')

const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3'

async function fetchCoinPrices(ids, vsCurrency = 'usd') {
  if (!Array.isArray(ids) || !ids.length) {
    return {}
  }

  const uniqueIds = Array.from(new Set(ids.map(id => id.trim().toLowerCase()).filter(Boolean)))
  if (!uniqueIds.length) {
    return {}
  }

  const query = new URLSearchParams({
    ids: uniqueIds.join(','),
    vs_currencies: vsCurrency,
  })

  const response = await fetch(`${COINGECKO_BASE_URL}/simple/price?${query.toString()}`, {
    method: 'GET',
    headers: {
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    const error = new Error(`CoinGecko request failed with status ${response.status}`)
    error.status = response.status
    error.body = text
    throw error
  }

  const json = await response.json()
  if (!json || typeof json !== 'object') {
    return {}
  }

  return json
}

module.exports = {
  fetchCoinPrices,
}



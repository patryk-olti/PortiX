const fetch = require('node-fetch')

const NBP_API_BASE_URL = 'https://api.nbp.pl/api/exchangerates'

/**
 * Pobiera aktualny kurs waluty z NBP
 * @param {string} currencyCode - Kod waluty (np. 'USD', 'EUR')
 * @returns {Promise<number>} - Kurs wymiany do PLN
 */
async function fetchExchangeRate(currencyCode) {
  if (!currencyCode || typeof currencyCode !== 'string') {
    throw new Error('Currency code is required')
  }

  const code = currencyCode.toUpperCase().trim()

  // PLN zawsze ma kurs 1
  if (code === 'PLN') {
    return 1.0
  }

  try {
    // Pobierz aktualny kurs (tabela A)
    const response = await fetch(`${NBP_API_BASE_URL}/rates/a/${code}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      // Jeśli nie ma w tabeli A, spróbuj tabeli B (mniej popularne waluty)
      const responseB = await fetch(`${NBP_API_BASE_URL}/rates/b/${code}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      })

      if (!responseB.ok) {
        throw new Error(`Failed to fetch exchange rate for ${code}: ${responseB.status}`)
      }

      const dataB = await responseB.json()
      if (!dataB || !dataB.rates || !Array.isArray(dataB.rates) || dataB.rates.length === 0) {
        throw new Error(`No exchange rate data for ${code}`)
      }

      const rate = dataB.rates[0]
      return typeof rate.mid === 'number' ? rate.mid : null
    }

    const data = await response.json()
    if (!data || !data.rates || !Array.isArray(data.rates) || data.rates.length === 0) {
      throw new Error(`No exchange rate data for ${code}`)
    }

    const rate = data.rates[0]
    return typeof rate.mid === 'number' ? rate.mid : null
  } catch (error) {
    console.error(`Error fetching exchange rate for ${code}:`, error)
    throw error
  }
}

/**
 * Pobiera kursy dla wielu walut jednocześnie
 * @param {string[]} currencyCodes - Lista kodów walut
 * @returns {Promise<Record<string, number>>} - Mapa kodów walut do kursów
 */
async function fetchExchangeRates(currencyCodes) {
  if (!Array.isArray(currencyCodes) || currencyCodes.length === 0) {
    return {}
  }

  const uniqueCodes = Array.from(new Set(currencyCodes.map(code => code?.toUpperCase()?.trim()).filter(Boolean)))

  if (uniqueCodes.length === 0) {
    return {}
  }

  const rates = {}

  // PLN zawsze ma kurs 1
  if (uniqueCodes.includes('PLN')) {
    rates.PLN = 1.0
  }

  // Pobierz kursy dla pozostałych walut równolegle
  const promises = uniqueCodes
    .filter(code => code !== 'PLN')
    .map(async code => {
      try {
        const rate = await fetchExchangeRate(code)
        return { code, rate }
      } catch (error) {
        console.error(`Failed to fetch rate for ${code}:`, error)
        return { code, rate: null }
      }
    })

  const results = await Promise.all(promises)

  results.forEach(({ code, rate }) => {
    if (rate !== null) {
      rates[code] = rate
    }
  })

  return rates
}

module.exports = {
  fetchExchangeRate,
  fetchExchangeRates,
}


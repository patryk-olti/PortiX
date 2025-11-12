import { getPositions } from './store'
import type { Position } from './types'

type MonetaryEntry = {
  value?: number | null
  currency?: string | null
}

type AggregatedMonetaryValue = {
  value: number | null
  label: string
  currency: string | null
  consistent: boolean
}

function aggregateMonetaryValue(
  entries: MonetaryEntry[],
  fallbackCurrency: string | null = null,
): AggregatedMonetaryValue {
  const normalized = entries
    .map(entry => {
      if (!entry || typeof entry.value !== 'number' || Number.isNaN(entry.value)) {
        return null
      }

      return {
        value: entry.value,
        currency: entry.currency ?? fallbackCurrency,
      }
    })
    .filter((entry): entry is { value: number; currency: string | null } => entry !== null)

  if (!normalized.length) {
    return { value: null, label: '—', currency: null, consistent: false }
  }

  const total = normalized.reduce((sum, entry) => sum + entry.value, 0)
  const currencies = new Set(
    normalized.map(entry =>
      entry.currency != null ? entry.currency : fallbackCurrency != null ? fallbackCurrency : null,
    ),
  )
  const consistent = currencies.size <= 1
  const [currency] = currencies

  if (consistent && currency) {
    const formatter = new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return { value: total, label: formatter.format(total), currency, consistent: true }
  }

  const numberFormatter = new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return {
    value: total,
    label: numberFormatter.format(total),
    currency: consistent ? (currency ?? null) : null,
    consistent,
  }
}

function formatActivePositionsLabel(count: number): string {
  if (count === 0) {
    return 'Brak aktywnych pozycji'
  }

  if (count === 1) {
    return '1 aktywna pozycja'
  }

  if (count >= 2 && count <= 4) {
    return `${count} aktywne pozycje`
  }

  return `${count} aktywnych pozycji`
}

function formatPercentageChange(value: number): string {
  if (!Number.isFinite(value)) {
    return '—'
  }

  if (value === 0) {
    return '0,00%'
  }

  const formatter = new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  const absolute = formatter.format(Math.abs(value))
  return `${value > 0 ? '+' : '-'}${absolute}%`
}

function extractInvestedEntry(position: Position): MonetaryEntry {
  if (position.positionSizeType === 'capital' && typeof position.positionSizeValue === 'number') {
    return {
      value: position.positionSizeValue,
      currency: position.positionCurrency ?? position.positionTotalValueCurrency ?? null,
    }
  }

  if (typeof position.positionTotalValue === 'number') {
    return {
      value: position.positionTotalValue,
      currency: position.positionTotalValueCurrency ?? position.positionCurrency ?? null,
    }
  }

  return { value: null, currency: position.positionCurrency ?? position.positionTotalValueCurrency ?? null }
}

function extractCurrentValueEntry(position: Position): MonetaryEntry {
  const invested = extractInvestedEntry(position)
  if (typeof invested.value !== 'number' || Number.isNaN(invested.value)) {
    return { value: null, currency: invested.currency ?? null }
  }

  if (typeof position.returnValue === 'number' && Number.isFinite(position.returnValue)) {
    const multiplier = 1 + position.returnValue / 100
    return {
      value: invested.value * multiplier,
      currency: invested.currency ?? null,
    }
  }

  return {
    value: invested.value,
    currency: invested.currency ?? null,
  }
}

export function renderHome(): string {
  const positions = getPositions()
  const portfolioValueMetric = aggregateMonetaryValue(
    positions.map(position => extractCurrentValueEntry(position)),
  )
  const investedCapitalMetric = aggregateMonetaryValue(
    positions.map(position => extractInvestedEntry(position)),
  )
  const activePositionsLabel = formatActivePositionsLabel(positions.length)
  const comparableTotals =
    portfolioValueMetric.value !== null &&
    investedCapitalMetric.value !== null &&
    Math.abs(investedCapitalMetric.value) > Number.EPSILON &&
    portfolioValueMetric.consistent &&
    investedCapitalMetric.consistent &&
    portfolioValueMetric.currency === investedCapitalMetric.currency
  const portfolioDescriptor = comparableTotals
    ? `${formatPercentageChange(((portfolioValueMetric.value ?? 0) / (investedCapitalMetric.value ?? 1) - 1) * 100)} względem kapitału`
    : activePositionsLabel
  const investedDescriptor =
    positions.length > 0 ? activePositionsLabel : 'Brak danych o kapitale'
  return `
    <main class="page">
      <section class="hero">
        <h1 class="app-name">
          <span class="app-name-primary">Panel</span>
          <span class="app-name-secondary">Analityczny</span>
        </h1>
        <p class="hero-subtitle">Techniczne spojrzenie na rynek</p>
        <p class="lede">
          Nasze decyzje inwestycyjne opierają się na precyzji analizy technicznej i
          dogłębnym zrozumieniu mechanizmów rynku. Nieustannie śledzimy zmienność,
          kierunki przepływu kapitału i poziom ryzyka, by budować portfel odporny na
          wahania. Stawiamy na strategię, nie przypadek – to fundament naszego
          podejścia do inwestowania. Nasze analizy mają charakter informacyjny i nie
          stanowią rekomendacji inwestycyjnych; pokazują wyłącznie naszą metodykę
          działania, a nie zachętę do uczestnictwa.
        </p>
      </section>

      <section class="portfolio">
        <div class="section-header">
          <h2>Stan portfela</h2>
        </div>
        <div class="portfolio-overview">
          <article class="metric">
            <span class="label">Wartość portfela</span>
            <span class="value">${portfolioValueMetric.label}</span>
            <span class="change neutral">${portfolioDescriptor}</span>
          </article>
          <article class="metric">
            <span class="label">Kapitał zainwestowany</span>
            <span class="value">${investedCapitalMetric.label}</span>
            <span class="change neutral">${investedDescriptor}</span>
          </article>
        </div>
        <div class="portfolio-filters">
          <label for="category-filter">Filtr kategorii</label>
          <select id="category-filter">
            <option value="all">Wszystkie</option>
            <option value="stock">Akcje</option>
            <option value="commodity">Surowiec</option>
            <option value="hedge">Zabezpieczenie</option>
            <option value="cash">Gotówka</option>
            <option value="cryptocurrency">Kryptowaluty</option>
          </select>
        </div>
        <div class="portfolio-table-wrapper">
          <table class="portfolio-table" aria-describedby="category-filter">
            <thead>
              <tr>
                <th>Pozycja</th>
                <th>Kategoria</th>
                <th>Cena zakupu</th>
                <th>Wartość pozycji</th>
                <th>Aktualny kurs</th>
                <th>Zwrot</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${
                positions
                  .map(
                    position => `
                <tr data-category="${position.category}">
                  <td>
                    <div class="portfolio-name">
                      <span class="portfolio-name-primary">${position.name}</span>
                      <span class="position-type-badge ${position.positionType}">
                        ${formatPositionType(position.positionType)}
                      </span>
                    </div>
                  </td>
                  <td>${position.categoryName}</td>
                  <td>${position.purchasePrice}</td>
                  <td>${position.positionTotalValueLabel ?? '—'}</td>
                  <td>${position.currentPrice}</td>
                  <td class="${
                    position.returnValue > 0
                      ? 'positive'
                      : position.returnValue < 0
                        ? 'negative'
                        : 'neutral'
                  }">${position.return}</td>
                  <td>
                    <a class="details-link" href="#/position/${position.id}" data-position-id="${position.id}">Szczegóły</a>
                  </td>
                </tr>
              `,
                  )
                  .join('')
              }
              ${positions.length === 0 ? '<tr class="empty"><td colspan="7">Brak pozycji w portfelu</td></tr>' : ''}
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <footer class="footer">
      <small>© ${new Date().getFullYear()} Wszystkie prawa zastrzeżone.</small>
      <nav>
        <a href="#/status">Status projektu</a>
        <a href="#">Dokumentacja</a>
        <a href="#">Kontakt</a>
        <a href="#/login">Logowanie</a>
      </nav>
    </footer>
  `
}

export function setupHomeHandlers(): void {
  const categoryFilter = document.querySelector<HTMLSelectElement>('#category-filter')
  const portfolioRows = Array.from(
    document.querySelectorAll<HTMLTableRowElement>('.portfolio-table tbody tr'),
  )

  categoryFilter?.addEventListener('change', event => {
    const value = (event.target as HTMLSelectElement).value

    portfolioRows.forEach(row => {
      if (value === 'all') {
        row.style.display = ''
        return
      }

      row.style.display = row.dataset.category === value ? '' : 'none'
    })
  })
}

function formatPositionType(positionType: 'long' | 'short'): string {
  return positionType === 'short' ? 'SHORT' : 'LONG'
}


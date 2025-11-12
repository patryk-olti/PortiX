import { getPositions } from './store'

type MonetaryEntry = {
  value?: number | null
  currency?: string | null
}

function aggregateMonetaryValue(
  entries: MonetaryEntry[],
  fallbackCurrency: string | null = 'PLN',
): { value: number | null; label: string } {
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
    return { value: null, label: '—' }
  }

  const total = normalized.reduce((sum, entry) => sum + entry.value, 0)
  const [first] = normalized
  const consistentCurrency =
    first.currency && normalized.every(entry => entry.currency === first.currency) ? first.currency : null

  if (consistentCurrency) {
    const formatter = new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: consistentCurrency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return { value: total, label: formatter.format(total) }
  }

  const numberFormatter = new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return { value: total, label: numberFormatter.format(total) }
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

export function renderHome(): string {
  const positions = getPositions()
  const portfolioValueMetric = aggregateMonetaryValue(
    positions.map(position => ({
      value: position.positionTotalValue ?? null,
      currency: position.positionTotalValueCurrency ?? position.positionCurrency ?? null,
    })),
  )
  const investedCapitalMetric = aggregateMonetaryValue(
    positions.map(position => {
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

      return { value: null, currency: null }
    }),
  )
  const activePositionsLabel = formatActivePositionsLabel(positions.length)
  const investedDescriptor =
    investedCapitalMetric.value !== null ? 'Łączna ekspozycja kapitału' : 'Brak danych o kapitale'
  const portfolioDescriptor = activePositionsLabel
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


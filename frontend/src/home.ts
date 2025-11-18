import { getPositions } from './store'
import type { Position } from './types'
import { fetchIdeas, login, fetchExchangeRates } from './api'

type MonetaryEntry = {
  value?: number | null
  currency?: string | null
}

type AggregatedMonetaryValue = {
  value: number | null
  label: string
  currency: string
  consistent: boolean
}

// Cache kursów walut (cache na 1 godzinę)
let exchangeRatesCache: Record<string, number> | null = null
let exchangeRatesCacheTime: number | null = null
const EXCHANGE_RATES_CACHE_TTL = 60 * 60 * 1000 // 1 godzina

async function getExchangeRates(currencies: string[]): Promise<Record<string, number>> {
  // Sprawdź cache
  const now = Date.now()
  if (
    exchangeRatesCache &&
    exchangeRatesCacheTime &&
    now - exchangeRatesCacheTime < EXCHANGE_RATES_CACHE_TTL
  ) {
    // Sprawdź czy mamy wszystkie potrzebne kursy
    const missingCurrencies = currencies.filter(
      currency => currency && !exchangeRatesCache![currency.toUpperCase()],
    )
    if (missingCurrencies.length === 0) {
      return exchangeRatesCache
    }
  }

  try {
    // Pobierz kursy z backendu
    const rates = await fetchExchangeRates(currencies)
    // Zawsze dodaj PLN z kursem 1
    rates.PLN = 1.0
    
    // Zaktualizuj cache
    exchangeRatesCache = { ...exchangeRatesCache, ...rates }
    exchangeRatesCacheTime = now
    
    return exchangeRatesCache
  } catch (error) {
    console.error('Failed to fetch exchange rates:', error)
    // Zwróć cache jeśli istnieje, nawet jeśli jest przestarzały
    if (exchangeRatesCache) {
      return exchangeRatesCache
    }
    // Jeśli nie ma cache, zwróć tylko PLN
    return { PLN: 1.0 }
  }
}

// Synchroniczna wersja (używana przy renderowaniu - bez konwersji walut)
function aggregateMonetaryValueSync(
  entries: MonetaryEntry[],
  targetCurrency: string = 'PLN',
): AggregatedMonetaryValue {
  const normalized = entries
    .map(entry => {
      if (!entry || typeof entry.value !== 'number' || Number.isNaN(entry.value)) {
        return null
      }

      return {
        value: entry.value,
        currency: (entry.currency ?? targetCurrency).toUpperCase(),
      }
    })
    .filter((entry): entry is { value: number; currency: string } => entry !== null)

  if (!normalized.length) {
    return { value: null, label: '—', currency: targetCurrency, consistent: true }
  }

  // Sprawdź czy są różne waluty
  const uniqueCurrencies = Array.from(new Set(normalized.map(entry => entry.currency)))
  const hasMultipleCurrencies = uniqueCurrencies.length > 1

  // Jeśli są różne waluty, zwróć "—" (zostanie zaktualizowane asynchronicznie)
  if (hasMultipleCurrencies) {
    return { value: null, label: 'Ładowanie...', currency: targetCurrency, consistent: true }
  }

  // Jeśli są tylko PLN lub brak walut, sumuj normalnie
  const total = normalized.reduce((sum, entry) => sum + entry.value, 0)

  const formatter = new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: targetCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return {
    value: total,
    label: formatter.format(total),
    currency: targetCurrency,
    consistent: true,
  }
}

// Asynchroniczna wersja z konwersją walut (używana do aktualizacji wartości)
async function aggregateMonetaryValue(
  entries: MonetaryEntry[],
  targetCurrency: string = 'PLN',
): Promise<AggregatedMonetaryValue> {
  const normalized = entries
    .map(entry => {
      if (!entry || typeof entry.value !== 'number' || Number.isNaN(entry.value)) {
        return null
      }

      return {
        value: entry.value,
        currency: (entry.currency ?? targetCurrency).toUpperCase(),
      }
    })
    .filter((entry): entry is { value: number; currency: string } => entry !== null)

  if (!normalized.length) {
    return { value: null, label: '—', currency: targetCurrency, consistent: true }
  }

  // Pobierz unikalne waluty
  const uniqueCurrencies = Array.from(new Set(normalized.map(entry => entry.currency))).filter(Boolean)
  
  // Pobierz kursy walut
  const exchangeRates = await getExchangeRates(uniqueCurrencies)

  // Konwertuj wszystkie wartości do PLN
  const convertedValues = normalized.map(entry => {
    const rate = exchangeRates[entry.currency] ?? 1.0
    return entry.value * rate
  })

  const total = convertedValues.reduce((sum, value) => sum + value, 0)

  const formatter = new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: targetCurrency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return {
    value: total,
    label: formatter.format(total),
    currency: targetCurrency,
    consistent: true,
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

// Formatuje wartość pozycji z 2 miejscami po przecinku
function formatPositionValue(value: string | null | undefined): string {
  if (!value || typeof value !== 'string') {
    return '—'
  }

  // Sprawdź czy wartość zawiera już formatowanie (np. "245,00 PLN" lub "1000,00 USD")
  // Jeśli tak, zachowaj formatowanie, ale upewnij się że ma 2 miejsca po przecinku
  const trimmed = value.trim()
  
  // Jeśli wartość zawiera liczbę, sformatuj ją
  const numberMatch = trimmed.match(/^([\d\s,\.]+)/)
  if (numberMatch) {
    const numberStr = numberMatch[1].replace(/\s/g, '').replace(',', '.')
    const numValue = parseFloat(numberStr)
    if (!Number.isNaN(numValue) && Number.isFinite(numValue)) {
      const formatter = new Intl.NumberFormat('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      const formatted = formatter.format(numValue)
      
      // Jeśli oryginalna wartość miała walutę, dodaj ją z powrotem
      const currencyMatch = trimmed.match(/\s*([A-Z]{3})\s*$/)
      if (currencyMatch) {
        return `${formatted} ${currencyMatch[1]}`
      }
      
      return formatted
    }
  }
  
  return trimmed
}

// Formatuje cenę (zakup lub aktualna) z 2 miejscami po przecinku
function formatPrice(price: string | null | undefined): string {
  if (!price || typeof price !== 'string') {
    return '—'
  }

  const trimmed = price.trim()
  
  // Sprawdź czy cena zawiera liczbę i walutę/jednostkę (np. "422.50 USD" lub "18 250 pkt")
  // Jeśli zawiera tylko liczbę i walutę (3 litery), sformatuj z 2 miejscami po przecinku
  const priceMatch = trimmed.match(/^([\d\s,\.]+)\s+([A-Z]{3}|\w+)$/)
  if (priceMatch) {
    const numberStr = priceMatch[1].replace(/\s/g, '').replace(',', '.')
    const numValue = parseFloat(numberStr)
    const unit = priceMatch[2]
    
    if (!Number.isNaN(numValue) && Number.isFinite(numValue)) {
      const formatter = new Intl.NumberFormat('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      const formatted = formatter.format(numValue)
      
      return `${formatted} ${unit}`
    }
  }
  
  // Jeśli cena zawiera tylko liczbę (bez jednostki), sformatuj ją
  const numberOnlyMatch = trimmed.match(/^([\d\s,\.]+)$/)
  if (numberOnlyMatch) {
    const numberStr = numberOnlyMatch[1].replace(/\s/g, '').replace(',', '.')
    const numValue = parseFloat(numberStr)
    
    if (!Number.isNaN(numValue) && Number.isFinite(numValue)) {
      const formatter = new Intl.NumberFormat('pl-PL', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
      return formatter.format(numValue)
    }
  }
  
  return trimmed
}

// Formatuje wartość w określonej walucie z 2 miejscami po przecinku
function formatValueInCurrency(value: number, currency: string): string {
  if (!Number.isFinite(value)) {
    return '—'
  }

  const currencyUpper = currency.toUpperCase()
  
  // Dla PLN użyj formatowania z symbolem waluty
  if (currencyUpper === 'PLN') {
    const formatter = new Intl.NumberFormat('pl-PL', {
      style: 'currency',
      currency: 'PLN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return formatter.format(value)
  }
  
  // Dla innych walut użyj prostego formatowania z kodem waluty na końcu
  const numberFormatter = new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${numberFormatter.format(value)} ${currencyUpper}`
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

function getUserPermissions() {
  const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true'
  const role = localStorage.getItem('adminRole') || 'guest'
  const canViewPortfolio = localStorage.getItem('adminCanViewPortfolio') === 'true'
  const canViewIdeas = localStorage.getItem('adminCanViewIdeas') === 'true'
  const canViewClosedPositions = localStorage.getItem('adminCanViewClosedPositions') === 'true'
  return { isAuthenticated, role, canViewPortfolio, canViewIdeas, canViewClosedPositions }
}

export function renderHome(): string {
  const { isAuthenticated, role, canViewPortfolio, canViewIdeas, canViewClosedPositions } = getUserPermissions()
  
  // Jeśli użytkownik nie jest zalogowany, pokaż formularz logowania
  if (!isAuthenticated) {
    return `
      <main class="page login-page-centered">
        <section class="login-section-centered">
          <div class="login-container-centered">
            <div class="login-header">
              <h1 class="app-name">
                <span class="app-name-primary">PortiX</span>
                <span class="app-name-secondary">Analytics</span>
              </h1>
              <h2>Logowanie</h2>
            </div>
            
            <form class="login-form" id="home-login-form">
              <div class="form-group">
                <label for="home-username">Nazwa użytkownika</label>
                <input 
                  type="text" 
                  id="home-username" 
                  name="username" 
                  required 
                  autocomplete="username"
                  placeholder="Wprowadź nazwę użytkownika"
                />
              </div>
              
              <div class="form-group">
                <label for="home-password">Hasło</label>
                <input 
                  type="password" 
                  id="home-password" 
                  name="password" 
                  required 
                  autocomplete="current-password"
                  placeholder="Wprowadź hasło"
                />
              </div>
              
              <div class="form-error" id="home-login-error" style="display: none;"></div>
              
              <button type="submit" class="login-button">Zaloguj się</button>
            </form>
          </div>
        </section>
      </main>
    `
  }

  // Użytkownik jest zalogowany - pokaż odpowiednie sekcje
  const positions = getPositions()
  const closedPositions = positions.filter(
    position => position.analysis?.positionClosed,
  )
  // Użyj synchronicznej wersji do pierwszego renderowania (tylko PLN)
  // Wartości zostaną zaktualizowane asynchronicznie po załadowaniu kursów walut
  const portfolioValueMetric = aggregateMonetaryValueSync(
    positions.map(position => extractCurrentValueEntry(position)),
    'PLN',
  )
  const investedCapitalMetric = aggregateMonetaryValueSync(
    positions.map(position => extractInvestedEntry(position)),
    'PLN',
  )
  const activePositionsLabel = formatActivePositionsLabel(positions.length)
  const comparableTotals =
    portfolioValueMetric.value !== null &&
    investedCapitalMetric.value !== null &&
    Math.abs(investedCapitalMetric.value) > Number.EPSILON
  const portfolioChangeValue = comparableTotals
    ? ((portfolioValueMetric.value ?? 0) / (investedCapitalMetric.value ?? 1) - 1) * 100
    : null
  const portfolioDescriptor = comparableTotals
    ? `<span class="metric-change ${portfolioChangeValue && portfolioChangeValue < 0 ? 'negative' : 'positive'}">${formatPercentageChange(portfolioChangeValue ?? 0)} względem kapitału</span>`
    : `<span class="metric-change neutral">${activePositionsLabel}</span>`
  const investedDescriptor =
    positions.length > 0 ? activePositionsLabel : 'Brak danych o kapitale'
  
  const adminMenuLink = role === 'admin' ? '<a href="#/admin" class="menu-link">Panel administracyjny</a>' : ''
  
  // Pobierz informacje o użytkowniku
  const username = localStorage.getItem('adminUsername') || 'Użytkownik'
  const userInitial = username.charAt(0).toUpperCase()
  
  return `
    <header class="main-header">
      <button type="button" class="hamburger-menu-btn" id="hamburger-menu-btn" aria-label="Menu">
        <span class="hamburger-icon"></span>
        <span class="hamburger-icon"></span>
        <span class="hamburger-icon"></span>
      </button>
      <div class="header-logo" id="header-logo">
        <img src="/logo.svg" alt="PortiX logo" />
      </div>
      <nav class="main-nav" id="main-nav">
        <div class="main-nav-content">
          <div class="user-info">
            <div class="user-avatar">${userInitial}</div>
            <div class="user-details">
              <span class="user-name">${username}</span>
              <span class="user-role">${role === 'admin' ? 'Administrator' : 'Użytkownik'}</span>
            </div>
          </div>
          <a href="#/status" class="menu-link">Status projektu</a>
          <a href="#" class="menu-link coming-soon" data-section="dokumentacja" title="Sekcja w przygotowaniu">Dokumentacja</a>
          <a href="#" class="menu-link coming-soon" data-section="kontakt" title="Sekcja w przygotowaniu">Kontakt</a>
          ${adminMenuLink}
        </div>
        <div class="main-nav-footer">
          <button type="button" class="menu-link logout-link" id="logout-btn">Wyloguj</button>
        </div>
      </nav>
      <div class="menu-overlay" id="menu-overlay"></div>
    </header>
    <main class="page">
      <section class="project-intro">
        <div class="section-header">
          <h1>PortiX Analytics</h1>
          <p>Platforma analityczna do zarządzania portfelem inwestycyjnym. PortiX umożliwia śledzenie pozycji, analizę techniczną oraz zarządzanie pomysłami inwestycyjnymi w jednym miejscu.</p>
        </div>
      </section>

      <section class="portfolio">
        <div class="section-header">
          <h2>Stan portfela</h2>
        </div>
        ${canViewPortfolio ? `
        <div class="portfolio-overview">
          <article class="metric">
            <span class="label">Wartość portfela</span>
            <span class="value">${portfolioValueMetric.label}</span>
            <span class="change">${portfolioDescriptor}</span>
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
                <th title="Wartość pozycji w chwili zakupu">Wartość pozycji (zakup)</th>
                <th>Wartość aktualna</th>
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
                  <td>${formatPrice(position.purchasePrice)}</td>
                  <td>
                    <span class="position-value" title="Wartość pozycji w chwili zakupu">${formatPositionValue(position.positionTotalValueLabel ?? '—')}</span>
                  </td>
                  <td class="current-value-cell" data-position-id="${position.id}" data-currency="${position.positionCurrency || position.positionTotalValueCurrency || 'PLN'}">
                    <span class="current-value-loading">Ładowanie...</span>
                  </td>
                  <td>${formatPrice(position.currentPrice)}</td>
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
              ${positions.length === 0 ? '<tr class="empty"><td colspan="8">Brak pozycji w portfelu</td></tr>' : ''}
            </tbody>
          </table>
        </div>
        ` : `
        <div class="no-permission-message">
          <p>Użytkownik nie posiada uprawnień do wyświetlania sekcji portfela.</p>
        </div>
        `}
      </section>

      <section class="ideas-section" id="ideas-section">
        <div class="section-header">
          <h2>Pomysły</h2>
          <p>Najnowsze pomysły inwestycyjne</p>
        </div>
        ${canViewIdeas ? `
        <div class="ideas-loading" id="ideas-loading">Ładowanie pomysłów...</div>
        <div class="ideas-grid" id="ideas-grid" hidden></div>
        <p class="empty-state" id="ideas-empty" hidden>Brak dostępnych pomysłów.</p>
        ` : `
        <div class="no-permission-message">
          <p>Użytkownik nie posiada uprawnień do wyświetlania sekcji pomysłów.</p>
        </div>
        `}
      </section>

      ${canViewClosedPositions ? `
      <section class="recent-closures">
        <div class="section-header">
          <h2>Ostatnio zamknięte pozycje</h2>
          <p>Najważniejsze dane z pięciu ostatnich zamknięć</p>
        </div>
        ${
          closedPositions.length
            ? `<div class="recent-closures-grid">
          ${closedPositions
            .slice(0, 5)
            .map(
              position => `
            <article class="recent-closure-card">
              <header>
                <div>
                  <h3>${position.name}</h3>
                  <span class="position-type-badge ${position.positionType}">${formatPositionType(position.positionType)}</span>
                </div>
                <time datetime="${position.analysis?.positionClosedDate ?? ''}">
                  ${position.analysis?.positionClosedDate
                    ? new Date(position.analysis.positionClosedDate).toLocaleDateString('pl-PL')
                    : 'Brak daty'}
                </time>
              </header>
              <dl>
                <div>
                  <dt>Zwrot</dt>
                  <dd class="${
                    position.returnValue > 0 ? 'positive' : position.returnValue < 0 ? 'negative' : 'neutral'
                  }">${position.return}</dd>
                </div>
                <div>
                  <dt>Kapitał</dt>
                  <dd>${position.positionTotalValueLabel ?? '—'}</dd>
                </div>
                <div>
                  <dt>Powód zamknięcia</dt>
                  <dd>${position.analysis?.positionClosedNote ?? 'Brak notatki'}</dd>
                </div>
              </dl>
              <footer>
                <a class="details-link" href="#/position/${position.id}" data-position-id="${position.id}">Zobacz szczegóły</a>
              </footer>
            </article>
          `,
            )
            .join('')}
        </div>`
            : '<p class="empty-state">Brak zamkniętych pozycji.</p>'
        }
        ` : `
        <div class="no-permission-message">
          <p>Użytkownik nie posiada uprawnień do wyświetlania sekcji zamkniętych pozycji.</p>
        </div>
        `}
      </section>
    </main>
  `
}

export function setupHomeHandlers(): void {
  const { isAuthenticated, canViewPortfolio, canViewIdeas } = getUserPermissions()

  // Setup login form if not authenticated
  if (!isAuthenticated) {
    const loginForm = document.querySelector<HTMLFormElement>('#home-login-form')
    const errorDiv = document.querySelector<HTMLDivElement>('#home-login-error')
    const submitButton = loginForm?.querySelector<HTMLButtonElement>('button[type="submit"]')

    loginForm?.addEventListener('submit', async (e) => {
      e.preventDefault()

      if (errorDiv) {
        errorDiv.style.display = 'none'
        errorDiv.textContent = ''
      }

      const formData = new FormData(loginForm)
      const username = (formData.get('username') as string)?.trim() ?? ''
      const password = (formData.get('password') as string) ?? ''

      if (!username || !password) {
        if (errorDiv) {
          errorDiv.textContent = 'Wypełnij wszystkie pola'
          errorDiv.style.display = 'block'
        }
        return
      }

      if (submitButton) {
        submitButton.disabled = true
        submitButton.textContent = 'Logowanie...'
      }

      try {
        const user = await login({ username, password })

        localStorage.setItem('adminAuthenticated', 'true')
        localStorage.setItem('adminUsername', user.username)
        localStorage.setItem('adminUserId', user.id)
        localStorage.setItem('adminRole', user.role || 'guest')
        localStorage.setItem('adminCanViewPortfolio', String(user.canViewPortfolio || false))
        localStorage.setItem('adminCanViewIdeas', String(user.canViewIdeas || false))
        localStorage.setItem('adminCanViewClosedPositions', String(user.canViewClosedPositions || false))
        localStorage.setItem('adminLastLogin', new Date().toISOString())
        localStorage.setItem('lastActivityTime', Date.now().toString())
        window.location.hash = '#/'
        window.location.reload()
      } catch (error) {
        console.error('Login error:', error)
        if (errorDiv) {
          errorDiv.textContent = error instanceof Error ? error.message : 'Wystąpił błąd podczas logowania'
          errorDiv.style.display = 'block'
        }
      } finally {
        if (submitButton) {
          submitButton.disabled = false
          submitButton.textContent = 'Zaloguj się'
        }
      }
    })
    return
  }

  // Aktualizuj wartości portfela z konwersją walut (asynchronicznie)
  if (isAuthenticated && canViewPortfolio) {
    void updatePortfolioValues()
  }

  // Setup portfolio filter if user can view portfolio
  if (canViewPortfolio) {
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

  // Load ideas after DOM is ready if user can view ideas
  if (canViewIdeas) {
    setTimeout(() => {
      void loadIdeas()
    }, 0)
  }

  // Setup hamburger menu
  setupHamburgerMenu()
  
  // Setup session timeout (30 minutes)
  setupSessionTimeout()
}

function closeMenu(): void {
  const hamburgerBtn = document.getElementById('hamburger-menu-btn')
  const mainNav = document.getElementById('main-nav')
  const menuOverlay = document.getElementById('menu-overlay')
  
  mainNav?.classList.remove('open')
  menuOverlay?.classList.remove('open')
  hamburgerBtn?.classList.remove('active')
  document.body.classList.remove('menu-open')
}

function setupHamburgerMenu(): void {
  const hamburgerBtn = document.getElementById('hamburger-menu-btn')
  const mainNav = document.getElementById('main-nav')
  const menuOverlay = document.getElementById('menu-overlay')
  const logoutBtn = document.getElementById('logout-btn')

  hamburgerBtn?.addEventListener('click', () => {
    mainNav?.classList.toggle('open')
    menuOverlay?.classList.toggle('open')
    hamburgerBtn.classList.toggle('active')
    document.body.classList.toggle('menu-open')
  })

  menuOverlay?.addEventListener('click', () => {
    closeMenu()
  })

  // Close menu on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && mainNav?.classList.contains('open')) {
      closeMenu()
    }
  })

  logoutBtn?.addEventListener('click', () => {
    if (sessionTimeoutTimer) {
      clearTimeout(sessionTimeoutTimer)
      sessionTimeoutTimer = null
    }
    localStorage.removeItem('adminAuthenticated')
    localStorage.removeItem('adminUsername')
    localStorage.removeItem('adminUserId')
    localStorage.removeItem('adminRole')
    localStorage.removeItem('adminCanViewPortfolio')
    localStorage.removeItem('adminCanViewIdeas')
    localStorage.removeItem('adminCanViewClosedPositions')
    localStorage.removeItem('adminLastLogin')
    localStorage.removeItem('lastActivityTime')
    window.location.hash = '#/'
    window.location.reload()
  })

  // Handle coming soon sections
  const comingSoonLinks = document.querySelectorAll('.menu-link.coming-soon')
  comingSoonLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault()
      const section = link.getAttribute('data-section')
      const sectionName = section === 'dokumentacja' ? 'Dokumentacja' : 'Kontakt'
      alert(`${sectionName} nie jest jeszcze gotowa. Pracujemy nad tym!`)
      closeMenu()
    })
  })

  // Close menu when clicking on menu links
  const menuLinks = document.querySelectorAll('.menu-link:not(.coming-soon)')
  menuLinks.forEach(link => {
    link.addEventListener('click', () => {
      closeMenu()
    })
  })
}

let sessionTimeoutTimer: ReturnType<typeof setTimeout> | null = null
const SESSION_TIMEOUT_MS = 30 * 60 * 1000 // 30 minutes

function updateLastActivityTime(): void {
  localStorage.setItem('lastActivityTime', Date.now().toString())
  resetSessionTimeout()
}

function resetSessionTimeout(): void {
  if (sessionTimeoutTimer) {
    clearTimeout(sessionTimeoutTimer)
  }
  
  sessionTimeoutTimer = setTimeout(() => {
    logoutUser()
  }, SESSION_TIMEOUT_MS)
}

function checkSessionExpiry(): boolean {
  const lastActivityTime = localStorage.getItem('lastActivityTime')
  if (!lastActivityTime) {
    return false
  }
  
  const lastActivity = parseInt(lastActivityTime, 10)
  const now = Date.now()
  const timeSinceLastActivity = now - lastActivity
  
  if (timeSinceLastActivity >= SESSION_TIMEOUT_MS) {
    return false
  }
  
  return true
}

function logoutUser(): void {
  localStorage.removeItem('adminAuthenticated')
  localStorage.removeItem('adminUsername')
  localStorage.removeItem('adminUserId')
  localStorage.removeItem('adminRole')
  localStorage.removeItem('adminCanViewPortfolio')
  localStorage.removeItem('adminCanViewIdeas')
  localStorage.removeItem('adminCanViewClosedPositions')
  localStorage.removeItem('adminLastLogin')
  localStorage.removeItem('lastActivityTime')
  
  if (sessionTimeoutTimer) {
    clearTimeout(sessionTimeoutTimer)
    sessionTimeoutTimer = null
  }
  
  alert('Sesja wygasła z powodu braku aktywności. Zostałeś wylogowany.')
  window.location.hash = '#/'
  window.location.reload()
}

function setupSessionTimeout(): void {
  // Check if user is authenticated
  const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true'
  if (!isAuthenticated) {
    return
  }
  
  // Check if session has already expired
  if (!checkSessionExpiry()) {
    logoutUser()
    return
  }
  
  // Reset timer based on remaining time
  const lastActivityTime = localStorage.getItem('lastActivityTime')
  if (lastActivityTime) {
    const lastActivity = parseInt(lastActivityTime, 10)
    const now = Date.now()
    const timeSinceLastActivity = now - lastActivity
    const remainingTime = SESSION_TIMEOUT_MS - timeSinceLastActivity
    
    if (remainingTime > 0) {
      sessionTimeoutTimer = setTimeout(() => {
        logoutUser()
      }, remainingTime)
    } else {
      logoutUser()
      return
    }
  } else {
    // First time setup
    updateLastActivityTime()
  }
  
  // Track user activity
  const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click']
  activityEvents.forEach(event => {
    document.addEventListener(event, updateLastActivityTime, { passive: true })
  })
}

async function loadIdeas(): Promise<void> {
  const loadingEl = document.getElementById('ideas-loading')
  const gridEl = document.getElementById('ideas-grid')
  const emptyEl = document.getElementById('ideas-empty')

  if (!loadingEl || !gridEl || !emptyEl) {
    return
  }

  try {
    const ideas = await fetchIdeas(10)
    loadingEl.hidden = true

    if (!ideas || ideas.length === 0) {
      emptyEl.hidden = false
      return
    }

    gridEl.hidden = false
    emptyEl.hidden = true

    gridEl.innerHTML = ideas
      .map(
        idea => `
      <article class="idea-card">
        ${idea.tradingviewImage ? `<img src="${idea.tradingviewImage}" alt="Wykres ${idea.symbol}" class="idea-image" />` : ''}
        <div class="idea-content">
          <header>
            <h3>${escapeHtml(idea.symbol)}</h3>
            <span class="idea-market">${escapeHtml(idea.market)}</span>
          </header>
          <dl class="idea-details">
            <div>
              <dt>Rynek</dt>
              <dd>${escapeHtml(idea.market)}</dd>
            </div>
            <div>
              <dt>Wejście</dt>
              <dd>${escapeHtml(idea.entryLevel)}</dd>
            </div>
            <div>
              <dt>Stop Loss</dt>
              <dd>${escapeHtml(idea.stopLoss)}</dd>
            </div>
            ${idea.targetTp ? `<div><dt>TP</dt><dd>${escapeHtml(idea.targetTp)}</dd></div>` : ''}
          </dl>
          <p class="idea-description">${escapeHtml(idea.description.slice(0, 150))}${idea.description.length > 150 ? '...' : ''}</p>
          <footer>
            <time datetime="${idea.publishedOn}">${new Date(idea.publishedOn).toLocaleDateString('pl-PL')}</time>
            <a class="details-link" href="#/idea/${idea.id}" data-idea-id="${idea.id}">Zobacz szczegóły</a>
          </footer>
        </div>
      </article>
    `,
      )
      .join('')
  } catch (error) {
    console.error('Failed to load ideas:', error)
    loadingEl.hidden = true
    gridEl.hidden = true
    emptyEl.hidden = false
    const errorMessage = error instanceof Error ? error.message : 'Nie udało się załadować pomysłów.'
    emptyEl.textContent = errorMessage
    emptyEl.className = 'empty-state error'
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function formatPositionType(positionType: 'long' | 'short'): string {
  return positionType === 'short' ? 'SHORT' : 'LONG'
}

// Funkcja do obliczenia aktualnej wartości pozycji w oryginalnej walucie pozycji
async function calculateCurrentValue(position: Position): Promise<string> {
  try {
    const currentValueEntry = extractCurrentValueEntry(position)
    
    if (!currentValueEntry.value || typeof currentValueEntry.value !== 'number') {
      return '—'
    }

    const currency = (currentValueEntry.currency || 'PLN').toUpperCase()
    
    // Zwróć wartość w oryginalnej walucie pozycji
    return formatValueInCurrency(currentValueEntry.value, currency)
  } catch (error) {
    console.error(`Failed to calculate current value for position ${position.id}:`, error)
    return '—'
  }
}

// Asynchroniczna funkcja do aktualizacji wartości portfela z konwersją walut
async function updatePortfolioValues(): Promise<void> {
  try {
    const positions = getPositions()
    const portfolioValueEntries = positions.map(position => extractCurrentValueEntry(position))
    const investedCapitalEntries = positions.map(position => extractInvestedEntry(position))

    // Pobierz zaktualizowane wartości z konwersją walut
    const portfolioValueMetric = await aggregateMonetaryValue(portfolioValueEntries, 'PLN')
    const investedCapitalMetric = await aggregateMonetaryValue(investedCapitalEntries, 'PLN')

    // Zaktualizuj wartości w DOM
    const portfolioValueEl = document.querySelector('.portfolio-overview .metric:nth-child(1) .value')
    const investedCapitalEl = document.querySelector('.portfolio-overview .metric:nth-child(2) .value')

    if (portfolioValueEl) {
      portfolioValueEl.textContent = portfolioValueMetric.label
    }

    if (investedCapitalEl) {
      investedCapitalEl.textContent = investedCapitalMetric.label
    }

    // Zaktualizuj procent zmiany
    const comparableTotals =
      portfolioValueMetric.value !== null &&
      investedCapitalMetric.value !== null &&
      Math.abs(investedCapitalMetric.value) > Number.EPSILON

    if (comparableTotals) {
      const portfolioChangeValue =
        ((portfolioValueMetric.value ?? 0) / (investedCapitalMetric.value ?? 1) - 1) * 100
      const portfolioDescriptor = document.querySelector('.portfolio-overview .metric:nth-child(1) .change')
      if (portfolioDescriptor) {
        portfolioDescriptor.innerHTML = `<span class="metric-change ${portfolioChangeValue < 0 ? 'negative' : 'positive'}">${formatPercentageChange(portfolioChangeValue)} względem kapitału</span>`
      }
    }

    // Zaktualizuj aktualne wartości pozycji w tabeli
    const currentValueCells = document.querySelectorAll<HTMLElement>('.current-value-cell')
    const updatePromises = Array.from(currentValueCells).map(async (cell) => {
      const positionId = cell.dataset.positionId
      if (!positionId) {
        cell.innerHTML = '—'
        return
      }

      const position = positions.find(p => p.id === positionId)
      if (!position) {
        cell.innerHTML = '—'
        return
      }

      try {
        const currentValue = await calculateCurrentValue(position)
        cell.innerHTML = `<span class="current-value">${currentValue}</span>`
      } catch (error) {
        console.error(`Failed to update current value for position ${positionId}:`, error)
        cell.innerHTML = '—'
      }
    })

    await Promise.all(updatePromises)
  } catch (error) {
    console.error('Failed to update portfolio values:', error)
    // W przypadku błędu, wartości pozostaną w wersji synchronicznej (tylko PLN)
  }
}


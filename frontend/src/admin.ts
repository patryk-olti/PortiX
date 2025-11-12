import {
  getPositions,
  getStatusUpdates,
  getTechnicalAnalysis,
  removeStatusUpdate,
  replaceStatusUpdates,
  updateStatusUpdate,
  upsertTechnicalAnalysis,
  removeTechnicalAnalysis,
  applyPositionUpdate,
  replacePositions,
  removePositionFromStore,
} from './store'
import type { Position, StatusUpdate, TechnicalAnalysis } from './types'
import {
  createNews,
  fetchStatusUpdates,
  updateNews,
  deleteNews,
  createPosition as createPortfolioPosition,
  updatePositionAnalysis as persistPositionAnalysis,
  deletePositionAnalysis as removePositionAnalysis,
  fetchPositions as fetchPositionsFromApi,
  deletePosition as deletePortfolioPosition,
  updatePositionMetadata,
} from './api'

const categoryOptions = [
  { value: 'stock', label: 'Akcje' },
  { value: 'commodity', label: 'Surowiec' },
  { value: 'hedge', label: 'Zabezpieczenie' },
  { value: 'cash', label: 'Gotówka' },
  { value: 'cryptocurrency', label: 'Kryptowaluty' },
] as const

const positionTypeOptions = [
  { value: 'long', label: 'LONG' },
  { value: 'short', label: 'SHORT' },
] as const

const sidebarSections = [
  { id: 'create', label: 'Dodaj nową pozycję' },
  { id: 'analyses', label: 'Edycja analiz' },
  { id: 'news', label: 'Aktualności' },
] as const

type CategoryOption = (typeof categoryOptions)[number]['value']

type TrendOption = TechnicalAnalysis['trend']

type PositionTypeOption = (typeof positionTypeOptions)[number]['value']

type SectionId = (typeof sidebarSections)[number]['id']

const ACTIVE_SECTION_STORAGE_KEY = 'adminActiveSection'
const ACTIVE_ANALYSIS_STORAGE_KEY = 'adminActiveAnalysisPosition'
let hasInitialNewsSync = false
let isSyncingNews = false
let adminNewsHandlerAttached = false
let adminNewsActionsTarget: HTMLDivElement | null = null

let analysisPositionSelect: HTMLSelectElement | null = null
let analysisFormContainer: HTMLDivElement | null = null
let isRefreshingPositions = false

let modalElement: HTMLDivElement | null = null
let modalForm: HTMLFormElement | null = null
let modalCloseBtn: HTMLButtonElement | null = null
let modalCancelBtn: HTMLButtonElement | null = null

function getStoredActiveSection(): SectionId {
  if (typeof window === 'undefined') {
    return 'create'
  }
  const stored = window.sessionStorage.getItem(ACTIVE_SECTION_STORAGE_KEY)
  if (stored === 'create' || stored === 'analyses' || stored === 'news') {
    return stored
  }
  return 'create'
}

export function renderAdmin(): string {
  const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true'
  const username = localStorage.getItem('adminUsername') || 'Administrator'

  if (!isAuthenticated) {
    window.location.hash = '#/login'
    return ''
  }

  const positions = getPositions()
  const statusUpdates = getStatusUpdates()
  const initialAnalysisPositionId = getStoredActiveAnalysisPosition(positions)
  const activeSection = getStoredActiveSection()

  if (initialAnalysisPositionId) {
    setStoredActiveAnalysisPosition(initialAnalysisPositionId)
  }

  return `
    <main class="admin-page admin-layout" data-active-section="${activeSection}">
      <aside class="admin-sidebar">
        <div class="admin-sidebar-logo">
          <img src="/logo.svg" alt="PortiX logo" />
        </div>
        <div class="admin-sidebar-header">
          <h1>Panel administratora</h1>
          <p>${username}</p>
        </div>
        <nav class="admin-sidebar-nav">
          ${sidebarSections
            .map(
              (section, index) => `
                <button type="button" class="admin-tab-link ${
                  section.id === activeSection
                    ? 'active'
                    : index === 0 && !activeSection
                      ? 'active'
                      : ''
                }" data-target="${section.id}">
                  ${section.label}
                </button>
              `,
            )
            .join('')}
        </nav>
        <div class="admin-sidebar-footer">
          <button type="button" class="logout-button admin-logout">Wyloguj</button>
        </div>
      </aside>

      <section class="admin-content">
        <section class="admin-section ${activeSection === 'create' ? 'active' : ''}" data-section="create">
          <div class="section-header">
            <h2>Dodaj nową pozycję</h2>
            <p>Uzupełnij podstawowe dane pozycji oraz scenariusz analizy technicznej.</p>
          </div>
          <form class="admin-form" id="create-position-form">
            <fieldset class="admin-form-fieldset">
              <legend>Dane pozycji</legend>
              <div class="form-grid columns-3">
                <label class="form-field">
                  <span>Symbol</span>
                  <input type="text" name="symbol" required placeholder="np. NDX" />
                </label>
                <label class="form-field with-tooltip">
                  <span>Symbol TradingView</span>
                  <input type="text" name="quoteSymbol" placeholder="np. NASDAQ:NDX" />
                  <span class="form-tooltip" role="tooltip">
                    Możesz użyć prefiksów:
                    <ul>
                      <li><code>ALPHA:CL=F</code> – kurs z Alpha Vantage (wymaga klucza)</li>
                      <li><code>TVC:USOIL</code> – kurs z TradingView</li>
                    </ul>
                  </span>
                </label>
                <label class="form-field">
                  <span>Waluta transakcji</span>
                  <select name="positionCurrency" class="position-currency-select">
                    <option value="PLN" selected>PLN</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="CHF">CHF</option>
                    <option value="JPY">JPY</option>
                    <option value="CAD">CAD</option>
                  </select>
                </label>
                <label class="form-field">
                  <span>Typ pozycji</span>
                  <select name="positionType" required>
                    ${positionTypeOptions
                      .map(option => `<option value="${option.value}">${option.label}</option>`)
                      .join('')}
                  </select>
                </label>
                <label class="form-field">
                  <span>Kategoria</span>
                  <select name="category" required>
                    ${categoryOptions.map(option => `<option value="${option.value}">${option.label}</option>`).join('')}
                  </select>
                </label>
                <label class="form-field">
                  <span>Cena zakupu</span>
                  <input type="text" name="purchasePrice" required placeholder="np. 420" />
                </label>
              </div>
              <div class="position-size-settings">
                <div class="position-size-row">
                  <label class="form-field position-size-type-field">
                    <span>Metoda wielkości pozycji</span>
                    <select name="positionSizeType" id="position-size-type">
                      <option value="capital">Kwota inwestycji</option>
                      <option value="units">Stała liczba jednostek</option>
                      <option value="pips">Wartość w pipsach</option>
                    </select>
                  </label>
                  <label class="form-field position-size-field" data-size-field="capital">
                    <span>Kwota inwestycji</span>
                    <input type="text" name="positionCapitalAmount" placeholder="np. 15000" />
                  </label>
                  <label class="form-field position-size-field" data-size-field="units" hidden>
                    <span>Liczba jednostek</span>
                    <input type="number" name="positionUnitsAmount" min="0" step="0.0001" placeholder="np. 2" />
                  </label>
                </div>
                <div class="position-size-row" data-size-field="pips" hidden>
                  <label class="form-field">
                    <span>Liczba pipsów</span>
                    <input type="number" name="positionPipCount" min="0" step="0.01" placeholder="np. 50" />
                  </label>
                  <label class="form-field">
                    <span>Wartość jednego pipsa</span>
                    <input type="text" name="positionPipValue" placeholder="np. 10" />
                  </label>
                </div>
              </div>
              <p class="form-hint position-size-summary" id="position-size-summary">
                Uzupełnij dane, aby obliczyć całkowitą wartość pozycji.
              </p>
            </fieldset>

            <fieldset class="admin-form-fieldset">
              <legend>Analiza techniczna</legend>
              <p class="fieldset-note">
                Wprowadź trend, cele take-profit oraz poziom stop-loss. Opcjonalnie dodaj zrzut ekranu analizy.
              </p>
              <div class="form-grid">
                <label class="form-field">
                  <span>Trend</span>
                  <select name="trend" required>
                    ${renderTrendOption('bullish', 'Wzrostowy', 'bullish')}
                    ${renderTrendOption('neutral', 'Neutralny', 'bullish')}
                    ${renderTrendOption('bearish', 'Spadkowy', 'bullish')}
                  </select>
                </label>
                <label class="form-field">
                  <span>Strategia wejścia</span>
                  <select name="entryStrategy" required>
                    <option value="level" selected>Wejście z poziomu</option>
                    <option value="candlePattern">Formacja świecowa</option>
                    <option value="formationRetest">Retest formacji</option>
                  </select>
                </label>
                <label class="form-field">
                  <span>TP1</span>
                  <input type="text" name="tp1" placeholder="np. 450 USD" />
                </label>
                <label class="form-field">
                  <span>TP2</span>
                  <input type="text" name="tp2" placeholder="np. 470 USD" />
                </label>
                <label class="form-field">
                  <span>TP3</span>
                  <input type="text" name="tp3" placeholder="np. 490 USD" />
                </label>
                <label class="form-field">
                  <span>Stop loss (SL)</span>
                  <input type="text" name="stopLoss" required placeholder="np. 410 USD" />
                </label>
                <label class="form-field">
                  <span>Obraz analizy</span>
                  <input type="file" name="analysisImage" accept="image/*" />
                </label>
              </div>
              <label class="form-field">
                <span>Podsumowanie</span>
                <textarea name="summary" rows="4" required placeholder="Krótki opis scenariusza"></textarea>
              </label>
            </fieldset>

            <div class="admin-form-actions">
              <button type="submit" class="primary">Dodaj pozycję</button>
            </div>
          </form>
        </section>

        <section class="admin-section ${activeSection === 'analyses' ? 'active' : ''}" data-section="analyses">
          <div class="section-header">
            <h2>Edycja analiz</h2>
            <p>Wybierz pozycję, zaktualizuj cele, SL, status oraz opcjonalny zrzut ekranu.</p>
          </div>
          ${
            positions.length
              ? `
              <div class="analysis-selector">
                <label class="form-field">
                  <span>Aktywna pozycja</span>
                  <select id="analysis-position-select">
                    ${positions
                      .map(({ id, name, symbol }) => `
                        <option value="${id}" ${id === initialAnalysisPositionId ? 'selected' : ''}>${name} (${symbol})</option>
                      `)
                      .join('')}
                  </select>
                </label>
              </div>
              <div id="analysis-form-container">
                ${initialAnalysisPositionId ? renderAnalysisForm(initialAnalysisPositionId) : ''}
              </div>
            `
              : '<p class="empty-state">Brak dostępnych pozycji. Dodaj pozycję, aby rozpocząć edycję analiz.</p>'
          }
        </section>

        <section class="admin-section ${activeSection === 'news' ? 'active' : ''}" data-section="news">
          <div class="section-header">
            <h2>Aktualności statusu projektu</h2>
            <p>Dodaj komunikat, który pojawi się w sekcji statusu.</p>
          </div>
          <form class="admin-form" id="status-update-form">
            <div class="form-grid">
              <label class="form-field">
                <span>Tytuł</span>
                <input type="text" name="title" required placeholder="np. Wdrożenie modułu alertów" />
              </label>
              <label class="form-field">
                <span>Data</span>
                <input type="date" name="date" required value="${new Date().toISOString().slice(0, 10)}" />
              </label>
              <label class="form-field">
                <span>Status</span>
                <select name="importance" required>
                  <option value="critical">Pilne</option>
                  <option value="important" selected>Ważne</option>
                  <option value="informational">Informacyjne</option>
                </select>
              </label>
            </div>
            <label class="form-field">
              <span>Opis</span>
              <textarea name="summary" rows="3" required placeholder="Krótka informacja dla zespołu i użytkowników."></textarea>
            </label>
            <div class="admin-form-actions">
              <button type="submit" class="primary">Dodaj aktualność</button>
            </div>
          </form>

          <div class="admin-news-preview">
            <h3>Ostatnie aktualności</h3>
            <div class="admin-news-wrapper" id="admin-news-wrapper">
              ${renderAdminNewsList(statusUpdates)}
            </div>
          </div>
        </section>
      </section>
    </main>

    <div class="admin-news-modal" id="admin-news-modal" hidden>
      <div class="admin-news-modal-content">
        <header>
          <h3>Edytuj aktualność</h3>
          <button type="button" class="admin-news-modal-close" id="admin-news-modal-close" aria-label="Zamknij">×</button>
        </header>
        <form id="admin-news-edit-form">
          <input type="hidden" name="id" />
          <label class="form-field">
            <span>Tytuł</span>
            <input type="text" name="title" required />
          </label>
          <label class="form-field">
            <span>Opis</span>
            <textarea name="summary" rows="4" required></textarea>
          </label>
          <div class="form-grid">
            <label class="form-field">
              <span>Data</span>
              <input type="date" name="date" required />
            </label>
            <label class="form-field">
              <span>Ważność</span>
              <select name="importance" required>
                <option value="critical">Pilne</option>
                <option value="important">Ważne</option>
                <option value="informational">Informacyjne</option>
              </select>
            </label>
          </div>
          <div class="admin-form-actions modal-actions">
            <button type="button" class="secondary" id="admin-news-modal-cancel">Anuluj</button>
            <button type="submit" class="primary">Zapisz zmiany</button>
          </div>
        </form>
      </div>
    </div>

  `
}

export function setupAdminHandlers(): void {
  const logoutButton = document.querySelector<HTMLButtonElement>('.admin-logout')
  logoutButton?.addEventListener('click', () => {
    localStorage.removeItem('adminAuthenticated')
    localStorage.removeItem('adminUsername')
    window.location.hash = '#/login'
  })

  setupSidebarNavigation()
  setupCreatePositionForm()
  setupAnalysisSection()
  setupStatusForm()
  refreshAdminNewsPreview()
  bindAdminNewsActions()
  initAdminNewsModal()
  if (!hasInitialNewsSync) {
    void syncStatusUpdatesFromApi()
  }
}

function setupSidebarNavigation() {
  const links = Array.from(document.querySelectorAll<HTMLButtonElement>('.admin-tab-link'))
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.admin-section'))

  const activate = (target: SectionId) => {
    sessionStorage.setItem(ACTIVE_SECTION_STORAGE_KEY, target)
    links.forEach(link => {
      link.classList.toggle('active', link.dataset.target === target)
    })
    sections.forEach(section => {
      section.classList.toggle('active', section.dataset.section === target)
    })
    const root = document.querySelector<HTMLElement>('.admin-page')
    if (root) {
      root.setAttribute('data-active-section', target)
    }
  }

  links.forEach(link => {
    link.addEventListener('click', () => {
      const target = link.dataset.target as SectionId | undefined
      if (target) {
        activate(target)
      }
    })
  })
}

function setupCreatePositionForm() {
  const form = document.querySelector<HTMLFormElement>('#create-position-form')
  if (!form) {
    return
  }

  const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]')
  const purchasePriceInput = form.querySelector<HTMLInputElement>('input[name="purchasePrice"]')
  const sizeTypeSelect = form.querySelector<HTMLSelectElement>('select[name="positionSizeType"]')
  const currencySelect = form.querySelector<HTMLSelectElement>('select[name="positionCurrency"]')
  const sizeFields = Array.from(form.querySelectorAll<HTMLElement>('[data-size-field]'))
  const capitalInput = form.querySelector<HTMLInputElement>('input[name="positionCapitalAmount"]')
  const unitsInput = form.querySelector<HTMLInputElement>('input[name="positionUnitsAmount"]')
  const pipCountInput = form.querySelector<HTMLInputElement>('input[name="positionPipCount"]')
  const pipValueInput = form.querySelector<HTMLInputElement>('input[name="positionPipValue"]')
  const summaryElement = form.querySelector<HTMLParagraphElement>('#position-size-summary')

  const validEntryStrategies = ['level', 'candlePattern', 'formationRetest'] as const
  const validSizeTypes = ['capital', 'units', 'pips'] as const

  const appendCurrencyIfMissing = (label: string | null | undefined, currency: string): string | undefined => {
    if (!label) {
      return undefined
    }
    const trimmed = label.trim()
    if (!trimmed) {
      return undefined
    }
    if (/[A-Za-z]{3}$/.test(trimmed)) {
      return trimmed
    }
    return `${trimmed} ${currency}`
  }

  const parseNumericValue = (label: string | null | undefined): number | undefined => {
    if (!label || typeof label !== 'string') {
      return undefined
    }
    const sanitized = label.replace(/\s+/g, '').replace(',', '.').match(/-?\d+(\.\d+)?/)
    if (!sanitized) {
      return undefined
    }
    const value = Number.parseFloat(sanitized[0])
    return Number.isFinite(value) ? value : undefined
  }

  const formatPriceLabelLocal = (value: number, currency?: string | null): string => {
    if (!Number.isFinite(value)) {
      return '—'
    }
    const formatter = new Intl.NumberFormat('pl-PL', {
      minimumFractionDigits: value >= 100 ? 2 : 3,
      maximumFractionDigits: value >= 100 ? 2 : 4,
    })
    const formatted = formatter.format(value)
    return currency && currency.trim().length ? `${formatted} ${currency}` : formatted
  }

  const toggleSizeFields = () => {
    const activeType = (sizeTypeSelect?.value ?? 'capital').toLowerCase()
    sizeFields.forEach(field => {
      const type = field.getAttribute('data-size-field')
      const shouldShow = type === activeType
      field.toggleAttribute('hidden', !shouldShow)
      field.classList.toggle('is-hidden', !shouldShow)
    })
    updatePositionSizeSummary()
  }

  const updatePositionSizeSummary = () => {
    if (!summaryElement) {
      return
    }

    const type = (sizeTypeSelect?.value ?? 'capital') as (typeof validSizeTypes)[number]
    const selectedCurrency = (currencySelect?.value ?? 'PLN').toUpperCase()
    const purchasePriceLabel = appendCurrencyIfMissing(purchasePriceInput?.value?.trim(), selectedCurrency) ?? ''
    const purchasePriceValue = parseNumericValue(purchasePriceLabel)

    let summary = 'Uzupełnij dane, aby obliczyć całkowitą wartość pozycji.'

    if (type === 'capital') {
      const capitalLabel = capitalInput?.value?.trim() ?? ''
      if (!capitalLabel) {
        summary = 'Podaj kwotę inwestycji (np. 15000).' 
      } else {
        const capitalValue = parseNumericValue(capitalLabel)
        const formatted =
          typeof capitalValue === 'number'
            ? formatPriceLabelLocal(capitalValue, selectedCurrency)
            : `${capitalLabel} ${selectedCurrency}`
        summary = `Całkowita wartość pozycji: ${formatted}`
      }
    } else if (type === 'units') {
      const unitsValue = Number.parseFloat(unitsInput?.value ?? '')
      if (!Number.isFinite(unitsValue) || unitsValue <= 0) {
        summary = 'Podaj dodatnią liczbę jednostek / kontraktów.'
      } else if (typeof purchasePriceValue !== 'number' || !Number.isFinite(purchasePriceValue)) {
        summary = 'Podaj prawidłową cenę zakupu (np. 420).' 
      } else {
        const total = unitsValue * purchasePriceValue
        summary = `Całkowita wartość pozycji: ${formatPriceLabelLocal(total, selectedCurrency)}`
      }
    } else {
      const pipCount = Number.parseFloat(pipCountInput?.value ?? '')
      const pipValueRaw = pipValueInput?.value?.trim() ?? ''
      if (!Number.isFinite(pipCount) || pipCount <= 0) {
        summary = 'Podaj dodatnią liczbę pipsów.'
      } else if (!pipValueRaw) {
        summary = 'Podaj wartość jednego pipsa (np. 10).' 
      } else {
        const pipValueLabelWithCurrency = appendCurrencyIfMissing(pipValueRaw, selectedCurrency)
        const perPipNumeric = parseNumericValue(pipValueLabelWithCurrency)
        if (typeof perPipNumeric !== 'number' || !Number.isFinite(perPipNumeric)) {
          summary = 'Wartość jednego pipsa musi być kwotą (np. 10).' 
        } else {
          const total = perPipNumeric * pipCount
          summary = `Całkowita wartość pozycji: ${formatPriceLabelLocal(total, selectedCurrency)}`
        }
      }
    }

    summaryElement.textContent = summary
  }

  ;[purchasePriceInput, sizeTypeSelect, currencySelect, capitalInput, unitsInput, pipCountInput, pipValueInput]
    .filter((element): element is HTMLElement => Boolean(element))
    .forEach(element => {
      const eventType = element instanceof HTMLSelectElement ? 'change' : 'input'
      element.addEventListener(eventType, () => {
        if (element === sizeTypeSelect) {
          toggleSizeFields()
        } else {
          updatePositionSizeSummary()
        }
      })
    })

  toggleSizeFields()

  form.addEventListener('submit', async event => {
    event.preventDefault()
    const formData = new FormData(form)

    const symbol = ((formData.get('symbol') as string) || '').trim().toUpperCase()
    const quoteSymbolInput = (formData.get('quoteSymbol') as string)?.trim()
    const rawCurrency = (formData.get('positionCurrency') as string) ?? 'PLN'
    const positionCurrency = rawCurrency.trim().toUpperCase() || 'PLN'
    const quoteSymbol =
      quoteSymbolInput && quoteSymbolInput.length
        ? quoteSymbolInput.replace(/\s+/g, '').toUpperCase()
        : undefined
    const category = formData.get('category') as CategoryOption
    const positionType = (formData.get('positionType') as PositionTypeOption) ?? 'long'
    const purchasePriceRaw = (formData.get('purchasePrice') as string)?.trim() ?? ''
    const purchasePrice = appendCurrencyIfMissing(purchasePriceRaw, positionCurrency) ?? purchasePriceRaw
    const positionSizeType = (formData.get('positionSizeType') as string)?.toLowerCase() as
      | 'capital'
      | 'units'
      | 'pips'
    const trend = formData.get('trend') as TrendOption
    const tp1 = (formData.get('tp1') as string)?.trim()
    const tp2 = (formData.get('tp2') as string)?.trim()
    const tp3 = (formData.get('tp3') as string)?.trim()
    const stopLoss = (formData.get('stopLoss') as string)?.trim()
    const summary = (formData.get('summary') as string)?.trim()
    const entryStrategy = (formData.get('entryStrategy') as string) || 'level'

    if (!symbol || !purchasePrice || !stopLoss || !summary) {
      alert('Uzupełnij poprawnie wszystkie wymagane pola formularza.')
      return
    }

    if (!validEntryStrategies.includes(entryStrategy as typeof validEntryStrategies[number])) {
      alert('Wybierz poprawną strategię wejścia.')
      return
    }

    if (!validSizeTypes.includes(positionSizeType as (typeof validSizeTypes)[number])) {
      alert('Wybierz poprawną metodę wielkości pozycji.')
      return
    }

    const id = symbol.toLowerCase()
    if (getPositions().some(position => position.id === id)) {
      alert('Pozycja o tym symbolu już istnieje. Wybierz inny symbol.')
      return
    }

    const purchasePriceValue = parseNumericValue(purchasePrice)
    const analysisImageFile = formData.get('analysisImage') as File | null

    let analysisImage: string | undefined
    if (analysisImageFile && analysisImageFile.size > 0) {
      try {
        analysisImage = await readFileAsDataURL(analysisImageFile)
      } catch (error) {
        console.error('Nie udało się odczytać pliku z analizą:', error)
        alert('Nie udało się odczytać załączonego obrazu analizy.')
        return
      }
    }

    let positionSizeValueToSend: number | undefined
    let positionSizeLabelToSend: string | undefined
    let positionSizePerPipLabelToSend: string | undefined

    if (positionSizeType === 'capital') {
      const capitalLabel = capitalInput?.value?.trim()
      if (!capitalLabel) {
        alert('Podaj kwotę inwestycji (np. 15000).')
        return
      }
      const capitalWithCurrency = appendCurrencyIfMissing(capitalLabel, positionCurrency)
      positionSizeLabelToSend = capitalWithCurrency ?? capitalLabel
      const capitalNumeric = parseNumericValue(positionSizeLabelToSend)
      if (typeof capitalNumeric === 'number' && Number.isFinite(capitalNumeric)) {
        positionSizeValueToSend = capitalNumeric
      }
    } else if (positionSizeType === 'units') {
      const unitsValue = Number.parseFloat(unitsInput?.value ?? '')
      if (!Number.isFinite(unitsValue) || unitsValue <= 0) {
        alert('Podaj dodatnią liczbę jednostek / kontraktów.')
        return
      }
      if (typeof purchasePriceValue !== 'number' || !Number.isFinite(purchasePriceValue)) {
        alert('Podaj prawidłową cenę zakupu (np. 420).')
        return
      }
      positionSizeValueToSend = unitsValue
      positionSizeLabelToSend = `${unitsValue}`
    } else if (positionSizeType === 'pips') {
      const pipCount = Number.parseFloat(pipCountInput?.value ?? '')
      const pipValueRaw = pipValueInput?.value?.trim()
      if (!Number.isFinite(pipCount) || pipCount <= 0) {
        alert('Podaj dodatnią liczbę pipsów.')
        return
      }
      if (!pipValueRaw) {
        alert('Podaj wartość jednego pipsa (np. 10).')
        return
      }
      const pipValueLabelWithCurrency = appendCurrencyIfMissing(pipValueRaw, positionCurrency)
      const perPipNumeric = parseNumericValue(pipValueLabelWithCurrency)
      if (typeof perPipNumeric !== 'number' || !Number.isFinite(perPipNumeric)) {
        alert('Wartość jednego pipsa musi być kwotą (np. 10).')
        return
      }
      positionSizeValueToSend = pipCount
      positionSizeLabelToSend = `${pipCount} pips`
      positionSizePerPipLabelToSend = pipValueLabelWithCurrency
    }

    const analysis: TechnicalAnalysis = {
      trend,
      targets: {
        ...(tp1 ? { tp1 } : {}),
        ...(tp2 ? { tp2 } : {}),
        ...(tp3 ? { tp3 } : {}),
      },
      stopLoss,
      summary,
      analysisImage,
      entryStrategy: entryStrategy as typeof validEntryStrategies[number],
    }

    try {
      if (submitButton) {
        submitButton.disabled = true
        submitButton.textContent = 'Dodawanie...'
      }

      const createdPosition = await createPortfolioPosition({
        symbol,
        name: symbol,
        category,
        positionType,
        purchasePrice,
        currentPrice: purchasePrice,
        returnValue: 0,
        quoteSymbol,
        positionSizeType,
        positionSizeValue: positionSizeValueToSend,
        positionSizeLabel: positionSizeLabelToSend,
        positionSizePerPipLabel: positionSizePerPipLabelToSend,
        positionCurrency,
        analysis,
      })

      applyPositionUpdate(createdPosition)
      await refreshPositionsFromBackend()

      alert(`Dodano nową pozycję ${symbol}.`)
      form.reset()
      if (sizeTypeSelect) {
        sizeTypeSelect.value = 'capital'
      }
      if (currencySelect) {
        currencySelect.value = 'PLN'
      }
      toggleSizeFields()
      updatePositionSizeSummary()
    } catch (error) {
      console.error('Nie udało się dodać pozycji:', error)
      const message = error instanceof Error ? error.message : 'Nie udało się dodać pozycji.'
      alert(message)
    } finally {
      if (submitButton) {
        submitButton.disabled = false
        submitButton.textContent = 'Dodaj pozycję'
      }
    }
  })
}

function setupAnalysisSection() {
  analysisPositionSelect = document.querySelector<HTMLSelectElement>('#analysis-position-select')
  analysisFormContainer = document.querySelector<HTMLDivElement>('#analysis-form-container')
  if (!analysisPositionSelect || !analysisFormContainer) {
    return
  }

  renderAnalysisEditor(analysisPositionSelect.value)
  setStoredActiveAnalysisPosition(analysisPositionSelect.value)

  analysisPositionSelect.addEventListener('change', () => {
    if (analysisPositionSelect) {
      setStoredActiveAnalysisPosition(analysisPositionSelect.value)
      renderAnalysisEditor(analysisPositionSelect.value)
    }
  })
}

function rebuildAnalysisSelector(selectedId?: string): string | null {
  analysisPositionSelect = document.querySelector<HTMLSelectElement>('#analysis-position-select')
  if (!analysisPositionSelect) {
    return null
  }

  const positions = getPositions()
  if (!positions.length) {
    analysisPositionSelect.innerHTML = ''
    analysisPositionSelect.disabled = true
    return null
  }

  const targetId =
    selectedId && positions.some(position => position.id === selectedId)
      ? selectedId
      : positions[0].id

  analysisPositionSelect.innerHTML = positions
    .map(({ id, name, symbol }) => `<option value="${id}" ${id === targetId ? 'selected' : ''}>${name} (${symbol})</option>`)
    .join('')
  analysisPositionSelect.disabled = false
  analysisPositionSelect.value = targetId

  return targetId
}

function renderAnalysisEditor(positionId: string) {
  analysisPositionSelect = document.querySelector<HTMLSelectElement>('#analysis-position-select')
  if (analysisPositionSelect && analysisPositionSelect.value !== positionId) {
    analysisPositionSelect.value = positionId
  }

  analysisFormContainer = document.querySelector<HTMLDivElement>('#analysis-form-container')
  if (!analysisFormContainer) {
    return
  }

  analysisFormContainer.innerHTML = renderAnalysisForm(positionId)
  const form = analysisFormContainer.querySelector<HTMLFormElement>('.analysis-edit-form')
  if (form) {
    bindAnalysisForm(form)
  }
}

function bindAnalysisForm(form: HTMLFormElement) {
  const positionId = form.dataset.positionId ?? ''
  const databaseId = form.dataset.databaseId ?? ''
  const initialAnalysis =
    positionId ? getTechnicalAnalysis(positionId) || createEmptyAnalysis() : createEmptyAnalysis()
  const initialPosition = getPositions().find(item => item.id === positionId)
  const initialQuoteSymbol = initialPosition?.quoteSymbol ?? ''

  setupClosureControls(form, initialAnalysis)

  const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]')

  form.addEventListener('submit', async event => {
    event.preventDefault()
    const formData = new FormData(form)
    const currentPositionId = form.dataset.positionId ?? positionId
    const currentDatabaseId = form.dataset.databaseId ?? databaseId
    const apiTargetId = currentDatabaseId || currentPositionId
    if (!currentPositionId) {
      return
    }

    const trend = formData.get('trend') as TrendOption
    const tp1 = (formData.get('tp1') as string)?.trim()
    const tp2 = (formData.get('tp2') as string)?.trim()
    const tp3 = (formData.get('tp3') as string)?.trim()
    const stopLoss = (formData.get('stopLoss') as string)?.trim()
    const summary = (formData.get('summary') as string)?.trim()
    const completed = formData.get('completed') === 'on'
    const completionNote = (formData.get('completionNote') as string)?.trim()
    const positionClosed = (formData.get('positionClosed') as string) === 'true'
    const positionClosedNote = (formData.get('positionClosedNote') as string)?.trim() ?? ''
    const positionClosedDateExplicit = (formData.get('positionClosedDateInput') as string)?.trim() ?? ''
    const quoteSymbolInput = ((formData.get('quoteSymbol') as string) ?? '').trim()
    const entryStrategy = (formData.get('entryStrategy') as string) || 'level'
    const currentImageValue = (formData.get('currentImage') as string) || undefined
    const analysisImageFile = formData.get('analysisImage') as File | null

    if (!summary || !stopLoss) {
      alert('Uzupełnij wymagane pola analizy.')
      return
    }

    if (completed && (!completionNote || !completionDateInput)) {
      alert('Podaj powód realizacji oraz datę realizacji analizy.')
      return
    }

    if (positionClosed && (!positionClosedNote || (!positionClosedDateExplicit && !positionClosedDateInput))) {
      alert('Dodaj informację oraz datę zamknięcia pozycji.')
      return
    }

    const validEntryStrategies = ['level', 'candlePattern', 'formationRetest'] as const
    if (!validEntryStrategies.includes(entryStrategy as typeof validEntryStrategies[number])) {
      alert('Wybierz poprawną strategię wejścia.')
      return
    }

    try {
      if (submitButton) {
        submitButton.disabled = true
        submitButton.textContent = 'Zapisywanie...'
      }

      const currentPosition = getPositions().find(item => item.id === currentPositionId)
      const originalQuoteSymbol = currentPosition?.quoteSymbol ?? initialQuoteSymbol
      const shouldUpdateQuoteSymbol = quoteSymbolInput !== originalQuoteSymbol

      if (shouldUpdateQuoteSymbol) {
        const updatedPositionMetadata = await updatePositionMetadata(apiTargetId, {
          quoteSymbol: quoteSymbolInput,
        })
        if (updatedPositionMetadata) {
          applyPositionUpdate(updatedPositionMetadata)
          if (updatedPositionMetadata.databaseId) {
            form.dataset.databaseId = updatedPositionMetadata.databaseId
          }
        }
      }

      let analysisImage = currentImageValue
      if (analysisImageFile && analysisImageFile.size > 0) {
        try {
          analysisImage = await readFileAsDataURL(analysisImageFile)
        } catch (error) {
          console.error('Nie udało się odczytać pliku z analizą:', error)
          throw new Error('Nie udało się odczytać załączonego obrazu analizy.')
        }
      }

      const existingAnalysis = getTechnicalAnalysis(currentPositionId) || createEmptyAnalysis()
      const resolvedClosedDate = positionClosed
        ? positionClosedDateExplicit || existingAnalysis.positionClosedDate || new Date().toISOString()
        : undefined
      const resolvedCompletionDate = completed
        ? completionDateInput || existingAnalysis.completionDate || new Date().toISOString()
        : undefined

      const analysis: TechnicalAnalysis = {
        trend,
        targets: {
          ...(tp1 ? { tp1 } : {}),
          ...(tp2 ? { tp2 } : {}),
          ...(tp3 ? { tp3 } : {}),
        },
        stopLoss,
        summary,
        analysisImage,
        completed,
        completionNote: completed ? completionNote : undefined,
        completionDate: resolvedCompletionDate,
        positionClosed,
        positionClosedNote: positionClosed ? positionClosedNote : undefined,
        positionClosedDate: resolvedClosedDate,
        entryStrategy: entryStrategy as typeof validEntryStrategies[number],
      }

      const updatedPosition = await persistPositionAnalysis(apiTargetId, analysis)
      if (updatedPosition) {
        applyPositionUpdate(updatedPosition)
        if (updatedPosition.databaseId) {
          form.dataset.databaseId = updatedPosition.databaseId
        }
      } else {
        upsertTechnicalAnalysis(currentPositionId, analysis)
      }

      await refreshPositionsFromBackend()
      renderAnalysisEditor(currentPositionId)
      alert('Analiza została zaktualizowana.')
    } catch (error) {
      console.error('Nie udało się zaktualizować analizy:', error)
      const message = error instanceof Error ? error.message : 'Nie udało się zaktualizować analizy.'
      alert(message)
    } finally {
      if (submitButton) {
        submitButton.disabled = false
        submitButton.textContent = 'Zapisz zmiany'
      }
    }
  })

  const deleteButton = form.querySelector<HTMLButtonElement>('.delete-analysis-button')
  deleteButton?.addEventListener('click', async event => {
    event.preventDefault()
    const currentPositionId = form.dataset.positionId ?? positionId
    const currentDatabaseId = form.dataset.databaseId ?? databaseId
    const apiTargetId = currentDatabaseId || currentPositionId
    if (!currentPositionId) {
      return
    }

    const shouldDelete = window.confirm('Czy na pewno chcesz usunąć tę analizę?')
    if (!shouldDelete) {
      return
    }

    const originalLabel = deleteButton.textContent

    try {
      deleteButton.disabled = true
      deleteButton.textContent = 'Usuwanie...'

      const updatedPosition = await removePositionAnalysis(apiTargetId)
      if (updatedPosition) {
        applyPositionUpdate(updatedPosition)
        if (updatedPosition.databaseId) {
          form.dataset.databaseId = updatedPosition.databaseId
        }
      }

      await refreshPositionsFromBackend()
      setStoredActiveAnalysisPosition(currentPositionId)
      removeTechnicalAnalysis(currentPositionId)

      window.requestAnimationFrame(() => {
        renderAnalysisEditor(currentPositionId)
      })

      alert('Analiza została usunięta.')
    } catch (error) {
      console.error('Nie udało się usunąć analizy:', error)
      const message = error instanceof Error ? error.message : 'Nie udało się usunąć analizy.'
      alert(message)
    } finally {
      deleteButton.disabled = false
      deleteButton.textContent = originalLabel ?? 'Usuń analizę'
    }
  })

  const deletePositionButton = form.querySelector<HTMLButtonElement>('.delete-position-button')
  deletePositionButton?.addEventListener('click', async event => {
    event.preventDefault()
    const currentPositionId = form.dataset.positionId ?? positionId
    const currentDatabaseId = form.dataset.databaseId ?? databaseId
    const apiTargetId = currentDatabaseId || currentPositionId
    if (!currentPositionId) {
      return
    }

    const shouldDelete = window.confirm('Czy na pewno chcesz usunąć tę pozycję? Operacja usunie wszystkie dane powiązane z analizą oraz historią cen.')
    if (!shouldDelete) {
      return
    }

    const originalLabel = deletePositionButton.textContent

    try {
      deletePositionButton.disabled = true
      deletePositionButton.textContent = 'Usuwanie pozycji...'

      await deletePortfolioPosition(apiTargetId)
      removePositionFromStore(currentPositionId)
      await refreshPositionsFromBackend()

      const remainingPositions = getPositions()
      if (remainingPositions.length) {
        const fallbackId = remainingPositions.find(pos => pos.id !== currentPositionId)?.id ?? remainingPositions[0].id
        const nextId = rebuildAnalysisSelector(fallbackId)
        if (nextId) {
          setStoredActiveAnalysisPosition(nextId)
          renderAnalysisEditor(nextId)
        }
      } else {
        rebuildAnalysisSelector()
        setStoredActiveAnalysisPosition('')
        if (analysisFormContainer) {
          analysisFormContainer.innerHTML = '<p class="empty-state">Brak dostępnych pozycji. Dodaj pozycję, aby rozpocząć edycję analiz.</p>'
        }
      }

      alert('Pozycja została usunięta.')
    } catch (error) {
      console.error('Nie udało się usunąć pozycji:', error)
      const message = error instanceof Error ? error.message : 'Nie udało się usunąć pozycji.'
      alert(message)
    } finally {
      deletePositionButton.disabled = false
      deletePositionButton.textContent = originalLabel ?? 'Usuń pozycję'
    }
  })

  bindAnalysisPreview(form)
}

function setupClosureControls(form: HTMLFormElement, analysis: TechnicalAnalysis) {
  const closureSection = form.querySelector<HTMLDivElement>('.analysis-closure')
  if (!closureSection) {
    return
  }

  const closeButton = closureSection.querySelector<HTMLButtonElement>('.close-analysis-button')
  const reopenButton = closureSection.querySelector<HTMLButtonElement>('.reopen-closure-button')
  const hiddenStatus = closureSection.querySelector<HTMLInputElement>('input[name="positionClosed"]')
  const hiddenDate = closureSection.querySelector<HTMLInputElement>('input[name="positionClosedDate"]')
  const noteField = closureSection.querySelector<HTMLTextAreaElement>('textarea[name="positionClosedNote"]')
  const info = closureSection.querySelector<HTMLParagraphElement>('.closure-info')

  const applyState = (closed: boolean, options: { note?: string; date?: string } = {}) => {
    if (hiddenStatus) {
      hiddenStatus.value = closed ? 'true' : 'false'
    }

    closureSection.dataset.closed = closed ? 'true' : 'false'

    if (noteField) {
      if (closed) {
        if (options.note !== undefined) {
          noteField.value = options.note
        }
        noteField.disabled = false
        noteField.required = true
      } else {
        if (options.note !== undefined) {
          noteField.value = ''
        }
        noteField.disabled = true
        noteField.required = false
      }
    }

    if (hiddenDate) {
      if (closed) {
        if (options.date !== undefined) {
          hiddenDate.value = options.date
        } else if (!hiddenDate.value) {
          hiddenDate.value = options.date ?? ''
        }
      } else {
        hiddenDate.value = ''
      }
    }

    const explicitDateInput = closureSection.querySelector<HTMLInputElement>('input[name="positionClosedDateInput"]')
    if (explicitDateInput) {
      if (closed) {
        if (options.date) {
          explicitDateInput.value = options.date.slice(0, 10)
        }
        explicitDateInput.disabled = false
        explicitDateInput.required = true
      } else {
        explicitDateInput.value = ''
        explicitDateInput.disabled = true
        explicitDateInput.required = false
      }
    }

    if (closeButton) {
      closeButton.hidden = closed
    }
    if (reopenButton) {
      reopenButton.hidden = !closed
    }

    if (info) {
      if (closed) {
        const displayDate = explicitDateInput?.value || options.date
        info.textContent = displayDate ? `Zamknięto: ${formatDate(displayDate)}` : 'Pozycja zamknięta'
      } else {
        info.textContent = ''
      }
    }

    if (closed && noteField && options.note !== undefined) {
      noteField.focus()
      const length = noteField.value.length
      noteField.setSelectionRange(length, length)
    }
  }

  applyState(Boolean(analysis.positionClosed), {
    note: analysis.positionClosed ? analysis.positionClosedNote ?? '' : '',
    date: analysis.positionClosed ? analysis.positionClosedDate ?? '' : '',
  })

  closeButton?.addEventListener('click', () => {
    const existingNote = noteField?.value.trim() ?? ''
    const note = window.prompt('Podaj krótką informację o zamknięciu pozycji.', existingNote)
    if (!note || !note.trim()) {
      alert('Dodaj przynajmniej krótką informację o zamknięciu pozycji.')
      return
    }
    applyState(true, { note: note.trim(), date: new Date().toISOString() })
  })

  reopenButton?.addEventListener('click', () => {
    if (!window.confirm('Oznaczyć pozycję jako aktywną?')) {
      return
    }
    applyState(false, { note: '', date: '' })
  })
}

function setupStatusForm() {
  const form = document.querySelector<HTMLFormElement>('#status-update-form')
  if (!form) {
    return
  }

  const submitButton = form.querySelector<HTMLButtonElement>('button[type="submit"]')

  form.addEventListener('submit', async event => {
    event.preventDefault()
    const formData = new FormData(form)

    const title = (formData.get('title') as string)?.trim()
    const date = formData.get('date') as string
    const importance = formData.get('importance') as StatusUpdate['importance']
    const summary = (formData.get('summary') as string)?.trim()

    if (!title || !date || !summary) {
      alert('Uzupełnij wszystkie pola aktualności.')
      return
    }

    const publishedOn = date || new Date().toISOString().slice(0, 10)

    try {
      if (submitButton) {
        submitButton.disabled = true
        submitButton.textContent = 'Dodawanie...'
      }

      const news = await createNews({
        title,
        summary,
        importance,
        publishedOn,
      })

      const normalizedDate = news.publishedOn ? news.publishedOn.slice(0, 10) : publishedOn

      const update: StatusUpdate = {
        id: news.id,
        title: news.title,
        date: normalizedDate,
        importance: news.importance,
        summary: news.summary,
      }

      updateStatusUpdate(update)
      refreshAdminNewsPreview()
      alert('Dodano nową aktualność.')
      form.reset()
      const dateInput = form.querySelector<HTMLInputElement>('input[name="date"]')
      if (dateInput) {
        dateInput.value = new Date().toISOString().slice(0, 10)
      }
      await syncStatusUpdatesFromApi({ force: true })
    } catch (error) {
      console.error('Nie udało się dodać aktualności:', error)
      const message = error instanceof Error ? error.message : 'Nie udało się dodać aktualności.'
      alert(message)
    } finally {
      if (submitButton) {
        submitButton.disabled = false
        submitButton.textContent = 'Dodaj aktualność'
      }
    }
  })
}

function renderAdminNewsList(updates: StatusUpdate[]): string {
  if (!updates.length) {
    return '<p class="empty-state">Brak dodanych aktualności.</p>'
  }

  return `<ul class="admin-news-list">
    ${updates
      .slice(0, 5)
      .map(
        update => `
          <li>
            <div class="admin-news-item">
              <span class="admin-news-date">${formatDate(update.date)}</span>
              <span class="admin-news-title">${update.title}</span>
              <span class="admin-news-badge ${update.importance}">${getImportanceLabel(update.importance)}</span>
            </div>
            <div class="admin-news-actions">
              <button type="button" class="admin-news-edit" data-news-id="${update.id}">Edytuj</button>
              <button type="button" class="admin-news-delete" data-news-id="${update.id}">Usuń</button>
            </div>
          </li>
        `,
      )
      .join('')}
  </ul>`
}

function refreshAdminNewsPreview(): void {
  const wrapper = document.querySelector<HTMLDivElement>('#admin-news-wrapper')
  if (!wrapper) {
    return
  }
  const updates = getStatusUpdates()
  wrapper.innerHTML = renderAdminNewsList(updates)
}

function bindAdminNewsActions(): void {
  const wrapper = document.querySelector<HTMLDivElement>('#admin-news-wrapper')
  if (!wrapper) {
    adminNewsHandlerAttached = false
    adminNewsActionsTarget?.removeEventListener('click', handleAdminNewsClick)
    adminNewsActionsTarget = null
    return
  }

  if (adminNewsActionsTarget === wrapper && adminNewsHandlerAttached) {
    return
  }

  adminNewsActionsTarget?.removeEventListener('click', handleAdminNewsClick)
  adminNewsActionsTarget = wrapper
  wrapper.addEventListener('click', handleAdminNewsClick)
  adminNewsHandlerAttached = true
}

async function handleAdminNewsClick(event: Event) {
  const deleteTarget = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('.admin-news-delete')
  if (deleteTarget) {
    await handleDeleteNews(deleteTarget)
    return
  }

  const editTarget = (event.target as HTMLElement | null)?.closest<HTMLButtonElement>('.admin-news-edit')
  if (editTarget) {
    await handleEditNews(editTarget)
  }
}

async function handleDeleteNews(target: HTMLButtonElement) {
  const newsId = target.dataset.newsId
  if (!newsId) {
    return
  }

  const confirmed = window.confirm('Na pewno chcesz usunąć tę aktualność?')
  if (!confirmed) {
    return
  }

  const originalText = target.textContent
  target.disabled = true
  target.textContent = 'Usuwanie...'

  try {
    await deleteNews(newsId)
    removeStatusUpdate(newsId)
    refreshAdminNewsPreview()
    await syncStatusUpdatesFromApi({ force: true })
  } catch (error) {
    console.error('Nie udało się usunąć aktualności:', error)
    const message = error instanceof Error ? error.message : 'Nie udało się usunąć aktualności.'
    alert(message)
  } finally {
    target.disabled = false
    target.textContent = originalText ?? 'Usuń'
  }
}

async function handleEditNews(target: HTMLButtonElement) {
  const newsId = target.dataset.newsId
  if (!newsId) {
    return
  }

  const updates = getStatusUpdates()
  const existing = updates.find(item => item.id === newsId)
  if (!existing) {
    alert('Nie znaleziono aktualności do edycji.')
    return
  }

  openAdminNewsModal(existing)
}

async function syncStatusUpdatesFromApi(options: { force?: boolean } = {}): Promise<void> {
  if (isSyncingNews) {
    return
  }
  if (hasInitialNewsSync && !options.force) {
    return
  }

  const wrapper = document.querySelector<HTMLDivElement>('#admin-news-wrapper')
  if (wrapper && !wrapper.dataset.loading) {
    wrapper.dataset.loading = 'true'
    wrapper.innerHTML = '<p class="empty-state">Ładowanie aktualności...</p>'
  }

  isSyncingNews = true
  try {
    const updates = await fetchStatusUpdates(30)
    replaceStatusUpdates(updates)
    hasInitialNewsSync = true
  } catch (error) {
    console.error('Nie udało się pobrać aktualności:', error)
  } finally {
    isSyncingNews = false
    if (wrapper) {
      delete wrapper.dataset.loading
    }
    refreshAdminNewsPreview()
  }
}

function renderAnalysisForm(positionId: string): string {
  const analysis = getTechnicalAnalysis(positionId) || createEmptyAnalysis()
  const position = getPositions().find(item => item.id === positionId)
  if (!position) {
    return '<p class="empty-state">Nie znaleziono pozycji.</p>'
  }

  const targets = analysis.targets ?? {}
  const isClosed = analysis.positionClosed ?? false
  const closedNote = analysis.positionClosedNote ?? ''
  const closedDate = analysis.positionClosedDate ?? ''

  return `
    <form class="admin-form analysis-edit-form" data-position-id="${positionId}" data-database-id="${position.databaseId ?? ''}">
      <div class="analysis-form-title">
        <h3>${position.name}</h3>
        <div class="analysis-form-meta">
          <span class="admin-analysis-symbol">${position.symbol}</span>
          <span class="position-type-badge ${position.positionType}">
            ${position.positionType === 'short' ? 'SHORT' : 'LONG'}
          </span>
          ${renderPositionValueBadge(position)}
        </div>
      </div>
      <div class="form-grid">
        <label class="form-field">
          <span>Trend</span>
          <select name="trend" required>
            ${renderTrendOption('bullish', 'Wzrostowy', analysis.trend)}
            ${renderTrendOption('neutral', 'Neutralny', analysis.trend)}
            ${renderTrendOption('bearish', 'Spadkowy', analysis.trend)}
          </select>
        </label>
        <label class="form-field">
          <span>Strategia wejścia</span>
          <select name="entryStrategy" required>
            <option value="level" ${analysis.entryStrategy === 'level' ? 'selected' : ''}>Wejście z poziomu</option>
            <option value="candlePattern" ${analysis.entryStrategy === 'candlePattern' ? 'selected' : ''}>Formacja świecowa</option>
            <option value="formationRetest" ${analysis.entryStrategy === 'formationRetest' ? 'selected' : ''}>Retest formacji</option>
          </select>
        </label>
        <label class="form-field with-tooltip">
          <span>Symbol TradingView</span>
          <input type="text" name="quoteSymbol" placeholder="np. NASDAQ:NDX" />
          <span class="form-tooltip" role="tooltip">
            Możesz użyć prefiksów:
            <ul>
              <li><code>ALPHA:CL=F</code> – kurs z Alpha Vantage (wymaga klucza)</li>
              <li><code>TVC:USOIL</code> – kurs z TradingView</li>
            </ul>
          </span>
        </label>
        <label class="form-field">
          <span>TP1</span>
          <input type="text" name="tp1" value="${targets.tp1 ?? ''}" placeholder="np. 450 USD" />
        </label>
        <label class="form-field">
          <span>TP2</span>
          <input type="text" name="tp2" value="${targets.tp2 ?? ''}" placeholder="np. 470 USD" />
        </label>
        <label class="form-field">
          <span>TP3</span>
          <input type="text" name="tp3" value="${targets.tp3 ?? ''}" placeholder="np. 490 USD" />
        </label>
        <label class="form-field">
          <span>Stop loss (SL)</span>
          <input type="text" name="stopLoss" required value="${analysis.stopLoss ?? ''}" placeholder="np. 410 USD" />
        </label>
        <label class="form-field">
          <span>Obraz analizy</span>
          <input type="file" name="analysisImage" accept="image/*" />
          <input type="hidden" name="currentImage" value="${analysis.analysisImage ?? ''}" />
        </label>
      </div>
      ${
        analysis.analysisImage
          ? `<div class="analysis-image-preview">
              <img src="${analysis.analysisImage}" alt="Analiza techniczna" loading="lazy" />
            </div>`
          : ''
      }
      <label class="form-field">
        <span>Podsumowanie</span>
        <textarea name="summary" rows="4" required>${analysis.summary ?? ''}</textarea>
      </label>
      <div class="analysis-completion">
        <div class="form-grid columns-3">
          <label class="checkbox">
            <input type="checkbox" name="completed" ${analysis.completed ? 'checked' : ''} />
            <span>Analiza zrealizowana</span>
          </label>
          <label class="form-field">
            <span>Powód realizacji</span>
            <textarea name="completionNote" rows="3" placeholder="Dlaczego uznajemy analizę za zrealizowaną?">${analysis.completionNote ?? ''}</textarea>
          </label>
          <label class="form-field">
            <span>Data realizacji</span>
            <input type="date" name="completionDate" value="${
              analysis.completed && analysis.completionDate ? analysis.completionDate.slice(0, 10) : ''
            }" />
          </label>
        </div>
        ${
          analysis.completed && analysis.completionDate
            ? `<p class="analysis-info">Zrealizowano: ${formatDate(analysis.completionDate)}</p>`
            : ''
        }
      </div>
      <div class="analysis-closure" data-closed="${isClosed ? 'true' : 'false'}">
        <div class="form-grid columns-3">
          <input type="hidden" name="positionClosed" value="${isClosed ? 'true' : 'false'}" />
          <input type="hidden" name="positionClosedDate" value="${closedDate}" />
          <label class="form-field closure-note">
            <span>Informacja o zamknięciu</span>
            <textarea
              name="positionClosedNote"
              rows="3"
              ${isClosed ? '' : 'disabled'}
              placeholder="Dlaczego pozycja została zamknięta?">${closedNote}</textarea>
          </label>
          <label class="form-field">
            <span>Data zamknięcia</span>
            <input type="date" name="positionClosedDateInput" value="${
              isClosed && closedDate ? closedDate.slice(0, 10) : ''
            }" ${isClosed ? '' : 'disabled'} />
          </label>
          <div class="analysis-closure-actions">
            <button type="button" class="secondary close-analysis-button" ${isClosed ? 'hidden' : ''}>
              Zamknij pozycję
            </button>
            <button type="button" class="ghost reopen-closure-button" ${isClosed ? '' : 'hidden'}>
              Oznacz jako aktywną
            </button>
            <p class="analysis-info closure-info">
              ${isClosed && closedDate ? `Zamknięto: ${formatDate(closedDate)}` : ''}
            </p>
          </div>
        </div>
      </div>
      <div class="admin-form-actions has-secondary">
        <div class="actions-left">
          <button type="button" class="secondary preview-analysis-button">Podgląd widoku</button>
        </div>
        <div class="actions-right">
          <button type="button" class="secondary danger delete-analysis-button">Usuń analizę</button>
          <button type="button" class="secondary danger delete-position-button">Usuń pozycję</button>
          <button type="submit" class="secondary">Zapisz zmiany</button>
        </div>
      </div>
    </form>
  `
}

function createEmptyAnalysis(): TechnicalAnalysis {
  return {
    trend: 'neutral',
    targets: {},
    stopLoss: '',
    summary: '',
    positionClosed: false,
    entryStrategy: 'level',
  }
}

function renderTrendOption(value: TrendOption, label: string, current?: TrendOption): string {
  return `<option value="${value}" ${current === value ? 'selected' : ''}>${label}</option>`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) {
    return dateString
  }
  return date.toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function getImportanceLabel(importance: StatusUpdate['importance']): string {
  const labels: Record<StatusUpdate['importance'], string> = {
    critical: 'Pilne',
    important: 'Ważne',
    informational: 'Informacyjne',
  }
  return labels[importance]
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = error => reject(error)
    reader.readAsDataURL(file)
  })
}

function bindAnalysisPreview(form: HTMLFormElement) {
  const previewButton = form.querySelector<HTMLButtonElement>('.preview-analysis-button')
  previewButton?.addEventListener('click', async event => {
    event.preventDefault()
    await openAnalysisPreview(form)
  })
}

async function openAnalysisPreview(form: HTMLFormElement) {
  const positionId = form.dataset.positionId
  if (!positionId) {
    alert('Nie udało się odnaleźć pozycji do podglądu.')
    return
  }

  const position = getPositions().find(item => item.id === positionId)
  if (!position) {
    alert('Nie znaleziono pozycji do podglądu.')
    return
  }

  const formData = new FormData(form)
  const tp1 = (formData.get('tp1') as string)?.trim()
  const tp2 = (formData.get('tp2') as string)?.trim()
  const tp3 = (formData.get('tp3') as string)?.trim()
  const positionClosed = (formData.get('positionClosed') as string) === 'true'
  const positionClosedNote = (formData.get('positionClosedNote') as string)?.trim() ?? ''
  const positionClosedDateExplicit = (formData.get('positionClosedDateInput') as string)?.trim() ?? ''

  let analysisImage = (formData.get('currentImage') as string) || undefined
  const analysisImageFile = formData.get('analysisImage') as File | null
  if (analysisImageFile && analysisImageFile.size > 0) {
    try {
      analysisImage = await readFileAsDataURL(analysisImageFile)
    } catch (error) {
      console.error('Nie udało się odczytać pliku do podglądu analizy:', error)
    }
  }

  const analysis: TechnicalAnalysis = {
    trend: (formData.get('trend') as TrendOption) ?? 'neutral',
    targets: {
      ...(tp1 ? { tp1 } : {}),
      ...(tp2 ? { tp2 } : {}),
      ...(tp3 ? { tp3 } : {}),
    },
    stopLoss: (formData.get('stopLoss') as string)?.trim(),
    summary: (formData.get('summary') as string)?.trim() ?? '',
    analysisImage,
    completed: formData.get('completed') === 'on',
    completionNote: (formData.get('completionNote') as string)?.trim() || undefined,
    completionDate: undefined,
    positionClosed,
    positionClosedNote: positionClosed ? positionClosedNote || undefined : undefined,
    positionClosedDate: positionClosed
      ? positionClosedDateExplicit || new Date().toISOString()
      : undefined,
  }

  document.querySelectorAll('.analysis-preview-overlay').forEach(node => node.remove())

  const overlay = document.createElement('div')
  overlay.className = 'analysis-preview-overlay'
  overlay.innerHTML = buildAnalysisPreviewHtml(position, analysis)
  overlay.addEventListener('click', event => {
    if (event.target instanceof HTMLElement && (event.target.classList.contains('close-preview') || event.target === overlay)) {
      overlay.remove()
    }
  })

  document.body.appendChild(overlay)
}

function buildAnalysisPreviewHtml(
  position: Position,
  analysis: TechnicalAnalysis,
): string {
  const trendClass = analysis.trend === 'bullish' ? 'positive' : analysis.trend === 'bearish' ? 'negative' : 'neutral'
  const trendLabel = getTrendLabel(analysis.trend ?? 'neutral')
  const typeLabel = position.positionType === 'short' ? 'SHORT' : 'LONG'
  const isClosed = analysis.positionClosed ?? false
  const closedDateLabel =
    isClosed && analysis.positionClosedDate ? formatDate(analysis.positionClosedDate) : undefined
  const positionValueLabel = getPositionValueLabel(position)

  return `
    <div class="analysis-preview-modal">
      <button type="button" class="close-preview" aria-label="Zamknij podgląd">×</button>
      <header class="analysis-preview-header">
        <div class="preview-titles">
          <h2>${position.name}</h2>
          <div class="preview-meta">
            <span class="preview-symbol">${position.symbol}</span>
            <span class="preview-type ${position.positionType}">${typeLabel}</span>
            <span class="preview-category">${position.categoryName}</span>
            ${positionValueLabel ? `<span class="preview-position-value">Wartość: ${positionValueLabel}</span>` : ''}
          </div>
          ${
            isClosed
              ? `<span class="preview-status closed">
                  Pozycja zamknięta${closedDateLabel ? ` • ${closedDateLabel}` : ''}
                </span>`
              : ''
          }
        </div>
      </header>
      <div class="analysis-preview-body">
        <section class="preview-section">
          <h3>Analiza techniczna</h3>
          <div class="preview-grid">
            <article class="preview-card">
              <span class="preview-label">Trend</span>
              <span class="preview-value ${trendClass}">${trendLabel}</span>
            </article>
            ${renderPreviewTarget('TP1', analysis.targets?.tp1)}
            ${renderPreviewTarget('TP2', analysis.targets?.tp2)}
            ${renderPreviewTarget('TP3', analysis.targets?.tp3)}
            <article class="preview-card">
              <span class="preview-label">Stop loss</span>
              <span class="preview-value">${analysis.stopLoss || '—'}</span>
            </article>
            <article class="preview-card">
              <span class="preview-label">Strategia wejścia</span>
              <span class="preview-value">${renderEntryStrategyLabel(analysis.entryStrategy)}</span>
            </article>
          </div>
          <div class="preview-summary">
            <h4>Podsumowanie</h4>
            <p>${analysis.summary || 'Brak opisu'}</p>
            ${
              analysis.completed && analysis.completionNote
                ? `<p class="preview-completion">Zrealizowano: ${analysis.completionNote}</p>`
                : ''
            }
            ${
              isClosed
                ? `<p class="preview-closure">${
                    analysis.positionClosedNote
                      ? `Zamknięcie: ${analysis.positionClosedNote}`
                      : 'Pozycja została zamknięta.'
                  }</p>`
                : ''
            }
          </div>
          ${
            analysis.analysisImage
              ? `<figure class="preview-figure">
                  <img src="${analysis.analysisImage}" alt="Podgląd analizy" />
                  <figcaption>Załączony obraz analizy</figcaption>
                </figure>`
              : ''
          }
        </section>
      </div>
    </div>
  `
}

function renderPreviewTarget(label: string, value?: string): string {
  return `
    <article class="preview-card">
      <span class="preview-label">${label}</span>
      <span class="preview-value">${value || '—'}</span>
    </article>
  `
}

function getTrendLabel(trend: TrendOption): string {
  const labels: Record<TrendOption, string> = {
    bullish: 'Wzrostowy',
    neutral: 'Neutralny',
    bearish: 'Spadkowy',
  }
  return labels[trend]
}

function initAdminNewsModal(): void {
  modalElement = document.querySelector<HTMLDivElement>('#admin-news-modal')
  modalForm = document.querySelector<HTMLFormElement>('#admin-news-edit-form')
  modalCloseBtn = document.querySelector<HTMLButtonElement>('#admin-news-modal-close')
  modalCancelBtn = document.querySelector<HTMLButtonElement>('#admin-news-modal-cancel')

  if (!modalElement || !modalForm) {
    return
  }

  modalForm.addEventListener('submit', async event => {
    event.preventDefault()
    const formData = new FormData(modalForm!)
    const id = formData.get('id') as string
    if (!id) {
      alert('Brak identyfikatora aktualności.')
      return
    }

    const title = (formData.get('title') as string)?.trim()
    const summary = (formData.get('summary') as string)?.trim()
    const date = formData.get('date') as string
    const importance = formData.get('importance') as StatusUpdate['importance']

    if (!title || !summary || !date || !importance) {
      alert('Uzupełnij wszystkie pola formularza.')
      return
    }

    try {
      setModalSubmitting(true)
      const updated = await updateNews(id, {
        title,
        summary,
        publishedOn: date,
        importance,
      })

      updateStatusUpdate(id, {
        title: updated.title,
        summary: updated.summary,
        date: updated.publishedOn.slice(0, 10),
        importance: updated.importance,
      })
      refreshAdminNewsPreview()
      await syncStatusUpdatesFromApi({ force: true })
      closeAdminNewsModal()
    } catch (error) {
      console.error('Nie udało się zaktualizować aktualności:', error)
      const message = error instanceof Error ? error.message : 'Nie udało się zaktualizować aktualności.'
      alert(message)
    } finally {
      setModalSubmitting(false)
    }
  })

  modalCloseBtn?.addEventListener('click', () => closeAdminNewsModal())
  modalCancelBtn?.addEventListener('click', () => closeAdminNewsModal())

  modalElement.addEventListener('click', event => {
    if (event.target === modalElement) {
      closeAdminNewsModal()
    }
  })
}

function openAdminNewsModal(update: StatusUpdate): void {
  if (!modalElement || !modalForm) {
    return
  }
  modalElement.hidden = false
  modalElement.classList.add('open')
  const idInput = modalForm.querySelector<HTMLInputElement>('input[name="id"]')
  const titleInput = modalForm.querySelector<HTMLInputElement>('input[name="title"]')
  const summaryInput = modalForm.querySelector<HTMLTextAreaElement>('textarea[name="summary"]')
  const dateInput = modalForm.querySelector<HTMLInputElement>('input[name="date"]')
  const importanceSelect = modalForm.querySelector<HTMLSelectElement>('select[name="importance"]')

  if (idInput) idInput.value = update.id
  if (titleInput) titleInput.value = update.title
  if (summaryInput) summaryInput.value = update.summary
  if (dateInput) dateInput.value = update.date
  if (importanceSelect) importanceSelect.value = update.importance
}

function closeAdminNewsModal(): void {
  if (!modalElement || !modalForm) {
    return
  }
  modalElement.classList.remove('open')
  modalElement.hidden = true
  modalForm.reset()
}

function setModalSubmitting(submitting: boolean): void {
  if (!modalForm) {
    return
  }
  const submitButton = modalForm.querySelector<HTMLButtonElement>('button[type="submit"]')
  if (submitButton) {
    submitButton.disabled = submitting
    submitButton.textContent = submitting ? 'Zapisywanie...' : 'Zapisz zmiany'
  }
}

function getStoredActiveAnalysisPosition(positions: Position[]): string {
  if (typeof window === 'undefined') {
    return positions[0]?.id ?? ''
  }
  const stored = window.sessionStorage.getItem(ACTIVE_ANALYSIS_STORAGE_KEY)
  if (stored && positions.some(position => position.id === stored)) {
    return stored
  }
  const fallback = positions[0]?.id ?? ''
  if (fallback) {
    window.sessionStorage.setItem(ACTIVE_ANALYSIS_STORAGE_KEY, fallback)
  } else {
    window.sessionStorage.removeItem(ACTIVE_ANALYSIS_STORAGE_KEY)
  }
  return fallback
}

function setStoredActiveAnalysisPosition(positionId: string) {
  if (typeof window === 'undefined') {
    return
  }
  if (positionId) {
    window.sessionStorage.setItem(ACTIVE_ANALYSIS_STORAGE_KEY, positionId)
  } else {
    window.sessionStorage.removeItem(ACTIVE_ANALYSIS_STORAGE_KEY)
  }
}

async function refreshPositionsFromBackend(): Promise<void> {
  if (isRefreshingPositions) {
    return
  }

  isRefreshingPositions = true
  try {
    const updatedPositions = await fetchPositionsFromApi()
    if (Array.isArray(updatedPositions)) {
      replacePositions(updatedPositions)
    }
  } catch (error) {
    console.error('Nie udało się odświeżyć pozycji:', error)
  } finally {
    isRefreshingPositions = false
  }
}

function renderEntryStrategyLabel(entryStrategy: TechnicalAnalysis['entryStrategy']): string {
  switch (entryStrategy) {
    case 'candlePattern':
      return 'Formacja świecowa'
    case 'formationRetest':
      return 'Retest formacji'
    case 'level':
    default:
      return 'Wejście z poziomu'
  }
}

function getPositionValueLabel(position: Position): string | null {
  if (position.positionTotalValueLabel) {
    return position.positionTotalValueLabel
  }
  if (
    position.positionSizeType === 'pips' &&
    typeof position.positionSizeValue === 'number' &&
    position.positionSizePerPipLabel
  ) {
    return `${position.positionSizeValue} × ${position.positionSizePerPipLabel}`
  }
  if (position.positionSizeType === 'units' && typeof position.positionSizeValue === 'number') {
    return `${position.positionSizeValue} × ${position.purchasePrice}`
  }
  if (position.positionSizeType === 'capital' && position.positionSizeLabel) {
    return position.positionSizeLabel
  }
  return null
}

function renderPositionValueBadge(position: Position): string {
  const label = getPositionValueLabel(position)
  return label ? `<span class="position-value-badge">Wartość: ${label}</span>` : ''
}

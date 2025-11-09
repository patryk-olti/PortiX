import {
  addPosition,
  addStatusUpdate,
  getPositions,
  getStatusUpdates,
  getTechnicalAnalysis,
  upsertTechnicalAnalysis,
} from './store'
import type { StatusUpdate, TechnicalAnalysis } from './types'

const categoryOptions = [
  { value: 'stock', label: 'Akcje' },
  { value: 'commodity', label: 'Surowiec' },
  { value: 'hedge', label: 'Zabezpieczenie' },
  { value: 'cash', label: 'Gotówka' },
] as const

type CategoryOption = (typeof categoryOptions)[number]['value']

export function renderAdmin(): string {
  const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true'
  const username = localStorage.getItem('adminUsername') || 'Administrator'

  if (!isAuthenticated) {
    window.location.hash = '#/login'
    return ''
  }

  const positions = getPositions()
  const statusUpdates = getStatusUpdates()

  return `
    <nav class="detail-nav">
      <div class="admin-nav-header">
        <a href="#/" class="back-link">
          <span class="back-icon">←</span>
          Powrót do portfela
        </a>
        <button class="logout-button" id="logout-button">Wyloguj się</button>
      </div>
    </nav>

    <main class="page admin-page">
      <section class="admin-header">
        <div class="admin-title">
          <h1>Panel administratora</h1>
          <p class="admin-subtitle">Witaj, ${username}</p>
        </div>
      </section>

      <section class="admin-create-position">
        <div class="section-header">
          <h2>Dodaj nową pozycję z analizą</h2>
          <p>Uzupełnij szczegóły pozycji oraz podstawową analizę techniczną.</p>
        </div>
        <form class="admin-form" id="create-position-form">
          <fieldset class="admin-form-fieldset">
            <legend>Dane pozycji</legend>
            <div class="form-grid">
              <label class="form-field">
                <span>Nazwa pozycji</span>
                <input type="text" name="name" required placeholder="np. Nasdaq 100" />
              </label>
              <label class="form-field">
                <span>Symbol</span>
                <input type="text" name="symbol" required placeholder="np. NDX" />
              </label>
              <label class="form-field">
                <span>Kategoria</span>
                <select name="category" required>
                  ${categoryOptions
                    .map(option => `<option value="${option.value}">${option.label}</option>`)
                    .join('')}
                </select>
              </label>
              <label class="form-field">
                <span>Cena zakupu</span>
                <input type="text" name="purchasePrice" required placeholder="np. 420 USD" />
              </label>
              <label class="form-field">
                <span>Aktualna cena</span>
                <input type="text" name="currentPrice" required placeholder="np. 455 USD" />
              </label>
              <label class="form-field">
                <span>Zwrot (%)</span>
                <input type="number" step="0.1" name="returnValue" required placeholder="np. 4.2" />
              </label>
            </div>
          </fieldset>

          <fieldset class="admin-form-fieldset">
            <legend>Analiza techniczna</legend>
            <div class="form-grid">
              <label class="form-field">
                <span>Trend</span>
                <select name="trend" required>
                  <option value="bullish">Wzrostowy</option>
                  <option value="neutral">Neutralny</option>
                  <option value="bearish">Spadkowy</option>
                </select>
              </label>
              <label class="form-field">
                <span>Wsparcie</span>
                <input type="text" name="support" required placeholder="np. 450 USD" />
              </label>
              <label class="form-field">
                <span>Opór</span>
                <input type="text" name="resistance" required placeholder="np. 480 USD" />
              </label>
              <label class="form-field">
                <span>RSI</span>
                <input type="number" name="rsi" min="0" max="100" required placeholder="np. 62" />
              </label>
              <label class="form-field">
                <span>MACD</span>
                <input type="text" name="macd" required placeholder="np. Bullish crossover" />
              </label>
              <label class="form-field">
                <span>Średnia krocząca</span>
                <input type="text" name="movingAverage" required placeholder="np. Cena powyżej 50 MA" />
              </label>
            </div>
            <label class="form-field">
              <span>Podsumowanie</span>
              <textarea name="summary" rows="4" required placeholder="Krótki opis sytuacji technicznej"></textarea>
            </label>
          </fieldset>

          <div class="admin-form-actions">
            <button type="submit" class="primary">Dodaj pozycję</button>
          </div>
        </form>
      </section>

      <section class="admin-analyses">
        <div class="section-header">
          <h2>Zarządzaj analizami</h2>
          <p>Aktualizuj parametry techniczne, oznacz analizy jako zrealizowane i dodawaj notatki.</p>
        </div>
        <div class="admin-analyses-list">
          ${positions
            .map(position => {
              const analysis = getTechnicalAnalysis(position.id) || createEmptyAnalysis()
              return `
              <article class="admin-analysis-card">
                <header class="admin-analysis-header">
                  <div>
                    <h3>${position.name}</h3>
                    <span class="admin-analysis-symbol">${position.symbol}</span>
                  </div>
                  <span class="admin-analysis-category">${getCategoryLabel(position.category)}</span>
                </header>
                <form class="analysis-form" data-position-id="${position.id}">
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
                      <span>Wsparcie</span>
                      <input type="text" name="support" required value="${analysis.support ?? ''}" />
                    </label>
                    <label class="form-field">
                      <span>Opór</span>
                      <input type="text" name="resistance" required value="${analysis.resistance ?? ''}" />
                    </label>
                    <label class="form-field">
                      <span>RSI</span>
                      <input type="number" name="rsi" min="0" max="100" required value="${analysis.indicators?.rsi ?? ''}" />
                    </label>
                    <label class="form-field">
                      <span>MACD</span>
                      <input type="text" name="macd" required value="${analysis.indicators?.macd ?? ''}" />
                    </label>
                    <label class="form-field">
                      <span>Średnia krocząca</span>
                      <input type="text" name="movingAverage" required value="${analysis.indicators?.movingAverage ?? ''}" />
                    </label>
                  </div>
                  <label class="form-field">
                    <span>Podsumowanie</span>
                    <textarea name="summary" rows="4" required>${analysis.summary ?? ''}</textarea>
                  </label>
                  <div class="analysis-completion">
                    <label class="checkbox">
                      <input type="checkbox" name="completed" ${analysis.completed ? 'checked' : ''} />
                      <span>Analiza zrealizowana</span>
                    </label>
                    <label class="form-field">
                      <span>Powód realizacji</span>
                      <textarea name="completionNote" rows="3" placeholder="Dlaczego uznajemy analizę za zrealizowaną?">${analysis.completionNote ?? ''}</textarea>
                    </label>
                    ${
                      analysis.completed && analysis.completionDate
                        ? `<p class="analysis-info">Zrealizowano: ${formatDate(analysis.completionDate)}</p>`
                        : ''
                    }
                  </div>
                  <div class="admin-form-actions">
                    <button type="submit" class="secondary">Zapisz zmiany</button>
                  </div>
                </form>
              </article>
            `
            })
            .join('')}
        </div>
      </section>

      <section class="admin-news">
        <div class="section-header">
          <h2>Aktualności statusu projektu</h2>
          <p>Dodaj komunikaty, które pojawią się w sekcji statusu projektu.</p>
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
          <ul class="admin-news-list">
            ${statusUpdates
              .slice(0, 5)
              .map(
                update => `
              <li>
                <span class="admin-news-date">${formatDate(update.date)}</span>
                <span class="admin-news-title">${update.title}</span>
                <span class="admin-news-badge ${update.importance}">${getImportanceLabel(update.importance)}</span>
              </li>
            `,
              )
              .join('')}
          </ul>
        </div>
      </section>
    </main>
  `
}

export function setupAdminHandlers(): void {
  const logoutButton = document.querySelector<HTMLButtonElement>('#logout-button')
  logoutButton?.addEventListener('click', () => {
    localStorage.removeItem('adminAuthenticated')
    localStorage.removeItem('adminUsername')
    window.location.hash = '#/login'
  })

  const createPositionForm = document.querySelector<HTMLFormElement>('#create-position-form')
  createPositionForm?.addEventListener('submit', event => {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    const formData = new FormData(form)

    const name = (formData.get('name') as string).trim()
    const symbol = ((formData.get('symbol') as string) || '').trim().toUpperCase()
    const category = formData.get('category') as CategoryOption
    const purchasePrice = (formData.get('purchasePrice') as string).trim()
    const currentPrice = (formData.get('currentPrice') as string).trim()
    const returnValueRaw = Number(formData.get('returnValue'))

    if (!name || !symbol || Number.isNaN(returnValueRaw)) {
      alert('Uzupełnij poprawnie wszystkie pola formularza.')
      return
    }

    const id = symbol.toLowerCase()
    if (getPositions().some(position => position.id === id)) {
      alert('Pozycja o tym symbolu już istnieje. Wybierz inny symbol.')
      return
    }

    const analysisTrend = formData.get('trend') as TechnicalAnalysis['trend']
    const analysisSupport = (formData.get('support') as string).trim()
    const analysisResistance = (formData.get('resistance') as string).trim()
    const analysisRSI = Number(formData.get('rsi'))
    const analysisMacd = (formData.get('macd') as string).trim()
    const analysisMa = (formData.get('movingAverage') as string).trim()
    const analysisSummary = (formData.get('summary') as string).trim()

    const position = {
      id,
      symbol,
      name,
      category,
      categoryName: getCategoryLabel(category),
      purchasePrice,
      currentPrice,
      return: formatReturn(returnValueRaw),
      returnValue: returnValueRaw,
    }

    const analysis: TechnicalAnalysis = {
      trend: analysisTrend,
      support: analysisSupport,
      resistance: analysisResistance,
      indicators: {
        rsi: analysisRSI,
        macd: analysisMacd,
        movingAverage: analysisMa,
      },
      summary: analysisSummary,
    }

    addPosition({ position, analysis })
    alert(`Dodano nową pozycję ${name}.`)
    form.reset()
  })

  document.querySelectorAll<HTMLFormElement>('.analysis-form').forEach(form => {
    form.addEventListener('submit', event => {
      event.preventDefault()
      const currentForm = event.currentTarget as HTMLFormElement
      const formData = new FormData(currentForm)
      const positionId = currentForm.dataset.positionId
      if (!positionId) {
        return
      }

      const trend = formData.get('trend') as TechnicalAnalysis['trend']
      const support = (formData.get('support') as string).trim()
      const resistance = (formData.get('resistance') as string).trim()
      const rsi = Number(formData.get('rsi'))
      const macd = (formData.get('macd') as string).trim()
      const movingAverage = (formData.get('movingAverage') as string).trim()
      const summary = (formData.get('summary') as string).trim()
      const completed = formData.get('completed') === 'on'
      const completionNote = (formData.get('completionNote') as string).trim()

      if (completed && !completionNote) {
        alert('Podaj powód oznaczenia analizy jako zrealizowanej.')
        return
      }

      const existingAnalysis = getTechnicalAnalysis(positionId) || createEmptyAnalysis()

      const newAnalysis: TechnicalAnalysis = {
        trend,
        support,
        resistance,
        indicators: {
          rsi,
          macd,
          movingAverage,
        },
        summary,
        completed,
        completionNote: completed ? completionNote : undefined,
        completionDate: completed
          ? existingAnalysis.completed && existingAnalysis.completionDate
            ? existingAnalysis.completionDate
            : new Date().toISOString()
          : undefined,
      }

      upsertTechnicalAnalysis(positionId, newAnalysis)
      alert('Analiza została zaktualizowana.')
    })
  })

  const statusForm = document.querySelector<HTMLFormElement>('#status-update-form')
  statusForm?.addEventListener('submit', event => {
    event.preventDefault()
    const form = event.currentTarget as HTMLFormElement
    const formData = new FormData(form)

    const title = (formData.get('title') as string).trim()
    const date = formData.get('date') as string
    const importance = formData.get('importance') as StatusUpdate['importance']
    const summary = (formData.get('summary') as string).trim()

    if (!title || !date || !summary) {
      alert('Uzupełnij wszystkie pola aktualności.')
      return
    }

    const update: StatusUpdate = {
      id: `status-${Date.now()}`,
      title,
      date,
      importance,
      summary,
    }

    addStatusUpdate(update)
    alert('Dodano nową aktualność.')
    form.reset()
    const dateInput = form.querySelector<HTMLInputElement>('input[name="date"]')
    if (dateInput) {
      dateInput.value = new Date().toISOString().slice(0, 10)
    }
  })
}

function createEmptyAnalysis(): TechnicalAnalysis {
  return {
    trend: 'neutral',
    support: '',
    resistance: '',
    indicators: {
      rsi: 50,
      macd: '',
      movingAverage: '',
    },
    summary: '',
  }
}

function getCategoryLabel(category: CategoryOption): string {
  return categoryOptions.find(option => option.value === category)?.label ?? category
}

function renderTrendOption(value: TechnicalAnalysis['trend'], label: string, current?: TechnicalAnalysis['trend']): string {
  return `<option value="${value}" ${current === value ? 'selected' : ''}>${label}</option>`
}

function formatReturn(value: number): string {
  const formatted = Math.round(value * 10) / 10
  return `${formatted > 0 ? '+' : ''}${formatted}%`
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

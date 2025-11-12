import {
  addPosition,
  addStatusUpdate,
  getPositions,
  getStatusUpdates,
  getTechnicalAnalysis,
  removeStatusUpdate,
  replaceStatusUpdates,
  updateStatusUpdate,
  upsertTechnicalAnalysis,
} from './store'
import type { Position, StatusUpdate, TechnicalAnalysis } from './types'
import { createNews, fetchStatusUpdates, updateNews, deleteNews, createPosition as createPortfolioPosition } from './api'

const categoryOptions = [
  { value: 'stock', label: 'Akcje' },
  { value: 'commodity', label: 'Surowiec' },
  { value: 'hedge', label: 'Zabezpieczenie' },
  { value: 'cash', label: 'Gotówka' },
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
let hasInitialNewsSync = false
let isSyncingNews = false
let adminNewsHandlerAttached = false
let adminNewsActionsTarget: HTMLDivElement | null = null

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
  const initialAnalysisPositionId = positions[0]?.id ?? ''
  const activeSection = getStoredActiveSection()

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
              <div class="form-grid">
                <label class="form-field">
                  <span>Symbol</span>
                  <input type="text" name="symbol" required placeholder="np. NDX" />
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
                  <input type="text" name="purchasePrice" required placeholder="np. 420 USD" />
                </label>
              </div>
            </fieldset>

            <fieldset class="admin-form-fieldset">
              <legend>Analiza techniczna</legend>
              <p class="fieldset-note">
                Wprowadź trend, cele take-profit oraz poziom stop-loss. Opcjonalnie dodaj link do TradingView oraz zrzut ekranu analizy.
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
                  <span>Link TradingView</span>
                  <input type="url" name="tradingViewUrl" placeholder="https://www.tradingview.com/idea/..." />
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
                      .map(({ id, name, symbol }, index) => `
                        <option value="${id}" ${index === 0 ? 'selected' : ''}>${name} (${symbol})</option>
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

  form.addEventListener('submit', async event => {
    event.preventDefault()
    const formData = new FormData(form)

    const symbol = ((formData.get('symbol') as string) || '').trim().toUpperCase()
    const category = formData.get('category') as CategoryOption
    const purchasePrice = (formData.get('purchasePrice') as string)?.trim()
    const trend = formData.get('trend') as TrendOption
    const tp1 = (formData.get('tp1') as string)?.trim()
    const tp2 = (formData.get('tp2') as string)?.trim()
    const tp3 = (formData.get('tp3') as string)?.trim()
    const stopLoss = (formData.get('stopLoss') as string)?.trim()
    const summary = (formData.get('summary') as string)?.trim()
    const analysisImageFile = formData.get('analysisImage') as File | null
    const positionType = (formData.get('positionType') as PositionTypeOption) ?? 'long'
    const tradingViewUrl = (formData.get('tradingViewUrl') as string)?.trim()
    const normalizedTradingViewUrl = normalizeTradingViewUrl(tradingViewUrl)

    if (tradingViewUrl && !normalizedTradingViewUrl) {
      alert('Podany link TradingView jest nieprawidłowy. Sprawdź adres URL.')
      return
    }

    if (!symbol || !purchasePrice || !stopLoss || !summary) {
      alert('Uzupełnij poprawnie wszystkie wymagane pola formularza.')
      return
    }

    const id = symbol.toLowerCase()
    if (getPositions().some(position => position.id === id)) {
      alert('Pozycja o tym symbolu już istnieje. Wybierz inny symbol.')
      return
    }

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
      tradingViewUrl: normalizedTradingViewUrl,
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
      })

      addPosition({ position: createdPosition, analysis })
      alert(`Dodano nową pozycję ${symbol}.`)
      form.reset()
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
  const select = document.querySelector<HTMLSelectElement>('#analysis-position-select')
  const container = document.querySelector<HTMLDivElement>('#analysis-form-container')
  if (!select || !container) {
    return
  }

  const render = (positionId: string) => {
    container.innerHTML = renderAnalysisForm(positionId)
    const form = container.querySelector<HTMLFormElement>('.analysis-edit-form')
    if (form) {
      bindAnalysisForm(form)
    }
  }

  render(select.value)

  select.addEventListener('change', () => {
    render(select.value)
  })
}

function bindAnalysisForm(form: HTMLFormElement) {
  form.addEventListener('submit', async event => {
    event.preventDefault()
    const formData = new FormData(form)
    const positionId = form.dataset.positionId
    if (!positionId) {
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
    const currentImageValue = (formData.get('currentImage') as string) || undefined
    const analysisImageFile = formData.get('analysisImage') as File | null
    const tradingViewUrl = (formData.get('tradingViewUrl') as string)?.trim()
    const normalizedTradingViewUrl = normalizeTradingViewUrl(tradingViewUrl)

    if (tradingViewUrl && !normalizedTradingViewUrl) {
      alert('Podany link TradingView jest nieprawidłowy. Sprawdź adres URL.')
      return
    }

    if (!summary || !stopLoss) {
      alert('Uzupełnij wymagane pola analizy.')
      return
    }

    if (completed && !completionNote) {
      alert('Podaj powód oznaczenia analizy jako zrealizowanej.')
      return
    }

    let analysisImage = currentImageValue
    if (analysisImageFile && analysisImageFile.size > 0) {
      try {
        analysisImage = await readFileAsDataURL(analysisImageFile)
      } catch (error) {
        console.error('Nie udało się odczytać pliku z analizą:', error)
        alert('Nie udało się odczytać załączonego obrazu analizy.')
        return
      }
    }

    const existingAnalysis = getTechnicalAnalysis(positionId) || createEmptyAnalysis()

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
      completionDate: completed
        ? existingAnalysis.completed && existingAnalysis.completionDate
          ? existingAnalysis.completionDate
          : new Date().toISOString()
        : undefined,
      tradingViewUrl: normalizedTradingViewUrl,
    }

    upsertTechnicalAnalysis(positionId, analysis)
    alert('Analiza została zaktualizowana.')
  })

  bindAnalysisPreview(form)
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

      addStatusUpdate(update)
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

  return `
    <form class="admin-form analysis-edit-form" data-position-id="${positionId}">
      <div class="analysis-form-title">
        <h3>${position.name}</h3>
        <div class="analysis-form-meta">
          <span class="admin-analysis-symbol">${position.symbol}</span>
          <span class="position-type-badge ${position.positionType}">
            ${position.positionType === 'short' ? 'SHORT' : 'LONG'}
          </span>
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
          <span>Link TradingView</span>
          <input type="url" name="tradingViewUrl" value="${analysis.tradingViewUrl ?? ''}" placeholder="https://www.tradingview.com/idea/..." />
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
      <div class="admin-form-actions has-secondary">
        <button type="button" class="ghost preview-analysis-button">Podgląd widoku</button>
        <button type="submit" class="secondary">Zapisz zmiany</button>
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
    tradingViewUrl: '',
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

function normalizeTradingViewUrl(value?: string | null): string | undefined {
  if (!value) {
    return undefined
  }
  try {
    const url = new URL(value)
    return url.toString()
  } catch (_error) {
    return undefined
  }
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
  const tradingViewValue = (formData.get('tradingViewUrl') as string)?.trim()
  const normalizedTradingViewUrl = normalizeTradingViewUrl(tradingViewValue)

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
    tradingViewUrl: normalizedTradingViewUrl,
    completed: formData.get('completed') === 'on',
    completionNote: (formData.get('completionNote') as string)?.trim() || undefined,
    completionDate: undefined,
  }

  const warning = tradingViewValue && !normalizedTradingViewUrl
    ? 'Podany link TradingView jest nieprawidłowy. Link nie zostanie wyświetlony w podglądzie.'
    : undefined

  document.querySelectorAll('.analysis-preview-overlay').forEach(node => node.remove())

  const overlay = document.createElement('div')
  overlay.className = 'analysis-preview-overlay'
  overlay.innerHTML = buildAnalysisPreviewHtml(position, analysis, { warning })
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
  options: { warning?: string } = {},
): string {
  const trendClass = analysis.trend === 'bullish' ? 'positive' : analysis.trend === 'bearish' ? 'negative' : 'neutral'
  const trendLabel = getTrendLabel(analysis.trend ?? 'neutral')
  const typeLabel = position.positionType === 'short' ? 'SHORT' : 'LONG'

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
          </div>
        </div>
      </header>
      <div class="analysis-preview-body">
        ${
          options.warning
            ? `<p class="preview-warning">${options.warning}</p>`
            : ''
        }
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
          </div>
          <div class="preview-summary">
            <h4>Podsumowanie</h4>
            <p>${analysis.summary || 'Brak opisu'}</p>
            ${
              analysis.completed && analysis.completionNote
                ? `<p class="preview-completion">Zrealizowano: ${analysis.completionNote}</p>`
                : ''
            }
          </div>
          ${
            analysis.tradingViewUrl
              ? `<div class="preview-tradingview">
                  <h4>TradingView</h4>
                  <iframe src="${analysis.tradingViewUrl}" loading="lazy" title="Podgląd TradingView"></iframe>
                  <a class="preview-link" href="${analysis.tradingViewUrl}" target="_blank" rel="noopener noreferrer">
                    Otwórz analizę w nowej karcie
                  </a>
                </div>`
              : ''
          }
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

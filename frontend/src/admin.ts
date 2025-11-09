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

const sidebarSections = [
  { id: 'create', label: 'Dodaj nową pozycję' },
  { id: 'analyses', label: 'Edycja analiz' },
  { id: 'news', label: 'Aktualności' },
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
  const initialAnalysisPositionId = positions[0]?.id ?? ''

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

    <main class="page admin-page admin-layout">
      <aside class="admin-sidebar">
        <div class="admin-sidebar-header">
          <h1>Panel administratora</h1>
          <p>Witaj, ${username}</p>
        </div>
        <nav class="admin-sidebar-nav">
          ${sidebarSections
            .map(
              (section, index) => `
                <button type="button" class="admin-tab-link ${index === 0 ? 'active' : ''}" data-target="${section.id}">
                  ${section.label}
                </button>
              `,
            )
            .join('')}
        </nav>
      </aside>

      <section class="admin-content">
        <section class="admin-section ${sidebarSections[0].id === 'create' ? 'active' : ''}" data-section="create">
          <div class="section-header">
            <h2>Dodaj nową pozycję</h2>
            <p>Uzupełnij podstawowe dane pozycji oraz scenariusz analizy technicznej.</p>
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
                Ważne: uzupełnij cele TP oraz poziom SL (negacja scenariusza). Możesz dołączyć zrzut ekranu z analizy.
              </p>
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
                <textarea name="summary" rows="4" required placeholder="Krótki opis scenariusza."></textarea>
              </label>
            </fieldset>

            <div class="admin-form-actions">
              <button type="submit" class="primary">Dodaj pozycję</button>
            </div>
          </form>
        </section>

        <section class="admin-section" data-section="analyses">
          <div class="section-header">
            <h2>Edycja analiz</h2>
            <p>Wybierz pozycję i zaktualizuj poziomy docelowe, SL oraz status scenariusza.</p>
          </div>
          ${
            positions.length
              ? `
              <div class="analysis-selector">
                <label class="form-field">
                  <span>Aktywna pozycja</span>
                  <select id="analysis-position-select">
                    ${positions
                      .map(
                        (position, index) => `
                        <option value="${position.id}" ${index === 0 ? 'selected' : ''}>
                          ${position.name} (${position.symbol})
                        </option>
                      `,
                      )
                      .join('')}
                  </select>
                </label>
              </div>
              <div id="analysis-form-container">
                ${initialAnalysisPositionId ? renderAnalysisForm(initialAnalysisPositionId) : ''}
              </div>
            `
              : '<p class="empty-state">Brak pozycji do edycji. Dodaj nową pozycję, aby rozpocząć.</p>'
          }
        </section>

        <section class="admin-section" data-section="news">
          <div class="section-header">
            <h2>Aktualności statusu projektu</h2>
            <p>Dodawaj komunikaty, które pojawią się w sekcji statusu.</p>
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
            ${
              statusUpdates.length
                ? `<ul class="admin-news-list">
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
                  </ul>`
                : '<p class="empty-state">Brak dodanych aktualności.</p>'
            }
          </div>
        </section>
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

  setupSidebarNavigation()
  setupCreatePositionForm()
  setupAnalysisSection()
  setupStatusForm()
}

function setupSidebarNavigation() {
  const links = Array.from(document.querySelectorAll<HTMLButtonElement>('.admin-tab-link'))
  const sections = Array.from(document.querySelectorAll<HTMLElement>('.admin-section'))

  const activate = (target: string) => {
    links.forEach(link => {
      link.classList.toggle('active', link.dataset.target === target)
    })
    sections.forEach(section => {
      section.classList.toggle('active', section.dataset.section === target)
    })
  }

  links.forEach(link => {
    link.addEventListener('click', () => {
      const target = link.dataset.target
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

  form.addEventListener('submit', async event => {
    event.preventDefault()
    const formData = new FormData(form)

    const name = (formData.get('name') as string)?.trim()
    const symbol = ((formData.get('symbol') as string) || '').trim().toUpperCase()
    const category = formData.get('category') as CategoryOption
    const purchasePrice = (formData.get('purchasePrice') as string)?.trim()
    const trend = formData.get('trend') as TechnicalAnalysis['trend']
    const tp1 = (formData.get('tp1') as string)?.trim()
    const tp2 = (formData.get('tp2') as string)?.trim()
    const tp3 = (formData.get('tp3') as string)?.trim()
    const stopLoss = (formData.get('stopLoss') as string)?.trim()
    const summary = (formData.get('summary') as string)?.trim()
    const analysisImageFile = formData.get('analysisImage') as File | null

    if (!name || !symbol || !purchasePrice || !stopLoss || !summary) {
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

    const position = {
      id,
      symbol,
      name,
      category,
      categoryName: getCategoryLabel(category),
      purchasePrice,
      currentPrice: purchasePrice,
      return: formatReturn(0),
      returnValue: 0,
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
    }

    addPosition({ position, analysis })
    alert(`Dodano nową pozycję ${name}.`)
    form.reset()
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

    const trend = formData.get('trend') as TechnicalAnalysis['trend']
    const tp1 = (formData.get('tp1') as string)?.trim()
    const tp2 = (formData.get('tp2') as string)?.trim()
    const tp3 = (formData.get('tp3') as string)?.trim()
    const stopLoss = (formData.get('stopLoss') as string)?.trim()
    const summary = (formData.get('summary') as string)?.trim()
    const completed = formData.get('completed') === 'on'
    const completionNote = (formData.get('completionNote') as string)?.trim()
    const currentImageValue = (formData.get('currentImage') as string) || undefined
    const analysisImageFile = formData.get('analysisImage') as File | null

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
    }

    upsertTechnicalAnalysis(positionId, analysis)
    alert('Analiza została zaktualizowana.')
  })
}

function setupStatusForm() {
  const form = document.querySelector<HTMLFormElement>('#status-update-form')
  if (!form) {
    return
  }

  form.addEventListener('submit', event => {
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
        <span class="admin-analysis-symbol">${position.symbol}</span>
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
      <div class="admin-form-actions">
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
  return `${formatted > 0 ? '+' : ''}${formatted.toFixed(1)}%`
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

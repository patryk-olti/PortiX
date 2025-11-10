import { getStatusUpdates, replaceStatusUpdates } from './store'
import { fetchNews } from './api'
import type { StatusUpdate } from './types'

const UPDATES_PER_PAGE = 6

export function renderStatus(): string {
  const updates = getStatusUpdates()
  const totalPages = Math.ceil(updates.length / UPDATES_PER_PAGE) || 1
  const visibleUpdates = updates.slice(0, UPDATES_PER_PAGE)

  return `
    <main class="page status-page">
      <section class="status-hero">
        <h1>Status projektu PortiX</h1>
        <p>Aktualne informacje o wdrożeniach, planach oraz incydentach.</p>
      </section>

      <section class="status-news">
        <div class="section-header">
          <h2>Aktualności zespołu</h2>
          <p>Najważniejsze wydarzenia dotyczące platformy analitycznej PortiX.</p>
        </div>
        <div
          class="status-news-list"
          data-total-pages="${totalPages}"
        >
          ${renderStatusCards(visibleUpdates)}
        </div>
        <div class="status-pagination">
          <button class="status-page-btn prev" type="button" ${totalPages === 1 ? 'disabled' : ''}>
            Poprzednie
          </button>
          <span class="status-page-indicator">Strona 1 z ${totalPages}</span>
          <button class="status-page-btn next" type="button" ${totalPages === 1 ? 'disabled' : ''}>
            Następne
          </button>
        </div>
      </section>

      <section class="status-help">
        <div class="status-help-card">
          <h2>Potrzebujesz wsparcia?</h2>
          <p>Skontaktuj się z zespołem PortiX, jeśli zauważysz problem lub masz pytania dotyczące roadmapy.</p>
          <div class="status-help-actions">
            <a class="status-action-button" href="mailto:support@portix.io">Napisz do nas</a>
            <a class="status-action-button secondary" href="#/">Powrót do strony głównej</a>
          </div>
        </div>
      </section>
    </main>
  `
}

export function setupStatusHandlers(): void {
  const list = document.querySelector<HTMLDivElement>('.status-news-list')
  const prevButton = document.querySelector<HTMLButtonElement>('.status-page-btn.prev')
  const nextButton = document.querySelector<HTMLButtonElement>('.status-page-btn.next')
  const indicator = document.querySelector<HTMLSpanElement>('.status-page-indicator')

  if (!list || !prevButton || !nextButton || !indicator) {
    return
  }

  let updates = getStatusUpdates()
  let currentPage = 1

  const getTotalPages = () => Math.max(1, Math.ceil(updates.length / UPDATES_PER_PAGE))

  const renderPage = (page: number, shouldScroll = true) => {
    const totalPages = getTotalPages()
    currentPage = Math.min(Math.max(page, 1), totalPages)
    const start = (page - 1) * UPDATES_PER_PAGE
    const pageItems = updates.slice(start, start + UPDATES_PER_PAGE)
    list.innerHTML = renderStatusCards(pageItems)
    const total = getTotalPages()
    indicator.textContent = `Strona ${currentPage} z ${total}`
    prevButton.disabled = currentPage === 1
    nextButton.disabled = currentPage === total
    if (shouldScroll) {
      list.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  prevButton.addEventListener('click', () => {
    if (currentPage > 1) {
      renderPage(currentPage - 1)
    }
  })

  nextButton.addEventListener('click', () => {
    if (currentPage < getTotalPages()) {
      renderPage(currentPage + 1)
    }
  })

  renderPage(1, false)

  void (async () => {
    try {
      list.dataset.loading = 'true'
      if (updates.length === 0) {
        list.innerHTML = '<p class="empty-state">Ładowanie aktualności...</p>'
      }
      const news = await fetchNews(30)
      const normalized: StatusUpdate[] = news.map(item => ({
        id: item.id,
        title: item.title,
        summary: item.summary,
        importance: item.importance,
        date: item.publishedOn ? item.publishedOn.slice(0, 10) : new Date().toISOString().slice(0, 10),
      }))
      replaceStatusUpdates(normalized)
      updates = getStatusUpdates()
      renderPage(1, false)
    } catch (error) {
      console.error('Nie udało się pobrać aktualności:', error)
      if (updates.length === 0) {
        list.innerHTML =
          '<p class="empty-state">Nie udało się załadować aktualności. Spróbuj ponownie później.</p>'
      }
    } finally {
      delete list.dataset.loading
    }
  })()
}

function renderStatusCards(items: StatusUpdate[]): string {
  if (items.length === 0) {
    return '<p class="empty-state">Brak dostępnych aktualności.</p>'
  }

  return items
    .map(
      item => `
        <article class="status-card">
          <header class="status-card-header">
            <time datetime="${item.date}">${formatDate(item.date)}</time>
          </header>
          <h3>${item.title}</h3>
          <p>${item.summary}</p>
          <footer class="status-card-footer">
            <span class="status-impact ${item.importance}">${getImportanceLabel(item.importance)}</span>
          </footer>
        </article>
      `,
    )
    .join('')
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

import { getStatusUpdates, replaceStatusUpdates } from './store'
import { fetchStatusUpdates } from './api'
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
            <button type="button" class="status-action-button secondary" data-target="#/">Powrót do strony głównej</button>
          </div>
        </div>
      </section>
    </main>
  `
}

export function setupStatusHandlers(): void {
  // Only setup handlers if we're actually on the status page
  // Check if status page elements exist
  const statusPage = document.querySelector<HTMLElement>('.status-page')
  if (!statusPage) {
    return
  }
  
  const list = document.querySelector<HTMLDivElement>('.status-news-list')
  const prevButton = document.querySelector<HTMLButtonElement>('.status-page-btn.prev')
  const nextButton = document.querySelector<HTMLButtonElement>('.status-page-btn.next')
  const indicator = document.querySelector<HTMLSpanElement>('.status-page-indicator')

  if (!list || !prevButton || !nextButton || !indicator) {
    return
  }
  
  // Verify we're on the status route before setting up handlers
  const currentHash = window.location.hash
  if (currentHash !== '#/status' && currentHash !== '#status') {
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
      const latest = await fetchStatusUpdates(30)
      replaceStatusUpdates(latest)
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

  // Handle anchor links (mailto, external links)
  // Only select <a> elements, not buttons
  const actionLinks = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('a.status-action-button')
  )

  actionLinks.forEach(link => {
    // Check if link has href property and skip mailto/external links
    if (link.href && (link.href.startsWith('mailto:') || link.dataset.external === 'true')) {
      return
    }
    
    // Skip links that have data-target (those are handled below)
    if (link.hasAttribute('data-target')) {
      return
    }

    link.addEventListener('click', event => {
      event.preventDefault()
      const target = link.getAttribute('href') || '#/'
      if (window.location.hash !== target) {
        window.location.hash = target
      }
    })
  })

  // Handle navigation buttons with data-target attribute (like "Powrót do strony głównej")
  const navButtons = Array.from(
    document.querySelectorAll<HTMLButtonElement>('button.status-action-button[data-target]')
  )
  
  navButtons.forEach(button => {
    const target = button.getAttribute('data-target')
    if (!target) {
      return
    }
    
    // Add click handler directly to the button
    // Use capture: true and stopImmediatePropagation to prevent other handlers from interfering
    button.addEventListener('click', (event: MouseEvent) => {
      event.preventDefault()
      event.stopPropagation()
      event.stopImmediatePropagation()
      
      // Navigate to target by setting hash
      // This will trigger hashchange event in main.ts which calls render()
      if (window.location.hash !== target) {
        window.location.hash = target
      } else {
        // If hash is already the target, force a re-render by triggering hashchange manually
        window.dispatchEvent(new HashChangeEvent('hashchange', {
          oldURL: window.location.href,
          newURL: window.location.href
        }))
      }
    }, { capture: true, once: false })
  })
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

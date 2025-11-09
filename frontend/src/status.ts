type StatusUpdate = {
  id: string
  title: string
  date: string
  tag: string
  summary: string
  importance: 'critical' | 'important' | 'informational'
}

const UPDATES_PER_PAGE = 6

const statusUpdates: StatusUpdate[] = [
  {
    id: 'release-1',
    title: 'Wdrożenie PortiX 1.2',
    date: '2025-10-12',
    tag: 'Release',
    summary:
      'Nowa wersja systemu PortiX wprowadza zestaw rozszerzonych metryk ryzyka, w tym wskaźniki ekspozycji sektorowej oraz scenariusze stresowe. Aktualizacja obejmuje również udoskonalony wykres TradingView z większą liczbą interwałów i lepszą optymalizacją wydajności.',
    importance: 'important',
  },
  {
    id: 'roadmap-1',
    title: 'Planowany moduł alertów',
    date: '2025-09-28',
    tag: 'Roadmap',
    summary:
      'Zespół kończy prace nad inteligentnymi alertami wolumenu, które pozwolą na natychmiastowe powiadomienia o gwałtownych zmianach aktywności rynkowej. W kolejnej iteracji moduł obejmie również alerty scenariuszy stresowych dla poszczególnych klas aktywów.',
    importance: 'informational',
  },
  {
    id: 'incident-1',
    title: 'Incydent infrastrukturalny',
    date: '2025-09-18',
    tag: 'Incident',
    summary:
      'Krótka niedostępność danych rynkowych spowodowana konserwacją serwerów wpłynęła na aktualizację wykresów w godzinach popołudniowych. Zespół infrastruktury wdrożył dodatkowe monitorowanie, aby zminimalizować ryzyko podobnych przerw w przyszłości.',
    importance: 'critical',
  },
  {
    id: 'security-1',
    title: 'Audyt bezpieczeństwa PortiX',
    date: '2025-09-05',
    tag: 'Security',
    summary:
      'Zewnętrzny audyt potwierdził zgodność PortiX z wewnętrznymi politykami bezpieczeństwa i standardami branżowymi. Wdrożyliśmy dwa rekomendowane usprawnienia konfiguracji SIEM, aby szybciej wykrywać nietypowe zachowania użytkowników.',
    importance: 'important',
  },
  {
    id: 'data-1',
    title: 'Integracja z nowymi dostawcami danych',
    date: '2025-08-17',
    tag: 'Data',
    summary:
      'Dodaliśmy wsparcie dla strumieniowych danych z rynków azjatyckich, rozszerzając pokrycie geograficzne PortiX oraz poprawiając ciągłość notowań w nocnych godzinach CET. Nowa integracja obejmuje również dane makroekonomiczne, przydatne do analiz międzyrynkowych.',
    importance: 'informational',
  },
  {
    id: 'ux-1',
    title: 'Warsztaty UX z klientami',
    date: '2025-08-03',
    tag: 'Research',
    summary:
      'Podczas warsztatów z kluczowymi klientami zebraliśmy szczegółowy feedback na temat ergonomii panelu i możliwości personalizacji kokpitów. Wnioski posłużą do zaprojektowania nowej sekcji skrótów oraz przebudowy widoku filtrów.',
    importance: 'important',
  },
  {
    id: 'foundation-1',
    title: 'Rozpoczęcie budowy strony PortiX',
    date: '2025-07-12',
    tag: 'Milestone',
    summary:
      'Zespół frontend oraz UX rozpoczął prace nad warstwą prezentacyjną platformy PortiX, koncentrując się na spójności języka wizualnego. Pierwsza iteracja obejmuje wdrożenie strony głównej oraz fundamentów systemu komponentów UI.',
    importance: 'informational',
  },
]

export function renderStatus(): string {
  const totalPages = Math.ceil(statusUpdates.length / UPDATES_PER_PAGE)
  const visibleUpdates = statusUpdates.slice(0, UPDATES_PER_PAGE)

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

  const totalPages = Math.ceil(statusUpdates.length / UPDATES_PER_PAGE)
  let currentPage = 1

  const renderPage = (page: number, shouldScroll = true) => {
    currentPage = page
    const start = (page - 1) * UPDATES_PER_PAGE
    const pageItems = statusUpdates.slice(start, start + UPDATES_PER_PAGE)
    list.innerHTML = renderStatusCards(pageItems)
    indicator.textContent = `Strona ${currentPage} z ${totalPages}`
    prevButton.disabled = currentPage === 1
    nextButton.disabled = currentPage === totalPages
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
    if (currentPage < totalPages) {
      renderPage(currentPage + 1)
    }
  })

  renderPage(1, false)
}

function renderStatusCards(items: StatusUpdate[]): string {
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

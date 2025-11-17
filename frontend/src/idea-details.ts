import { fetchIdea } from './api'
import type { Idea } from './types'

function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function formatEntryStrategy(strategy: Idea['entryStrategy']): string {
  switch (strategy) {
    case 'level':
      return 'Wejście z poziomu'
    case 'candlePattern':
      return 'Formacja świecowa'
    case 'formationRetest':
      return 'Retest formacji'
    default:
      return '—'
  }
}

export function renderIdeaDetails(_ideaId: string): string {
  return `
    <main class="page">
      <section class="idea-details-section">
        <div class="idea-details-loading" id="idea-details-loading">Ładowanie szczegółów pomysłu...</div>
        <div class="idea-details-content" id="idea-details-content" hidden></div>
        <div class="idea-details-error" id="idea-details-error" hidden></div>
      </section>
    </main>

    <footer class="footer">
      <small>© ${new Date().getFullYear()} Wszystkie prawa zastrzeżone.</small>
      <nav>
        <a href="#/">Strona główna</a>
        <a href="#/status">Status projektu</a>
        <a href="#">Dokumentacja</a>
        <a href="#">Kontakt</a>
      </nav>
    </footer>
  `
}

export async function setupIdeaDetailsHandlers(ideaId: string): Promise<void> {
  const loadingEl = document.getElementById('idea-details-loading')
  const contentEl = document.getElementById('idea-details-content')
  const errorEl = document.getElementById('idea-details-error')

  if (!loadingEl || !contentEl || !errorEl) {
    return
  }

  try {
    const idea = await fetchIdea(ideaId)
    loadingEl.hidden = true
    errorEl.hidden = true
    contentEl.hidden = false

    contentEl.innerHTML = `
      <div class="idea-details-header">
        <a href="#/" class="back-link">← Powrót</a>
        <h1>${escapeHtml(idea.symbol)}</h1>
        <span class="idea-market">${escapeHtml(idea.market)}</span>
      </div>

      ${idea.tradingviewImage ? `<div class="idea-details-image"><img src="${idea.tradingviewImage}" alt="Wykres ${idea.symbol}" /></div>` : ''}

      <div class="idea-details-body">
        <dl class="idea-details-list">
          <div>
            <dt>Rynek</dt>
            <dd>${idea.market}</dd>
          </div>
          <div>
            <dt>Wejście</dt>
            <dd>${idea.entryLevel}</dd>
          </div>
          <div>
            <dt>Stop Loss</dt>
            <dd>${idea.stopLoss}</dd>
          </div>
          ${idea.targetTp ? `<div><dt>Target TP</dt><dd>${idea.targetTp}</dd></div>` : ''}
          <div>
            <dt>Strategia wejścia</dt>
            <dd>${formatEntryStrategy(idea.entryStrategy)}</dd>
          </div>
          <div>
            <dt>Data publikacji</dt>
            <dd>${new Date(idea.publishedOn).toLocaleDateString('pl-PL', { year: 'numeric', month: 'long', day: 'numeric' })}</dd>
          </div>
        </dl>

        <div class="idea-description-full">
          <h2>Opis</h2>
          <div>${idea.description.split('\n').map(line => `<p>${line}</p>`).join('')}</div>
        </div>
      </div>
    `
  } catch (error) {
    console.error('Failed to load idea details:', error)
    loadingEl.hidden = true
    contentEl.hidden = true
    errorEl.hidden = false
    errorEl.textContent = error instanceof Error ? error.message : 'Nie udało się załadować szczegółów pomysłu.'
  }
}


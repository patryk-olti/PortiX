import { getPositions, getStatusUpdates, replaceStatusUpdates } from './store';
import { fetchStatusUpdates } from './api';
import type { StatusUpdate } from './types';

export function renderHome(): string {
  const positions = getPositions();
  const news = getStatusUpdates().slice(0, 3);
  return `
    <main class="page">
      <section class="hero">
        <h1 class="app-name">
          <span class="app-name-primary">PortiX</span>
          <span class="app-name-secondary">Analytics</span>
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
          <h2>Stan portfela PortiX</h2>
        </div>
        <div class="portfolio-overview">
          <article class="metric">
            <span class="label">Wartość portfela</span>
            <span class="value">254 800 PLN</span>
            <span class="change positive">+4.2% m/m</span>
          </article>
          <article class="metric">
            <span class="label">Kapitał zainwestowany</span>
            <span class="value">182 500 PLN</span>
            <span class="change neutral">71% ekspozycji</span>
          </article>
          <article class="metric">
            <span class="label">Kapitał rezerwowy</span>
            <span class="value">72 300 PLN</span>
            <span class="change neutral">29% gotówki</span>
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
          </select>
        </div>
        <div class="portfolio-table-wrapper">
          <table class="portfolio-table" aria-describedby="category-filter">
            <thead>
              <tr>
                <th>Pozycja</th>
                <th>Kategoria</th>
                <th>Cena zakupu</th>
                <th>Aktualny kurs</th>
                <th>Zwrot</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${positions
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
                .join('')}
            </tbody>
          </table>
        </div>
      </section>

      <section class="home-news">
        <div class="section-header">
          <h2>Aktualności</h2>
          <p>Ostatnie informacje z panelu administracyjnego.</p>
        </div>
        <div class="home-news-list" id="home-news-list">
          ${renderHomeNewsCards(news)}
        </div>
      </section>
    </main>

    <footer class="footer">
      <small>© ${new Date().getFullYear()} PortiX. Wszystkie prawa zastrzeżone.</small>
      <nav>
        <a href="#/status">Status projektu</a>
        <a href="#">Dokumentacja</a>
        <a href="#">Kontakt</a>
        <a href="#/login">Logowanie</a>
      </nav>
    </footer>
  `;
}

export function setupHomeHandlers(): void {
  const categoryFilter = document.querySelector<HTMLSelectElement>('#category-filter');
  const portfolioRows = Array.from(
    document.querySelectorAll<HTMLTableRowElement>('.portfolio-table tbody tr'),
  );

  categoryFilter?.addEventListener('change', (event) => {
    const value = (event.target as HTMLSelectElement).value;

    portfolioRows.forEach((row) => {
      if (value === 'all') {
        row.style.display = '';
        return;
      }

      row.style.display = row.dataset.category === value ? '' : 'none';
    });
  });

  refreshHomeNews();
  void hydrateHomeNews();
}

function renderHomeNewsCards(items: StatusUpdate[]): string {
  if (!items.length) {
    return '<p class="empty-state">Brak aktualności.</p>';
  }

  return items
    .slice(0, 3)
    .map(
      item => `
        <article class="home-news-card">
          <header>
            <time datetime="${item.date}">${formatDate(item.date)}</time>
            <span class="home-news-badge ${item.importance}">${getImportanceLabel(item.importance)}</span>
          </header>
          <h3>${item.title}</h3>
          <p>${item.summary}</p>
        </article>
      `,
    )
    .join('');
}

function refreshHomeNews(): void {
  const container = document.querySelector<HTMLDivElement>('#home-news-list');
  if (!container) {
    return;
  }
  const updates = getStatusUpdates();
  container.innerHTML = renderHomeNewsCards(updates);
}

async function hydrateHomeNews(): Promise<void> {
  const container = document.querySelector<HTMLDivElement>('#home-news-list');
  if (!container) {
    return;
  }

  if (!container.dataset.loading) {
    container.dataset.loading = 'true';
    container.innerHTML = '<p class="empty-state">Ładowanie aktualności...</p>';
  }

  try {
    const updates = await fetchStatusUpdates(6);
    replaceStatusUpdates(updates);
  } catch (error) {
    console.error('Nie udało się pobrać aktualności:', error);
    container.innerHTML =
      '<p class="empty-state">Nie udało się pobrać aktualności. Spróbuj ponownie później.</p>';
  } finally {
    delete container.dataset.loading;
    refreshHomeNews();
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function getImportanceLabel(importance: StatusUpdate['importance']): string {
  const labels: Record<StatusUpdate['importance'], string> = {
    critical: 'Pilne',
    important: 'Ważne',
    informational: 'Informacyjne',
  };

  return labels[importance];
}

function formatPositionType(positionType: 'long' | 'short'): string {
  return positionType === 'short' ? 'SHORT' : 'LONG';
}


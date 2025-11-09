import { positions } from './data';

export function renderHome(): string {
  return `
    <main class="page">
      <section class="hero">
        <h1 class="app-name">
          <span class="app-name-primary">PortiX</span>
          <span class="app-name-secondary">Analytics</span>
        </h1>
        <p class="hero-subtitle">Techniczne spojrzenie na rynek</p>
        <p class="lede">
          Monitorujemy zmienność, przepływy kapitału i ryzyko, aby precyzyjnie
          zarządzać portfelem inwestycyjnym.
        </p>
      </section>

      <section class="portfolio">
        <div class="section-header">
          <h2>Stan portfela PortiX</h2>
          <p>Monitorujemy alokację kapitału i reagujemy na zmiany struktury rynku.</p>
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
              ${positions.map(position => `
                <tr data-category="${position.category}">
                  <td>${position.name}</td>
                  <td>${position.categoryName}</td>
                  <td>${position.purchasePrice}</td>
                  <td>${position.currentPrice}</td>
                  <td class="${position.returnValue > 0 ? 'positive' : position.returnValue < 0 ? 'negative' : 'neutral'}">${position.return}</td>
                  <td>
                    <a class="details-link" href="#/position/${position.id}" data-position-id="${position.id}">Szczegóły</a>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </section>
    </main>

    <footer class="footer">
      <small>© ${new Date().getFullYear()} PortiX. Wszystkie prawa zastrzeżone.</small>
      <nav>
        <a href="#">Status projektu</a>
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
}


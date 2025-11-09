export function renderAdmin(): string {
  const isAuthenticated = localStorage.getItem('adminAuthenticated') === 'true';
  const username = localStorage.getItem('adminUsername') || 'Administrator';
  
  if (!isAuthenticated) {
    window.location.hash = '#/login';
    return '';
  }
  
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

      <section class="admin-stats">
        <div class="section-header">
          <h2>Statystyki systemu</h2>
          <p>Przegląd działania platformy</p>
        </div>
        <div class="admin-stats-grid">
          <article class="admin-stat-card">
            <span class="stat-label">Aktywne pozycje</span>
            <span class="stat-value">5</span>
            <span class="stat-change neutral">W portfelu</span>
          </article>
          <article class="admin-stat-card">
            <span class="stat-label">Wartość portfela</span>
            <span class="stat-value">254 800 PLN</span>
            <span class="stat-change positive">+4.2% m/m</span>
          </article>
          <article class="admin-stat-card">
            <span class="stat-label">Transakcje (miesiąc)</span>
            <span class="stat-value">12</span>
            <span class="stat-change neutral">Wykonane</span>
          </article>
          <article class="admin-stat-card">
            <span class="stat-label">Ostatnia aktualizacja</span>
            <span class="stat-value">${new Date().toLocaleDateString('pl-PL')}</span>
            <span class="stat-change neutral">Dzisiaj</span>
          </article>
        </div>
      </section>

      <section class="admin-actions">
        <div class="section-header">
          <h2>Zarządzanie portfelem</h2>
          <p>Akcje dostępne dla administratora</p>
        </div>
        <div class="admin-actions-grid">
          <div class="admin-action-card">
            <h3>Dodaj pozycję</h3>
            <p>Dodaj nową pozycję do portfela</p>
            <button class="admin-action-button" disabled>Wkrótce</button>
          </div>
          <div class="admin-action-card">
            <h3>Edytuj pozycję</h3>
            <p>Modyfikuj istniejące pozycje w portfelu</p>
            <button class="admin-action-button" disabled>Wkrótce</button>
          </div>
          <div class="admin-action-card">
            <h3>Historia transakcji</h3>
            <p>Przeglądaj pełną historię transakcji</p>
            <button class="admin-action-button" disabled>Wkrótce</button>
          </div>
          <div class="admin-action-card">
            <h3>Raporty</h3>
            <p>Generuj raporty i analizy portfela</p>
            <button class="admin-action-button" disabled>Wkrótce</button>
          </div>
        </div>
      </section>

      <section class="admin-settings">
        <div class="section-header">
          <h2>Ustawienia</h2>
          <p>Konfiguracja systemu</p>
        </div>
        <div class="admin-settings-list">
          <div class="admin-setting-item">
            <div class="setting-info">
              <h3>Powiadomienia e-mail</h3>
              <p>Otrzymuj powiadomienia o ważnych zdarzeniach</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" disabled />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="admin-setting-item">
            <div class="setting-info">
              <h3>Aktualizacje automatyczne</h3>
              <p>Automatyczne odświeżanie danych rynkowych</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" checked disabled />
              <span class="toggle-slider"></span>
            </label>
          </div>
          <div class="admin-setting-item">
            <div class="setting-info">
              <h3>Eksport danych</h3>
              <p>Zezwól na eksport danych portfela</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" checked disabled />
              <span class="toggle-slider"></span>
            </label>
          </div>
        </div>
      </section>
    </main>
  `;
}

export function setupAdminHandlers(): void {
  const logoutButton = document.querySelector<HTMLButtonElement>('#logout-button');
  
  logoutButton?.addEventListener('click', () => {
    localStorage.removeItem('adminAuthenticated');
    localStorage.removeItem('adminUsername');
    window.location.hash = '#/login';
  });
}

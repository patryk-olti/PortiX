export function renderLogin(): string {
  return `
    <main class="page login-page">
      <section class="login-section">
        <div class="login-container">
          <div class="login-header">
            <h1 class="app-name">
              <span class="app-name-primary">PortiX</span>
              <span class="app-name-secondary">Analytics</span>
            </h1>
            <h2>Logowanie do panelu administratora</h2>
          </div>
          
          <form class="login-form" id="login-form">
            <div class="form-group">
              <label for="username">Nazwa użytkownika</label>
              <input 
                type="text" 
                id="username" 
                name="username" 
                required 
                autocomplete="username"
                placeholder="Wprowadź nazwę użytkownika"
              />
            </div>
            
            <div class="form-group">
              <label for="password">Hasło</label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                required 
                autocomplete="current-password"
                placeholder="Wprowadź hasło"
              />
            </div>
            
            <div class="form-error" id="login-error" style="display: none;"></div>
            
            <button type="submit" class="login-button">Zaloguj się</button>
          </form>
          
          <div class="login-footer">
            <a href="#/" class="back-link">← Powrót do strony głównej</a>
          </div>
        </div>
      </section>
    </main>
  `;
}

export function setupLoginHandlers(): void {
  const loginForm = document.querySelector<HTMLFormElement>('#login-form');
  const errorDiv = document.querySelector<HTMLDivElement>('#login-error');
  
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (errorDiv) {
      errorDiv.style.display = 'none';
      errorDiv.textContent = '';
    }
    
    const formData = new FormData(loginForm);
    const rawUsername = (formData.get('username') as string) ?? '';
    const username = rawUsername.trim() || 'Administrator';
    // Walidacja została tymczasowo wyłączona, aby umożliwić logowanie bez podawania hasła.
    void formData.get('password');
    
    localStorage.setItem('adminAuthenticated', 'true');
    localStorage.setItem('adminUsername', username || 'Administrator');
    localStorage.setItem('adminLastLogin', new Date().toISOString());
    window.location.hash = '#/admin';
  });
}

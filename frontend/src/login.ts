import { login } from './api'

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
  const submitButton = loginForm?.querySelector<HTMLButtonElement>('button[type="submit"]');
  
  loginForm?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (errorDiv) {
      errorDiv.style.display = 'none';
      errorDiv.textContent = '';
    }
    
    const formData = new FormData(loginForm);
    const username = (formData.get('username') as string)?.trim() ?? '';
    const password = (formData.get('password') as string) ?? '';
    
    if (!username || !password) {
      if (errorDiv) {
        errorDiv.textContent = 'Wypełnij wszystkie pola';
        errorDiv.style.display = 'block';
      }
      return;
    }
    
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Logowanie...';
    }
    
    try {
      const user = await login({ username, password });
      
      localStorage.setItem('adminAuthenticated', 'true');
      localStorage.setItem('adminUsername', user.username);
      localStorage.setItem('adminUserId', user.id);
      localStorage.setItem('adminRole', user.role || 'guest');
      localStorage.setItem('adminCanViewPortfolio', String(user.canViewPortfolio || false));
      localStorage.setItem('adminCanViewIdeas', String(user.canViewIdeas || false));
      localStorage.setItem('adminCanViewClosedPositions', String(user.canViewClosedPositions || false));
      localStorage.setItem('adminLastLogin', new Date().toISOString());
      window.location.hash = '#/';
    } catch (error) {
      console.error('Login error:', error);
      if (errorDiv) {
        errorDiv.textContent = error instanceof Error ? error.message : 'Wystąpił błąd podczas logowania';
        errorDiv.style.display = 'block';
      }
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Zaloguj się';
      }
    }
  });
}

import './style.css'
import { renderHome, setupHomeHandlers } from './home'
import { renderPositionDetails, setupPositionDetailsHandlers } from './position-details'

function getRoute(): { path: string; params: Record<string, string> } {
  const hash = window.location.hash.slice(1)
  const pathParts = hash ? hash.split('/').filter(p => p) : []
  const path = pathParts[0] || '/'
  
  const params: Record<string, string> = {}
  if (path === 'position' && pathParts.length > 1) {
    params.id = pathParts[1]
  }
  
  return { path, params }
}

function render() {
  try {
    const app = document.querySelector<HTMLDivElement>('#app')
    if (!app) {
      console.error('App element not found!')
      return
    }

    const route = getRoute()
    console.log('Current route:', route)

    if (route.path === 'position' && route.params.id) {
      const html = renderPositionDetails(route.params.id)
      app.innerHTML = html
      // Scroll to top when navigating to a new page
      window.scrollTo(0, 0)
      // Use setTimeout to ensure DOM is fully updated before setting up handlers
      setTimeout(() => {
        setupPositionDetailsHandlers()
      }, 0)
    } else {
      const html = renderHome()
      app.innerHTML = html
      // Scroll to top when navigating to home page
      window.scrollTo(0, 0)
      setupHomeHandlers()
    }
  } catch (error) {
    console.error('Error rendering:', error)
    const app = document.querySelector<HTMLDivElement>('#app')
    if (app) {
      app.innerHTML = `
        <div style="padding: 2rem; color: red;">
          <h1>Błąd aplikacji</h1>
          <p>${error instanceof Error ? error.message : String(error)}</p>
          <pre>${error instanceof Error ? error.stack : ''}</pre>
        </div>
      `
      // Scroll to top even on error
      window.scrollTo(0, 0)
    }
  }
}

// Initial render - wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', render)
} else {
  render()
}

// Listen for hash changes
window.addEventListener('hashchange', render)

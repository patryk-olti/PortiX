import './style.css'
import { renderHome, setupHomeHandlers } from './home'
import { renderPositionDetails, setupPositionDetailsHandlers } from './position-details'
import { renderLogin, setupLoginHandlers } from './login'
import { renderAdmin, setupAdminHandlers } from './admin'
import { renderStatus, setupStatusHandlers } from './status'
import { renderIdeaDetails, setupIdeaDetailsHandlers } from './idea-details'
import { subscribe, replacePositions } from './store'
import { fetchPositions } from './api'

function getRoute(): { path: string; params: Record<string, string> } {
  const hash = window.location.hash.slice(1)
  const pathParts = hash ? hash.split('/').filter(p => p) : []
  const path = pathParts[0] || '/'
  
  const params: Record<string, string> = {}
  if ((path === 'position' || path === 'idea') && pathParts.length > 1) {
    params.id = pathParts[1]
  }
  
  return { path, params }
}

let lastRouteKey = ''

// Export render function so it can be called directly if needed
export function render() {
  try {
    const app = document.querySelector<HTMLDivElement>('#app')
    if (!app) {
      console.error('App element not found!')
      return
    }

    const route = getRoute()
    const routeKey = `${route.path}:${Object.values(route.params).join(':')}`
    const shouldScroll = routeKey !== lastRouteKey
    
    // Only prevent re-render if route hasn't changed at all
    // This prevents flickering but always allows navigation
    // Note: We allow home page to always render to enable navigation from other pages
    if (routeKey === lastRouteKey && route.path !== '/' && route.path !== '') {
      return
    }

    if (route.path === 'position' && route.params.id) {
      const html = renderPositionDetails(route.params.id)
      app.innerHTML = html
      // Scroll to top when navigating to a new page
      if (shouldScroll) {
        window.scrollTo(0, 0)
      }
      // Use setTimeout to ensure DOM is fully updated before setting up handlers
      setTimeout(() => {
        setupPositionDetailsHandlers()
      }, 0)
      app.classList.remove('admin-root')
    } else if (route.path === 'idea' && route.params.id) {
      const html = renderIdeaDetails(route.params.id)
      app.innerHTML = html
      if (shouldScroll) {
        window.scrollTo(0, 0)
      }
      setTimeout(async () => {
        await setupIdeaDetailsHandlers(route.params.id)
      }, 0)
      app.classList.remove('admin-root')
    } else if (route.path === 'login') {
      const html = renderLogin()
      app.innerHTML = html
      if (shouldScroll) {
        window.scrollTo(0, 0)
      }
      setTimeout(() => {
        setupLoginHandlers()
      }, 0)
      app.classList.remove('admin-root')
    } else if (route.path === 'status') {
      const html = renderStatus()
      app.innerHTML = html
      if (shouldScroll) {
        window.scrollTo(0, 0)
      }
      setTimeout(() => {
        setupStatusHandlers()
      }, 0)
      app.classList.remove('admin-root')
    } else if (route.path === 'admin') {
      const html = renderAdmin()
      if (html) {
        app.innerHTML = html
        if (shouldScroll) {
          window.scrollTo(0, 0)
        }
        setTimeout(() => {
          setupAdminHandlers()
        }, 0)
        app.classList.add('admin-root')
      }
    } else {
      const html = renderHome()
      app.innerHTML = html
      // Scroll to top when navigating to home page
      if (shouldScroll) {
        window.scrollTo(0, 0)
      }
      setupHomeHandlers()
      app.classList.remove('admin-root')
    }
    lastRouteKey = routeKey
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
window.addEventListener('hashchange', () => {
  render()
})

// Only re-render on store changes if we're on the home page
// This prevents unnecessary re-renders on other pages that cause flickering
subscribe(() => {
  const route = getRoute()
  // Only re-render home page on store updates
  if (route.path === '/' || route.path === '') {
    render()
  }
})

async function bootstrapPositions() {
  try {
    const positions = await fetchPositions()
    if (Array.isArray(positions)) {
      replacePositions(positions)
    }
  } catch (error) {
    console.error('Failed to synchronize positions from API:', error)
  }
}

void bootstrapPositions()

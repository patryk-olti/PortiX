import type { StatusUpdate } from './types'

const API_BASE_URL =
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL
    ? String(import.meta.env.VITE_API_BASE_URL)
    : ''

function resolveEndpoint(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  if (!API_BASE_URL) {
    return path
  }
  const base = API_BASE_URL.replace(/\/$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${base}${suffix}`
}

export interface CreateNewsPayload {
  title: string
  summary: string
  importance: StatusUpdate['importance']
  publishedOn: string
}

export interface NewsResponse {
  id: string
  title: string
  summary: string
  importance: StatusUpdate['importance']
  publishedOn: string
  createdAt: string
  updatedAt: string
}

export async function createNews(payload: CreateNewsPayload): Promise<NewsResponse> {
  const response = await fetch(resolveEndpoint('/api/news'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: payload.title,
      summary: payload.summary,
      importance: payload.importance,
      publishedOn: payload.publishedOn,
    }),
  })

  let json: unknown

  try {
    json = await response.json()
  } catch (_error) {
    // ignore json parse errors, will throw below
  }

  if (!response.ok) {
    const message =
      typeof json === 'object' && json && 'error' in json
        ? String((json as { error?: unknown }).error ?? 'Failed to create news')
        : 'Failed to create news'
    throw new Error(message)
  }

  if (!json || typeof json !== 'object' || !('data' in json)) {
    throw new Error('Unexpected response from server')
  }

  return (json as { data: NewsResponse }).data
}

export async function fetchNews(limit?: number): Promise<NewsResponse[]> {
  const query = typeof limit === 'number' ? `?limit=${encodeURIComponent(limit)}` : ''
  const response = await fetch(resolveEndpoint(`/api/news${query}`))

  let json: unknown
  try {
    json = await response.json()
  } catch (_error) {
    // ignore json parse errors, handle below
  }

  if (!response.ok) {
    const message =
      typeof json === 'object' && json && 'error' in json
        ? String((json as { error?: unknown }).error ?? 'Failed to load news')
        : 'Failed to load news'
    throw new Error(message)
  }

  if (!json || typeof json !== 'object' || !('data' in json)) {
    throw new Error('Unexpected response from server')
  }

  return (json as { data: NewsResponse[] }).data
}

export function mapNewsToStatusUpdate(news: NewsResponse): StatusUpdate {
  return {
    id: news.id,
    title: news.title,
    summary: news.summary,
    importance: news.importance,
    date: news.publishedOn ? news.publishedOn.slice(0, 10) : new Date().toISOString().slice(0, 10),
  }
}

export async function fetchStatusUpdates(limit?: number): Promise<StatusUpdate[]> {
  const news = await fetchNews(limit)
  return news.map(mapNewsToStatusUpdate).sort((a, b) => {
    if (a.date === b.date) {
      return a.id < b.id ? 1 : -1
    }
    return a.date < b.date ? 1 : -1
  })
}


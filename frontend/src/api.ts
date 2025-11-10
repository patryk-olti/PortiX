import type { StatusUpdate } from './types'

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
  const response = await fetch('/api/news', {
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
  const response = await fetch(`/api/news${query}`)

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


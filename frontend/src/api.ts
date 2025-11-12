import type { Position, StatusUpdate, TechnicalAnalysis } from './types'

const EXPLICIT_API_BASE =
  typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_BASE_URL
    ? String(import.meta.env.VITE_API_BASE_URL)
    : ''

const DEV_BACKEND_PORT = typeof import.meta !== 'undefined' && import.meta.env
  ? String(import.meta.env.VITE_BACKEND_PORT ?? '3000')
  : '3000'

const DEV_FRONTEND_PORTS = new Set(['5173', '4173'])

function resolveEndpoint(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  const baseUrl = getApiBaseUrl()
  if (!baseUrl) {
    return path
  }

  const base = baseUrl.replace(/\/$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${base}${suffix}`
}

function getApiBaseUrl(): string {
  if (EXPLICIT_API_BASE) {
    return EXPLICIT_API_BASE
  }

  if (typeof window === 'undefined') {
    return ''
  }

  const { protocol, hostname, port } = window.location

  if (port && DEV_FRONTEND_PORTS.has(port)) {
    return `${protocol}//${hostname}:${DEV_BACKEND_PORT}`
  }

  return window.location.origin
}

function serializeAnalysisPayload(analysis?: TechnicalAnalysis | null): Record<string, unknown> | undefined {
  if (!analysis) {
    return undefined
  }

  const targets = analysis.targets ?? {}
  const payload: Record<string, unknown> = {
    trend: analysis.trend,
    targets: {
      ...(targets.tp1 ? { tp1: targets.tp1 } : {}),
      ...(targets.tp2 ? { tp2: targets.tp2 } : {}),
      ...(targets.tp3 ? { tp3: targets.tp3 } : {}),
    },
    stopLoss: analysis.stopLoss,
    summary: analysis.summary,
  }

  if (analysis.analysisImage) {
    payload.analysisImage = analysis.analysisImage
  }

  if (analysis.completed) {
    payload.completed = true
  }

  if (analysis.completionNote) {
    payload.completionNote = analysis.completionNote
  }

  if (analysis.completionDate) {
    payload.completionDate = analysis.completionDate
  }

  if (analysis.positionClosed) {
    payload.positionClosed = true
  }

  if (analysis.positionClosedNote) {
    payload.positionClosedNote = analysis.positionClosedNote
  }

  if (analysis.positionClosedDate) {
    payload.positionClosedDate = analysis.positionClosedDate
  }

  return payload
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

export interface TradingViewQuoteRequest {
  symbols: string[]
}

export interface TradingViewQuoteResponse {
  symbol: string
  price: number | null
  currency?: string | null
  name?: string | null
  description?: string | null
  exchange?: string | null
  updatedAt: string
}

export interface CreatePositionPayload {
  symbol: string
  name?: string
  category: Position['category']
  positionType: Position['positionType']
  purchasePrice: string
  currentPrice?: string
  returnValue?: number
  quoteSymbol?: string
  positionSizeType: 'capital' | 'units' | 'pips'
  positionSizeValue?: number
  positionSizeLabel?: string
  positionSizePerPipLabel?: string
  analysis?: TechnicalAnalysis
  positionCurrency?: string
}

export type PositionResponse = Position

export interface DeletePositionResponse {
  id: string
  slug: string
}

export interface ResolveQuoteSymbolPayload {
  symbol: string
  category?: Position['category']
  hint?: string
  quoteSymbol?: string
}

export interface ResolveQuoteSymbolResult {
  quoteSymbol: string | null
  source?: string
}

export async function fetchPositions(): Promise<PositionResponse[]> {
  const response = await fetch(resolveEndpoint('/api/positions'))

  let json: unknown
  try {
    json = await response.json()
  } catch (_error) {
    // ignore, handled below
  }

  if (!response.ok) {
    const message =
      typeof json === 'object' && json && 'error' in json
        ? String((json as { error?: unknown }).error ?? 'Failed to load positions')
        : 'Failed to load positions'
    throw new Error(message)
  }

  if (!json || typeof json !== 'object' || !('data' in json)) {
    throw new Error('Unexpected response from server')
  }

  return (json as { data: PositionResponse[] }).data
}

export async function createPosition(payload: CreatePositionPayload): Promise<PositionResponse> {
  const analysisPayload = serializeAnalysisPayload(payload.analysis)
  const body: Record<string, unknown> = {
    symbol: payload.symbol,
    name: payload.name,
    category: payload.category,
    positionType: payload.positionType,
    purchasePrice: payload.purchasePrice,
    currentPrice: payload.currentPrice,
    returnValue: payload.returnValue,
    quoteSymbol: payload.quoteSymbol,
    positionSizeType: payload.positionSizeType,
    positionCurrency: payload.positionCurrency,
  }

  if (typeof payload.positionSizeValue === 'number') {
    body.positionSizeValue = payload.positionSizeValue
  }

  if (payload.positionSizeLabel) {
    body.positionSizeLabel = payload.positionSizeLabel
  }

  if (payload.positionSizePerPipLabel) {
    body.positionSizePerPipLabel = payload.positionSizePerPipLabel
  }

  if (analysisPayload) {
    body.analysis = analysisPayload
  }

  const response = await fetch(resolveEndpoint('/api/positions'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  let json: unknown
  try {
    json = await response.json()
  } catch (_error) {
    // ignore, handled below
  }

  if (!response.ok) {
    const message =
      typeof json === 'object' && json && 'error' in json
        ? String((json as { error?: unknown }).error ?? 'Failed to create position')
        : 'Failed to create position'
    throw new Error(message)
  }

  if (!json || typeof json !== 'object' || !('data' in json)) {
    throw new Error('Unexpected response from server')
  }

  return (json as { data: PositionResponse }).data
}

export async function resolveQuoteSymbol(
  payload: ResolveQuoteSymbolPayload,
): Promise<ResolveQuoteSymbolResult> {
  const response = await fetch(resolveEndpoint('/api/positions/resolve-symbol'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  let json: unknown
  try {
    json = await response.json()
  } catch (_error) {
    // ignore, handled below
  }

  if (!response.ok) {
    const message =
      typeof json === 'object' && json && 'error' in json
        ? String((json as { error?: unknown }).error ?? 'Failed to resolve quote symbol')
        : 'Failed to resolve quote symbol'
    throw new Error(message)
  }

  if (!json || typeof json !== 'object' || !('data' in json)) {
    throw new Error('Unexpected response from server')
  }

  return (json as { data: ResolveQuoteSymbolResult }).data
}

export async function fetchTradingViewQuotes(
  request: TradingViewQuoteRequest,
): Promise<TradingViewQuoteResponse[]> {
  const response = await fetch(resolveEndpoint('/api/prices'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  let json: unknown
  try {
    json = await response.json()
  } catch (_error) {
    // ignore parse errors, handled below
  }

  if (!response.ok) {
    const message =
      typeof json === 'object' && json && 'error' in json
        ? String((json as { error?: unknown }).error ?? 'Failed to fetch quotes')
        : 'Failed to fetch quotes'
    throw new Error(message)
  }

  if (!json || typeof json !== 'object' || !('data' in json)) {
    throw new Error('Unexpected response from server')
  }

  return (json as { data: TradingViewQuoteResponse[] }).data
}

export async function deleteNews(id: string): Promise<void> {
  const response = await fetch(resolveEndpoint(`/api/news/${encodeURIComponent(id)}`), {
    method: 'DELETE',
  })

  if (!response.ok) {
    let message = 'Failed to delete news'
    try {
      const json = (await response.json()) as { error?: string }
      if (json?.error) {
        message = json.error
      }
    } catch (_error) {
      // ignore parse error
    }
    throw new Error(message)
  }
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

export interface UpdateNewsPayload {
  title?: string
  summary?: string
  importance?: StatusUpdate['importance']
  publishedOn?: string
}

export async function updateNews(id: string, payload: UpdateNewsPayload): Promise<NewsResponse> {
  const response = await fetch(resolveEndpoint(`/api/news/${encodeURIComponent(id)}`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  let json: unknown
  try {
    json = await response.json()
  } catch (_error) {
    // ignore
  }

  if (!response.ok) {
    const message =
      typeof json === 'object' && json && 'error' in json
        ? String((json as { error?: unknown }).error ?? 'Failed to update news')
        : 'Failed to update news'
    throw new Error(message)
  }

  if (!json || typeof json !== 'object' || !('data' in json)) {
    throw new Error('Unexpected response from server')
  }

  return (json as { data: NewsResponse }).data
}

export async function updatePositionAnalysis(
  positionId: string,
  analysis: TechnicalAnalysis,
): Promise<PositionResponse> {
  const payload = serializeAnalysisPayload(analysis)
  if (!payload) {
    throw new Error('Analysis payload is invalid')
  }

  const response = await fetch(resolveEndpoint(`/api/positions/${encodeURIComponent(positionId)}/analysis`), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ analysis: payload }),
  })

  let json: unknown
  try {
    json = await response.json()
  } catch (_error) {
    // handled below
  }

  if (!response.ok) {
    const message =
      typeof json === 'object' && json && 'error' in json
        ? String((json as { error?: unknown }).error ?? 'Failed to update analysis')
        : 'Failed to update analysis'
    throw new Error(message)
  }

  if (!json || typeof json !== 'object' || !('data' in json)) {
    throw new Error('Unexpected response from server')
  }

  return (json as { data: PositionResponse }).data
}

export async function deletePositionAnalysis(positionId: string): Promise<PositionResponse> {
  const response = await fetch(
    resolveEndpoint(`/api/positions/${encodeURIComponent(positionId)}/analysis`),
    {
      method: 'DELETE',
    },
  )

  let json: unknown
  try {
    json = await response.json()
  } catch (_error) {
    // handled below
  }

  if (!response.ok) {
    const message =
      typeof json === 'object' && json && 'error' in json
        ? String((json as { error?: unknown }).error ?? 'Failed to delete analysis')
        : 'Failed to delete analysis'
    throw new Error(message)
  }

  if (!json || typeof json !== 'object' || !('data' in json)) {
    throw new Error('Unexpected response from server')
  }

  return (json as { data: PositionResponse }).data
}

export async function deletePosition(positionId: string): Promise<DeletePositionResponse> {
  const response = await fetch(resolveEndpoint(`/api/positions/${encodeURIComponent(positionId)}`), {
    method: 'DELETE',
  })

  let json: unknown
  try {
    json = await response.json()
  } catch (_error) {
    // handled below
  }

  if (!response.ok) {
    const message =
      typeof json === 'object' && json && 'error' in json
        ? String((json as { error?: unknown }).error ?? 'Failed to delete position')
        : 'Failed to delete position'
    throw new Error(message)
  }

  if (!json || typeof json !== 'object') {
    throw new Error('Unexpected response from server')
  }

  if ('data' in json && json.data && typeof json.data === 'object') {
    const data = json.data as { id?: unknown; slug?: unknown }
    return {
      id: typeof data.id === 'string' ? data.id : '',
      slug: typeof data.slug === 'string' ? data.slug : positionId,
    }
  }

  return {
    id: positionId,
    slug: positionId,
  }
}

export interface UpdatePositionPayload {
  quoteSymbol?: string
}

export async function updatePositionMetadata(
  positionId: string,
  payload: UpdatePositionPayload,
): Promise<PositionResponse> {
  const response = await fetch(resolveEndpoint(`/api/positions/${encodeURIComponent(positionId)}`), {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  let json: unknown
  try {
    json = await response.json()
  } catch (_error) {
    // handled below
  }

  if (!response.ok) {
    const message =
      typeof json === 'object' && json && 'error' in json
        ? String((json as { error?: unknown }).error ?? 'Failed to update position metadata')
        : 'Failed to update position metadata'
    throw new Error(message)
  }

  if (!json || typeof json !== 'object' || !('data' in json)) {
    throw new Error('Unexpected response from server')
  }

  return (json as { data: PositionResponse }).data
}


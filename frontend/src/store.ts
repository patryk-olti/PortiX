import { initialPositions, initialTechnicalAnalysis, initialModifications, initialInsights, initialStatusUpdates } from './data'
import type {
  Insight,
  Modification,
  Position,
  StatusUpdate,
  TechnicalAnalysis,
} from './types'

interface AdminState {
  positions: Position[]
  technicalAnalysis: Record<string, TechnicalAnalysis>
  modifications: Record<string, Modification[]>
  insights: Record<string, Insight[]>
  statusUpdates: StatusUpdate[]
}

const STORAGE_KEY = 'portix-admin-state-v1'

const defaultState: AdminState = {
  positions: clone(initialPositions),
  technicalAnalysis: clone(initialTechnicalAnalysis),
  modifications: clone(initialModifications),
  insights: clone(initialInsights),
  statusUpdates: clone(initialStatusUpdates),
}

const DEFAULT_QUOTE_SYMBOLS: Record<string, string> = {
  soxx: 'NASDAQ:SOXX',
  msft: 'NASDAQ:MSFT',
  dax: 'INDEX:DEU40',
  gold: 'TVC:GOLD',
  cash: 'OANDA:USDCAD',
}

const KNOWN_CURRENCIES = new Set(['USD', 'EUR', 'GBP', 'PLN', 'CAD', 'CHF', 'JPY'])

const SAMPLE_STATUS_UPDATE_IDS = new Set([
  'release-1',
  'roadmap-1',
  'incident-1',
  'security-1',
  'data-1',
  'ux-1',
  'foundation-1',
])

const listeners = new Set<() => void>()
let state: AdminState = loadState()

function clone<T>(value: T): T {
  const structuredCloneFn = (globalThis as unknown as { structuredClone?: <U>(value: U) => U }).structuredClone

  if (typeof structuredCloneFn === 'function') {
    return structuredCloneFn(value)
  }

  return JSON.parse(JSON.stringify(value)) as T
}

function loadState(): AdminState {
  if (typeof window === 'undefined') {
    return clone(defaultState)
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return clone(defaultState)
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AdminState>
    return normalizeState(parsed)
  } catch (error) {
    console.warn('Nie udało się odczytać stanu z localStorage, używam wartości domyślnych.', error)
    return clone(defaultState)
  }
}

function normalizeState(parsed: Partial<AdminState>): AdminState {
  const technicalAnalysisSource =
    parsed.technicalAnalysis && typeof parsed.technicalAnalysis === 'object'
      ? clone(parsed.technicalAnalysis)
      : clone(defaultState.technicalAnalysis)

  const statusUpdatesSource =
    Array.isArray(parsed.statusUpdates) ? clone(parsed.statusUpdates) : clone(defaultState.statusUpdates)

  return {
    positions: migratePositions(
      Array.isArray(parsed.positions) ? clone(parsed.positions) : clone(defaultState.positions),
    ),
    technicalAnalysis: migrateTechnicalAnalyses(technicalAnalysisSource),
    modifications:
      parsed.modifications && typeof parsed.modifications === 'object'
        ? clone(parsed.modifications)
        : clone(defaultState.modifications),
    insights:
      parsed.insights && typeof parsed.insights === 'object'
        ? clone(parsed.insights)
        : clone(defaultState.insights),
    statusUpdates: migrateStatusUpdates(statusUpdatesSource),
  }
}

function normalizeQuoteSymbol(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim().toUpperCase()
  return trimmed.length > 0 ? trimmed : undefined
}

function resolveQuoteSymbol(position: Position, incoming?: unknown): string | undefined {
  const normalizedIncoming = normalizeQuoteSymbol(incoming)
  if (normalizedIncoming) {
    return normalizedIncoming
  }

  const idCandidate = DEFAULT_QUOTE_SYMBOLS[position.id?.toLowerCase() ?? '']
  if (idCandidate) {
    return idCandidate
  }

  const symbolCandidate = DEFAULT_QUOTE_SYMBOLS[position.symbol?.toLowerCase() ?? '']
  if (symbolCandidate) {
    return symbolCandidate
  }

  const rawSymbol = position.symbol?.trim()
  if (!rawSymbol) {
    return undefined
  }

  if (rawSymbol.includes(':')) {
    return rawSymbol.toUpperCase()
  }

  const upper = rawSymbol.toUpperCase()

  switch (position.category) {
    case 'stock':
      return `NASDAQ:${upper}`
    case 'commodity':
      return `TVC:${upper}`
    case 'hedge':
      return `INDEX:${upper}`
    case 'cash':
      return `FX:${upper}`
    default:
      return undefined
  }
}

function normalizeCurrency(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined
  }
  const trimmed = value.trim().toUpperCase()
  return trimmed.length > 0 ? trimmed : undefined
}

function inferCurrencyFromLabel(label: string | undefined): string | undefined {
  if (!label || typeof label !== 'string') {
    return undefined
  }
  const match = label.trim().match(/([A-Za-z]{3})$/)
  if (!match) {
    return undefined
  }
  const candidate = match[1].toUpperCase()
  return KNOWN_CURRENCIES.has(candidate) ? candidate : undefined
}

function migratePositions(source: Position[]): Position[] {
  return source.map(position => {
    const incoming = position as Position & {
      quoteSymbol?: unknown
      currentPriceValue?: unknown
      currentPriceCurrency?: unknown
    }

    const quoteSymbol = resolveQuoteSymbol(position, incoming.quoteSymbol)

    const numericValue =
      typeof incoming.currentPriceValue === 'number' && Number.isFinite(incoming.currentPriceValue)
        ? incoming.currentPriceValue
        : parseNumericValue(position.currentPrice)

    const currency =
      normalizeCurrency(incoming.currentPriceCurrency) ?? inferCurrencyFromLabel(position.currentPrice)

    return {
      ...position,
      positionType: position.positionType ?? 'long',
      quoteSymbol,
      currentPriceValue: typeof numericValue === 'number' ? numericValue : undefined,
      currentPriceCurrency: currency,
      currentPrice:
        typeof numericValue === 'number' ? formatPriceLabel(numericValue, currency) : position.currentPrice,
    }
  })
}

function createEmptyAnalysisRecord(): TechnicalAnalysis {
  return {
    trend: 'neutral',
    targets: {},
    stopLoss: '',
    summary: '',
    positionClosed: false,
  }
}

function migrateTechnicalAnalyses(source: Record<string, TechnicalAnalysis | any>): Record<string, TechnicalAnalysis> {
  const migrated: Record<string, TechnicalAnalysis> = {}
  Object.entries(source).forEach(([key, value]) => {
    if (value && typeof value === 'object') {
      if ('targets' in value || 'stopLoss' in value || 'analysisImage' in value) {
        const closed =
          value.positionClosed === true ||
          value.positionClosed === 'true' ||
          value.positionClosed === 1
        migrated[key] = {
          trend: value.trend ?? 'neutral',
          targets: {
            ...(value.targets?.tp1 ? { tp1: value.targets.tp1 } : {}),
            ...(value.targets?.tp2 ? { tp2: value.targets.tp2 } : {}),
            ...(value.targets?.tp3 ? { tp3: value.targets.tp3 } : {}),
          },
          stopLoss: value.stopLoss ?? '',
          summary: value.summary ?? '',
          analysisImage: value.analysisImage,
          completed: value.completed ?? false,
          completionNote: value.completionNote,
          completionDate: value.completionDate,
          positionClosed: closed,
          positionClosedNote: closed ? value.positionClosedNote ?? '' : undefined,
          positionClosedDate: closed ? value.positionClosedDate : undefined,
        }
      } else {
        const closed =
          value.positionClosed === true ||
          value.positionClosed === 'true' ||
          value.positionClosed === 1
        migrated[key] = {
          trend: value.trend ?? 'neutral',
          targets: {
            ...(value.resistance ? { tp1: value.resistance } : {}),
          },
          stopLoss: value.support ?? '',
          summary:
            value.summary ??
            (value.indicators ? `RSI: ${value.indicators.rsi}, MACD: ${value.indicators.macd}` : ''),
          completed: value.completed ?? false,
          completionNote: value.completionNote,
          completionDate: value.completionDate,
          positionClosed: closed,
          positionClosedNote: closed ? value.positionClosedNote ?? '' : undefined,
          positionClosedDate: closed ? value.positionClosedDate : undefined,
        }
      }
    } else {
      migrated[key] = createEmptyAnalysisRecord()
    }
  })
  return migrated
}

function sanitizeImportance(value: StatusUpdate['importance']): StatusUpdate['importance'] {
  if (value === 'critical' || value === 'important' || value === 'informational') {
    return value
  }
  return 'informational'
}

function migrateStatusUpdates(source: StatusUpdate[]): StatusUpdate[] {
  const seen = new Set<string>()
  const migrated: StatusUpdate[] = []

  source.forEach(item => {
    if (!item || typeof item !== 'object') {
      return
    }
    if (!item.id || typeof item.id !== 'string') {
      return
    }
    if (SAMPLE_STATUS_UPDATE_IDS.has(item.id) || seen.has(item.id)) {
      return
    }

    const normalizedDate =
      typeof item.date === 'string' && item.date.length >= 10 ? item.date.slice(0, 10) : new Date().toISOString().slice(0, 10)

    migrated.push({
      id: item.id,
      title: (item.title ?? '').toString(),
      summary: (item.summary ?? '').toString(),
      importance: sanitizeImportance(item.importance),
      date: normalizedDate,
    })
    seen.add(item.id)
  })

  migrated.sort((a, b) => {
    if (a.date === b.date) {
      return a.id < b.id ? 1 : -1
    }
    return a.date < b.date ? 1 : -1
  })

  return migrated
}

function saveState() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Nie udało się zapisać stanu w localStorage:', error)
  }
}

function updateState(updater: (current: AdminState) => AdminState) {
  state = updater(clone(state))
  saveState()
  notify()
}

function notify() {
  listeners.forEach(listener => listener())
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function resetState(): void {
  updateState(() => clone(defaultState))
}

export function getPositions(): Position[] {
  return clone(state.positions)
}

export function getPositionById(id: string): Position | undefined {
  return clone(state.positions.find(position => position.id === id))
}

export function getTechnicalAnalysis(id: string): TechnicalAnalysis | undefined {
  const analysis = state.technicalAnalysis[id]
  return analysis ? clone(analysis) : undefined
}

export function getModifications(id: string): Modification[] {
  return clone(state.modifications[id] ?? [])
}

export function getInsights(id: string): Insight[] {
  return clone(state.insights[id] ?? [])
}

export function getStatusUpdates(): StatusUpdate[] {
  return clone(state.statusUpdates)
}

function parseNumericValue(label: string): number | undefined {
  if (typeof label !== 'string') {
    return undefined
  }

  const sanitized = label
    .replace(/\s+/g, '')
    .replace(',', '.')
    .match(/-?\d+(\.\d+)?/)

  if (!sanitized) {
    return undefined
  }

  const value = Number.parseFloat(sanitized[0])
  return Number.isFinite(value) ? value : undefined
}

function formatPriceLabel(value: number, currency?: string | null): string {
  if (!Number.isFinite(value)) {
    return '—'
  }

  const formatter = new Intl.NumberFormat('pl-PL', {
    minimumFractionDigits: value >= 100 ? 2 : 3,
    maximumFractionDigits: value >= 100 ? 2 : 4,
  })

  const formatted = formatter.format(value)
  return currency && currency.trim().length ? `${formatted} ${currency}` : formatted
}

export function applyPositionQuotes(
  updates: Array<{ id: string; symbol?: string; price: number | null | undefined; currency?: string | null }>,
) {
  if (!Array.isArray(updates) || !updates.length) {
    return
  }

  updateState(current => {
    const next = clone(current)

    updates.forEach(update => {
      if (!update?.id) {
        return
      }
      const target = next.positions.find(position => position.id === update.id)
      if (!target) {
        return
      }

      if (typeof update.symbol === 'string' && update.symbol.trim()) {
        target.quoteSymbol = update.symbol.trim()
      }

      if (typeof update.price === 'number' && Number.isFinite(update.price)) {
        target.currentPrice = formatPriceLabel(update.price, update.currency)
        target.currentPriceValue = update.price
        target.currentPriceCurrency = normalizeCurrency(update.currency) ?? target.currentPriceCurrency

        const purchaseValue = parseNumericValue(target.purchasePrice)
        if (typeof purchaseValue === 'number' && purchaseValue !== 0) {
          const changePercent = ((update.price - purchaseValue) / purchaseValue) * 100
          const rounded = Math.round(changePercent * 10) / 10
          target.returnValue = rounded
          target.return = `${rounded >= 0 ? '+' : ''}${rounded.toFixed(1)}%`
        }
      }
    })

    return next
  })
}

export function replacePositions(positions: Position[]) {
  updateState(current => {
    const next = clone(current)
    const existingById = new Map(current.positions.map(position => [position.id, position]))
    next.positions = migratePositions(clone(positions)).map(position => {
      const existing = existingById.get(position.id)
      if (!existing) {
        return position
      }

      const currentPriceValue =
        typeof existing.currentPriceValue === 'number' && Number.isFinite(existing.currentPriceValue)
          ? existing.currentPriceValue
          : position.currentPriceValue

      const currentPriceCurrency =
        normalizeCurrency(existing.currentPriceCurrency) ?? position.currentPriceCurrency ?? undefined

      return {
        ...position,
        currentPriceValue,
        currentPriceCurrency,
        currentPrice:
          typeof currentPriceValue === 'number'
            ? formatPriceLabel(currentPriceValue, currentPriceCurrency)
            : position.currentPrice,
        returnValue:
          typeof existing.returnValue === 'number' && Number.isFinite(existing.returnValue)
            ? existing.returnValue
            : position.returnValue,
        return: existing.return ?? position.return,
      }
    })

    next.positions.forEach(position => {
      if (!next.technicalAnalysis[position.id]) {
        next.technicalAnalysis[position.id] =
          defaultState.technicalAnalysis[position.id] ?? createEmptyAnalysisRecord()
      }
      if (!next.modifications[position.id]) {
        next.modifications[position.id] = []
      }
      if (!next.insights[position.id]) {
        next.insights[position.id] = []
      }
    })

    return next
  })
}

export function replaceStatusUpdates(updates: StatusUpdate[]) {
  updateState(current => {
    const next = clone(current)
    next.statusUpdates = migrateStatusUpdates(updates)
    return next
  })
}

export interface NewPositionPayload {
  position: Position
  analysis: TechnicalAnalysis
  modifications?: Modification[]
  insights?: Insight[]
}

export function addPosition(payload: NewPositionPayload) {
  updateState(current => {
    const next = clone(current)
    next.positions = next.positions.filter(position => position.id !== payload.position.id)
    const currency = inferCurrencyFromLabel(payload.position.currentPrice)
    const currentPriceValue = parseNumericValue(payload.position.currentPrice)
    next.positions.push({
      ...payload.position,
      quoteSymbol: resolveQuoteSymbol(payload.position, payload.position.quoteSymbol),
      currentPriceCurrency: currency,
      currentPriceValue: typeof currentPriceValue === 'number' ? currentPriceValue : undefined,
      currentPrice:
        typeof currentPriceValue === 'number'
          ? formatPriceLabel(currentPriceValue, currency)
          : payload.position.currentPrice,
    })
    next.technicalAnalysis[payload.position.id] = payload.analysis

    if (payload.modifications?.length) {
      next.modifications[payload.position.id] = payload.modifications
    } else {
      next.modifications[payload.position.id] = []
    }

    if (payload.insights?.length) {
      next.insights[payload.position.id] = payload.insights
    } else {
      next.insights[payload.position.id] = []
    }

    return next
  })
}

export function upsertTechnicalAnalysis(positionId: string, analysis: TechnicalAnalysis) {
  updateState(current => {
    const next = clone(current)
    next.technicalAnalysis[positionId] = analysis
    return next
  })
}

export function addStatusUpdate(update: StatusUpdate) {
  updateState(current => {
    const next = clone(current)
    next.statusUpdates = migrateStatusUpdates([update, ...next.statusUpdates])
    return next
  })
}

export function updateStatusUpdate(id: string, partial: Partial<StatusUpdate>) {
  updateState(current => {
    const next = clone(current)
    next.statusUpdates = next.statusUpdates.map(update =>
      update.id === id ? { ...update, ...partial } : update,
    )
    return next
  })
}

export function removeStatusUpdate(id: string) {
  updateState(current => {
    const next = clone(current)
    next.statusUpdates = next.statusUpdates.filter(update => update.id !== id)
    return next
  })
}

export function markAnalysisCompleted(positionId: string, completion: { note: string; date: string }) {
  updateState(current => {
    const next = clone(current)
    const analysis = next.technicalAnalysis[positionId]
    if (analysis) {
      analysis.completed = true
      analysis.completionNote = completion.note
      analysis.completionDate = completion.date
      next.technicalAnalysis[positionId] = analysis
    }
    return next
  })
}

export function reopenAnalysis(positionId: string) {
  updateState(current => {
    const next = clone(current)
    const analysis = next.technicalAnalysis[positionId]
    if (analysis) {
      analysis.completed = false
      delete analysis.completionNote
      delete analysis.completionDate
      next.technicalAnalysis[positionId] = analysis
    }
    return next
  })
}

export function addInsight(positionId: string, insight: Insight) {
  updateState(current => {
    const next = clone(current)
    const existing = next.insights[positionId] ?? []
    next.insights[positionId] = [insight, ...existing]
    return next
  })
}

export function updateInsight(positionId: string, insightId: string, partial: Partial<Insight>) {
  updateState(current => {
    const next = clone(current)
    const existing = next.insights[positionId] ?? []
    next.insights[positionId] = existing.map(item =>
      item.id === insightId ? { ...item, ...partial } : item,
    )
    return next
  })
}

export function removeInsight(positionId: string, insightId: string) {
  updateState(current => {
    const next = clone(current)
    const existing = next.insights[positionId] ?? []
    next.insights[positionId] = existing.filter(item => item.id !== insightId)
    return next
  })
}

export function addModification(positionId: string, modification: Modification) {
  updateState(current => {
    const next = clone(current)
    const existing = next.modifications[positionId] ?? []
    next.modifications[positionId] = [modification, ...existing]
    return next
  })
}

export function updateModification(positionId: string, modificationId: string, partial: Partial<Modification>) {
  updateState(current => {
    const next = clone(current)
    const existing = next.modifications[positionId] ?? []
    next.modifications[positionId] = existing.map(item =>
      item.id === modificationId ? { ...item, ...partial } : item,
    )
    return next
  })
}

export function removeModification(positionId: string, modificationId: string) {
  updateState(current => {
    const next = clone(current)
    const existing = next.modifications[positionId] ?? []
    next.modifications[positionId] = existing.filter(item => item.id !== modificationId)
    return next
  })
}

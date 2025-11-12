import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Position, TechnicalAnalysis } from '../src/types'

let store: typeof import('../src/store')

function createAnalysis(overrides: Partial<TechnicalAnalysis> = {}): TechnicalAnalysis {
  const { targets, ...rest } = overrides
  return {
    trend: 'bullish',
    summary: 'Primary scenario',
    stopLoss: '90 USD',
    targets: targets ? { ...targets } : {},
    completed: false,
    positionClosed: false,
    entryStrategy: 'level',
    ...rest,
  }
}

function createPosition(overrides: Partial<Position> = {}): Position {
  return {
    id: 'alpha',
    symbol: 'ALPHA',
    quoteSymbol: 'NASDAQ:ALPHA',
    name: 'Alpha Asset',
    category: 'stock',
    categoryName: 'Akcje',
    purchasePrice: '100 USD',
    positionSizeType: 'capital',
    positionSizeValue: 1000,
    positionSizeLabel: '1000 USD',
    positionTotalValue: 1000,
    positionTotalValueCurrency: 'USD',
    positionTotalValueLabel: '1 000 USD',
    positionCurrency: 'USD',
    currentPrice: '110 USD',
    currentPriceValue: 110,
    currentPriceCurrency: 'USD',
    return: '+10%',
    returnValue: 10,
    positionType: 'long',
    analysis: createAnalysis(),
    ...overrides,
  }
}

beforeEach(async () => {
  localStorage.clear()
  vi.resetModules()
  store = await import('../src/store')
  store.resetState()
})

describe('store replacePositions', () => {
  it('persists incoming analyses from backend data', () => {
    const backendAnalysis = createAnalysis({
      entryStrategy: 'candlePattern',
      summary: 'Updated view',
    })
    const incoming = createPosition({
      id: 'alpha',
      analysis: backendAnalysis,
      positionTotalValueLabel: '1 100 USD',
      currentPrice: '115 USD',
      currentPriceValue: 115,
      return: '+15%',
      returnValue: 15,
    })

    store.replacePositions([incoming])

    const positions = store.getPositions()
    expect(positions).toHaveLength(1)
    const position = positions[0]
    expect(position.analysis).toMatchObject({
      trend: 'bullish',
      entryStrategy: 'candlePattern',
      summary: 'Updated view',
      stopLoss: '90 USD',
    })

    const analysis = store.getTechnicalAnalysis('alpha')
    expect(analysis).toMatchObject({
      trend: 'bullish',
      summary: 'Updated view',
      stopLoss: '90 USD',
      entryStrategy: 'candlePattern',
    })

    expect(store.getInsights('alpha')).toEqual([])
    expect(store.getModifications('alpha')).toEqual([])
  })
})

describe('store removePositionFromStore', () => {
  it('removes position and clears related state', () => {
    const incoming = createPosition({ id: 'alpha' })
    store.replacePositions([incoming])

    store.removePositionFromStore('alpha')

    expect(store.getPositions()).toHaveLength(0)
    expect(store.getPositionById('alpha')).toBeUndefined()
    expect(store.getTechnicalAnalysis('alpha')).toBeUndefined()
    expect(store.getInsights('alpha')).toEqual([])
    expect(store.getModifications('alpha')).toEqual([])
  })
})


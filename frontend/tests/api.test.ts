import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as api from '../src/api'

// Mock fetch globally
const global = globalThis as typeof globalThis & { fetch: typeof fetch }
global.fetch = vi.fn() as any

describe('API functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset environment
    delete (import.meta as any).env?.VITE_API_BASE_URL
  })

  describe('fetchPositions', () => {
    it('fetches positions successfully', async () => {
      const mockPositions = [
        {
          id: '1',
          symbol: 'BTCUSDT',
          category: 'cryptocurrency',
          positionType: 'long',
        },
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPositions }),
      })

      const result = await api.fetchPositions()

      expect(result).toEqual(mockPositions)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/positions'),
      )
    })

    it('throws error on failed request', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: 'Server error' }),
      })

      await expect(api.fetchPositions()).rejects.toThrow('Server error')
    })
  })

  describe('createPosition', () => {
    it('creates a position successfully', async () => {
      const mockPosition = {
        id: '1',
        symbol: 'BTCUSDT',
        category: 'cryptocurrency',
      }

      const payload = {
        symbol: 'BTCUSDT',
        category: 'cryptocurrency' as const,
        positionType: 'long' as const,
        purchasePrice: '42000 USD',
        positionSizeType: 'capital' as const,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPosition }),
      })

      const result = await api.createPosition(payload)

      expect(result).toEqual(mockPosition)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/positions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        }),
      )
    })
  })

  describe('fetchNews', () => {
    it('fetches news successfully', async () => {
      const mockNews = [
        {
          id: '1',
          title: 'Test News',
          summary: 'Test summary',
          importance: 'high' as const,
          publishedOn: '2024-01-15',
          createdAt: '2024-01-15',
          updatedAt: '2024-01-15',
        },
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNews }),
      })

      const result = await api.fetchNews()

      expect(result).toEqual(mockNews)
    })

    it('fetches news with limit', async () => {
      const mockNews = [
        {
          id: '1',
          title: 'Test News',
          summary: 'Test summary',
          importance: 'high' as const,
          publishedOn: '2024-01-15',
          createdAt: '2024-01-15',
          updatedAt: '2024-01-15',
        },
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNews }),
      })

      await api.fetchNews(5)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/news?limit=5'),
      )
    })
  })

  describe('createNews', () => {
    it('creates news successfully', async () => {
      const mockNews = {
        id: '1',
        title: 'New News',
        summary: 'Summary',
        importance: 'important' as const,
        publishedOn: '2024-01-15',
        createdAt: '2024-01-15',
        updatedAt: '2024-01-15',
      }

      const payload = {
        title: 'New News',
        summary: 'Summary',
        importance: 'important' as const,
        publishedOn: '2024-01-15',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNews }),
      })

      const result = await api.createNews(payload)

      expect(result).toEqual(mockNews)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/news'),
        expect.objectContaining({
          method: 'POST',
        }),
      )
    })
  })

  describe('updateNews', () => {
    it('updates news successfully', async () => {
      const mockNews = {
        id: '1',
        title: 'Updated News',
        summary: 'Updated Summary',
        importance: 'high' as const,
        publishedOn: '2024-01-15',
        createdAt: '2024-01-15',
        updatedAt: '2024-01-16',
      }

      const payload = {
        title: 'Updated News',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockNews }),
      })

      const result = await api.updateNews('1', payload)

      expect(result).toEqual(mockNews)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/news/1'),
        expect.objectContaining({
          method: 'PUT',
        }),
      )
    })
  })

  describe('deleteNews', () => {
    it('deletes news successfully', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
      })

      await api.deleteNews('1')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/news/1'),
        expect.objectContaining({
          method: 'DELETE',
        }),
      )
    })
  })

  describe('fetchIdeas', () => {
    it('fetches ideas successfully', async () => {
      const mockIdeas = [
        {
          id: '1',
          symbol: 'BTCUSDT',
          market: 'Cryptocurrency',
          entryLevel: '42000',
          stopLoss: '40000',
          description: 'Test idea',
          entryStrategy: 'level' as const,
        },
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockIdeas }),
      })

      const result = await api.fetchIdeas()

      expect(result).toEqual(mockIdeas)
    })
  })

  describe('fetchIdea', () => {
    it('fetches a single idea successfully', async () => {
      const mockIdea = {
        id: '1',
        symbol: 'BTCUSDT',
        market: 'Cryptocurrency',
        entryLevel: '42000',
        stopLoss: '40000',
        description: 'Test idea',
        entryStrategy: 'level' as const,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockIdea }),
      })

      const result = await api.fetchIdea('1')

      expect(result).toEqual(mockIdea)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/ideas/1'),
      )
    })
  })

  describe('createIdea', () => {
    it('creates an idea successfully', async () => {
      const mockIdea = {
        id: '1',
        symbol: 'BTCUSDT',
        market: 'Cryptocurrency',
        entryLevel: '42000',
        stopLoss: '40000',
        description: 'New idea',
        entryStrategy: 'level' as const,
      }

      const payload = {
        symbol: 'BTCUSDT',
        market: 'Cryptocurrency',
        entryLevel: '42000',
        stopLoss: '40000',
        description: 'New idea',
        entryStrategy: 'level' as const,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockIdea }),
      })

      const result = await api.createIdea(payload)

      expect(result).toEqual(mockIdea)
    })
  })

  describe('updateIdea', () => {
    it('updates an idea successfully', async () => {
      const mockIdea = {
        id: '1',
        symbol: 'ETHUSDT',
        market: 'Cryptocurrency',
        entryLevel: '2500',
        stopLoss: '2300',
        description: 'Updated idea',
        entryStrategy: 'level' as const,
      }

      const payload = {
        description: 'Updated idea',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockIdea }),
      })

      const result = await api.updateIdea('1', payload)

      expect(result).toEqual(mockIdea)
    })
  })

  describe('deleteIdea', () => {
    it('deletes an idea successfully', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
      })

      await api.deleteIdea('1')

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/ideas/1'),
        expect.objectContaining({
          method: 'DELETE',
        }),
      )
    })
  })

  describe('login', () => {
    it('logs in successfully', async () => {
      const mockUser = {
        id: '1',
        username: 'testuser',
        role: 'admin' as const,
        createdAt: '2024-01-15',
        updatedAt: '2024-01-15',
      }

      const payload = {
        username: 'testuser',
        password: 'testpass',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockUser }),
      })

      const result = await api.login(payload)

      expect(result).toEqual(mockUser)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
        }),
      )
    })
  })

  describe('fetchUsers', () => {
    it('fetches users successfully', async () => {
      const mockUsers = [
        {
          id: '1',
          username: 'user1',
          role: 'user' as const,
          createdAt: '2024-01-15',
          updatedAt: '2024-01-15',
        },
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockUsers }),
      })

      const result = await api.fetchUsers()

      expect(result).toEqual(mockUsers)
    })
  })

  describe('createUser', () => {
    it('creates a user successfully', async () => {
      const mockUser = {
        id: '1',
        username: 'newuser',
        role: 'user' as const,
        createdAt: '2024-01-15',
        updatedAt: '2024-01-15',
      }

      const payload = {
        username: 'newuser',
        password: 'password',
        role: 'user' as const,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockUser }),
      })

      const result = await api.createUser(payload)

      expect(result).toEqual(mockUser)
    })
  })

  describe('updatePositionAnalysis', () => {
    it('updates position analysis successfully', async () => {
      const mockPosition = {
        id: '1',
        symbol: 'BTCUSDT',
        analysis: {
          trend: 'bullish' as const,
          targets: {},
          stopLoss: '40000',
          summary: 'Test analysis',
          entryStrategy: 'level' as const,
          completed: false,
          positionClosed: false,
        },
      }

      const analysis = {
        trend: 'bullish' as const,
        targets: {},
        stopLoss: '40000',
        summary: 'Test analysis',
        entryStrategy: 'level' as const,
        completed: false,
        positionClosed: false,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPosition }),
      })

      const result = await api.updatePositionAnalysis('1', analysis)

      expect(result).toEqual(mockPosition)
    })
  })

  describe('deletePositionAnalysis', () => {
    it('deletes position analysis successfully', async () => {
      const mockPosition = {
        id: '1',
        symbol: 'BTCUSDT',
        analysis: null,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockPosition }),
      })

      const result = await api.deletePositionAnalysis('1')

      expect(result).toEqual(mockPosition)
    })
  })

  describe('deletePosition', () => {
    it('deletes a position successfully', async () => {
      const mockResponse = {
        id: '1',
        slug: 'btcusdt',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResponse }),
      })

      const result = await api.deletePosition('1')

      expect(result).toEqual(mockResponse)
    })
  })

  describe('resolveQuoteSymbol', () => {
    it('resolves quote symbol successfully', async () => {
      const mockResult = {
        quoteSymbol: 'BINANCE:BTCUSDT',
        source: 'auto',
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockResult }),
      })

      const result = await api.resolveQuoteSymbol({
        symbol: 'BTCUSDT',
        category: 'cryptocurrency',
      })

      expect(result).toEqual(mockResult)
    })
  })

  describe('fetchTradingViewQuotes', () => {
    it('fetches TradingView quotes successfully', async () => {
      const mockQuotes = [
        {
          symbol: 'NASDAQ:AAPL',
          price: 150.25,
          currency: 'USD',
          name: 'Apple Inc.',
          updatedAt: '2024-01-15',
        },
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockQuotes }),
      })

      const result = await api.fetchTradingViewQuotes({
        symbols: ['NASDAQ:AAPL'],
      })

      expect(result).toEqual(mockQuotes)
    })
  })

  describe('fetchExchangeRates', () => {
    it('fetches exchange rates successfully', async () => {
      const mockRates = {
        USD: 4.0,
        EUR: 4.3,
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ data: mockRates }),
      })

      const result = await api.fetchExchangeRates(['USD', 'EUR'])

      expect(result).toEqual(mockRates)
    })
  })
})


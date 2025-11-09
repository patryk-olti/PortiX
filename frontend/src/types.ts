export interface Position {
  id: string;
  symbol: string;
  name: string;
  category: 'stock' | 'commodity' | 'hedge' | 'cash';
  categoryName: string;
  purchasePrice: string;
  currentPrice: string;
  return: string;
  returnValue: number;
}

export interface TechnicalAnalysis {
  trend: 'bullish' | 'bearish' | 'neutral';
  support: string;
  resistance: string;
  indicators: {
    rsi: number;
    macd: string;
    movingAverage: string;
  };
  summary: string;
}

export interface Modification {
  id: string;
  date: string;
  type: 'buy' | 'sell' | 'adjust';
  description: string;
  amount: string;
  price: string;
}

export interface Insight {
  id: string;
  date: string;
  title: string;
  content: string;
  impact: 'positive' | 'negative' | 'neutral';
}


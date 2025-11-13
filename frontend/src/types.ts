export interface Position {
  id: string;
  symbol: string;
  quoteSymbol?: string;
  name: string;
  category: 'stock' | 'commodity' | 'hedge' | 'cash' | 'cryptocurrency';
  categoryName: string;
  purchasePrice: string;
  positionSizeType?: 'capital' | 'units' | 'pips' | null;
  positionSizeValue?: number | null;
  positionSizeLabel?: string | null;
  positionSizePerPipValue?: number | null;
  positionSizePerPipLabel?: string | null;
  positionTotalValue?: number | null;
  positionTotalValueCurrency?: string | null;
  positionTotalValueLabel?: string | null;
  positionCurrency?: string | null;
  currentPrice: string;
  currentPriceValue?: number;
  currentPriceCurrency?: string;
  return: string;
  returnValue: number;
  positionType: 'long' | 'short';
  analysis?: TechnicalAnalysis | null;
  databaseId?: string;
}

export interface TechnicalAnalysis {
  trend: 'bullish' | 'bearish' | 'neutral';
  targets: {
    tp1?: string;
    tp2?: string;
    tp3?: string;
  };
  stopLoss?: string;
  summary: string;
  analysisImage?: string;
  completed?: boolean;
  completionNote?: string;
  completionDate?: string;
  positionClosed?: boolean;
  positionClosedNote?: string;
  positionClosedDate?: string;
  entryStrategy?: 'level' | 'candlePattern' | 'formationRetest';
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

export interface StatusUpdate {
  id: string;
  title: string;
  date: string;
  summary: string;
  importance: 'critical' | 'important' | 'informational';
}

export interface Idea {
  id: string;
  symbol: string;
  name: string;
  market: string;
  entryLevel: string;
  stopLoss: string;
  description: string;
  targetTp?: string | null;
  entryStrategy?: 'level' | 'candlePattern' | 'formationRetest' | null;
  tradingviewImage?: string | null;
  publishedOn: string;
  createdAt: string;
  updatedAt: string;
}


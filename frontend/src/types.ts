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
  positionType: 'long' | 'short';
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
  tradingViewUrl?: string;
  completed?: boolean;
  completionNote?: string;
  completionDate?: string;
  positionClosed?: boolean;
  positionClosedNote?: string;
  positionClosedDate?: string;
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


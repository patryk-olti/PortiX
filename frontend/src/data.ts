import type { Position, TechnicalAnalysis, Modification, Insight } from './types';

export const positions: Position[] = [
  {
    id: 'soxx',
    symbol: 'SOXX',
    name: 'SOXX ETF',
    category: 'stock',
    categoryName: 'Akcje',
    purchasePrice: '422.50 USD',
    currentPrice: '462.90 USD',
    return: '+9.4%',
    returnValue: 9.4,
  },
  {
    id: 'msft',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    category: 'stock',
    categoryName: 'Akcje',
    purchasePrice: '320.10 USD',
    currentPrice: '339.70 USD',
    return: '+6.1%',
    returnValue: 6.1,
  },
  {
    id: 'dax',
    symbol: 'DAX',
    name: 'DAX Futures',
    category: 'hedge',
    categoryName: 'Zabezpieczenie',
    purchasePrice: '18 250 pkt',
    currentPrice: '18 030 pkt',
    return: '-1.2%',
    returnValue: -1.2,
  },
  {
    id: 'gold',
    symbol: 'XAUUSD',
    name: 'Gold Spot',
    category: 'commodity',
    categoryName: 'Surowiec',
    purchasePrice: '1 962 USD',
    currentPrice: '2 036 USD',
    return: '+3.8%',
    returnValue: 3.8,
  },
  {
    id: 'cash',
    symbol: 'CASH',
    name: 'Cash PLN',
    category: 'cash',
    categoryName: 'Gotówka',
    purchasePrice: '1.00',
    currentPrice: '1.00',
    return: '0.0%',
    returnValue: 0,
  },
];

export const technicalAnalysis: Record<string, TechnicalAnalysis> = {
  soxx: {
    trend: 'bullish',
    support: '450.00 USD',
    resistance: '480.00 USD',
    indicators: {
      rsi: 68,
      macd: 'Bullish crossover',
      movingAverage: 'Price above 50-day MA',
    },
    summary: 'SOXX wykazuje silny trend wzrostowy. RSI na poziomie 68 wskazuje na możliwość kontynuacji wzrostu, choć zbliża się do strefy wykupienia. MACD pokazuje bullish crossover, co potwierdza pozytywny momentum. Cena znajduje się powyżej 50-dniowej średniej kroczącej, co wspiera trend wzrostowy.',
  },
  msft: {
    trend: 'bullish',
    support: '330.00 USD',
    resistance: '350.00 USD',
    indicators: {
      rsi: 62,
      macd: 'Positive momentum',
      movingAverage: 'Price above all major MAs',
    },
    summary: 'Microsoft kontynuuje silny trend wzrostowy. Wskaźniki techniczne potwierdzają pozytywny momentum z RSI na poziomie 62. Cena znajduje się powyżej wszystkich głównych średnich kroczących, co wskazuje na silną strukturę trendu. Poziomy wsparcia i oporu sugerują dalszy potencjał wzrostowy.',
  },
  dax: {
    trend: 'bearish',
    support: '17 800 pkt',
    resistance: '18 400 pkt',
    indicators: {
      rsi: 42,
      macd: 'Bearish signal',
      movingAverage: 'Price below 50-day MA',
    },
    summary: 'DAX Futures wykazuje korektę po wcześniejszych wzrostach. RSI na poziomie 42 wskazuje na neutralne do lekko niedowartościowane warunki. MACD pokazuje bearish signal, co sugeruje możliwość dalszej korekty. Pozycja służy jako zabezpieczenie portfela przed spadkami na rynku akcji.',
  },
  gold: {
    trend: 'bullish',
    support: '2 000 USD',
    resistance: '2 080 USD',
    indicators: {
      rsi: 58,
      macd: 'Bullish trend',
      movingAverage: 'Price consolidating above support',
    },
    summary: 'Złoto wykazuje stabilny trend wzrostowy w kontekście niepewności geopolitycznej i oczekiwań dotyczących obniżek stóp procentowych. RSI na poziomie 58 wskazuje na zdrowy momentum bez wykupienia. Cena konsoliduje się powyżej kluczowego wsparcia na poziomie 2000 USD, co wspiera dalszy potencjał wzrostowy.',
  },
};

export const modifications: Record<string, Modification[]> = {
  soxx: [
    {
      id: '1',
      date: '2024-01-15',
      type: 'buy',
      description: 'Początkowy zakup pozycji',
      amount: '50 jednostek',
      price: '422.50 USD',
    },
    {
      id: '2',
      date: '2024-02-20',
      type: 'buy',
      description: 'Dokupienie przy wybiciu oporu',
      amount: '25 jednostek',
      price: '445.00 USD',
    },
    {
      id: '3',
      date: '2024-03-10',
      type: 'adjust',
      description: 'Rebalancing portfela - częściowa realizacja zysków',
      amount: '-15 jednostek',
      price: '458.00 USD',
    },
  ],
  msft: [
    {
      id: '1',
      date: '2024-01-10',
      type: 'buy',
      description: 'Początkowy zakup pozycji',
      amount: '100 akcji',
      price: '320.10 USD',
    },
    {
      id: '2',
      date: '2024-02-05',
      type: 'buy',
      description: 'Dokupienie przy pullback',
      amount: '50 akcji',
      price: '315.00 USD',
    },
  ],
  dax: [
    {
      id: '1',
      date: '2024-01-20',
      type: 'buy',
      description: 'Otwarcie pozycji zabezpieczającej',
      amount: '2 kontrakty',
      price: '18 250 pkt',
    },
  ],
  gold: [
    {
      id: '1',
      date: '2024-01-05',
      type: 'buy',
      description: 'Początkowy zakup',
      amount: '10 uncji',
      price: '1 962 USD',
    },
    {
      id: '2',
      date: '2024-02-15',
      type: 'buy',
      description: 'Dokupienie przy konsolidacji',
      amount: '5 uncji',
      price: '1 980 USD',
    },
  ],
};

export const insights: Record<string, Insight[]> = {
  soxx: [
    {
      id: '1',
      date: '2024-03-15',
      title: 'Silny popyt na półprzewodniki',
      content: 'Sektor półprzewodników wykazuje silny popyt ze strony przemysłu AI i pojazdów elektrycznych. SOXX beneficjentem długoterminowych trendów technologicznych.',
      impact: 'positive',
    },
    {
      id: '2',
      date: '2024-03-10',
      title: 'Wybicie powyżej oporu 460 USD',
      content: 'Cena wybiła powyżej kluczowego poziomu oporu na 460 USD, co otwiera drogę do dalszych wzrostów w kierunku 480 USD.',
      impact: 'positive',
    },
    {
      id: '3',
      date: '2024-03-01',
      title: 'RSI zbliża się do strefy wykupienia',
      content: 'RSI na poziomie 68 wskazuje na możliwość krótkoterminowej korekty. Rozważamy częściową realizację zysków przy poziomie 470 USD.',
      impact: 'neutral',
    },
  ],
  msft: [
    {
      id: '1',
      date: '2024-03-12',
      title: 'Pozytywne wyniki kwartalne',
      content: 'Microsoft raportuje silne wyniki, szczególnie w segmencie Azure i AI. Przychody z chmury rosną w tempie 28% rok do roku.',
      impact: 'positive',
    },
    {
      id: '2',
      date: '2024-03-05',
      title: 'Integracja AI w produktach',
      content: 'Firma intensywnie integruje funkcje AI w swoich produktach, co powinno wspierać wzrost przychodów w kolejnych kwartałach.',
      impact: 'positive',
    },
  ],
  dax: [
    {
      id: '1',
      date: '2024-03-08',
      title: 'Korekta po wzrostach',
      content: 'DAX koryguje po silnych wzrostach w pierwszym kwartale. Pozycja zabezpieczająca działa zgodnie z oczekiwaniami, ograniczając ekspozycję na spadki.',
      impact: 'neutral',
    },
    {
      id: '2',
      date: '2024-02-20',
      title: 'Niepewność geopolityczna',
      content: 'Zwiększona niepewność geopolityczna wspiera pozycję zabezpieczającą. DAX może testować niższe poziomy w przypadku eskalacji napięć.',
      impact: 'negative',
    },
  ],
  gold: [
    {
      id: '1',
      date: '2024-03-14',
      title: 'Oczekiwania dotyczące obniżek stóp',
      content: 'Rynek oczekuje obniżek stóp procentowych przez Fed, co tradycyjnie wspiera ceny złota. Inflacja spada, co zwiększa prawdopodobieństwo poluzowania polityki monetarnej.',
      impact: 'positive',
    },
    {
      id: '2',
      date: '2024-03-02',
      title: 'Niepewność geopolityczna',
      content: 'Zwiększona niepewność geopolityczna zwiększa popyt na złoto jako bezpieczną przystań. Popyt centralnych banków na złoto pozostaje silny.',
      impact: 'positive',
    },
    {
      id: '3',
      date: '2024-02-25',
      title: 'Konsolidacja powyżej 2000 USD',
      content: 'Złoto konsoliduje się powyżej kluczowego wsparcia na 2000 USD, co buduje bazę do dalszych wzrostów. Poziom 2080 USD jest następnym celem.',
      impact: 'positive',
    },
  ],
};

export function getPositionById(id: string): Position | undefined {
  return positions.find(p => p.id === id);
}

export function getTechnicalAnalysis(symbol: string): TechnicalAnalysis | undefined {
  return technicalAnalysis[symbol];
}

export function getModifications(symbol: string): Modification[] {
  return modifications[symbol] || [];
}

export function getInsights(symbol: string): Insight[] {
  return insights[symbol] || [];
}


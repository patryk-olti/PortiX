import type { Position, TechnicalAnalysis, Modification, Insight, StatusUpdate } from './types';

export const initialPositions: Position[] = [
  {
    id: 'soxx',
    symbol: 'SOXX',
    quoteSymbol: 'NASDAQ:SOXX',
    name: 'SOXX ETF',
    category: 'stock',
    categoryName: 'Akcje',
    purchasePrice: '422.50 USD',
    positionSizeType: 'units',
    positionSizeValue: 50,
    positionSizeLabel: '50',
    positionTotalValue: 21125,
    positionTotalValueCurrency: 'USD',
    positionTotalValueLabel: '21 125,00 USD',
    positionCurrency: 'USD',
    currentPrice: '462.90 USD',
    return: '+9.4%',
    returnValue: 9.4,
    positionType: 'long',
  },
  {
    id: 'msft',
    symbol: 'MSFT',
    quoteSymbol: 'NASDAQ:MSFT',
    name: 'Microsoft Corporation',
    category: 'stock',
    categoryName: 'Akcje',
    purchasePrice: '320.10 USD',
    positionSizeType: 'units',
    positionSizeValue: 100,
    positionSizeLabel: '100',
    positionTotalValue: 32010,
    positionTotalValueCurrency: 'USD',
    positionTotalValueLabel: '32 010,00 USD',
    positionCurrency: 'USD',
    currentPrice: '339.70 USD',
    return: '+6.1%',
    returnValue: 6.1,
    positionType: 'long',
  },
  {
    id: 'dax',
    symbol: 'DAX',
    quoteSymbol: 'INDEX:DEU40',
    name: 'DAX Futures',
    category: 'hedge',
    categoryName: 'Zabezpieczenie',
    purchasePrice: '18 250 pkt',
    positionSizeType: 'pips',
    positionSizeValue: 250,
    positionSizeLabel: '250 pips',
    positionSizePerPipValue: 25,
    positionSizePerPipLabel: '25 EUR',
    positionTotalValue: 6250,
    positionTotalValueCurrency: 'EUR',
    positionTotalValueLabel: '6 250,00 EUR',
    positionCurrency: 'EUR',
    currentPrice: '18 030 pkt',
    return: '-1.2%',
    returnValue: -1.2,
    positionType: 'short',
  },
  {
    id: 'gold',
    symbol: 'XAUUSD',
    quoteSymbol: 'TVC:GOLD',
    name: 'Gold Spot',
    category: 'commodity',
    categoryName: 'Surowiec',
    purchasePrice: '1 962 USD',
    positionSizeType: 'capital',
    positionSizeValue: 15000,
    positionSizeLabel: '15 000 USD',
    positionTotalValue: 15000,
    positionTotalValueCurrency: 'USD',
    positionTotalValueLabel: '15 000,00 USD',
    positionCurrency: 'USD',
    currentPrice: '2 036 USD',
    return: '+3.8%',
    returnValue: 3.8,
    positionType: 'long',
  },
  {
    id: 'cash',
    symbol: 'CASH',
    quoteSymbol: 'OANDA:USDCAD',
    name: 'Cash PLN',
    category: 'cash',
    categoryName: 'Gotówka',
    purchasePrice: '1.00',
    currentPrice: '1.00',
    return: '0.0%',
    returnValue: 0,
    positionType: 'long',
  },
];

export const initialTechnicalAnalysis: Record<string, TechnicalAnalysis> = {
  soxx: {
    trend: 'bullish',
    targets: {
      tp1: '470 USD',
      tp2: '480 USD',
      tp3: '495 USD',
    },
    stopLoss: '445 USD',
    summary:
      'SOXX pozostaje w silnym trendzie wzrostowym dzięki popytowi na półprzewodniki. Scenariusz bazowy zakłada kontynuację wzrostu po krótkiej konsolidacji.',
    positionClosed: false,
    entryStrategy: 'formationRetest',
  },
  msft: {
    trend: 'bullish',
    targets: {
      tp1: '348 USD',
      tp2: '355 USD',
      tp3: '365 USD',
    },
    stopLoss: '318 USD',
    summary:
      'Microsoft korzysta na rosnącej adopcji usług chmurowych i AI. Utrzymanie powyżej ostatniego wsparcia wspiera scenariusz dalszego wzrostu.',
    positionClosed: false,
    entryStrategy: 'level',
  },
  dax: {
    trend: 'bearish',
    targets: {
      tp1: '17 600 pkt',
      tp2: '17 300 pkt',
      tp3: '17 000 pkt',
    },
    stopLoss: '18 450 pkt',
    summary:
      'Kontrakt na DAX służy jako zabezpieczenie portfela. Scenariusz zakłada dalszą korektę w kierunku niższych poziomów wsparcia.',
    positionClosed: false,
    entryStrategy: 'candlePattern',
  },
  gold: {
    trend: 'bullish',
    targets: {
      tp1: '2 060 USD',
      tp2: '2 090 USD',
      tp3: '2 120 USD',
    },
    stopLoss: '1 995 USD',
    summary:
      'Złoto wspierane jest przez oczekiwania związane z polityką monetarną i popyt na aktywa defensywne. Kluczowe wsparcie w okolicach 2000 USD pozostaje nienaruszone.',
    positionClosed: false,
    entryStrategy: 'formationRetest',
  },
};

export const initialModifications: Record<string, Modification[]> = {
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

export const initialInsights: Record<string, Insight[]> = {
  soxx: [
    {
      id: '1',
      date: '2024-03-15',
      title: 'Silny popyt na półprzewodniki',
      content:
        'Sektor półprzewodników wykazuje silny popyt ze strony przemysłu AI i pojazdów elektrycznych. SOXX beneficjentem długoterminowych trendów technologicznych.',
      impact: 'positive',
    },
    {
      id: '2',
      date: '2024-03-10',
      title: 'Wybicie powyżej oporu 460 USD',
      content:
        'Cena wybiła powyżej kluczowego poziomu oporu na 460 USD, co otwiera drogę do dalszych wzrostów w kierunku 480 USD.',
      impact: 'positive',
    },
    {
      id: '3',
      date: '2024-03-01',
      title: 'RSI zbliża się do strefy wykupienia',
      content:
        'RSI na poziomie 68 wskazuje na możliwość krótkoterminowej korekty. Rozważamy częściową realizację zysków przy poziomie 470 USD.',
      impact: 'neutral',
    },
  ],
  msft: [
    {
      id: '1',
      date: '2024-03-12',
      title: 'Pozytywne wyniki kwartalne',
      content:
        'Microsoft raportuje silne wyniki, szczególnie w segmencie Azure i AI. Przychody z chmury rosną w tempie 28% rok do roku.',
      impact: 'positive',
    },
    {
      id: '2',
      date: '2024-03-05',
      title: 'Integracja AI w produktach',
      content:
        'Firma intensywnie integruje funkcje AI w swoich produktach, co powinno wspierać wzrost przychodów w kolejnych kwartałach.',
      impact: 'positive',
    },
  ],
  dax: [
    {
      id: '1',
      date: '2024-03-08',
      title: 'Korekta po wzrostach',
      content:
        'DAX koryguje po silnych wzrostach w pierwszym kwartale. Pozycja zabezpieczająca działa zgodnie z oczekiwaniami, ograniczając ekspozycję na spadki.',
      impact: 'neutral',
    },
    {
      id: '2',
      date: '2024-02-20',
      title: 'Niepewność geopolityczna',
      content:
        'Zwiększona niepewność geopolityczna wspiera pozycję zabezpieczającą. DAX może testować niższe poziomy w przypadku eskalacji napięć.',
      impact: 'negative',
    },
  ],
  gold: [
    {
      id: '1',
      date: '2024-03-14',
      title: 'Oczekiwania dotyczące obniżek stóp',
      content:
        'Rynek oczekuje obniżek stóp procentowych przez Fed, co tradycyjnie wspiera ceny złota. Inflacja spada, co zwiększa prawdopodobieństwo poluzowania polityki monetarnej.',
      impact: 'positive',
    },
    {
      id: '2',
      date: '2024-03-02',
      title: 'Niepewność geopolityczna',
      content:
        'Zwiększona niepewność geopolityczna zwiększa popyt na złoto jako bezpieczną przystań. Popyt centralnych banków na złoto pozostaje silny.',
      impact: 'positive',
    },
    {
      id: '3',
      date: '2024-02-25',
      title: 'Konsolidacja powyżej 2000 USD',
      content:
        'Złoto konsoliduje się powyżej kluczowego wsparcia na 2000 USD, co buduje bazę do dalszych wzrostów. Poziom 2080 USD jest następnym celem.',
      impact: 'positive',
    },
  ],
};

export const initialStatusUpdates: StatusUpdate[] = [];


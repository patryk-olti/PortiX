import { getPositionById, getTechnicalAnalysis, getModifications, getInsights } from './store';

export function renderPositionDetails(positionId: string): string {
  const position = getPositionById(positionId);
  
  if (!position) {
    return `
      <main class="page">
        <section class="error-section">
          <h2>Pozycja nie została znaleziona</h2>
          <a href="#/" class="back-link">← Powrót do strony głównej</a>
        </section>
      </main>
    `;
  }

  const analysis = getTechnicalAnalysis(position.id);
  const modifications = getModifications(position.id);
  const insights = getInsights(position.id);

  const trendClass = analysis?.trend === 'bullish' ? 'positive' : analysis?.trend === 'bearish' ? 'negative' : 'neutral';
  const trendText = analysis?.trend === 'bullish' ? 'Wzrostowy' : analysis?.trend === 'bearish' ? 'Spadkowy' : 'Neutralny';
  const completionBadge = analysis?.completed
    ? `<span class="analysis-status completed">Zrealizowano ${analysis.completionDate ? formatDate(analysis.completionDate) : ''}</span>`
    : '<span class="analysis-status open">Aktywna analiza</span>';
  const targets = analysis?.targets ?? {};

  return `
    <nav class="detail-nav">
      <a href="#/" class="back-link">
        <span class="back-icon">←</span>
        Powrót do portfela
      </a>
    </nav>

    <main class="page detail-page">
      <section class="position-header">
        <div class="position-title">
          <h1>${position.name}</h1>
          <span class="position-symbol">${position.symbol}</span>
          ${completionBadge}
        </div>
        <div class="position-stats">
          <div class="stat-item">
            <span class="stat-label">Kategoria</span>
            <span class="stat-value">${position.categoryName}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Cena zakupu</span>
            <span class="stat-value">${position.purchasePrice}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Aktualny kurs</span>
            <span class="stat-value">${position.currentPrice}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Zwrot</span>
            <span class="stat-value ${
              position.returnValue > 0 ? 'positive' : position.returnValue < 0 ? 'negative' : 'neutral'
            }">${position.return}</span>
          </div>
        </div>
      </section>

      <section class="chart-section">
        <div class="section-header">
          <h2>Wykres cenowy</h2>
          <p>Analiza techniczna w czasie rzeczywistym</p>
        </div>
        <div class="chart-container" id="tradingview-container-${position.id}" data-symbol="${getTradingViewSymbol(position.id)}">
          <!-- TradingView widget will be inserted here -->
        </div>
      </section>

      <section class="technical-analysis-section">
        <div class="section-header">
          <h2>Analiza techniczna</h2>
          <p>Założenia scenariusza wraz z poziomami docelowymi</p>
        </div>
        <div class="analysis-grid">
          <div class="analysis-card">
            <span class="analysis-label">Trend</span>
            <span class="analysis-value ${trendClass}">${trendText}</span>
          </div>
          ${renderTargetCard('TP1', targets.tp1)}
          ${renderTargetCard('TP2', targets.tp2)}
          ${renderTargetCard('TP3', targets.tp3)}
          <div class="analysis-card">
            <span class="analysis-label">Negacja scenariusza (SL)</span>
            <span class="analysis-value">${analysis?.stopLoss || 'N/A'}</span>
          </div>
        </div>
        <div class="analysis-summary">
          <h3>Podsumowanie analizy</h3>
          <p>${analysis?.summary || 'Brak dostępnej analizy technicznej.'}</p>
          ${analysis?.completed && analysis.completionNote ? `<p class="analysis-completion-note">Powód realizacji: ${analysis.completionNote}</p>` : ''}
        </div>
        ${
          analysis?.analysisImage
            ? `<figure class="analysis-figure">
                <img src="${analysis.analysisImage}" alt="Analiza techniczna ${position.name}" loading="lazy" />
                <figcaption>Szczegóły analizy graficznej</figcaption>
              </figure>`
            : ''
        }
      </section>

      <section class="modifications-section">
        <div class="section-header">
          <h2>Historia modyfikacji</h2>
          <p>Wszystkie transakcje i zmiany pozycji</p>
        </div>
        <div class="modifications-list">
          ${
            modifications.length > 0
              ? modifications
                  .map(
                    mod => `
            <div class="modification-item">
              <div class="modification-header">
                <span class="modification-type ${mod.type}">${getModificationTypeLabel(mod.type)}</span>
                <span class="modification-date">${formatDate(mod.date)}</span>
              </div>
              <div class="modification-content">
                <p class="modification-description">${mod.description}</p>
                <div class="modification-details">
                  <span>Ilość: ${mod.amount}</span>
                  <span>Cena: ${mod.price}</span>
                </div>
              </div>
            </div>
          `,
                  )
                  .join('')
              : '<p class="empty-state">Brak historii modyfikacji.</p>'
          }
        </div>
      </section>

      <section class="insights-section">
        <div class="section-header">
          <h2>Wnioski i obserwacje</h2>
          <p>Analiza sytuacji rynkowej i perspektywy</p>
        </div>
        <div class="insights-list">
          ${
            insights.length > 0
              ? insights
                  .map(
                    insight => `
            <div class="insight-item">
              <div class="insight-header">
                <h3 class="insight-title">${insight.title}</h3>
                <span class="insight-date">${formatDate(insight.date)}</span>
              </div>
              <p class="insight-content">${insight.content}</p>
              <span class="insight-impact ${insight.impact}">${getImpactLabel(insight.impact)}</span>
            </div>
          `,
                  )
                  .join('')
              : '<p class="empty-state">Brak dostępnych wniosków.</p>'
          }
        </div>
      </section>
    </main>
  `;
}

function renderTargetCard(label: string, value?: string): string {
  return `
    <div class="analysis-card">
      <span class="analysis-label">${label}</span>
      <span class="analysis-value">${value || '—'}</span>
    </div>
  `;
}

function getTradingViewSymbol(positionId: string): string {
  const symbolMap: Record<string, string> = {
    'soxx': 'NASDAQ:SOXX',
    'msft': 'NASDAQ:MSFT',
    'dax': 'DEU:DAX',
    'gold': 'TVC:GOLD',
    'cash': 'FX:USDCASH',
  };
  return symbolMap[positionId.toLowerCase()] || 'NASDAQ:SOXX';
}

function getModificationTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'buy': 'Zakup',
    'sell': 'Sprzedaż',
    'adjust': 'Korekta',
  };
  return labels[type] || type;
}

function getImpactLabel(impact: string): string {
  const labels: Record<string, string> = {
    'positive': 'Pozytywny wpływ',
    'negative': 'Negatywny wpływ',
    'neutral': 'Neutralny wpływ',
  };
  return labels[impact] || impact;
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function setupPositionDetailsHandlers(): void {
  // Load TradingView widget using their embed method
  const containers = document.querySelectorAll('.chart-container[data-symbol]');
  
  containers.forEach((container) => {
    const symbol = container.getAttribute('data-symbol') || 'NASDAQ:SOXX';
    
    // Check if widget already loaded
    if (container.querySelector('.tradingview-widget-container')) {
      return;
    }
    
    // Clear container first
    container.innerHTML = '';
    
    // Create the widget HTML structure using DOM API
    // TradingView expects: container > widget div > scripts (loader + config)
    const widgetContainer = document.createElement('div');
    widgetContainer.className = 'tradingview-widget-container';
    
    const widgetDiv = document.createElement('div');
    widgetDiv.className = 'tradingview-widget-container__widget';
    widgetContainer.appendChild(widgetDiv);
    
    const config = {
      autosize: true,
      symbol: symbol,
      interval: 'D',
      timezone: 'Europe/Warsaw',
      theme: 'dark',
      style: '1',
      locale: 'pl',
      backgroundColor: '#0b1120',
      gridColor: 'rgba(148, 163, 184, 0.1)',
      withdateranges: true,
      range: '1M',
      hide_side_toolbar: false,
      allow_symbol_change: true,
      save_image: false,
      details: true,
      hotlist: true,
      calendar: false,
      support_host: 'https://www.tradingview.com'
    };
    
    // Create config script - must be before loader script
    // TradingView reads config from script tag with JSON textContent
    const configScript = document.createElement('script');
    configScript.type = 'text/javascript';
    configScript.textContent = JSON.stringify(config);
    widgetContainer.appendChild(configScript);
    
    // Create the loader script
    const loaderScript = document.createElement('script');
    loaderScript.type = 'text/javascript';
    loaderScript.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js';
    loaderScript.async = true;
    widgetContainer.appendChild(loaderScript);
    
    // Append widget container to our chart container
    container.appendChild(widgetContainer);
  });
}


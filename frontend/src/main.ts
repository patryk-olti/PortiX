import './style.css'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="page">
    <section class="hero">
      <p class="eyebrow">PortiX Analytics</p>
      <h1>Techniczne spojrzenie na rynek</h1>
      <p class="lede">
        Łączymy analizę makro, siłę trendów oraz śladowanie kapitału, aby
        podejmować decyzje inwestycyjne w oparciu o dane i scenariusze ryzyka.
      </p>
      <div class="hero-actions">
        <button type="button">Otwórz panel analityczny</button>
        <button type="button" class="secondary">Zdefiniuj założenia portfela</button>
      </div>
    </section>

    <section class="insights">
      <h2>Aktualny obraz rynku</h2>
      <p>
        Skanujemy główne indeksy, sektorowe rotacje oraz dynamikę wolumenów, aby
        zidentyfikować fazę cyklu i wyznaczyć poziomy, które wymagają uwagi.
      </p>
      <ul class="insights-highlights">
        <li>Trend wzrostowy utrzymany w interwale dziennym, ale momentum słabnie.</li>
        <li>Kapitał przepływa do spółek technologicznych i surowców krytycznych.</li>
        <li>Wolumen akumulacyjny rośnie, co wspiera scenariusz kontynuacji.</li>
      </ul>
    </section>

    <section class="ideas">
      <div class="section-header">
        <h2>Aktualne pomysły inwestycyjne</h2>
        <p>Krótka lista setupów, które monitorujemy w PortiX na najbliższe sesje.</p>
      </div>
      <div class="idea-grid">
        <article class="idea-card">
          <h3>NASDAQ Composite</h3>
          <p class="idea-summary">Wybicie z konsolidacji przy wzroście wolumenu.</p>
          <dl>
            <div>
              <dt>Strefa wejścia</dt>
              <dd>15 100 – 15 260</dd>
            </div>
            <div>
              <dt>Poziom obrony</dt>
              <dd>14 840</dd>
            </div>
            <div>
              <dt>Cel scenariusza</dt>
              <dd>15 980</dd>
            </div>
          </dl>
        </article>

        <article class="idea-card">
          <h3>EUR / USD</h3>
          <p class="idea-summary">Retest strefy wsparcia i budowa wyższego dołka.</p>
          <dl>
            <div>
              <dt>Strefa wejścia</dt>
              <dd>1.0800 – 1.0830</dd>
            </div>
            <div>
              <dt>Poziom obrony</dt>
              <dd>1.0750</dd>
            </div>
            <div>
              <dt>Cel scenariusza</dt>
              <dd>1.0970</dd>
            </div>
          </dl>
        </article>

        <article class="idea-card">
          <h3>Miedź 3M</h3>
          <p class="idea-summary">Budowa bazy pod wybicie przy rosnących zapasach.</p>
          <dl>
            <div>
              <dt>Strefa wejścia</dt>
              <dd>3.62 – 3.68</dd>
            </div>
            <div>
              <dt>Poziom obrony</dt>
              <dd>3.55</dd>
            </div>
            <div>
              <dt>Cel scenariusza</dt>
              <dd>3.92</dd>
            </div>
          </dl>
        </article>
      </div>
    </section>

    <section class="portfolio">
      <div class="section-header">
        <h2>Stan portfela PortiX</h2>
        <p>Monitorujemy alokację kapitału i reagujemy na zmiany struktury rynku.</p>
      </div>
      <div class="portfolio-metrics">
        <article class="metric">
          <span class="label">Wartość netto</span>
          <span class="value">254 800 PLN</span>
          <span class="change positive">+4.2% m/m</span>
        </article>
        <article class="metric">
          <span class="label">Ekspozycja akcyjna</span>
          <span class="value">62%</span>
          <span class="change neutral">balans</span>
        </article>
        <article class="metric">
          <span class="label">Ryzyko portfela</span>
          <span class="value">1.8% VaR</span>
          <span class="change warning">wzrost vs poprzedni tydzień</span>
        </article>
      </div>
      <div class="portfolio-notes">
        <p>
          Największa pozycja: sektor półprzewodników (28%). Dodano hedge na DAX
          w kontraktach terminowych. Sygnał redukcji jeśli momentum spadnie poniżej
          średniej 20-dniowej.
        </p>
      </div>
    </section>

    <section class="cta">
      <h2>Zaprojektuj kolejne ruchy</h2>
      <p>
        Twórz scenariusze techniczne, zarządzaj ekspozycją i dokumentuj decyzje w
        jednym miejscu.
      </p>
      <button type="button">Dodaj nową strategię</button>
    </section>
  </main>

  <footer class="footer">
    <small>© ${new Date().getFullYear()} PortiX. Wszystkie prawa zastrzeżone.</small>
    <nav>
      <a href="#">Status projektu</a>
      <a href="#">Dokumentacja</a>
      <a href="#">Kontakt</a>
    </nav>
  </footer>
`

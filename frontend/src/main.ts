import './style.css'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <main class="page">
    <section class="hero">
      <p class="eyebrow">PortiX</p>
      <h1>Portfel cyfrowych doświadczeń</h1>
      <p class="lede">
        Minimalny szkielet aplikacji, który pozwala szybko zbudować produkty
        łączące frontend, backend i Supabase.
      </p>
      <div class="hero-actions">
        <button type="button">Rozpocznij konfigurację</button>
        <button type="button" class="secondary">Zobacz plan rozwoju</button>
      </div>
    </section>

    <section class="features">
      <article class="feature">
        <h2>Frontend</h2>
        <p>React + Vite gotowe do iteracji z natychmiastowym odświeżaniem.</p>
      </article>
      <article class="feature">
        <h2>Backend</h2>
        <p>Express.js z nodemonem do szybkiego prototypowania API.</p>
      </article>
      <article class="feature">
        <h2>Supabase</h2>
        <p>PostgreSQL w chmurze i gotowe SDK do integracji danych.</p>
      </article>
    </section>

    <section class="cta">
      <h2>Bądź o krok do przodu</h2>
      <p>
        PortiX jest gotowy, aby rozszerzyć go o Twoje moduły, automatyzację i
        integracje.
      </p>
      <button type="button">Zaplanuj kolejne kroki</button>
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

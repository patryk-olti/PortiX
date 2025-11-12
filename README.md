# PortiX – dokumentacja techniczna

Kompleksowa aplikacja do zarządzania portfelem inwestycyjnym, z panelem administracyjnym do wprowadzania analiz technicznych oraz publiczną stroną prezentującą pozycje wraz z aktualnymi kursami. Poniższa dokumentacja opisuje architekturę, przepływ danych, kontrakty API, konfigurację środowisk oraz procedury uruchomieniowe i testowe.

---

## Spis treści

1. [Architektura rozwiązania](#architektura-rozwiązania)
2. [Wymagania wstępne](#wymagania-wstępne)
3. [Konfiguracja środowiska](#konfiguracja-środowiska)
4. [Backend](#backend)
   - [Struktura bazy danych](#struktura-bazy-danych)
   - [Zmienne środowiskowe](#zmienne-środowiskowe-backendu)
   - [Uruchomienie i tryby pracy](#uruchomienie-i-tryby-pracy-backendu)
   - [Testy](#testy-backend)
   - [Kontrakty API](#kontrakty-api)
   - [Integracje z dostawcami cen](#integracje-z-dostawcami-cen)
5. [Frontend](#frontend)
   - [Budowanie i uruchamianie](#budowanie-i-uruchamianie-frontend)
   - [Testy](#testy-frontend)
   - [Warstwa stanu i przepływ danych](#warstwa-stanu-i-przepływ-danych)
   - [Panel administracyjny – opis funkcji](#panel-administracyjny--opis-funkcji)
6. [Dodatkowe zasoby](#dodatkowe-zasoby)

---

## Architektura rozwiązania

```
├─ backend/          # Serwer Express + logika domenowa + integracje z dostawcami cen
├─ frontend/         # Aplikacja Vite/TypeScript renderująca panel administracyjny i stronę publiczną
├─ infrastructure/   # Pliki środowiskowe (m.in. wzorce plików .env)
└─ README.md         # Dokumentacja projektu
```

- **Baza danych:** Supabase (PostgreSQL) z własnym schematem oraz migracjami wykonywanymi dynamicznie przez backend (`ensureSchema`).
- **Integracje zewnętrzne:** TradingView, CoinGecko oraz Alpha Vantage dla aktualizacji bieżących kursów.
- **Stan aplikacji:** Po stronie frontendu zarządzany w lokalnym store z persistencją do `localStorage`.

---

## Wymagania wstępne

- Node.js ≥ 18
- npm ≥ 9
- Dostęp do instancji PostgreSQL (np. Supabase) z pluginem `pgcrypto`
- (Opcjonalnie) klucz API Alpha Vantage do pobierania kursów instrumentów giełdowych

---

## Konfiguracja środowiska

1. Zainstaluj zależności:

   ```bash
   cd backend
   npm install

   cd ../frontend
   npm install
   ```

2. Skonfiguruj plik `.env` w katalogu `backend` (szczegóły w sekcji [Zmienne środowiskowe backendu](#zmienne-środowiskowe-backendu)).

3. Upewnij się, że baza danych ma dostępny extension `pgcrypto` (w środowisku produkcyjnym/backendowym).

---

## Backend

### Struktura bazy danych

Kluczowe tabele (tworzone automatycznie przez `ensureSchema()`):

1. **`news`** – wpisy informacyjne na stronie.
2. **`portfolio_positions`** – główna tabela pozycji portfelowych z polami:
   - podstawowe dane (`symbol`, `name`, `category`, `position_type`, `purchase_price_label`),
   - metadane dot. wielkości pozycji (`position_size_*`),
   - ostatnie zaczytane kursy (`latest_*` oraz `latest_price_updated_at`),
   - identyfikator `quote_symbol` wskazujący źródło danych o kursie.
3. **`portfolio_position_snapshots`** – historia kursów i zwrotów każdej pozycji.
4. **`portfolio_position_analyses`** – szczegóły analizy technicznej powiązanej 1:1 z pozycją (trend, targety, SL, entry strategy, status zamknięcia).

Wszystkie operacje CRUD realizowane są poprzez warstwę serwisu `backend/src/lib/positions.js`.

### Zmienne środowiskowe backendu

| Zmienna                    | Opis                                                                 |
|---------------------------|----------------------------------------------------------------------|
| `SUPABASE_DB_URL`         | Adres połączenia do bazy PostgreSQL (wymagana).                      |
| `PORT`                    | Port serwera HTTP (domyślnie 3000).                                  |
| `CORS_ORIGINS`            | Lista dozwolonych originów (oddzielonych przecinkami).               |
| `CORS_ALLOW_ALL`          | Jeżeli `true`, zezwala na wszystkie originy.                         |
| `ALPHA_VANTAGE_API_KEY`   | Klucz do API Alpha Vantage (opcjonalny – gdy brak, następuje fallback). |

Wzorcowy plik `.env.example` znajduje się w `infrastructure/.env.example`.

### Uruchomienie i tryby pracy backendu

```bash
cd backend
npm run dev     # tryb developerski (nodemon)
npm start       # produkcyjny start serwera
```

Endpoint zdrowia: `GET /health`

### Testy (backend)

```
cd backend
npm test
```

W testach używany jest `pg-mem`, z mockami dostawców cen (TradingView, CoinGecko, Alpha Vantage). Testy pokrywają główne scenariusze CRUD pozycji i analiz.

### Kontrakty API

Wszystkie endpointy zwracają JSON z kluczem `data` (ewentualnie `error`).

#### Pozycje

- `GET /api/positions`
  - Zwraca aktualny stan portfela, wraz z najświeższymi kursami i analizą (jeśli istnieje).
- `POST /api/positions`
  - Tworzy nową pozycję (oraz opcjonalnie zapisuje analizę). Wymagane pola:
    - `symbol`, `name`, `category`, `positionType`, `purchasePrice`, `positionSizeType`.
    - `analysis` – obiekt z polami m.in. `trend`, `stopLoss`, `summary`, `entryStrategy`.
  - Odpowiedź: `201` + obiekt pozycji.
- `PATCH /api/positions/:id`
  - Aktualizacja metadanych pozycji (obecnie `quoteSymbol`).
- `DELETE /api/positions/:id`
  - Usuwa pozycję oraz wszystkie powiązane rekordy (`snapshots`, `analyses`).

#### Analizy techniczne

- `PUT /api/positions/:id/analysis`
  - Tworzy lub aktualizuje analizę. Weryfikowane pola: `trend`, `stopLoss`, `summary`, opcjonalne targety i status.
- `DELETE /api/positions/:id/analysis`
  - Usuwa analizę, pozostawiając samą pozycję.

#### Ceny (legacy)

- `POST /api/prices`
  - (Zachowane dla kompatybilności) pobiera kursy wyłącznie z TradingView. Aktualnie głównym źródłem kursów jest `GET /api/positions`.

### Integracje z dostawcami cen

Backend rozpoznaje prefiks `quoteSymbol`, aby dobrać odpowiednie źródło:

| Prefiks          | Dostawca        | Przykład             | Wymagania            |
|------------------|-----------------|----------------------|----------------------|
| `ALPHA:`         | Alpha Vantage   | `ALPHA:CL=F`         | Wymagany API key     |
| `COINGECKO:`     | CoinGecko       | `COINGECKO:bitcoin:usd` | Brak dodatkowych wymagań |
| brak / `BINANCE:`| TradingView / Binance | `BINANCE:BTCUSDT` | Fallback dla kryptowalut |
| `TVC:`, `NASDAQ:`| TradingView     | `TVC:USOIL`, `NASDAQ:MSFT` | Brak               |

Jeżeli dostawca nie jest dostępny (np. brak API key), backend automatycznie wraca do TradingView i loguje ostrzeżenie.

---

## Frontend

Aplikacja TypeScript + Vite. UI obejmuje:

- Stronę główną z tabelą pozycji (aktualny kurs, wartość pozycji, zwrot procentowy),
- Szczegóły pojedynczej pozycji (opis, analiza techniczna),
- Panel administracyjny do zarządzania pozycjami i analizami.

### Budowanie i uruchamianie (frontend)

```bash
cd frontend
npm run dev       # tryb developerski (domyślnie http://localhost:5173)
npm run build     # build produkcyjny (wynik w katalogu dist/)
npm run preview   # podgląd builda
```

### Testy (frontend)

```
cd frontend
npm test
```

Testy bazują na Vitest + jsdom i obejmują m.in. scenariusze:

- `replacePositions` – poprawne przeniesienie analiz z API do store,
- `removePositionFromStore` – usunięcie pozycji wraz z powiązanymi danymi.

### Warstwa stanu i przepływ danych

- Plik `src/store.ts` odpowiada za wszystkie mutacje stanu (pozycje, analizy, modyfikacje, insighty, statusy).
- Dane są przechowywane w `localStorage` pod kluczem `portix-admin-state-v1`. Przy starcie wykonywana jest migracja stanu (m.in. wyliczanie kursów, ustawienia symboli).
- Najważniejsze funkcje:
  - `replacePositions`: przepina stan na dane z backendu, zachowując spójność analiz i czyszcząc nieużywane rekordy,
  - `addPosition`: dodaje/aktualizuje pozycję wraz z analizą, insightami i modyfikacjami,
  - `removePositionFromStore`: usuwa pozycję i powiązane informacje z magazynu,
  - `applyPositionUpdate`: służy do synchronizacji po aktualizacji metadanych (np. `quoteSymbol`).

### Panel administracyjny – opis funkcji

- **Dodawanie pozycji:** Formularz w układzie 3-kolumnowym z polami:
  - podstawowe dane (nazwa, kategoria, typ),
  - parametry wielkości (kapitał / jednostki / pipsy) wraz z obliczeniem wartości pozycji,
  - analiza techniczna (trend, strategia wejścia, targety, obraz analizy),
  - symbol TradingView z tooltipem opisującym prefiksy (`ALPHA:`, `BINANCE:`, itp.).
- **Edycja analizy:** Możliwość aktualizacji analizy, zmiany symbolu, oznaczenia zamknięcia pozycji, dodania notatki i daty.
- **Usuwanie analizy/pozycji:** Dedykowane przyciski usuwające odpowiednio samą analizę lub całkowicie pozycję z bazy.
- **Zamykanie pozycji:** Markowanie analizy jako zamkniętej z dodatkowym komentarzem.
- **Aktualne kursy:** Wczytywane z backendu (stan `currentPrice` oraz `positionTotalValueLabel`).

---

## Dodatkowe zasoby

- `backend/tests/*` – testy integracyjne backendu.
- `frontend/tests/*` – testy funkcjonalne store w panelu.
- `infrastructure/.env.example` – lista wymaganych zmiennych środowiskowych.
- `frontend/src/style.css` – globalne style (m.in. layout formularzy, tooltipy, buttons).

W razie potrzeby rozbudowy dokumentacji warto rozważyć:

- Diagram architektury (np. w katalogu `docs/`),
- Instrukcję wdrożenia produkcyjnego (Docker, CI/CD),
- Scenariusze testowe E2E (np. Playwright/Cypress) dla krytycznych ścieżek.

---

> Dokumentacja utrzymana w języku polskim zgodnie z komunikacją projektu. W przypadku współpracy w międzynarodowym zespole zaleca się przygotowanie równoległej wersji anglojęzycznej.

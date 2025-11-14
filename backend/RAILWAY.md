# Deployment na Railway - Szybki Przewodnik

## Problem: `SUPABASE_DB_URL is not defined`

Jeśli widzisz ten błąd na Railway, oznacza to, że nie ustawiłeś zmiennych środowiskowych w panelu Railway.

## Rozwiązanie - Krok po kroku

### 1. Ustaw zmienne środowiskowe w Railway

**WAŻNE:** Zmienne środowiskowe muszą być ustawione na poziomie **SERWISU**, nie projektu!

1. Zaloguj się do [Railway](https://railway.app)
2. Otwórz swój projekt
3. **Kliknij na konkretny serwis** (nie na projekt)
4. Przejdź do zakładki **"Variables"** (lub **"Settings"** → **"Variables"**)
5. Dodaj następujące zmienne:

**Uwaga:** Jeśli ustawisz zmienne na poziomie projektu, mogą nie być widoczne dla serwisu. Zawsze ustawiaj je na poziomie serwisu!

Wszystkie zmienne środowiskowe są szczegółowo udokumentowane w pliku **`env.example`** w folderze backend.

**Wymagane:**
- `SUPABASE_DB_URL` - Connection string do bazy danych PostgreSQL (Supabase)

**Opcjonalne:**
- `PORT` - Port serwera (Railway ustawia automatycznie)
- `NODE_ENV` - Tryb środowiska (`production`, `development`, `test`)
- `CORS_ALLOW_ALL` - Zezwól na wszystkie originy (domyślnie: `false`)
- `CORS_ORIGINS` - Lista dozwolonych originów oddzielonych przecinkami
- `ALPHA_VANTAGE_API_KEY` - Klucz API Alpha Vantage (opcjonalny)

Zobacz **`backend/env.example`** dla szczegółowej dokumentacji każdej zmiennej.

### 2. Skonfiguruj ustawienia buildu (jeśli potrzebne)

Jeśli Twój backend jest w folderze `backend/` w monorepo:

1. W projekcie Railway, kliknij na serwis
2. Przejdź do **"Settings"**
3. W sekcji **"Build"**, ustaw:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install` (lub zostaw puste, Railway wykryje automatycznie)
   - **Start Command**: `npm start` (lub zostaw puste)

### 3. Sprawdź logi

1. Po zapisaniu zmiennych, Railway automatycznie przebuduje aplikację
2. Przejdź do zakładki **"Deployments"** lub **"Logs"**
3. Sprawdź, czy aplikacja startuje poprawnie
4. Powinieneś zobaczyć: `PortiX backend listening on port XXXX`

### 4. Testuj endpoint

1. Railway automatycznie przypisze URL do Twojego serwisu
2. Sprawdź endpoint: `https://twoj-url.railway.app/health`
3. Powinieneś otrzymać odpowiedź: `{"status":"ok","db":"connected"}`

## Troubleshooting

### Problem: Aplikacja nadal nie startuje - `SUPABASE_DB_URL is not defined`

**Najczęstsze przyczyny:**

1. **Zmienna ustawiona na złym poziomie**
   - ❌ Zmienna ustawiona na poziomie **projektu** (Project Variables)
   - ✅ Zmienna musi być ustawiona na poziomie **serwisu** (Service Variables)
   - **Rozwiązanie:** Kliknij na serwis (nie projekt) → Variables → Dodaj zmienną

2. **Błędna nazwa zmiennej**
   - Sprawdź, czy nazwa to dokładnie `SUPABASE_DB_URL` (wielkie litery, podkreślnik)
   - Nie używaj spacji ani innych znaków

3. **Zmienna nie została zapisana**
   - Po dodaniu zmiennej, upewnij się, że kliknąłeś "Save" lub "Add"
   - Railway automatycznie przebuduje aplikację po zapisaniu

4. **Sprawdź logi diagnostyczne**
   - W logach Railway powinieneś zobaczyć:
     - `Available environment variables: ...` (jeśli DEBUG_ENV=true)
     - `SUPABASE_DB_URL is set: true/false`
   - Jeśli widzisz `SUPABASE_DB_URL is set: false`, zmienna nie jest dostępna

5. **Wymuś przebudowę**
   - Po dodaniu zmiennej, Railway powinien automatycznie przebudować
   - Jeśli nie, kliknij "Redeploy" w zakładce "Deployments"

**Jak sprawdzić czy zmienna jest ustawiona:**
- W logach Railway szukaj: `Available environment variables count: X`
- Jeśli widzisz `No SUPABASE/DATABASE related environment variables found`, zmienna nie jest dostępna
- Sprawdź czy widzisz inne zmienne Railway (np. `PORT`, `RAILWAY_ENVIRONMENT`)

### Problem: Błąd połączenia z bazą danych

1. **Sprawdź firewall Supabase** - Upewnij się, że Supabase pozwala na połączenia z zewnątrz
2. **Sprawdź connection string** - Zweryfikuj, że używasz poprawnego connection stringa z Supabase
3. **Sprawdź pooler** - Upewnij się, że używasz portu pooler (zwykle 6543), nie bezpośredniego (5432)

### Problem: CORS errors

1. Ustaw `CORS_ORIGINS` z URL-em Twojego frontendu
2. Lub tymczasowo ustaw `CORS_ALLOW_ALL=true` do testowania (nie używaj w produkcji)

## Przydatne linki

- [Railway Documentation](https://docs.railway.app)
- [Railway Environment Variables](https://docs.railway.app/deploy/environment-variables)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)


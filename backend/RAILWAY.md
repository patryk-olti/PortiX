# Deployment na Railway - Szybki Przewodnik

## Problem: `SUPABASE_DB_URL is not defined`

Jeśli widzisz ten błąd na Railway, oznacza to, że nie ustawiłeś zmiennych środowiskowych w panelu Railway.

## Rozwiązanie - Krok po kroku

### 1. Ustaw zmienne środowiskowe w Railway

1. Zaloguj się do [Railway](https://railway.app)
2. Otwórz swój projekt
3. Przejdź do zakładki **"Variables"** (lub kliknij na serwis → **"Variables"**)
4. Dodaj następujące zmienne:

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

### Problem: Aplikacja nadal nie startuje

1. **Sprawdź logi** - Railway pokazuje szczegółowe logi w zakładce "Logs"
2. **Zweryfikuj zmienne** - Upewnij się, że wszystkie zmienne są ustawione poprawnie (bez spacji, cudzysłowów)
3. **Sprawdź connection string** - Upewnij się, że `SUPABASE_DB_URL` jest poprawny i zawiera wszystkie wymagane parametry

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


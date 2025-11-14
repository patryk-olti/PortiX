# Deployment Frontendu - Szybki Przewodnik

## Problem: `ERR_CONNECTION_REFUSED` lub `Failed to fetch`

Jeśli widzisz błędy typu:
- `Failed to load resource: net::ERR_CONNECTION_REFUSED`
- `Failed to fetch`
- `Failed to synchronize positions from API`

To oznacza, że frontend próbuje połączyć się z backendem na `localhost:3000`, ale backend jest na Railway (lub innej platformie).

## Rozwiązanie

### 1. Znajdź URL backendu z Railway

1. Zaloguj się do [Railway](https://railway.app)
2. Otwórz projekt z backendem
3. Kliknij na serwis backendu
4. W zakładce **"Settings"** → **"Networking"** znajdź **"Public Domain"**
5. Skopiuj URL (np. `https://backend-xxxxx.railway.app`)

### 2. Ustaw zmienną środowiskową `VITE_API_BASE_URL`

#### Lokalny development (jeśli uruchamiasz frontend lokalnie)

1. Stwórz plik `frontend/.env.local`:
   ```bash
   cd frontend
   cp env.example .env.local
   ```

2. Edytuj `frontend/.env.local`:
   ```
   VITE_API_BASE_URL=https://twoj-backend.railway.app
   ```
   Zastąp `https://twoj-backend.railway.app` URL-em Twojego backendu z Railway.

3. Uruchom ponownie dev server:
   ```bash
   npm run dev
   ```

#### Produkcja (Vercel/Netlify/Railway)

**Vercel:**
1. W projekcie Vercel, przejdź do **"Settings"** → **"Environment Variables"**
2. Dodaj zmienną:
   - **Name:** `VITE_API_BASE_URL`
   - **Value:** `https://twoj-backend.railway.app` (URL Twojego backendu)
   - **Environment:** Production, Preview, Development
3. Kliknij **"Save"**
4. Vercel automatycznie przebuduje aplikację

**Netlify:**
1. W projekcie Netlify, przejdź do **"Site settings"** → **"Environment variables"**
2. Kliknij **"Add a variable"**
3. Dodaj:
   - **Key:** `VITE_API_BASE_URL`
   - **Value:** `https://twoj-backend.railway.app` (URL Twojego backendu)
4. Kliknij **"Save"**
5. Netlify automatycznie przebuduje aplikację

**Railway:**
1. W projekcie Railway, kliknij na serwis frontendu
2. Przejdź do zakładki **"Variables"**
3. Dodaj zmienną:
   - **Name:** `VITE_API_BASE_URL`
   - **Value:** `https://twoj-backend.railway.app` (URL Twojego backendu)
4. Railway automatycznie przebuduje aplikację

### 3. Skonfiguruj CORS w backendzie

Upewnij się, że backend zezwala na żądania z domeny frontendu:

1. W Railway, w serwisie backendu, przejdź do zakładki **"Variables"**
2. Dodaj zmienną `CORS_ORIGINS`:
   - **Name:** `CORS_ORIGINS`
   - **Value:** URL Twojego frontendu (np. `https://twoj-frontend.vercel.app`)
   - Jeśli masz kilka domen, oddziel je przecinkami: `https://frontend.vercel.app,https://www.twoja-domena.com`
3. Railway automatycznie przebuduje backend

### 4. Sprawdź czy działa

1. Otwórz frontend w przeglądarce
2. Otwórz konsolę deweloperską (F12)
3. Sprawdź logi:
   - Powinieneś zobaczyć: `[API] Using explicit API base URL: https://twoj-backend.railway.app`
   - Jeśli widzisz ostrzeżenie o braku `VITE_API_BASE_URL`, zmienna nie jest ustawiona
4. Sprawdź czy aplikacja ładuje dane z backendu

## Troubleshooting

### Problem: Nadal widzę błąd `ERR_CONNECTION_REFUSED`

1. **Sprawdź czy zmienna jest ustawiona:**
   - W konsoli przeglądarki sprawdź logi - powinieneś zobaczyć `[API] Using explicit API base URL: ...`
   - Jeśli nie widzisz tego loga, zmienna nie jest ustawiona

2. **Sprawdź czy URL backendu jest poprawny:**
   - Upewnij się, że URL backendu zaczyna się od `https://`
   - Upewnij się, że URL nie kończy się na `/`
   - Sprawdź czy backend działa: otwórz `https://twoj-backend.railway.app/health` w przeglądarce

3. **Sprawdź CORS:**
   - W konsoli przeglądarki sprawdź czy widzisz błędy CORS
   - Jeśli widzisz błędy CORS, upewnij się, że `CORS_ORIGINS` w backendzie zawiera URL frontendu

### Problem: Frontend działa lokalnie, ale nie w produkcji

1. **Sprawdź czy zmienna jest ustawiona w produkcji:**
   - W Vercel/Netlify/Railway sprawdź czy zmienna `VITE_API_BASE_URL` jest ustawiona
   - Upewnij się, że zmienna jest ustawiona dla środowiska "Production"

2. **Przebuduj aplikację:**
   - Po dodaniu zmiennej środowiskowej, aplikacja musi zostać przebudowana
   - W Vercel/Netlify kliknij "Redeploy"
   - W Railway przebudowa nastąpi automatycznie

### Problem: Błędy CORS

1. **Sprawdź czy `CORS_ORIGINS` jest ustawione:**
   - W backendie (Railway) sprawdź czy zmienna `CORS_ORIGINS` zawiera URL frontendu
   - Upewnij się, że URL jest dokładnie taki sam (z `https://`, bez końcowego `/`)

2. **Tymczasowo zezwól na wszystkie originy (tylko do testowania):**
   - W backendie ustaw `CORS_ALLOW_ALL=true`
   - **UWAGA:** Nie używaj tego w produkcji!

## Szybki test

Aby szybko sprawdzić czy backend jest dostępny:

1. Otwórz w przeglądarce: `https://twoj-backend.railway.app/health`
2. Powinieneś zobaczyć: `{"status":"ok","db":"connected"}`
3. Jeśli widzisz błąd, backend nie jest dostępny lub URL jest niepoprawny

## Przydatne linki

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Railway Environment Variables](https://docs.railway.app/deploy/environment-variables)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)


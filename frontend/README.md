## PortiX Frontend

### Environment Variables

Wszystkie zmienne środowiskowe są udokumentowane w pliku **`env.example`**.

#### Local Development

1. Skopiuj plik przykładowy (opcjonalnie):
   ```bash
   cp env.example .env.local
   ```

2. Uzupełnij wartości w pliku `.env.local` (opcjonalnie):
   - `VITE_API_BASE_URL=http://localhost:3000` - URL do backendu (domyślnie używany automatycznie)

3. Zainstaluj zależności i uruchom:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

#### Production Build

1. Ustaw zmienną środowiskową `VITE_API_BASE_URL` (jeśli backend i frontend są na różnych domenach):
   - Przykład: `VITE_API_BASE_URL=https://twoj-backend.railway.app`

2. Zbuduj aplikację:
   ```bash
   cd frontend
   npm install
   npm run build
   ```

3. Zbudowane pliki znajdziesz w folderze `dist/`

#### Jak działa rozpoznawanie URL backendu?

1. **Jeśli `VITE_API_BASE_URL` jest ustawione** → używa tego URL
2. **Jeśli frontend działa na porcie deweloperskim** (5173, 4173) → używa `http://localhost:3000`
3. **W przeciwnym razie** → używa `window.location.origin` (ta sama domena co frontend)

**W praktyce:**
- **Lokalny development:** Nie musisz nic ustawiać, automatycznie użyje `localhost:3000`
- **Produkcja (ta sama domena):** Nie musisz nic ustawiać, automatycznie użyje tej samej domeny
- **Produkcja (różne domeny):** Ustaw `VITE_API_BASE_URL` na URL backendu

### Deployment

#### Vercel (Rekomendowane)

1. **Połącz repozytorium z Vercel:**
   - Zaloguj się do [Vercel](https://vercel.com)
   - Kliknij "New Project"
   - Wybierz repozytorium z GitHub

2. **Skonfiguruj projekt:**
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - **Install Command:** `npm install`

3. **Ustaw zmienne środowiskowe:**
   - Jeśli backend jest na innej domenie, dodaj:
     - `VITE_API_BASE_URL` = URL Twojego backendu (np. `https://twoj-backend.railway.app`)

4. **Deploy:**
   - Vercel automatycznie zbuduje i wdroży aplikację
   - Po każdym push do głównej gałęzi, aplikacja zostanie automatycznie przebudowana

#### Netlify

1. **Połącz repozytorium z Netlify:**
   - Zaloguj się do [Netlify](https://netlify.com)
   - Kliknij "New site from Git"
   - Wybierz repozytorium

2. **Skonfiguruj build:**
   - **Base directory:** `frontend`
   - **Build command:** `npm run build`
   - **Publish directory:** `frontend/dist`

3. **Ustaw zmienne środowiskowe:**
   - Site settings → Environment variables
   - Jeśli backend jest na innej domenie, dodaj:
     - `VITE_API_BASE_URL` = URL Twojego backendu

4. **Deploy:**
   - Netlify automatycznie zbuduje i wdroży aplikację

#### Railway

1. **Dodaj nowy serwis w Railway:**
   - W projekcie Railway, kliknij "+ New" → "GitHub Repo"
   - Wybierz repozytorium

2. **Skonfiguruj build:**
   - **Root Directory:** `frontend`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npx serve dist -s -l 3000`
   - **Output Directory:** `dist`

3. **Ustaw zmienne środowiskowe:**
   - Jeśli backend jest na innej domenie, dodaj:
     - `VITE_API_BASE_URL` = URL Twojego backendu (np. `https://twoj-backend.railway.app`)

4. **Deploy:**
   - Railway automatycznie zbuduje i wdroży aplikację

#### Statyczny hosting (np. GitHub Pages, S3, Cloudflare Pages)

1. **Zbuduj aplikację lokalnie:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Ustaw `VITE_API_BASE_URL` przed buildem:**
   ```bash
   export VITE_API_BASE_URL=https://twoj-backend.railway.app
   npm run build
   ```
   Lub stwórz plik `.env.production`:
   ```
   VITE_API_BASE_URL=https://twoj-backend.railway.app
   ```

3. **Wdróż zawartość folderu `dist/`** na wybrany hosting statyczny

### CORS Configuration

Upewnij się, że backend ma skonfigurowane CORS, aby zezwolić na żądania z domeny frontendu:

- W backendie, ustaw `CORS_ORIGINS` z URL-em frontendu (np. `https://twoj-frontend.vercel.app`)
- Lub ustaw `CORS_ALLOW_ALL=true` (niezalecane w produkcji)

### Troubleshooting

Jeśli widzisz błędy typu `ERR_CONNECTION_REFUSED` lub `Failed to fetch`, zobacz **`DEPLOYMENT.md`** dla szczegółowego przewodnika rozwiązywania problemów.

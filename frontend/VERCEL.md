# Deployment na Vercel - Szybki Przewodnik

## Krok 1: Przygotowanie repozytorium

Upewnij się, że Twój kod jest w repozytorium Git (GitHub, GitLab, Bitbucket).

## Krok 2: Połącz projekt z Vercel

1. Zaloguj się do [Vercel](https://vercel.com)
2. Kliknij **"Add New..."** → **"Project"**
3. Zaimportuj repozytorium z frontendem
4. Vercel automatycznie wykryje, że to projekt Vite

## Krok 3: Konfiguracja projektu

### Ustawienia Build:

- **Framework Preset:** Vite (powinno być wykryte automatycznie)
- **Root Directory:** `frontend` (jeśli frontend jest w podfolderze)
- **Build Command:** `npm run build` (domyślnie)
- **Output Directory:** `dist` (domyślnie dla Vite)
- **Install Command:** `npm install` (domyślnie)

### Zmienne środowiskowe:

1. W ustawieniach projektu, przejdź do **"Environment Variables"**
2. Dodaj zmienną:
   - **Name:** `VITE_API_BASE_URL`
   - **Value:** URL Twojego backendu (np. `https://twoj-backend.railway.app`)
   - **Environment:** Production, Preview, Development (zaznacz wszystkie)

**WAŻNE:** 
- Jeśli backend i frontend są na tej samej domenie, nie musisz ustawiać `VITE_API_BASE_URL`
- Jeśli są na różnych domenach, ustaw `VITE_API_BASE_URL` na URL backendu

## Krok 4: Deployment

1. Kliknij **"Deploy"**
2. Vercel automatycznie:
   - Zainstaluje zależności (`npm install`)
   - Zbuduje projekt (`npm run build`)
   - Wdroży pliki z folderu `dist`

## Krok 5: Weryfikacja

1. Po zakończeniu deploymentu, Vercel przypisze URL (np. `https://twoj-projekt.vercel.app`)
2. Otwórz aplikację w przeglądarce
3. Sprawdź konsolę przeglądarki (F12):
   - Powinieneś zobaczyć: `[API] Using explicit API base URL: https://twoj-backend.railway.app`
   - Jeśli widzisz ostrzeżenie o braku `VITE_API_BASE_URL`, sprawdź czy zmienna jest ustawiona

## Automatyczne deploymenty

Vercel automatycznie wdraża:
- **Production:** przy pushu do głównej gałęzi (zwykle `main` lub `master`)
- **Preview:** przy każdym pull requeście lub pushu do innych gałęzi

## Troubleshooting

### Problem: Build się nie udaje

1. **Sprawdź logi builda** w Vercel Dashboard
2. **Sprawdź czy Root Directory jest ustawione** na `frontend` (jeśli frontend jest w podfolderze)
3. **Sprawdź czy wszystkie zależności są w `package.json`**

### Problem: Aplikacja nie łączy się z backendem

1. **Sprawdź czy `VITE_API_BASE_URL` jest ustawione** w Environment Variables
2. **Sprawdź czy URL backendu jest poprawny** (zaczyna się od `https://`)
3. **Sprawdź CORS w backendzie** - upewnij się, że `CORS_ORIGINS` zawiera URL frontendu z Vercel

### Problem: Strony nie ładują się po odświeżeniu (404)

Vercel automatycznie konfiguruje rewrites dla SPA dzięki plikowi `vercel.json`. Jeśli nadal masz problemy:
- Sprawdź czy plik `vercel.json` jest w folderze `frontend/`
- Sprawdź czy `outputDirectory` w `vercel.json` to `dist`

## Przydatne linki

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vite Deployment Guide](https://vitejs.dev/guide/static-deploy.html#vercel)


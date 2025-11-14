## PortiX Backend

### Environment Variables

Wszystkie zmienne środowiskowe są udokumentowane w pliku **`env.example`**.

#### Local Development

1. Skopiuj plik przykładowy:
   ```bash
   cp env.example .env
   ```

2. Uzupełnij wartości w pliku `.env` (przynajmniej `SUPABASE_DB_URL`)

3. Uruchom aplikację:
   ```bash
   npm start
   ```

#### Production (Railway/Render/etc)

Ustaw zmienne środowiskowe w panelu platformy hostingowej zgodnie z dokumentacją w `env.example`.

**Wymagane:**
- `SUPABASE_DB_URL` - Connection string do bazy danych PostgreSQL (Supabase)

**Opcjonalne:**
- `PORT` - Port serwera (domyślnie: 3000, Railway ustawia automatycznie)
- `NODE_ENV` - Tryb środowiska (`production`, `development`, `test`)
- `CORS_ALLOW_ALL` - Zezwól na wszystkie originy (domyślnie: `false`)
- `CORS_ORIGINS` - Lista dozwolonych originów oddzielonych przecinkami
- `ALPHA_VANTAGE_API_KEY` - Klucz API Alpha Vantage (opcjonalny)

Szczegóły i przykłady: zobacz **`env.example`**

### Development

```
cd backend
npm install
npm start
```

`/health` ↦ verifies database connectivity.

### Deployment on Railway

1. **Create a new project on Railway:**
   - Go to [Railway](https://railway.app)
   - Click "New Project"
   - Select "Deploy from GitHub repo" (or upload your code)

2. **Configure environment variables:**
   - In your Railway project, go to "Variables" tab
   - Add the following variables:
     - `SUPABASE_DB_URL` - Your Supabase PostgreSQL connection string
     - `CORS_ORIGINS` - Your frontend URL(s) (e.g., `https://yourdomain.com`)
     - Optionally: `CORS_ALLOW_ALL=true` if you want to allow all origins

3. **Configure build settings:**
   - Railway should auto-detect Node.js
   - Root directory: `backend` (if deploying from monorepo)
   - Build command: `npm install`
   - Start command: `npm start`

4. **Deploy:**
   - Railway will automatically deploy on every push to your main branch
   - Check logs to verify the deployment
   - Your backend will be available at the Railway-generated URL

**Note:** Railway automatically sets the `PORT` environment variable, so you don't need to configure it manually.

### News API

`POST /api/news`

```json
{
  "title": "string",
  "summary": "string",
  "importance": "critical | important | informational",
  "publishedOn": "YYYY-MM-DD" // optional
}
```

`GET /api/news?limit=20`

```json
{
  "data": [
    {
      "id": "<uuid>",
      "title": "...",
      "summary": "...",
      "importance": "important",
      "publishedOn": "2025-11-10",
      "createdAt": "2025-11-10T11:47:43.027Z",
      "updatedAt": "2025-11-10T11:47:43.027Z"
    }
  ]
}
```

`PUT /api/news/:id`

Request body (any field optional):

```json
{
  "title": "string",
  "summary": "string",
  "importance": "critical | important | informational",
  "publishedOn": "YYYY-MM-DD"
}
```

Response `200`:

```json
{
  "data": {
    "id": "<uuid>",
    "title": "...",
    "summary": "...",
    "importance": "important",
    "publishedOn": "2025-11-10",
    "createdAt": "2025-11-10T11:47:43.027Z",
    "updatedAt": "2025-11-10T11:47:43.027Z"
  }
}
```

`DELETE /api/news/:id`

Response `200`:

```json
{ "success": true }
```

Response `201`:

```json
{
  "data": {
    "id": "<uuid>",
    "title": "...",
    "summary": "...",
    "importance": "important",
    "publishedOn": "2025-11-10",
    "createdAt": "2025-11-10T11:47:43.027Z",
    "updatedAt": "2025-11-10T11:47:43.027Z"
  }
}
```


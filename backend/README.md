## PortiX Backend

### Environment

Create `backend/.env` with:

```
SUPABASE_DB_URL=postgresql://postgres.pmgyenfmgzncyfawshls:P1w2rt2c%26@aws-1-eu-west-1.pooler.supabase.com:6543/postgres
```

### Development

```
cd backend
npm install
npm start
```

`/health` ↦ verifies database connectivity.

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


## PortiX Frontend

### Development

```bash
cd frontend
npm install
npm run dev
```

During local development the backend API runs on `http://localhost:3000`. Create `frontend/.env.local` with:

```
VITE_API_BASE_URL=http://localhost:3000
```

The build (`npm run build`) uses `VITE_API_BASE_URL` to contact the backend when submitting or fetching news updates.  
If the variable is not provided, the app will try to detect the backend automatically (when running on the Vite dev server it falls back to `http://localhost:3000`).

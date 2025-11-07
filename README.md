# PortiX

PortiX to szkic aplikacji webowej skladajacej sie z trzech warstw:

- **Frontend**: React (Vite) odpowiada za interfejs uzytkownika
- **Backend**: Express.js zapewnia warstwe API
- **Database**: Supabase (PostgreSQL) jako zarzadzana warstwa danych

## Struktura projektu

```
.
|- backend/          # Szkielet serwera Express
|- frontend/         # Szkielet aplikacji React
|- infrastructure/   # Pliki srodowiskowe i przyszla konfiguracja infrastruktury
\- README.md
```

## Wymagania wstepne

- Node.js >= 18
- npm >= 9

## Uruchomienie srodowiska deweloperskiego

### Frontend

```
cd frontend
npm install
npm run dev
```

Aplikacja domyslnie startuje na porcie 5173.

### Backend

```
cd backend
npm install
npm run dev
```

Serwer nasluchuje na porcie zdefiniowanym w zmiennej PORT (domyslnie 3000).

## Konfiguracja Supabase

W katalogu infrastructure znajduje sie plik .env.example z wymaganymi zmiennymi srodowiskowymi. Przed uruchomieniem backendu skopiuj go do .env i uzupelnij danymi swojego projektu Supabase.

```
cp infrastructure/.env.example backend/.env
```

## Nastepne kroki

- Zaimplementowac logike API w Express oraz warstwe dostepu do Supabase
- Zdefiniowac kontrakty komunikacji miedzy frontendem i backendem
- Dodac konfiguracje CI/CD oraz orkiestracje srodowisk
- Przygotowac testy jednostkowe i integracyjne

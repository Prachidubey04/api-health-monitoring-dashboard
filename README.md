# API Health Monitor

A local API monitoring dashboard built with FastAPI, SQLite, React, Vite, and Recharts. It checks three public test APIs, records each result locally, and displays live service status, response times, uptime, and recent checks.

## Requirements

- Python 3.10 or newer
- Node.js 20.19+ or 22.12+
- Internet access for checking the monitored public APIs

## Run locally

From the project root, open two terminals.

Backend:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m uvicorn backend.main:app --reload
```

The API is at http://127.0.0.1:8000. On startup it checks all three APIs and creates `backend/monitoring.db`.

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The Vite development server proxies `/health`, `/services`, `/check`, and `/history` to the backend.

## API

- `GET /health` reports backend liveness.
- `GET /services` returns configured services and their latest results and observed uptime.
- `POST /check` checks all services and persists each result.
- `GET /history?limit=60` returns recent stored checks (limit 1-500).

Set `DATABASE_PATH` to use a different SQLite file. Uptime is calculated from all stored checks, not an external uptime provider.
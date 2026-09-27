from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

from backend.database import (
    fetch_history,
    fetch_latest_by_service,
    fetch_uptime_by_service,
    initialize_database,
)
from backend.monitor import SERVICES, run_checks


@asynccontextmanager
async def lifespan(_: FastAPI):
    initialize_database()
    await run_checks()
    yield


app = FastAPI(title="API Health Monitor", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/services")
def services() -> dict[str, Any]:
    latest = fetch_latest_by_service()
    uptime = fetch_uptime_by_service()
    entries = []
    for service in SERVICES:
        recent = latest.get(service["service_id"], {})
        entries.append(
            {
                **service,
                "status": recent.get("status", "PENDING"),
                "status_code": recent.get("status_code"),
                "response_time_ms": recent.get("response_time_ms"),
                "error": recent.get("error"),
                "last_checked": recent.get("checked_at"),
                "uptime_percent": uptime.get(service["service_id"], 0),
            }
        )
    return {"services": entries}


@app.post("/check")
async def check() -> dict[str, Any]:
    results = await run_checks()
    return {"checked": len(results), "results": results}


@app.get("/history")
def history(limit: int = Query(default=60, ge=1, le=500)) -> dict[str, Any]:
    return {"events": fetch_history(limit)}
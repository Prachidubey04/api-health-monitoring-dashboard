import os
import sqlite3
from pathlib import Path
from typing import Any


DATABASE_PATH = Path(
    os.getenv("DATABASE_PATH", Path(__file__).with_name("monitoring.db"))
)


def get_connection() -> sqlite3.Connection:
    DATABASE_PATH.parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS checks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                service_id TEXT NOT NULL,
                name TEXT NOT NULL,
                url TEXT NOT NULL,
                status TEXT NOT NULL,
                status_code INTEGER,
                response_time_ms REAL,
                error TEXT,
                checked_at TEXT NOT NULL
            )
            """
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_checks_service_checked "
            "ON checks(service_id, checked_at DESC)"
        )


def insert_check(result: dict[str, Any]) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO checks (
                service_id, name, url, status, status_code,
                response_time_ms, error, checked_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                result["service_id"],
                result["name"],
                result["url"],
                result["status"],
                result["status_code"],
                result["response_time_ms"],
                result["error"],
                result["checked_at"],
            ),
        )


def fetch_history(limit: int = 100) -> list[dict[str, Any]]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT * FROM checks ORDER BY checked_at DESC, id DESC LIMIT ?",
            (limit,),
        ).fetchall()
    return [dict(row) for row in rows]


def fetch_latest_by_service() -> dict[str, dict[str, Any]]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT checks.* FROM checks
            INNER JOIN (
                SELECT service_id, MAX(id) AS latest_id
                FROM checks GROUP BY service_id
            ) latest ON checks.id = latest.latest_id
            """
        ).fetchall()
    return {row["service_id"]: dict(row) for row in rows}


def fetch_uptime_by_service() -> dict[str, float]:
    with get_connection() as connection:
        rows = connection.execute(
            """
            SELECT service_id,
                   ROUND(100.0 * SUM(CASE WHEN status = 'UP' THEN 1 ELSE 0 END)
                         / COUNT(*), 2) AS uptime
            FROM checks GROUP BY service_id
            """
        ).fetchall()
    return {row["service_id"]: row["uptime"] for row in rows}
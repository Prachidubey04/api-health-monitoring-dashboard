import asyncio
from datetime import datetime, timezone
from time import perf_counter
from typing import Any

import httpx

from backend.database import insert_check


SERVICES = [
    {
        "service_id": "httpbin",
        "name": "HTTPBin",
        "url": "https://httpbin.org/get",
        "description": "HTTP testing service",
    },
    {
        "service_id": "jsonplaceholder",
        "name": "JSONPlaceholder",
        "url": "https://jsonplaceholder.typicode.com/posts/1",
        "description": "Public JSON API",
    },
    {
        "service_id": "postman-echo",
        "name": "Postman Echo",
        "url": "https://postman-echo.com/get",
        "description": "HTTP request inspection",
    },
]


async def check_service(
    client: httpx.AsyncClient, service: dict[str, str]
) -> dict[str, Any]:
    started = perf_counter()
    status_code = None
    error = None
    status = "DOWN"
    try:
        response = await client.get(service["url"])
        status_code = response.status_code
        if response.is_success:
            status = "UP"
        else:
            error = f"HTTP {response.status_code}"
    except httpx.TimeoutException:
        error = "Request timed out"
    except httpx.RequestError as exception:
        error = str(exception) or exception.__class__.__name__

    result = {
        **service,
        "status": status,
        "status_code": status_code,
        "response_time_ms": round((perf_counter() - started) * 1000, 2),
        "error": error,
        "checked_at": datetime.now(timezone.utc).isoformat(),
    }
    insert_check(result)
    return result


async def run_checks() -> list[dict[str, Any]]:
    timeout = httpx.Timeout(10.0, connect=5.0)
    async with httpx.AsyncClient(
        timeout=timeout,
        follow_redirects=True,
        headers={"User-Agent": "API-Health-Monitor/1.0"},
    ) as client:
        return await asyncio.gather(
            *(check_service(client, service) for service in SERVICES)
        )
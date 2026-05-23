import os

import certifi
import httpx

try:
    import truststore

    truststore.inject_into_ssl()
except ImportError:
    pass

from backend.config import settings


def create_http_client() -> httpx.AsyncClient:
    verify: bool | str = certifi.where()
    if os.getenv("SSL_VERIFY", "true").lower() in ("0", "false", "no"):
        verify = False

    return httpx.AsyncClient(
        timeout=settings.request_timeout_sec,
        verify=verify,
    )

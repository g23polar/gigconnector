from starlette.requests import Request
from slowapi import Limiter


def _get_real_client_ip(request: Request) -> str:
    """Extract client IP from X-Forwarded-For (set by reverse proxies like Render),
    falling back to the direct remote address."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        # X-Forwarded-For: client, proxy1, proxy2 — the first value is the real client
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


limiter = Limiter(key_func=_get_real_client_ip)

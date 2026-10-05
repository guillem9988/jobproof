"""Hosted mode: lets the app run as a public, read-mostly demo.

The default (local) mode trusts its single user. A public deployment cannot, so with HOSTED_MODE=true:

* nothing that touches the server's filesystem, network or credentials is reachable
  (local/GitHub imports, URL fetching, posting creation, settings),
* the real AI providers are never used, whatever keys the server holds,
* only the fixture data is visible and shared state is not mutated by visitors,
* write requests are rate limited.
"""

import ipaddress
import re
import socket
import threading
import time
from collections import defaultdict, deque
from urllib.parse import urljoin, urlparse

import httpx

# (method, path pattern) pairs that are unavailable in hosted mode.
BLOCKED_ROUTES = [
    ("POST", re.compile(r"^/api/v1/projects$")),
    ("POST", re.compile(r"^/api/v1/projects/[^/]+/imports$")),
    ("POST", re.compile(r"^/api/v1/job-postings$")),
    ("POST", re.compile(r"^/api/v1/job-postings/fetch-url$")),
    ("POST", re.compile(r"^/api/v1/job-postings/[^/]+/extract-requirements$")),
    ("POST", re.compile(r"^/api/v1/settings(/test)?$")),
    ("POST", re.compile(r"^/api/v1/assessments/[^/]+/reviews$")),
    ("POST", re.compile(r"^/api/v1/tasks/[^/]+/cancel$")),
    ("POST", re.compile(r"^/api/v1/analyses/[^/]+/cancel$")),
]

HOSTED_MESSAGE = "This is a public demo: this action is only available when you run JobProof yourself."


def is_blocked(method: str, path: str) -> bool:
    return any(method == m and pattern.match(path) for m, pattern in BLOCKED_ROUTES)


def is_public_ip(value: str) -> bool:
    try:
        ip = ipaddress.ip_address(value.split("%")[0])
    except ValueError:
        return False
    if isinstance(ip, ipaddress.IPv6Address) and ip.ipv4_mapped:
        ip = ip.ipv4_mapped
    return ip.is_global and not ip.is_multicast


def assert_public_url(url: str) -> None:
    """Rejects URLs whose host is, or resolves to, a non-public address (SSRF guard)."""
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.hostname:
        raise ValueError("URL must start with http:// or https://")
    if parsed.username or parsed.password:
        raise ValueError("URLs with credentials are not allowed.")
    try:
        addresses = {info[4][0] for info in socket.getaddrinfo(parsed.hostname, parsed.port or 443)}
    except socket.gaierror as e:
        raise ValueError(f"Could not resolve host: {parsed.hostname}") from e
    if not addresses or not all(is_public_ip(a) for a in addresses):
        raise ValueError("That address is not a public website.")


def safe_get(
    url: str,
    *,
    headers: dict[str, str],
    timeout: float = 15,
    max_redirects: int = 3,
    max_bytes: int = 2_000_000,
):
    """GET that validates every redirect hop and caps the response size."""
    for _ in range(max_redirects + 1):
        assert_public_url(url)
        with httpx.stream("GET", url, headers=headers, timeout=timeout, follow_redirects=False) as resp:
            if resp.is_redirect:
                location = resp.headers.get("location", "")
                url = urljoin(url, location)
                continue
            body = b""
            for chunk in resp.iter_bytes():
                body += chunk
                if len(body) > max_bytes:
                    raise ValueError("The page is too large to import.")
            return resp.status_code, body.decode(resp.encoding or "utf-8", errors="replace")
    raise ValueError("Too many redirects.")


class RateLimiter:
    """Sliding-window limiter keyed by client; in memory, which is enough for one instance."""

    def __init__(self, limit: int, window: float = 60.0):
        self.limit = limit
        self.window = window
        self.hits: dict[str, deque[float]] = defaultdict(deque)
        self.lock = threading.Lock()

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        with self.lock:
            q = self.hits[key]
            while q and now - q[0] > self.window:
                q.popleft()
            if len(q) >= self.limit:
                return False
            q.append(now)
            if len(self.hits) > 10_000:
                for k in [k for k, v in self.hits.items() if not v or now - v[-1] > self.window]:
                    del self.hits[k]
            return True


def client_key(forwarded_for: str | None, peer: str | None) -> str:
    """The address our own proxy saw: the last X-Forwarded-For hop (earlier hops can be spoofed)."""
    if forwarded_for:
        hops = [h.strip() for h in forwarded_for.split(",") if h.strip()]
        if hops:
            return hops[-1]
    return peer or "unknown"


def is_demo_record(kind: str, row: dict) -> bool:
    if kind == "analysis":
        return row.get("mode") == "demo"
    return bool(row.get("demo"))


# Served on every response. The app is a static SPA that only talks to its own origin, so the policy can be strict.
CSP = (
    "default-src 'self'; "
    "script-src 'self'; "
    "style-src 'self'; "
    "style-src-attr 'unsafe-inline'; "  # React sets inline style attributes
    "img-src 'self' data:; "
    "font-src 'self'; "
    "connect-src 'self'; "
    "object-src 'none'; "
    "base-uri 'self'; "
    "form-action 'self'; "
    "frame-ancestors 'none'"
)

SECURITY_HEADERS = {
    "Content-Security-Policy": CSP,
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Strict-Transport-Security": "max-age=63072000; includeSubDomains",
}

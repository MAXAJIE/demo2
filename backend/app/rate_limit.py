from __future__ import annotations

import threading
import time
from collections import defaultdict, deque

from .config import RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MINUTES

_lock = threading.Lock()
_buckets: dict[tuple[str, str], deque[float]] = defaultdict(deque)
_WINDOW_SECONDS = RATE_LIMIT_WINDOW_MINUTES * 60


def check_rate_limit(
    scope: str,
    identity: str,
    *,
    limit: int | None = None,
    window_seconds: float | None = None,
) -> bool:
    """True when allowed, False when the caller is over the limit.

    `limit` and `window_seconds` override the global defaults for one scope
    (e.g. bookings, which should be stricter than enquiries).
    """
    max_hits = RATE_LIMIT_MAX if limit is None else limit
    window = _WINDOW_SECONDS if window_seconds is None else window_seconds
    now = time.monotonic()
    key = (scope, identity)
    with _lock:
        bucket = _buckets[key]
        while bucket and now - bucket[0] > window:
            bucket.popleft()
        if len(bucket) >= max_hits:
            return False
        bucket.append(now)
        return True


def _reset_for_tests() -> None:
    with _lock:
        _buckets.clear()

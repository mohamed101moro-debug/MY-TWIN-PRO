"""
MyTwin – Smart Semantic Cache Service v6.0 (مع Cost Tracker)
================================================
- تخزين مؤقت محلي + Redis (اختياري)
- Semantic Similarity للتشابه المعنوي
- TTL متدرج: 1h / 24h / 7d
- Smart Eviction + Cost Tracking مدمج
- يسجل Hits/Misses في Cost Tracker لتحليل التوفير
"""
import hashlib, time, json, logging, re
from typing import Optional, Any, Dict, Tuple
from difflib import SequenceMatcher

logger = logging.getLogger(__name__)

_cache: Dict[str, Dict[str, Any]] = {}
_cache_stats = {
    "hits": 0, "misses": 0, "sets": 0, "deletes": 0,
    "semantic_hits": 0, "api_calls_saved": 0,
    "last_cleanup": time.time(),
}

_redis_client = None
_redis_enabled = False

try:
    from app.core.config import config
    redis_url = getattr(config, 'REDIS_URL', None)
    if redis_url:
        import redis
        _redis_client = redis.Redis.from_url(
            redis_url, decode_responses=True,
            socket_connect_timeout=2, socket_timeout=2
        )
        _redis_client.ping()
        _redis_enabled = True
        logger.info("✅ Redis متصل")
except Exception as e:
    logger.info(f"ℹ️ Redis غير متصل، استخدام الذاكرة المحلية: {e}")

def _get_ttl(key: str, value: str = "") -> int:
    if "frequent" in key or "emotion" in key: return 3600
    if "context" in key or "personality" in key: return 86400
    if "static" in key: return 604800
    return 300

def _clean_text(text: str) -> str:
    text = re.sub(r'[^\w\s]', '', text.lower())
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def _similarity(a: str, b: str) -> float:
    return SequenceMatcher(None, _clean_text(a), _clean_text(b)).ratio()

def get(key: str) -> Optional[Any]:
    global _cache_stats
    if _redis_enabled and _redis_client:
        try:
            val = _redis_client.get(key)
            if val is not None:
                _cache_stats["hits"] += 1
                _record_hit()
                return json.loads(val)
        except Exception: pass

    entry = _cache.get(key)
    if entry and entry.get("expires", 0) > time.time():
        _cache_stats["hits"] += 1
        _record_hit()
        return entry["value"]
    elif entry:
        del _cache[key]
        _cache_stats["deletes"] += 1
    _cache_stats["misses"] += 1
    _record_miss()
    return None

def set(key: str, value: Any, ttl: int = 0) -> None:
    global _cache_stats
    if ttl == 0: ttl = _get_ttl(key, str(value)[:100])
    if _redis_enabled and _redis_client:
        try: _redis_client.setex(key, ttl, json.dumps(value, ensure_ascii=False))
        except Exception: pass
    _cache[key] = {"value": value, "expires": time.time() + ttl}
    _cache_stats["sets"] += 1
    if time.time() - _cache_stats["last_cleanup"] > 600:
        _cleanup_expired()

def delete(key: str) -> bool:
    global _cache_stats
    if _redis_enabled and _redis_client:
        try: _redis_client.delete(key)
        except Exception: pass
    if key in _cache:
        del _cache[key]
        _cache_stats["deletes"] += 1
        return True
    return False

def _cleanup_expired() -> int:
    global _cache_stats
    now = time.time()
    expired = [k for k, v in _cache.items() if v.get("expires", 0) <= now]
    for key in expired: del _cache[key]
    _cache_stats["last_cleanup"] = now
    if expired: logger.info(f"🧹 تنظيف {len(expired)} مفتاح منتهي")
    return len(expired)


def purge_legacy_response_cache(max_scan_per_pattern: int = 5000) -> int:
    """Remove pre-v2 globally shared response keys; never touch v2 namespaces."""
    legacy_patterns = {
        "semantic:*": "semantic:v2:",
        "resp:*": "resp:v2:",
        "ai_response:*": "ai_response:v2:",
    }
    removed = 0
    for key in list(_cache):
        if any(key.startswith(pattern[:-1]) and not key.startswith(current)
               for pattern, current in legacy_patterns.items()):
            _cache.pop(key, None)
            removed += 1

    if _redis_enabled and _redis_client:
        try:
            for pattern, current_prefix in legacy_patterns.items():
                batch = []
                scanned = 0
                for key in _redis_client.scan_iter(match=pattern, count=250):
                    scanned += 1
                    if not str(key).startswith(current_prefix):
                        batch.append(key)
                    if len(batch) >= 250:
                        removed += _redis_client.delete(*batch)
                        batch.clear()
                    if scanned >= max_scan_per_pattern:
                        break
                if batch:
                    removed += _redis_client.delete(*batch)
        except Exception as error:
            logger.warning("Legacy response-cache purge incomplete; old keys are ignored and expire by TTL: %s", error)
    return removed

def _scope_token(scope: Optional[str]) -> Optional[str]:
    if not isinstance(scope, str) or not scope.strip():
        return None
    return hashlib.sha256(scope.encode("utf-8")).hexdigest()[:32]


def _semantic_prefix(scope: Optional[str]) -> Optional[str]:
    token = _scope_token(scope)
    return f"semantic:v2:{token}:" if token else None


def get_semantic_cached(
    query: str,
    threshold: float = 0.85,
    *,
    scope: Optional[str] = None,
) -> Tuple[Optional[str], float]:
    """Return only cache entries from the explicit authenticated scope.

    No scope means no lookup: legacy/global entries are intentionally ignored.
    Fuzzy matching compares prompts to prompts, never prompts to output text.
    """
    global _cache_stats
    prefix = _semantic_prefix(scope)
    normalized_query = _clean_text(query)
    if not prefix or not normalized_query:
        return None, 0.0

    digest = hashlib.sha256(normalized_query.encode("utf-8")).hexdigest()
    direct = get(f"{prefix}{digest}")
    if isinstance(direct, dict) and direct.get("query") == normalized_query:
        _cache_stats["semantic_hits"] += 1
        return direct.get("response"), 1.0

    best_response = None
    best_score = 0.0
    for key, cached in list(_cache.items()):
        if not key.startswith(prefix) or cached.get("expires", 0) <= time.time():
            continue
        value = cached.get("value")
        if not isinstance(value, dict):
            continue
        original_query = value.get("query")
        response = value.get("response")
        if not isinstance(original_query, str) or not isinstance(response, str):
            continue
        score = _similarity(normalized_query, original_query)
        if score > best_score and score >= threshold:
            best_score, best_response = score, response

    if best_response is not None:
        _cache_stats["semantic_hits"] += 1
        return best_response, best_score
    return None, 0.0


def set_semantic_cached(
    query: str,
    response: str,
    ttl: int = 0,
    *,
    scope: Optional[str] = None,
) -> bool:
    prefix = _semantic_prefix(scope)
    normalized_query = _clean_text(query)
    if not prefix or not normalized_query:
        return False
    if ttl == 0:
        ttl = _get_ttl("frequent", response[:100])
    digest = hashlib.sha256(normalized_query.encode("utf-8")).hexdigest()
    set(f"{prefix}{digest}", {"query": normalized_query, "response": response}, ttl)
    logger.debug("Semantic cache stored in an isolated scope (TTL: %ss)", ttl)
    return True


def _make_response_key(message: str, twin_name: str, lang: str, scope: str) -> str:
    token = _scope_token(scope)
    raw = f"{message.strip().lower()}|{twin_name}|{lang}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()
    return f"resp:v2:{token}:{digest}"


def get_cached_response(
    message: str,
    twin_name: str,
    lang: str,
    *,
    user_id: Optional[str] = None,
    tier: str = "free",
    task: str = "general",
) -> Optional[str]:
    if not user_id:
        return None
    scope = f"{user_id}|{task}|{tier}|{lang}|{twin_name}"
    result, score = get_semantic_cached(message, scope=scope)
    if result and score >= 0.85:
        _cache_stats["api_calls_saved"] += 1
        return result
    return get(_make_response_key(message, twin_name, lang, scope))


def set_cached_response(
    message: str,
    twin_name: str,
    lang: str,
    reply: str,
    ttl: int = 300,
    *,
    user_id: Optional[str] = None,
    tier: str = "free",
    task: str = "general",
) -> None:
    if not user_id:
        return
    scope = f"{user_id}|{task}|{tier}|{lang}|{twin_name}"
    set(_make_response_key(message, twin_name, lang, scope), reply, ttl)
    set_semantic_cached(message, reply, ttl, scope=scope)

def cache_user_context(user_id: str, context: dict, ttl: int = 600) -> None:
    set(f"context:{user_id}", context, ttl)

def get_user_context(user_id: str) -> Optional[dict]:
    return get(f"context:{user_id}")

def cache_emotional_state(user_id: str, emotional_state: dict) -> None:
    set(f"emotion:{user_id}", emotional_state, ttl=120)

def get_emotional_state(user_id: str) -> Optional[dict]:
    return get(f"emotion:{user_id}")

def cache_ai_response(
    query: str,
    response: str,
    ttl: int = 300,
    *,
    scope: Optional[str] = None,
) -> None:
    token = _scope_token(scope)
    if not token:
        return
    digest = hashlib.sha256(query.encode("utf-8")).hexdigest()
    set(f"ai_response:v2:{token}:{digest}", response, ttl)
    set_semantic_cached(query, response, ttl, scope=scope)


def get_ai_response(query: str, *, scope: Optional[str] = None) -> Optional[str]:
    token = _scope_token(scope)
    if not token:
        return None
    result, score = get_semantic_cached(query, scope=scope)
    if result and score >= 0.85:
        _cache_stats["api_calls_saved"] += 1
        return result
    digest = hashlib.sha256(query.encode("utf-8")).hexdigest()
    return get(f"ai_response:v2:{token}:{digest}")

def get_stats() -> Dict:
    total = _cache_stats["hits"] + _cache_stats["misses"]
    hit_rate = (_cache_stats["hits"] / total * 100) if total > 0 else 0
    return {
        "total_entries": len(_cache),
        "hits": _cache_stats["hits"],
        "misses": _cache_stats["misses"],
        "hit_rate": round(hit_rate, 2),
        "semantic_hits": _cache_stats["semantic_hits"],
        "api_calls_saved": _cache_stats["api_calls_saved"],
        "redis_enabled": _redis_enabled,
    }

def _record_hit():
    try:
        from app.infrastructure.ai.cost_tracker import cost_tracker
        cost_tracker.record_cache_hit()
    except Exception: pass

def _record_miss():
    try:
        from app.infrastructure.ai.cost_tracker import cost_tracker
        cost_tracker.record_cache_miss()
    except Exception: pass

purge_legacy_response_cache()
logger.info(f"✅ Smart Semantic Cache v6.0 | Redis: {'متصل' if _redis_enabled else 'محلي'} | TTL: متدرج | Cost Tracker: مدمج")

"""Consent-gated cloud embeddings with owner/provider/model-scoped cache."""
import asyncio
import hashlib
import logging
import os
from typing import List, Optional

logger = logging.getLogger("embedding_client")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
EMBEDDING_PROVIDER = os.getenv("EMBEDDING_PROVIDER", "gemini").strip().lower()
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-004").strip()
VECTOR_DIMENSION = int(os.getenv("VECTOR_DIMENSION", "768"))
LOCAL_EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
LOCAL_VECTOR_DIMENSION = int(os.getenv("LOCAL_VECTOR_DIMENSION", "384"))
_cache: dict[str, list[float]] = {}


def _has_consent(user_id: Optional[str], provider: str) -> bool:
    try:
        from app.privacy.cloud_ai_consent import get_granted_providers
        return provider in get_granted_providers(user_id, "memory_embedding")
    except Exception:
        return False


async def _gemini_embed(text: str, user_id: Optional[str] = None) -> List[float]:
    if not _has_consent(user_id, "gemini_embedding") or not GEMINI_API_KEY:
        return []
    try:
        from google import genai
        client = genai.Client(api_key=GEMINI_API_KEY)
        result = await client.aio.models.embed_content(model=EMBEDDING_MODEL, contents=text)
        if result.embeddings:
            return list(result.embeddings[0].values)
    except Exception as exc:
        logger.warning("Gemini embedding failed (%s)", type(exc).__name__)
    return []


async def _local_embed(text: str) -> List[float]:
    """Compute embeddings locally; no cloud provider consent is needed."""
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer(LOCAL_EMBEDDING_MODEL)
        loop = asyncio.get_running_loop()
        embeddings = await loop.run_in_executor(None, model.encode, text)
        return embeddings.tolist()
    except ImportError:
        logger.warning("Local sentence-transformers model unavailable")
    except Exception as exc:
        logger.warning("Local embedding failed (%s)", type(exc).__name__)
    return []


def _provider_config() -> tuple[str, str, int] | None:
    if EMBEDDING_PROVIDER == "gemini":
        return "gemini", EMBEDDING_MODEL, VECTOR_DIMENSION
    if EMBEDDING_PROVIDER == "local":
        return "local", LOCAL_EMBEDDING_MODEL, LOCAL_VECTOR_DIMENSION
    # In particular, do not call OpenAI directly or silently route an unknown
    # provider to Gemini: provider identity must match the disclosed consent.
    logger.error("Unsupported embedding provider; refusing egress")
    return None


async def generate_embedding(text: str, user_id: Optional[str] = None) -> List[float]:
    """Generate one vector; cloud use requires matching owner, purpose and provider consent."""
    if not text or not text.strip():
        return []
    selected = _provider_config()
    if selected is None:
        return []
    provider, model_id, expected_dimension = selected

    if provider == "gemini":
        if not user_id or not _has_consent(user_id, "gemini_embedding"):
            return []
        cache_scope = f"{user_id}:gemini_embedding"
    else:
        # Local compute needs no cloud grant, but cached vectors still belong to
        # one account. Anonymous local calls are computed without being cached.
        cache_scope = f"{user_id}:local" if user_id else None

    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    cache_key = f"{cache_scope}:{model_id}:dim{expected_dimension}:{digest}" if cache_scope else None
    if cache_key is not None and cache_key in _cache:
        return _cache[cache_key]

    vector = await _gemini_embed(text, user_id=user_id) if provider == "gemini" else await _local_embed(text)
    if vector and len(vector) != expected_dimension:
        logger.error(
            "Embedding dimension mismatch for provider=%s model=%s expected=%s actual=%s",
            provider,
            model_id,
            expected_dimension,
            len(vector),
        )
        return []
    if vector:
        if cache_key is not None:
            if len(_cache) > 10000:
                _cache.clear()
            _cache[cache_key] = vector
        try:
            from app.observability.metrics_service import metrics
            metrics.record_request("embedding", 200, 0)
        except Exception:
            pass
    return vector


async def generate_embeddings_batch(texts: List[str], user_id: Optional[str] = None) -> List[List[float]]:
    return [await generate_embedding(text, user_id=user_id) for text in texts]


logger.info("Embedding Client initialized (cloud egress requires per-user consent)")

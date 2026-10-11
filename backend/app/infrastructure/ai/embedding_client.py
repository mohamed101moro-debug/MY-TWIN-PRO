"""Consent-gated cloud embeddings with owner/provider-scoped cache."""
import asyncio
import hashlib
import logging
import os
from typing import List, Optional

logger = logging.getLogger("embedding_client")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
EMBEDDING_PROVIDER = os.getenv("EMBEDDING_PROVIDER", "gemini")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-004")
VECTOR_DIMENSION = int(os.getenv("VECTOR_DIMENSION", "768"))
_cache: dict[str, list[float]] = {}


def _has_consent(user_id: Optional[str], provider: str) -> bool:
    try:
        from app.privacy.cloud_ai_consent import get_granted_providers
        return provider in get_granted_providers(user_id, "memory_embedding")
    except Exception:
        return False


async def _gemini_embed(text: str, user_id: Optional[str] = None) -> List[float]:
    if not _has_consent(user_id, "gemini_embedding"):
        return []
    if not GEMINI_API_KEY:
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


async def _openai_embed(text: str, user_id: Optional[str] = None) -> List[float]:
    if not _has_consent(user_id, "openai_embedding"):
        return []
    if not OPENAI_API_KEY:
        return []
    try:
        import openai
        client = openai.AsyncOpenAI(api_key=OPENAI_API_KEY)
        response = await client.embeddings.create(model="text-embedding-3-small", input=text)
        if response.data:
            return response.data[0].embedding
    except Exception as exc:
        logger.warning("OpenAI embedding failed (%s)", type(exc).__name__)
    return []


async def _local_embed(text: str) -> List[float]:
    """Compute embeddings locally; no cloud provider consent is needed."""
    try:
        from sentence_transformers import SentenceTransformer
        model = SentenceTransformer("sentence-transformers/all-MiniLM-L6-v2")
        loop = asyncio.get_running_loop()
        embeddings = await loop.run_in_executor(None, model.encode, text)
        return embeddings.tolist()
    except ImportError:
        logger.warning("Local sentence-transformers model unavailable")
    except Exception as exc:
        logger.warning("Local embedding failed (%s)", type(exc).__name__)
    return []


async def generate_embedding(text: str, user_id: Optional[str] = None) -> List[float]:
    """Generate one vector; cloud use requires matching owner, purpose and provider consent."""
    if not text or not text.strip():
        return []
    provider = EMBEDDING_PROVIDER if EMBEDDING_PROVIDER in {"gemini", "openai", "local"} else "gemini"
    if provider == "local":
        cache_scope = "local"
    else:
        provider_key = "gemini_embedding" if provider == "gemini" else "openai_embedding"
        if not user_id or not _has_consent(user_id, provider_key):
            return []
        cache_scope = f"{user_id}:{provider_key}"

    digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
    cache_key = f"{cache_scope}:{digest}"
    if cache_key in _cache:
        return _cache[cache_key]

    if provider == "local":
        vector = await _local_embed(text)
    elif provider == "openai":
        vector = await _openai_embed(text, user_id=user_id)
    else:
        vector = await _gemini_embed(text, user_id=user_id)

    if vector:
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

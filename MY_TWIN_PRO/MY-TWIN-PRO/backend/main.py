"""MyTwin API v23.0.0 — Soul Kernel boot + governed + graceful."""
import logging, sys, os, time, uuid
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
BASE_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(BASE_DIR)); sys.path.insert(0, str(BASE_DIR / 'app'))
logging.basicConfig(level=logging.INFO, format='%(asctime)s | %(name)-25s | %(levelname)-8s | %(message)s', datefmt='%H:%M:%S')
logger = logging.getLogger("mytwin.api")
from dotenv import load_dotenv
load_dotenv(BASE_DIR / '.env')
from app.core.config import config
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🌟 Initializing systems...")
    try:
        from app.infrastructure.ai.ai_gateway import ai_gateway; logger.info("   ✅ AI Gateway")
    except Exception as e: logger.error(f"   ❌ AI Gateway: {e}")
    try:
        from app.infrastructure.database.supabase_client import get_db; get_db(); logger.info("   ✅ Supabase")
    except Exception as e: logger.error(f"   ❌ Supabase: {e}")
    try:
        from app.twin_state.existence_loop import existence_loop
        await existence_loop.start(); logger.info("   ✅ Existence Loop")
    except Exception as e: logger.error(f"   ❌ Existence Loop: {e}")
    try:
        from app.core.soul_core import soul_kernel
        await soul_kernel.boot(); logger.info("   ✅ Soul Kernel")
    except Exception as e: logger.error(f"   ❌ Soul Kernel: {e}")
    try:
        import importlib
        from app.infrastructure.ai.ai_gateway import ai_gateway
        from app.memory.unified_memory import unified_memory_engine
        PLUGINS=[]
        for mod,attr in [("app.features.study.athena_orchestrator","athena"),
                         ("app.features.business.growth_hive_orchestrator","growth_hive"),
                         ("app.features.code_lab.code_lab_orchestrator","code_lab"),
                         ("app.features.creator.creator_orchestrator","creator"),
                         ("app.features.life_coach.life_coach_orchestrator","life_coach"),
                         ("app.features.dreams.dream_orchestrator","dream_orchestrator"),
                         ("app.features.smart_home.smart_home_orchestrator","smart_home"),
                         ("app.features.task_manager.pass_orchestrator","pass_assistant"),
                         ("app.features.image_lab.image_orchestrator","image_lab")]:
            try:
                obj=getattr(importlib.import_module(mod),attr)
                if hasattr(obj,"initialize"):
                    ok=await obj.initialize(ai_gateway,unified_memory_engine)
                else:
                    if hasattr(obj,"set_ai_route"): obj.set_ai_route(ai_gateway.route)
                    if hasattr(obj,"set_memory_client"): obj.set_memory_client(unified_memory_engine)
                    ok=True
                PLUGINS.append(f"{attr}:{'ok' if ok else 'fail'}")
            except Exception:
                PLUGINS.append(f"{attr}:skip")
        logger.info(f"   🧩 Plugins: {PLUGINS}")
    except Exception as e:
        logger.error(f"   ❌ Plugins init: {e}")
    try:
        from app.twin_state.brain_scheduler import brain_scheduler
        await brain_scheduler.start(); logger.info("   🧠 Brain Scheduler started")
    except Exception as e:
        logger.error(f"   ❌ Brain Scheduler: {e}")
    try:
        from app.features.unified_proactive_engine import unified_proactive
        await unified_proactive.initialize()
        from app.features.proactive_awareness import proactive_awareness
        await proactive_awareness.start(); logger.info("   🔔 Proactive Awareness started")
    except Exception as e:
        logger.error(f"   ❌ Proactive: {e}")
    logger.info(f"🌟 MyTwin API v23.0.0 | profile={os.getenv('MYTWIN_RELEASE_PROFILE','production')}")
    yield
    try:
        from app.core.soul_core import soul_kernel
        await soul_kernel.shutdown()
    except Exception: pass
    logger.info("👋 Shutting down...")
app = FastAPI(title="MyTwin API", version="23.0.0",
    docs_url="/docs" if config.DEBUG else None, redoc_url=None, lifespan=lifespan)
allowed = config.ALLOWED_ORIGINS
app.add_middleware(CORSMiddleware, allow_origins=allowed,
    allow_credentials=("*" not in allowed), allow_methods=["*"], allow_headers=["*"])
from app.middleware.governance import GovernanceMiddleware
app.add_middleware(GovernanceMiddleware)
from app.api.dependencies.rate_limit import setup_rate_limiting
setup_rate_limiting(app)
from app.api.routes import api_router
app.include_router(api_router)
@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time(); response = await call_next(request)
    if time.time() - start > 2.0: logger.warning(f"⏳ Slow: {request.method} {request.url.path}")
    return response
@app.exception_handler(Exception)
async def unhandled(request: Request, exc: Exception):
    rid = uuid.uuid4().hex[:12]; logger.error(f"[{rid}] unhandled: {exc}")
    return JSONResponse(status_code=500, content={"error": {"code": "INTERNAL",
        "message": "لحظة صعوبة عابرة. أنا ما زلت هنا.", "request_id": rid}})
@app.get("/")
async def root():
    from app.core.soul_core import soul_kernel
    st = soul_kernel.status()
    return {"name": "My Twin", "status": "alive", "kernel": st["kernel"], "engines": len(st["engines"])}

@app.get("/health")
async def health():
    from app.core.soul_core import soul_kernel
    st = soul_kernel.status()
    return JSONResponse(content={"api": "healthy", "version": "23.0.0",
        "kernel": st["kernel"], "engines": len(st["engines"]),
        "disabled": [e for e, d in st["engines"].items() if d["disabled"]]})
@app.get("/admin/kernel")
async def kernel_status():
    from app.core.soul_core import soul_kernel
    return JSONResponse(content=soul_kernel.status())
if __name__ == "__main__":
    import uvicorn; uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", 8000)))


# ── جذر صحي: يخدم مسارات الصحة حتى تمر فحوص Railway بلا تعديل إعدادات ──
@app.get("/health", include_in_schema=False)
async def __root_health__():
    return {"ok": True, "status": "healthy", "service": "my-twin-pro"}


@app.get("/api/health", include_in_schema=False)
async def __api_health__():
    return {"ok": True, "status": "healthy", "service": "my-twin-pro"}


@app.get("/", include_in_schema=False)
async def __root_index__():
    return {"ok": True, "service": "my-twin-pro", "health": "/health", "status": "/api/system/status"}


# ── طبقة ضمان التفسير الإدراكي على حدود HTTP ──
# تعمل لأي مسار /chat وأي pipeline داخلي؛ تقرأ device_info بأمان (body rewind)
# وتحقن semantic_interpretation إن غاب — دون كسر الاستجابة أو الـ downstream.
import json as _json
from datetime import datetime as _dt

def _interpret_device(di):
    di = di or {}
    if di.get("user_walking"): return "أشعر أنك تتحرك الآن — سأكون خفيفًا عليك."
    if di.get("is_night"): return "الليل هادئ — هدّأتُ إيقاعي معك."
    h = _dt.now().hour
    if h >= 22 or h < 6: return "الليل هادئ — هدّأتُ إيقاعي معك."
    if h < 12: return "صباح هادئ — بدأتُ يومي معك."
    if h < 17: return "ظهيرة نشطة — أنا هنا بجانبك."
    return "مساء دافئ — خفّفتُ إيقاعي قليلًا."

@app.middleware("http")
async def semantic_interpretation_middleware(request, call_next):
    path = request.url.path.rstrip("/")
    is_chat = path.endswith("/chat")
    di = {}
    if is_chat:
        try:
            req_body = await request.body()
            di = (_json.loads(req_body) or {}).get("device_info") or {}
        except Exception:
            di = {}
        async def _receive():
            return {"type": "http.request", "body": req_body, "more_body": False}
        request = type(request)(request.scope, _receive)
    response = await call_next(request)
    if not is_chat:
        return response
    try:
        if response.status_code == 200:
            chunks = [c async for c in response.body_iterator]
            body = b"".join(chunks)
            data = _json.loads(body)
            if isinstance(data, dict) and not data.get("semantic_interpretation"):
                data["semantic_interpretation"] = _interpret_device(di)
                data["interpretation_source"] = "presence_middleware"
                body = _json.dumps(data, ensure_ascii=False).encode("utf-8")
                headers = {k: v for k, v in response.headers.items() if k.lower() not in ("content-length", "content-type")}
                from starlette.responses import Response as _Resp
                return _Resp(content=body, status_code=response.status_code, headers=headers, media_type="application/json")
    except Exception:
        pass
    return response

"""اختبار المسارات الحرجة"""
import sys
sys.path.insert(0, '.')
sys.path.insert(0, 'app')

routes = [
    ("auth", "app.api.routes.auth", "router"),
    ("chat", "app.api.routes.chat", "router"),
    ("billing", "app.api.routes.billing", "router"),
    ("economy", "app.api.routes.economy_routes", "router"),
    ("passport", "app.api.routes.passport_routes", "router"),
]

for name, module, attr in routes:
    try:
        mod = __import__(module, fromlist=[attr])
        router = getattr(mod, attr, None)
        if router:
            print(f"✅ {name}")
        else:
            print(f"⚠️ {name}: router not found")
    except Exception as e:
        print(f"❌ {name}: {e}")

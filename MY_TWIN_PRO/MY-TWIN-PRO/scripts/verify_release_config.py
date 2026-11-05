"""Static release gate; reports blockers without touching production."""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
app = json.loads((ROOT / "app.json").read_text())['expo']
pkg = json.loads((ROOT / "package.json").read_text())
issues: list[str] = []

if app.get("sdkVersion") != "52.0.0":
    issues.append(f"SDK baseline changed unexpectedly: {app.get('sdkVersion')}")
if not app.get("extra", {}).get("eas", {}).get("projectId"):
    issues.append("EAS projectId is missing")
if not str(app.get("updates", {}).get("url", "")).startswith("https://u.expo.dev/"):
    issues.append("updates.url is not an Expo Updates URL")
api_url = app.get("extra", {}).get("API_URL", "")
if not api_url.startswith("https://"):
    issues.append("extra.API_URL must be HTTPS")
if "expo-secure-store" not in pkg.get("dependencies", {}):
    issues.append("expo-secure-store dependency is missing")
if "expo-av" in pkg.get("dependencies", {}):
    issues.append("expo-av migration remains open; do not claim SDK55 readiness")

result = {"status": "PASS" if not issues else "NO-GO", "sdk": app.get("sdkVersion"), "api_url": api_url, "issues": issues}
print(json.dumps(result, ensure_ascii=False, indent=2))
sys.exit(1 if issues else 0)

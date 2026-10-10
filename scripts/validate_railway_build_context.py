"""Validate Railway's repository-root Docker context before building."""
from __future__ import annotations

import json
import shlex
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
config = json.loads((ROOT / "railway.json").read_text(encoding="utf-8"))
build = config.get("build", {})
if build.get("builder") != "DOCKERFILE":
    raise SystemExit("railway.json must explicitly select the Dockerfile builder")

dockerfile_rel = Path(build.get("dockerfilePath", ""))
if not dockerfile_rel.parts or dockerfile_rel.is_absolute() or ".." in dockerfile_rel.parts:
    raise SystemExit("railway.json dockerfilePath must be a safe repository-relative path")
dockerfile = ROOT / dockerfile_rel
if not dockerfile.is_file():
    raise SystemExit(f"Railway Dockerfile does not exist: {dockerfile_rel}")

for required in ("package.json", "railway.json", "backend/requirements.txt", "backend/main.py"):
    if not (ROOT / required).exists():
        raise SystemExit(f"Expected repository-root build input is missing: {required}")

copy_count = 0
for line_number, raw in enumerate(dockerfile.read_text(encoding="utf-8").splitlines(), 1):
    stripped = raw.strip()
    if not stripped or stripped.startswith("#"):
        continue
    instruction = stripped.split(maxsplit=1)[0].upper()
    if instruction not in {"COPY", "ADD"}:
        continue
    parts = shlex.split(stripped)
    operands = [part for part in parts[1:] if not part.startswith("--")]
    if len(operands) < 2:
        raise SystemExit(f"Unsupported {instruction} form at {dockerfile_rel}:{line_number}")
    sources = operands[:-1]
    for source in sources:
        if source.startswith(("http://", "https://", "$")):
            continue
        candidate = ROOT / source
        if not candidate.exists():
            raise SystemExit(
                f"{instruction} source is not available in repository-root context: "
                f"{source} ({dockerfile_rel}:{line_number})"
            )
    copy_count += 1

ignore_lines = (ROOT / ".dockerignore").read_text(encoding="utf-8").splitlines()
if "*" not in ignore_lines or "!backend/" not in ignore_lines or "!backend/**" not in ignore_lines:
    raise SystemExit(".dockerignore must restrict the root build context to backend/")
if copy_count < 2:
    raise SystemExit("Expected at least two validated COPY/ADD instructions")
print(f"Railway root context valid: {dockerfile_rel}; {copy_count} copy instructions; backend-only context")

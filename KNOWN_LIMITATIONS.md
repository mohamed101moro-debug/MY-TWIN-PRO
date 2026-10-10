# Known Limitations — P0.05 Repository Baseline

Last updated: 2026-10-10. This records what has not been proven; it does not infer the user's production configuration from local access.

## Platform access and deployment

No Railway connector or CLI is available in this execution session, so service settings, watched branch, root directory, environment variables, and automatic deployment policy remain uninspected. The user-provided failed-build logs show Railpack analyzed an archive whose top-level contents were only `MY_TWIN_PRO/`, then failed to detect an app. The current P0.05 branch places source markers at repository root, explicitly selects a root-context Dockerfile, and checks the Docker context in CI. No Railway deployment was made; the fix is not yet proven against the live service.

The root Railway Docker build was not executed locally because Docker is unavailable in this sandbox. CI now performs a real image build. If the Railway service Root Directory is configured to `/backend`, use `/backend/railway.json` as the config path; otherwise use the repository root and `/railway.json`. The dashboard's current setting is unknown. Railway's official docs currently mark Config as Code deprecated and state existing files keep working until 2026-12-01; migrate to Infrastructure as Code before that date.

The Supabase connector listed the only project named `My Twin` (`nckgqvpocawknhkruhip`) as `INACTIVE`; reading its migration ledger timed out. The project was not restored or awakened, no branch was created, and no SQL or migration was applied. Confirm the intended staging project and availability before database-dependent roadmap work.

## Build identity and client configuration

`app.json` contains different `extra.eas.projectId` and `updates.url` identifiers. The user was asked which UUID is canonical; the answer is pending. No EAS build, OTA update, signed Android artifact, or device acceptance has run.

Local Android JavaScript export passes under Node 20.20.2 after explicitly adding `query-string@9.5.1`, and `expo install --check` reports aligned dependencies. This is not a native Gradle/AAB build or a store-ready artifact.

The client uses `EXPO_PUBLIC_API_BASE_URL` at EAS bundle time, then falls back to `https://my-twin-pro-production.up.railway.app`. The `app.json` `extra.API_URL` value is unused by current code and has no URL scheme. Railway runtime variables are not implicitly passed into EAS; the current fallback mitigates this only while that host remains correct.

## Dependency and test gates

The final npm audit reports 89 total vulnerabilities (29 moderate, 59 high, 1 critical); production-only reports 69 (29 moderate, 39 high, 1 critical). The CI production audit gate intentionally blocks on high or critical findings. `npm audit fix --force` was not run because the proposed core Expo/React Native changes cross major versions and require an SDK-aligned upgrade and full native validation.

The complete backend suite on Python 3.11.16 reports 185 passed and 9 skipped. The skips are external TCMA integration cases; no live Supabase database or external service was used. Four deprecation warnings remain, including Pydantic `.dict()` and upstream Supabase/Starlette APIs. Backend requirements are range-based rather than fully locked.

A static route inventory and project-owner regression tests were added. Gitleaks `8.30.1` scanned `origin/main..HEAD` with zero findings; two current-tree generic-pattern matches were reviewed as non-account values. GitHub Secret Scanning Alerts could not be read because the integration returned 403. No DAST or black-box authorization test against Railway, production RLS/storage-policy verification, or cross-account test with real Supabase sessions has run.

## Roadmap and release boundary

The user explicitly confirmed that the full P0.05 package is to be the repository baseline, overriding the roadmap's selective-integration recommendation for Phase 0. The current branch implements that source choice. This does not waive other roadmap acceptance gates: do not merge to `main` or call the product production-ready until critical/high dependency findings, EAS identity/native build, staging/RLS, Railway deployment validation, and device/release gates are resolved.

The P0.05 source baseline and follow-up CI/test/dependency changes are committed locally on the isolated integration branch. Phase 0 source import and first local gates are complete; Phase 1 inventory is partial; Phase 2 build/config is partial; Phases 3–6 have only partial local/static evidence; Phases 7–16 have not passed acceptance. No production database or service was changed.

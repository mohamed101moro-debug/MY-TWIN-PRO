# Known Limitations — P0.05 Integration Baseline

Last updated: 2026-10-10. This records what has not been proven; it does not infer the user's production configuration from local access.

## Platform access and deployment

No Railway connector or CLI is available in this execution session. `railway.json` points to `backend/Dockerfile` and `/health`, but the Railway service settings, watched branch, root directory, environment variables, and automatic deployment policy were not inspected. The user reports that Railway variables are configured; this has not been validated here. No deployment was made.

The Supabase connector listed the only project named `My Twin` (`nckgqvpocawknhkruhip`) as `INACTIVE`; reading its migration ledger timed out. The project was not restored or awakened, no branch was created, and no SQL or migration was applied. Confirm the intended staging project and availability before database-dependent roadmap work.

## Build identity and client configuration

`app.json` contains different `extra.eas.projectId` and `updates.url` identifiers. The user was asked which UUID is canonical; the answer is pending. No EAS build, OTA update, signed Android artifact, or device acceptance has run.

Local Android JavaScript export passes under Node 20.20.2 after explicitly adding `query-string@9.5.1`, and `expo install --check` reports aligned dependencies. This is not a native Gradle/AAB build or a store-ready artifact.

The client uses `EXPO_PUBLIC_API_BASE_URL` at EAS bundle time, then falls back to `https://my-twin-pro-production.up.railway.app`. The `app.json` `extra.API_URL` value is unused by current code and has no URL scheme. Railway runtime variables are not implicitly passed into EAS; the current fallback mitigates this only while that host remains correct.

## Dependency and test gates

The final npm audit reports 89 total vulnerabilities (29 moderate, 59 high, 1 critical); production-only reports 69 (29 moderate, 39 high, 1 critical). The CI production audit gate intentionally blocks on high or critical findings. `npm audit fix --force` was not run because the proposed core Expo/React Native changes cross major versions and require an SDK-aligned upgrade and full native validation.

The complete backend suite on Python 3.11.16 reports 185 passed and 9 skipped. The skips are external TCMA integration cases; no live Supabase database or external service was used. Four deprecation warnings remain, including Pydantic `.dict()` and upstream Supabase/Starlette APIs.

Backend requirements are range-based rather than fully locked. CI now exercises the full test suite, but production dependency resolution is not yet fully reproducible across time.

A static route inventory and project-owner regression tests were added. No DAST or black-box authorization test against Railway, production RLS/storage-policy verification, cross-account test with real Supabase sessions, or specialized full Git-history secret scan has run.

## Roadmap decision

The P0.05 source baseline is committed locally on the isolated integration branch; follow-up CI, dependency, test, and inventory changes are still local. The branch has not been pushed or merged. Phase 0 baseline import and the first local test gates are complete. Security/dependency remediation, EAS identity/build, Supabase staging and migrations, Railway deployment validation, user/device acceptance, and later cognitive/relationship/agency evolution gates remain open. Do not call the product production-ready or merge to `main` until the critical/high dependency gate and the external release gates are closed.

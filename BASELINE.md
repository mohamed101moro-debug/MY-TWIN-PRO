# My Twin — P0.05 Integration Baseline

## Source of truth

The source package is `MYTWIN-P0-EXECUTION-05-ACCESS-CONTROL-VERIFIER-2026-10-09.zip` (SHA-256 `a44aaccb193d314783e00269405ddeafac4ce23b2052b2bd0b4922fbdf84dc1b`). Its 883 source files were imported to repository root and matched by relative path and SHA-256 before integration notes and two compile fixes were added. `SOURCE_MANIFEST.json` records the archive's source-file digests, not subsequent integration-only edits.

Branch `integration/p0-05-baseline-2026-10-10` was created from GitHub `main` commit `72953552fd45646647402094fc797e16598c17f4` (2026-09-05). The local baseline commit is `7d9beccf92b4c459ac3dea512aebcbc7a4fce9da`; Git ancestry is preserved and `main` has not been modified. The current follow-up changes are local and uncommitted.

## Build and test evidence

P0.05 declares Expo `~52.0.0` and React Native `0.76.9`. The branch was checked using Node `20.20.2` and Python `3.11.16`, matching the major versions in CI.

A clean `npm ci --legacy-peer-deps` succeeded. TypeScript passed, Jest passed 4/4 tests, Android JavaScript export passed and produced a 6.86 MB Hermes bundle, and `expo install --check` reported that dependencies are up to date. The export initially exposed that `expo-router@4.0.22` requires `query-string` at runtime without declaring it; the package now directly pins `query-string@9.5.1`, and a clean install plus export passed.

Python `compileall` passed. The complete backend suite passed **185 tests**, with **9 skipped** and 4 deprecation warnings, on Python 3.11.16. Tests used isolated placeholder Supabase settings; no live database was contacted. The skipped TCMA integration cases still require their external integration environment.

The CI workflow now runs TypeScript, Jest, Android JS export, Expo dependency alignment, the complete backend suite, and a production dependency-audit gate. Workflow YAML parsing and `git diff --check` passed locally. The audit step is expected to fail until high/critical advisories are removed.

## Security and release blockers

The final npm audit reports **89 findings** overall (29 moderate, 59 high, 1 critical) and **69** in the production dependency tree (29 moderate, 39 high, 1 critical). The remaining fixes suggested for core Expo/React Native dependencies cross major-version boundaries or otherwise alter the Expo SDK; no forced upgrade was applied. Production release and merge remain blocked by the critical/high findings.

A static inventory found 254 route decorators in 50 route modules: 216 registered, 23 conditional internal, and 15 currently unmounted. Among 22 paths containing `{user_id}`, 20 use `require_request_owner`; project statistics performs explicit authenticated-ID equality and owner-filtered SQL; the admin detail path is covered by the separate internal-admin policy. Two regression tests were added for the project-statistics path. See `docs/release/API_SURFACE_INVENTORY_2026-10-10_AR.md` for exceptions and scan limits.

## Configuration and release boundary

`app.json` still contains different `extra.eas.projectId` and `updates.url` identifiers. A user clarification is pending; neither was changed by guesswork. The frontend reads `EXPO_PUBLIC_API_BASE_URL` at bundle time and otherwise falls back to the current `https://my-twin-pro-production.up.railway.app` host. The separate `app.json` `extra.API_URL` value is not read by the current client. Railway variables do not automatically populate EAS build variables.

The Android JavaScript bundle is not a signed native APK/AAB, device acceptance, or EAS update. No GitHub push, PR merge, Railway deployment, Supabase migration, deletion-worker activation, or store submission has occurred. This branch is an integration candidate, not a release.

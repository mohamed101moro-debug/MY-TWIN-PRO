# My Twin — P0.05 Integration Baseline

## Source of truth

The source package is `MYTWIN-P0-EXECUTION-05-ACCESS-CONTROL-VERIFIER-2026-10-09.zip` (SHA-256 `a44aaccb193d314783e00269405ddeafac4ce23b2052b2bd0b4922fbdf84dc1b`). Its 883 source files were imported to repository root and matched by relative path and SHA-256 before integration notes and two compile fixes were added. `SOURCE_MANIFEST.json` records the archive's source-file digests, not subsequent integration-only edits.

Branch `integration/p0-05-baseline-2026-10-10` was created from GitHub `main` commit `72953552fd45646647402094fc797e16598c17f4` (2026-09-05). Git ancestry is preserved; `main` has not been modified.

## Build and test inventory

P0.05 declares Expo `~52.0.0` and React Native `0.76.9`. CI declares Node 20 and Python 3.11; this sandbox uses Node 22.13.0 and Python 3.12.3, so version parity remains outstanding.

After clean `npm ci --legacy-peer-deps`, TypeScript `npx tsc --noEmit --skipLibCheck` passed following two narrow fixes: guard `SignupResult.user_id` after the email-confirmation branch, and import SDK 52 FileSystem APIs from `expo-file-system` rather than a missing `/legacy` subpath. Jest passed 4/4 tests; P0 auth-boundary and source-contract tests passed 21/21; Python `compileall` passed; and six static lifecycle/presence/backbone hardening gates passed. EAS/Android native build remains pending.

The install reported 97 npm audit findings (3 critical, 66 high, 28 moderate). Production-only audit reported 76 (2 critical, 46 high, 28 moderate). These remain release blockers pending triage and compatible remediation; no forced upgrade was applied.

## Configuration and release boundary

`app.json` still has different `extra.eas.projectId` and `updates.url` identifiers. Keep them unchanged until the owning Expo project is confirmed. No GitHub push, PR merge, Railway deployment, Supabase migration, deletion-worker activation, or store submission is implied by this local baseline commit. The branch is an integration candidate, not a release.

# Known Limitations — P0.05 Integration Baseline

Last updated: 2026-10-10. This records what has not yet been proven; it does not infer the user's production configuration from local access.

## Platform access and deployment

No Railway connector or CLI is available in this execution session. Therefore Railway service settings, watched branch, root directory, and automatic deployment policy were not inspected. The user reports that Railway environment variables are configured, but they could not be validated here. No deployment was made.

The Supabase connector was enabled after user confirmation. The only listed project named `My Twin` (`nckgqvpocawknhkruhip`) returned status `INACTIVE`; reading its migration ledger timed out. The project was not restored or awakened, no branch was created, and no SQL or migration was applied. Confirm the intended staging project and availability before phases 4–5.

## Build and dependency gates

`app.json` has different `extra.eas.projectId` and `updates.url` identifiers. These were not changed by guesswork. No EAS/Android build or device acceptance has run.

A clean `npm ci --legacy-peer-deps` succeeded. TypeScript `npx tsc --noEmit --skipLibCheck` passed after fixing `SignupResult` narrowing for email-confirmation signups and changing `expo-file-system/legacy` to the SDK-52-compatible `expo-file-system` entry point. Jest passed 4/4 tests. Selected P0 Python tests passed 21/21 and `compileall` passed on Python 3.12.3, but CI specifies Python 3.11; the exact CI runtime still needs to be exercised. Six static source gates passed.

The full npm audit reported 97 findings: 3 critical, 66 high, 28 moderate. `npm audit --omit=dev` reported 76 production-tree findings: 2 critical, 46 high, 28 moderate. No `npm audit fix --force` was run; triage and compatible dependency updates are required before release.

A targeted credential-pattern scan found only runtime credential-handling expressions and a test-fixture candidate; it did not print values. No `.env`, private-key, or named service-account credential file was found. This is not a specialized repository-history secret scan; run one before pushing a public branch.

## Roadmap decision

The source tree was imported as requested on an isolated integration branch while retaining Git history. The baseline/patch recommendation in the team documents is inconsistent. Do not merge this branch to `main` or call it a release candidate until the differences, full CI, staging tests, Railway target, EAS project identity, dependency findings, and release decision are reviewed.

# MotoGuard Release Readiness Gate

**Current decision: BLOCKED — do not deploy to production.**

This document is a release gate, not a claim that the product is production-ready. Every required item must have reproducible evidence on the exact release candidate commit. A green unit/build/security CI run is necessary but does not establish end-to-end product readiness.

## Non-negotiable protected assets

- [ ] `client/src/pages/Home.tsx` is unchanged from the protected baseline (expected blob SHA: `a45976c8085709adce1a6186e4a72865d440c654`).
- [ ] `firestore.rules` and `firestore.prod.rules` are byte-identical.
- [ ] PR #3 remains open and unmerged until separately reviewed and explicitly approved.
- [ ] No production deploy, production rules publish, or production-data inspection/export/migration/mutation is performed as part of this audit.
- [ ] The exact release-candidate commit has successful required CI runs; pending, cancelled, stale-head, or failed runs do not pass this gate.

## Known blockers requiring implementation and verification

### 1. Durable backend persistence

- [ ] Community posts and comments are persisted through an authenticated backend/Firestore path and are visible consistently across sessions and authorized users.
- [ ] Marketplace listings are persisted through an authenticated backend/Firestore path; create/read/update/delete permissions are enforced server-side and across accounts.
- [ ] Events have a real authorized persistence/read path; the current empty-state page is not evidence of a working events feature.
- [ ] Admin moderation, listing removal, business tier changes, and ad/banner publication perform real authorized server-side operations or remain clearly unavailable. Client-only state must never be presented as a completed server operation.
- [ ] Automated tests prove persisted data survives reload, is visible to a second authorized client, and is denied to unauthorized clients.

### 2. Help-chat and account privacy

- [ ] Test account switching and sign-out on the same browser. Cached help requests/messages from one account must not be exposed to another account.
- [ ] Verify that local-only fallback messages and requests are clearly identified and never mistaken for server-confirmed records.
- [ ] Legacy help records containing email-based `user` or `helpers` fields remain a privacy risk until a separately authorized, reviewed migration is completed.
- [ ] Before any legacy migration: obtain an authorized export and authoritative email-to-UID mapping; run the offline planner; review every blocked record; test the transform and rollback in a disposable emulator; obtain explicit production-migration approval; then use a backed-up, bounded, auditable migration with post-migration verification. No such production operation is authorized by this audit.

### 3. End-to-end acceptance

- [ ] Registration, sign-in, sign-out, session restoration, and account switching.
- [ ] SOS creation, owner-only exact-location details, helper discovery/acceptance, duplicate/race handling, resolution, and failure/offline states.
- [ ] Help request creation, authorized helper acceptance, chat read/write authorization, message validation, and completion.
- [ ] Community post/comment lifecycle and ownership checks across two accounts.
- [ ] Marketplace listing lifecycle, positive/finite price validation, ownership checks, and unauthorized-operation denial.
- [ ] Admin claim checks and every admin action's persistence, authorization, auditability, and honest failure feedback.
- [ ] Mobile viewport, loading/empty/error states, network loss/recovery, and browser refresh behavior.
- [ ] Firestore emulator authorization tests run against both rule files; no rule weakening to make tests pass.

## Release evidence required

For each checklist item, record the tested commit SHA, test command/scenario, result, and CI run or review evidence. Re-run the full suite against the exact release candidate after the final code change. A source build alone is not acceptance evidence.

## Vercel configuration audit (2026-10-27)

Read-only Vercel project/deployment metadata and environment-variable names were inspected. Secret values were not decrypted or inspected. Preview deployments may be created automatically by the Git integration; no production promotion or deployment was performed as part of this audit.

- Exact candidate commit `285a674f198d2a115472deb70d41f84ff854daf2` has READY Preview deployments in both Vercel projects: `motosos1` deployment `dpl_B69Zt6Dw146TRSnwcZWDh7okoAXp` and `motoguard` deployment `dpl_AxCzDPWDNHfVDNkxq3utZdaXuXn6`. Both report `target: null`, so these are not evidence of a Production deployment.
- The `motosos1` project is configured as Vite, has no project environment-variable records in the Vercel environment listing, and its most recent deployment targeting Production is in ERROR on an older `main` commit (`16848e0bfb504c78dc7a76bb74679f680939e8aa`). SSO protection is enabled for deployments except custom domains.
- The `motoguard` project reports no framework selection and no SSO protection. Its latest Production-targeted READY deployments are older than the current candidate and have no verified match to the current commit. It reports 26 environment-variable records: payment-provider, app URL, persistence/admin bootstrap and database/Neon settings. Names/targets were inspected only; populated values and runtime consumption were not verified. The records include production-only and production/preview-targeted variables; do not assume the preview environment is safely isolated from production resources.
- A previous read-only request to a Preview `/api/sos` route returned HTTP 404. This is not an endpoint authorization test; the repository has no `api/` or `functions/` directory and `server/index.ts` currently serves the SPA only.
- Do not wire the client to a new API or create a production-facing SOS endpoint until the intended runtime, dedicated non-production Firebase project, server identity/secrets, and data isolation are explicitly mapped and tested. Do not inspect/decrypt secret values as part of this audit.

## Current verified boundary

Commit `285a674f198d2a115472deb70d41f84ff854daf2` passed Safe CI run [40478515439](https://github.com/serkansirinoglu-ship-it/motosos1/actions/runs/40478515439): TypeScript, unit tests, production build without deployment, static Firestore audit, strict rules gate, rules-file parity, isolated emulator authorization/SOS transaction tests, and CI workflow completion. The latest candidate also has READY Vercel Preview deployments in both projects, but neither deployment is targeted to Production.

The protected Home file SHA remains `a45976c8085709adce1a6186e4a72865d440c654`. Both `firestore.rules` and `firestore.prod.rules` remain byte-identical at SHA `c6741aead88452ed7f794323e75fb3f4f581da43`. PR #3 remains open and unmerged.

The SOS active-guard module remains a non-production transaction proof of concept, not an authenticated endpoint and not wired into the client. Its emulator tests prove the transaction primitive's concurrency/ownership/lifecycle behavior only; they do not prove a deployed endpoint or end-to-end mobile flow. The current client still performs a non-atomic query-then-write for active SOS creation, so cross-device uniqueness is unresolved. The current SOS transaction helper also does not yet create the full public/private SOS schema.

Durable persistence gaps, cross-account cache/privacy checks, legacy-record privacy, complete end-to-end acceptance, a dedicated non-production Firebase project/runtime mapping, and Production configuration/health verification remain open. The latest Preview READY state and green CI are necessary evidence, not a release authorization.

This verifies only the listed automated checks on the stated commit. It does **not** establish full product or deployment readiness.

**Until every blocker has implementation and recorded verification, the release decision remains BLOCKED.** No production deployment or production Firestore rules publication is authorized by this document.

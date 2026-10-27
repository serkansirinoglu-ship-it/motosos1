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
- A direct read-only request to the current Preview URL's `/api/sos` returned HTTP 404 (`NOT_FOUND`). This confirms there is no deployed SOS API route at that path in that Preview; it is not an endpoint-level auth test. Do not wire the client to this route until a protected, non-production server endpoint is implemented and verified.


Read-only project metadata and environment-variable names were inspected; secret values were not decrypted or inspected.

- The `motoguard` project reports 26 environment-variable records. Names include payment-provider settings, admin bootstrap settings, a persistence flag, and database/Neon settings. The metadata includes both production-only and production/preview-targeted records. This is not proof that every variable is populated or that the application consumes it correctly.
- The separate `motosos1` project reports no project environment-variable records in the Vercel environment listing. Its project metadata identifies Vite and SSO protection for non-custom domains; the `motoguard` project reports no framework selection and no SSO protection. These are configuration differences to resolve before choosing a backend deployment target.
- The earlier code-audit head `37cd81a998b806d0a68c2a58aff5b690320f9a4b` had no matching deployment in either project. A later documentation-only head `436e56669830fef4a6c64a6d8721c0d639e34cbf` has a Vercel Preview deployment in `motosos1` (`dpl_6DF43cyDRokKxGcc7qiraB6DdrW9`, READY); the preview root, generated JS, CSS, and manifest were fetched successfully. This validates the static Vite output path for that preview commit only; it does not validate runtime Firebase flows, backend APIs, or production readiness. The `motoguard` Vercel context remains rate-limited.
- The current repository contains no `api/` or `functions/` directory, and `server/index.ts` only serves the SPA. Do not add a production-facing SOS endpoint until the intended Vercel project/runtime, non-production Firebase project, and server-side secret/identity configuration are explicitly mapped and validated.

## Current verified boundary

Commit `436e56669830fef4a6c64a6d8721c0d639e34cbf` passed Safe CI run [40469673467](https://github.com/serkansirinoglu-ship-it/motosos1/actions/runs/40469673467): TypeScript, unit tests, production build without deployment, static Firestore audit, strict rules gate, rules-file parity, isolated emulator authorization tests, and the protected-home-page guard. Its Vercel Preview deployment also reached READY and served the SPA root plus JS/CSS/manifest assets. The Vercel output-directory change itself remains from `52d6c899a75d232b5338b19aea5e228b0a6ad9d2`.

The Vercel projects were checked against this exact commit and no matching deployment was found. The most recent observed READY deployments belong to older commits, so the `vercel.json` output-directory change has not yet been validated by a Preview deployment. Do not treat an older READY deployment as evidence for the current head.

The SOS active-guard module remains a non-production transaction proof of concept, not an authenticated endpoint and not wired into the client. Cross-device active-SOS uniqueness therefore remains unresolved. Durable persistence gaps, cross-account cache checks, legacy-record privacy, and complete end-to-end acceptance also remain open.

This verifies only the listed automated checks on the stated commit. It does **not** establish full product or deployment readiness.

**Until every blocker has implementation and recorded verification, the release decision remains BLOCKED.** No production deployment or production Firestore rules publication is authorized by this document.

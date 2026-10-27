# ADR: Atomic uniqueness for active SOS requests

- Status: Proposed; implementation not enabled
- Date: 2026-10-27
- Scope: non-production design only
- Protected files: `client/src/pages/Home.tsx`, `firestore.rules`, and `firestore.prod.rules` must remain unchanged.

## Context

The current client-side flow queries `sosRequests` for an active request and then creates a request in a separate write batch. The in-memory `sosCreateLock` prevents duplicate submissions only inside one JavaScript runtime. Two tabs, browsers, or devices can both observe no active request before either write commits. The existing Firestore rules validate the request shape and owner but do not enforce per-user active-request uniqueness.

## Decision

Do not represent the client query-plus-batch as an atomic uniqueness guarantee. The safe target is a server-authoritative SOS creation and terminal-transition flow, designed and tested in an isolated environment before any rollout.

Proposed creation algorithm:

1. Require a Firebase ID token; verify it on the server and derive the UID from the verified token, never from a caller-supplied owner field.
2. Apply App Check where available, per-UID rate limiting, input validation, and request-size limits.
3. In a Firestore transaction, read a deterministic per-user active-SOS guard document (for example, `activeSOSLocks/{uid}`). If it points to an active SOS, return that existing request instead of creating another.
4. If no active request exists, create the public SOS document, its owner-only `privateDetails/owner` document, and the guard document in the same transaction. Keep exact coordinates, email, and free text out of the public document.
5. Make cancellation and resolution use a transaction that validates ownership and current request state and clears the guard only if it still points to the request being closed. Add a reconciliation path for legacy active requests and stale guards before rollout.
6. Return a stable result for retries and duplicate submissions; do not create a parallel legacy help/chat record when authoritative SOS creation fails.

The server must use a narrowly scoped Admin SDK identity and must not expose a general-purpose document-write endpoint. Admin SDK writes bypass Firestore Security Rules, so the endpoint must perform its own authorization and schema validation.

## Constraints and rollout gates

- Do not modify either Firestore rules file as part of this work.
- Do not access, export, migrate, or modify production data.
- Do not deploy or enable a new endpoint in production from this ADR.
- Before implementation: inspect all SOS create/cancel/resolve/accept call sites, confirm hosting/runtime support and secret management, and add emulator-backed concurrency tests for simultaneous requests, retries, auth mismatch, cancellation races, and stale-guard recovery.
- Run typecheck, unit tests, build, both rules static gates, rules-file parity, and isolated emulator authorization tests.
- Review privacy and retention implications for precise GPS and private owner details.
- Roll out only after explicit deployment approval, observability/alerting, and a rollback plan exist.

## Known limitations

The current client query and in-memory lock remain defense-in-depth only. Cross-device uniqueness is not fixed by this document or by the existing Safe CI checks. Device-level SOS end-to-end behavior has not been tested here.

## Repository feasibility audit (2026-10-27)

Reviewed the current branch without touching production resources:

- `server/index.ts` is an Express static-file server with a catch-all route that serves the SPA; it has no authenticated API routes.
- `vercel.json` currently declares only the frozen pnpm install command and does not define a serverless API/function routing strategy.
- The root `package.json` does not include the Firebase Admin SDK.
- The existing browser client uses the Firebase client SDK; it is not a trusted environment for enforcing a cross-device uniqueness lock.
- The existing `sosCreateLock` is explicitly limited to one JavaScript runtime.

### Implementation gate

**Do not add a production-facing SOS endpoint yet.** First decide and document the supported backend execution target (for example, a properly configured serverless function or managed backend service), its identity verification method, secret storage, App Check strategy, rate limits, logging policy, and deployment owner. Then implement the endpoint behind a non-production-only configuration with emulator-backed transaction/concurrency tests. A generic Express route in the current SPA server is not assumed to work as a Vercel function.

No Firebase Admin dependency, endpoint, secret, hosting configuration, Firestore rule, or production deployment was changed as part of this feasibility audit.


## Non-production transaction proof of concept

Safe CI now includes `scripts/sos-active-guard.emulator.test.cjs`, which runs only when `FIRESTORE_EMULATOR_HOST` is set and the project ID begins with `demo-`. It uses the Admin SDK only against the isolated emulator and verifies:

- six simultaneous create attempts resolve to one active SOS ID;
- retries return the existing active request;
- terminal close clears only the matching guard;
- a new active request can be created after close;
- a guard pointing to a missing SOS document can be recovered.

This is a transaction-pattern proof of concept, not a production endpoint. The Admin SDK bypasses Firestore Security Rules, so it does not validate endpoint authentication or authorization. The client is not wired to this code; the cross-device issue remains unresolved until a supported server runtime, authenticated endpoint, dependency/secret management, lifecycle integration, and deployment plan are implemented and reviewed.


## SOS client integration audit (2026-10-27)

Reviewed the current branch's `firebase.js`, `client/src/pages/SOSPage.tsx`, `server/index.ts`, `vercel.json`, `firebase.json`, and root `package.json`.

### Confirmed call paths and schema constraints

- `createSOSRequest(data)` in `firebase.js` takes its effective identity from `auth.currentUser`, checks it against the caller UID, queries `sosRequests` by `requesterId`, then writes a public parent plus `privateDetails/owner` in a batch. The query and batch are separate operations, so the client can still race across devices.
- The public parent currently expects `requesterId`, `helpType`, rounded `latitude`/`longitude`, `status: "active"`, `acceptedBy: null`, `createdAt`, `updatedAt`, `resolvedAt: null`, and `cancelledAt: null`. Exact coordinates, contact email, and note belong in `privateDetails/owner`.
- `acceptSOSRequest(id)` currently writes `acceptedBy` and `updatedAt` directly from the client. `updateSOSRequest(id, patch, expectedUid)` directly writes owner terminal status and the corresponding timestamp. Any server-authoritative migration must explicitly preserve or intentionally redesign these paths; swapping only creation would leave lifecycle and guard reconciliation inconsistent.
- `SOSPage.tsx` also maintains a local placeholder while the remote request is pending/fails and contains session-change handling. Integration must preserve honest local-only vs server-confirmed messaging and must not silently report a local placeholder as an active server SOS.
- `server/index.ts` is a static SPA server with a catch-all route, `vercel.json` has no API/function routing configuration, and `package.json` has no Firebase Admin SDK dependency. `firebase.json` configures the Firestore emulator but does not identify a dedicated non-production Firebase project.

### Required implementation sequence (not yet implemented)

1. Decide the supported server execution target and deployment ownership; configure a dedicated non-production Firebase project and isolated credentials/data. Prove the target with a harmless health endpoint before adding SOS operations.
2. Define and test a server contract for create, accept, cancel, and resolve. Verify Firebase ID tokens server-side; derive UID only from verified claims; validate App Check where supported; enforce request schema, per-UID rate limits, bounded payloads, structured redacted logs, and fail-closed behavior.
3. In one transaction, read the per-UID guard and any legacy active records needed for reconciliation; create the complete public parent, owner-private document, and guard atomically. Preserve rounded public coordinates and exact-location privacy. Do not trust caller-provided requester IDs/emails.
4. Make accept and terminal transitions server-authoritative or retain direct Firestore writes only if rules and the chosen invariant prove they cannot bypass the guard lifecycle. For terminal transitions, clear the guard only if it still references the same SOS. Specify behavior for stale guards and legacy active records before rollout.
5. Add emulator tests for schema parity, simultaneous creation from independent clients, retries, account changes, unauthorized callers, accept/close races, stale/legacy reconciliation, privacy boundaries, and failure responses. Add UI/service tests for loading, local-only fallback, remote errors, session switches, refresh/restore, and helper visibility.
6. Run the existing Safe CI suite on the exact candidate, then perform manual two-account end-to-end acceptance against non-production only. Document monitoring, alerts, rollback, data retention, and operational ownership before any production approval.

**Current decision unchanged:** do not wire the client or expose a new endpoint yet. The transaction helper intentionally writes only a minimal proof-of-concept record and is not schema-compatible with the current client flow. A green Safe CI run does not close these integration gates.

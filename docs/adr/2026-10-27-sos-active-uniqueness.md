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

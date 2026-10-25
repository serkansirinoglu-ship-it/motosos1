# Firestore Security Audit — isolated branch

Date: 2026-10-26  
Scope: source review of `firestore.rules`, `firestore.prod.rules`, and current client calls.  
Status: restrictive rules, strict static checks, emulator authorization tests, and offline migration-assessment tooling are implemented on the isolated audit branch. Commit `34f002f9d9bb1d2374656d56e20fdb3ae930e147` passed both push CI ([run](https://github.com/serkansirinoglu-ship-it/motosos1/actions/runs/40233836900)) and pull-request CI ([run](https://github.com/serkansirinoglu-ship-it/motosos1/actions/runs/40233841314)), including TypeScript, unit tests, build, strict static checks, and emulator authorization tests against both rules files. No rules have been published to Firebase.

## Findings and changes on the audit branch

The initial emulator characterization confirmed permissive cross-user access and exposed an additional issue: the catch-all public-read rule overrode narrower private-profile rules because matching Firestore `allow` statements are combined with OR semantics. The branch now addresses these confirmed paths:

1. **Default access:** unmatched collections deny reads and writes. Public catalog/content collections retain explicit public-read rules.
2. **SOS requests:** authenticated riders can discover active SOS calls; inactive requests are limited to their owner/admin. Owner updates are limited to active-to-cancelled/resolved transitions and the status/timestamp fields.
3. **Profiles:** create validates UID/email identity, zero-valued server-controlled counters, empty badges, and server timestamps. Updates are restricted to profile-edit fields; points, counters, badges, identity, and creation time cannot be changed by the owner.
4. **Help requests:** creation validates `ownerId` against the authenticated Firebase UID and validates shape/coordinates. The realtime board query now filters to active requests. Closing is restricted to the owner; resolving is restricted to an accepted helper whose UID is recorded on the request. Closed requests are limited to owner/accepted helpers/admin.
5. **Chat messages:** read/send access is limited to the request owner or accepted helpers. Message sender must match the authenticated Firebase UID; display name is stored separately, and text length and server timestamp are validated.
6. **Presence:** public read remains intentional for the online-count feature, with writes limited to the owner and documents restricted to `uid`/`lastSeen`. Revisit if the UI starts exposing anything beyond this minimal heartbeat.

7. **Exact SOS location and contact details:** active SOS documents are visible to signed-in riders for discovery, so putting exact GPS coordinates, requester email, or free-text notes on the parent document would disclose them to every signed-in user. The audit branch stores only a rounded location on the public parent document and moves exact coordinates, requester email, and notes into `sosRequests/{id}/privateDetails/owner`. Firestore create rules also validate that public latitude/longitude lie on the 0.01-degree grid, with a narrow floating-point tolerance that handles positive and negative coordinate values. Rules allow the owner and the helper who successfully claims the active SOS to read that subdocument. Claiming an SOS is a one-time transition from `acceptedBy: null` to the authenticated helper UID. The legacy help-request mirror no longer copies exact GPS coordinates into its public description.

8. **Help request identity privacy:** new public `helpRequests` store `ownerId` as a Firebase UID instead of owner email; the `helpers` list and message sender identity also use UIDs. Chat display names are stored separately from authorization identity. Rules retain compatibility for existing legacy documents containing email in `user` or `helpers`; those historical records remain an explicit migration risk because Firestore rules cannot hide individual fields in a readable document. No existing production records were migrated or modified.

## Remaining release gates

Rules are enforced server-side, so the client query/state transitions were updated alongside the rules. The strict test suite passes against the dedicated demo Firestore Emulator for both rule files on the latest audited commit. This validates the checked-in branch only; it does not mean the rules are deployed. Production publishing remains a separate release decision and is not part of this work.

## Required emulator authorization test matrix

- Unauthenticated user: denied reads/writes for private profiles, SOS requests, help requests, and messages.
- Profile owner: can update approved public profile fields; cannot alter UID, email identity, points, help counters, badges, or server-owned timestamps unless explicitly authorized.
- Other signed-in user: cannot read private profile data or inactive SOS records.
- Helper discovery: can query only active SOS requests and receive only fields needed to offer help, according to the product's approved privacy model.
- SOS owner: can cancel their own active request; cannot change requester identity, coordinates, helper identity, or unrelated fields; cannot reopen a cancelled/completed request.
- Other user: cannot cancel or mutate someone else's SOS request.
- Help request owner: can read and manage their own request under the intended lifecycle.
- Accepted helper: can read/send messages only for a request they are authorized to help with.
- Unrelated signed-in user: cannot read or create messages in another request's message subcollection.
- Create validation: spoofed requester IDs, missing required fields, invalid categories/statuses, and malformed coordinates are denied.
- Presence: unauthorized clients cannot write another user's presence; public read access is confirmed or removed based on the final privacy design.

## Next implementation gate

1. Continue schema-level review of public community, event, listing, and presence documents; add field-level restrictions only where confirmed against client usage.
2. Resolve the documented legacy help-record identity exposure through an authorized, reviewed migration plan; do not infer identity mappings or access production data as part of this branch.
3. Keep both rules files byte-identical and preserve the strict emulator, static-analysis, TypeScript, unit-test, build, and homepage-diff gates on every change.
4. Perform a separate non-production integration review before release consideration.
5. Publish rules or migrate production data only after separate explicit approval.

## Release safety

- No production deployment was performed.
- Firestore rules were modified on the isolated audit branch only; no rules were published to Firebase.
- No user data or Firebase secrets were accessed or changed.
- The isolated branch and pull request remain the review surface.

## Emulator characterization added on the audit branch

The Safe CI workflow now installs pinned Firebase Emulator test tooling into a temporary CI-only directory (not into the app dependency tree) and runs `scripts/firestore-rules.emulator.test.cjs` against the Firestore Emulator with the demo project ID `demo-motoguard-firestore-rules`. It does not connect to the production Firebase project.

The suite is now in **strict authorization mode**: known vulnerable behaviors are asserted as denials, and CI fails if those operations unexpectedly succeed. `pnpm security:rules` remains a diagnostic report; `pnpm security:rules:strict` is the blocking static gate. Passing these checks validates only the checked-in rules and tested cases; it is not a guarantee that every application path is secure or that rules are deployed. The emulator harness does not publish rules to Firebase, and both checked-in rules files are kept byte-identical.

The emulator configuration is explicitly checked into `firebase.json` and points the local Firestore Emulator at `firestore.rules`. This avoids the dangerous Firebase CLI default of allowing all emulator reads/writes when no rules path is configured. The emulator test run must not be considered valid unless startup logs confirm the configured rules file is loaded.

The emulator characterization is now run twice in the same CI step: once with `firestore.rules`, then with `FIRESTORE_RULES_FILE=firestore.prod.rules`. Both are supplied directly to `initializeTestEnvironment`; no production Firebase project is used.


## Help-request lifecycle authorization tests — 2026-10-25

The strict emulator suite now explicitly checks the lifecycle on both `firestore.rules` and `firestore.prod.rules`:

- An unaccepted user cannot resolve a help request or read/send its chat messages.
- An accepted helper can read/send messages and resolve the request using their own UID.
- A helper cannot spoof another sender UID or submit a message over the 2,000-character limit.
- The request owner can close an unresolved request but cannot claim the helper's identity in the resolution fields.
- An unrelated user cannot close another rider's request.

These are emulator-only authorization tests. They do not read, migrate, or modify production records. The latest audited commit's push and pull-request CI runs passed this suite for both rule files.


## Legacy help-record migration preparation — 2026-10-25

The legacy `user` and email-valued `helpers` fields are a known privacy limitation: Firestore rules cannot redact individual fields from a document that is readable. Existing records must not be bulk-updated until the owner/helper identities have been mapped to authoritative Firebase UIDs.

A local-only assessment tool has been added at `scripts/legacy-help-migration-plan.mjs`, with unit tests at `scripts/legacy-help-migration-plan.test.mjs`. It:

- Reads only user-supplied local JSON inputs; it does not initialize Firebase or use credentials.
- Maps legacy email identities to Firebase UIDs only when the mapping is unique and complete.
- Blocks missing/ambiguous identities, malformed helper lists, duplicate document IDs, and duplicate helper identities after mapping.
- Prints aggregate counts only from the CLI; it never prints raw emails, descriptions, or document bodies.
- Does not update Firestore and does not create a migration payload. `readyForReview` means only that identity mapping checks passed, not that a record is approved for migration.

### Required migration gates

1. Produce an authorized, access-controlled export and a verified email-to-UID mapping from an authoritative identity source; never infer UIDs from email strings.
2. Run the assessment on a protected local machine and resolve every blocked item. Keep export and mapping files out of Git and support logs.
3. Review the planned record-by-record changes, preserving unrelated fields and timestamps according to a separately reviewed migration design.
4. Test the transformation and rollback on a disposable emulator dataset; verify owner/helper reads, chat authorization, and removal of legacy email fields.
5. Obtain separate explicit approval before any production migration. Back up the relevant collection, run a dry-run diff, apply in bounded batches with audit logging that omits PII, and verify counts and authorization after migration.
6. Only after verified migration, consider removing email-based compatibility branches from both rules files. Do not publish rules as part of this preparatory change.

No export, identity mapping, Firestore write, production data access, or rules publication was performed as part of this commit.


## Legacy identity migration assessment (offline only)

The branch includes `scripts/legacy-help-migration-plan.mjs` and unit tests. It accepts a local export JSON plus an explicit email-to-UID mapping JSON, and emits aggregate counts on the command line. It never initializes Firebase, connects to a project, or writes records. It blocks duplicate document IDs, missing or conflicting mappings, malformed identity lists, and invalid identity shapes. The function-level plan contains proposed identities for review; do not share that detailed output because it can include document IDs and UIDs.

`readyForReview` is only a static identity-mapping result, not a migration payload, data-integrity guarantee, or authorization to migrate. Before any migration: obtain an authorized export and authoritative UID mapping; review a redacted assessment; validate all field transformations against the actual schema; test idempotency, backups, rollback and bounded batches in an isolated environment; then obtain a separate explicit production migration approval. Never put raw exports or mapping files into Git or CI artifacts. Do not remove legacy rule compatibility until migration completion is independently verified.

The planner's UID-shape checks are intentionally conservative and must be reconciled against the actual Firebase Auth UID format and project data before use on a real export. No production export, mapping, migration, or user-data mutation has been performed.


## Protected main-page guard

The Safe CI workflow checks every pull request against its actual base branch and fails if `client/src/pages/Home.tsx` changes. This is a CI guard only; it does not edit or restore the page. The guard is intended to preserve the explicit requirement that security work not alter the main page. Existing PR file-list review also confirms that the current audit PR does not include that path.


## Firestore rules drift prevention

The Safe CI workflow compares `firestore.rules` and `firestore.prod.rules` byte-for-byte and fails if they diverge. This prevents a future security fix from being applied to only one checked-in rules file. It does not publish rules to Firebase. At the time of adding this guard, both files are identical.


## Closed help request chat write guard

Firestore rules now require a help request to remain active before a non-admin can create a chat message. The emulator suite includes a regression test for a listed helper attempting to send a message after closure.


## SOS private-details path restriction

Non-admin access to SOS private details is restricted to the designated `privateDetails/owner` document. This prevents an accepted helper from reading other documents that might later be added under the same subcollection. The emulator suite verifies that the accepted helper can read `owner` while being denied `unexpected`.


## SOS private-details ownership regression

The emulator suite also verifies that a different authenticated rider cannot create `privateDetails/owner` under an SOS request they do not own. This checks the atomic parent/subdocument ownership binding, not just read restrictions.

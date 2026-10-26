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
6. **Presence:** public read remains intentional for the online-count feature, with writes limited to the owner and documents restricted to `uid`/`lastSeen`. Revisit if the UI starts exposing anything beyond this minimal heartbeat. Emulator regression tests also reject stale client-supplied heartbeat timestamps, extra identity fields, and deletion by another user.

7. **Exact SOS location and contact details:** active SOS documents are visible to signed-in riders for discovery, so putting exact GPS coordinates, requester email, or free-text notes on the parent document would disclose them to every signed-in user. The audit branch stores only a rounded location on the public parent document and moves exact coordinates, requester email, and notes into `sosRequests/{id}/privateDetails/owner`. Firestore create rules also validate that public latitude/longitude lie on the 0.01-degree grid, with a narrow floating-point tolerance that handles positive and negative coordinate values. Rules allow the owner and the helper who successfully claims the active SOS to read that subdocument. Claiming an SOS is a one-time transition from `acceptedBy: null` to the authenticated helper UID. The legacy help-request mirror no longer copies exact GPS coordinates into its public description.

8. **Help request identity privacy:** new public `helpRequests` store `ownerId` as a Firebase UID instead of owner email; the `helpers` list and message sender identity also use UIDs. Chat display names are stored separately from authorization identity. Rules retain compatibility for existing legacy documents containing email in `user` or `helpers`; those historical records remain an explicit migration risk because Firestore rules cannot hide individual fields in a readable document. No existing production records were migrated or modified.

## Additional schema checks added on 2026-10-26

- Event and marketplace listing creation now require `createdAt == request.time`, preventing clients from omitting or backdating the creation timestamp. Emulator tests cover valid server timestamps, missing timestamps, and forged historical timestamps for both collections. Both rules files must remain byte-identical and the full non-production CI must pass before this change is considered verified.

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

## Cross-user public-content authorization regressions — 2026-10-26

The non-production Firestore Emulator matrix now explicitly asserts that an unrelated signed-in user cannot edit or delete an existing community post, and cannot edit or delete an event owned by another user. It also asserts that a post owner cannot inject a comment by rewriting the parent document's `comments` array. These tests run for both byte-identical rules files through the existing Safe CI workflow.

The current application community and marketplace screens use local in-memory services, and the Events page intentionally shows an empty state until real backend event data exists. These tests validate server-side rules for any Firestore-backed use; they do not claim that those screens currently persist data in Firestore. Likes/comments should remain outside owner-editable post fields; a future Firestore integration should use a separately authorized, atomic interaction model rather than opening parent-document array mutation.

## Public content mutation hardening — 2026-10-26

The strict Firestore rules now constrain the public community-post and marketplace-listing schemas and owner-editable fields:

- Community-post creation uses an explicit field allowlist and validates content/city and optional text/list fields. Owners can edit only content, city, image, and tag; they cannot rewrite author identity, likes/comments arrays, or creation time. Admins retain moderation access. Owner edits now also reject an empty city, matching the create-time non-empty schema requirement; the emulator suite covers this regression.
- Listing creation uses an explicit field allowlist and validates title, category, non-negative numeric price, description, city, and optional contact/image text. Sellers cannot self-assign the featured/promotion flag or rewrite seller identity/contact email and creation time through ordinary updates. Editable listing content is allowlisted.
- Event writes now use a bounded field allowlist and validate title and optional descriptive fields. Organizer identity and creation timestamp are immutable to non-admins; event deletion remains admin-only.
- Emulator regression tests cover oversized community content, extra privilege fields, unauthorized likes/creation-time mutation, self-promotion, seller email changes, negative prices, and owner-field spoofing.
- Both `firestore.rules` and `firestore.prod.rules` are kept byte-for-byte identical. The application currently uses local in-memory community and marketplace services rather than a Firestore-backed persistence layer for those screens; these rules are defensive server-side gates for any authorized future integration and do not claim that those screens persist remotely.

These changes were validated by the strict emulator suite against both rule files, plus TypeScript, unit tests, production build, static security analysis, and the protected-homepage CI guard. No deployment or production data change was performed.
## Public presence reads reject malformed legacy documents — 2026-10-26

Firestore document reads cannot redact selected fields. The public presence read rule therefore checks that a record contains only `uid` and `lastSeen`; malformed legacy records with additional fields are denied rather than exposed. The emulator suite seeds such a legacy-shaped record and asserts that anonymous reads fail while a valid minimal presence record remains readable. This is a defensive document-level gate, not a field-redaction mechanism. Both rules files must remain byte-for-byte identical, and no production rules were published.

## Presence read schema validation — 2026-10-26

The public `presence/{uid}` read rule now requires exactly the `uid` and `lastSeen` fields, requires the stored UID to match the document ID, and requires `lastSeen` to be a Firestore timestamp. Emulator fixtures verify that anonymous reads still work for valid minimal records and are denied for legacy records with extra identity fields, mismatched UIDs, or malformed heartbeat timestamps. Both rules files remain byte-identical; no production rules were published.


## Marketplace seller-email privacy gate — 2026-10-26

Public marketplace listing documents must not contain `sellerEmail`: new listing writes reject that field, and anonymous/public reads of legacy documents containing it are denied. The listing owner and admins retain access to legacy records so they can be reviewed without exposing the email to everyone. Emulator regression tests cover both legacy reads and new writes for both identical rules files. This is a rules-level safeguard only; no production records were inspected or migrated. Because Firestore rules are not field filters, any future Firestore listing query must account for legacy email-bearing documents (for example, after a separately approved migration) rather than assuming the rules can redact `sellerEmail`.


## Marketplace client model privacy alignment — 2026-10-26

The in-memory marketplace listing model and listing creation flow no longer store or derive a public seller email. Seller display names use the profile display name or a neutral fallback instead of deriving a name from the email address. This aligns client-side data shape with the Firestore rule that rejects `sellerEmail` on new listing documents. Marketplace persistence remains in-memory in the current client implementation; no production data was accessed or changed.


## Community-post legacy schema privacy gate — 2026-10-26

Anonymous reads of community posts now require the stored document to contain only the approved public fields. Admins and the post owner retain access to legacy records that have extra fields, allowing review without exposing those records to the public. The emulator suite adds a legacy post with an email field and asserts anonymous denial plus owner access. This is document-level protection: Firestore rules cannot redact fields. Any future Firestore-backed feed must account for legacy documents that fail the public schema condition; the current community screen still uses local in-memory data. No production data was inspected or changed.


## Event legacy-schema privacy gate — 2026-10-26

Public event reads now require the document to contain only the approved public event fields. The organizer and admins retain access to legacy records with extra fields for review. Emulator coverage verifies anonymous denial and organizer access for a legacy event containing a contact email. Firestore rules deny the whole document rather than redact individual fields. The current Events page is an empty state and does not persist events; this is a defensive future-backend rule. No production data was inspected or changed.


## Help-request legacy email privacy gate — 2026-10-26

Active help requests remain discoverable to signed-in riders only when their document uses the approved public field schema. Legacy records with extra fields such as the old `user` email field are readable only by the owner, listed helpers, or admins. Emulator coverage verifies that an unrelated signed-in user is denied while the owner retains access. This can hide legacy email-bearing requests from the general feed until a separately approved migration or review; no production data was inspected or changed.

## SOS claim and deletion regression coverage

The emulator suite now also asserts that a successful SOS claim cannot be taken over by a second rider, that the accepted helper cannot mutate the public coordinates, and that neither the requester nor an unrelated signed-in rider can delete the SOS parent document. These are regression checks against claim-race and post-creation tampering paths; the admin-only deletion policy remains unchanged. They run against both synchronized rules files in the isolated CI workflow.

9. **Marketplace listing read schema:** public reads now require the document to contain only approved listing fields. Previously, excluding only the known `sellerEmail` field still allowed a legacy listing with any other unexpected field to be read publicly. The emulator suite now seeds a legacy listing with an `internalNotes` field and verifies public access is denied while the seller can still read it. Both rules files remain synchronized; no production records were inspected or changed.

## User-profile read isolation regression — 2026-10-26

The non-production Firestore Emulator suite now explicitly verifies that an authenticated rider cannot read another rider's private profile, while the profile owner can read their own profile. This supplements the existing anonymous-read denial and server-controlled profile-field mutation checks. The test runs against both synchronized rules files; no production data was accessed.

## Profile update input validation — 2026-10-26

Profile-owner updates now validate the types and maximum lengths of changed display name, city, motorcycle, photo URL, and bio fields; the location privacy toggle must be boolean, and contacts must remain a list capped at 10 entries. This prevents malformed or oversized values from being stored through the client rules path while preserving the existing editable fields. Emulator regressions cover wrong display-name type, oversized bio, non-boolean privacy toggle, and excessive contacts. Both checked-in rules files are synchronized. No production rules were published and no production data was accessed.


## Profile creation input validation — 2026-10-26

New profile creation now applies the same field type and size boundaries used for profile edits: display name (80 characters), city and motorcycle (100 each), photo URL (2048), bio (500), boolean location privacy, and contacts list capped at 10 entries. Optional fields remain optional for compatibility, but when supplied must satisfy the checks. Emulator tests cover invalid field types, oversized bio, invalid privacy flag, excessive contacts, and a valid new profile. Both rules files are kept byte-for-byte synchronized; no production rules were published and no production data was accessed.


## Presence privacy — authenticated reads only — 2026-10-26

Presence records expose a rider UID and heartbeat timestamp. Reads now require authentication as well as the existing exact-field, document-UID, and timestamp checks. The client presence helper is designed for signed-in users, so anonymous read access was unnecessary. Emulator regressions verify that anonymous reads fail, signed-in reads of valid records succeed, and malformed legacy records remain unreadable. Both rules files are synchronized; this change has not been published to production.


## Private-by-default location setting on profile creation — 2026-10-26

New profile creation may omit `privacyLocation`, but if it is supplied the value must be `false`. This matches the current profile-creation helper, which initializes location sharing as disabled, and avoids allowing a client to opt into location sharing implicitly during account setup. Users can explicitly change the Boolean setting later through the profile update path. Emulator coverage rejects both malformed values and an initial `true` value. Both rule files remain synchronized; no production rules were published.


## Help-request coordinate-pair validation — 2026-10-26

Help-request creation now accepts either no location or both latitude and longitude. A request containing only one coordinate is rejected, as are nonnumeric or out-of-range coordinate values. The same validation is mirrored byte-for-byte in `firestore.rules` and `firestore.prod.rules`. Emulator regression tests cover both latitude-only and longitude-only submissions against both rule files. This is a non-production rules change only; no rules were published and no production records were accessed or changed.


## Bottom-of-home engagement component and CI verification — 2026-10-26

The optional MotoGuard engagement section is implemented in `client/src/components/HomeEngagementSection.tsx` and mounted from `client/src/App.tsx` after the existing `<Home />` component. The protected `client/src/pages/Home.tsx` file was restored to its baseline content; its verified blob SHA is `a45976c8085709adce1a6186e4a72865d440c654`. Do not move the engagement component into that protected file.

The section contains a self-contained safe-driving question and navigation cards to existing community, events, map, and profile routes. It does not claim that event creation, persistent quiz scores, points, streaks, or rewards are implemented. The Events page currently presents an empty state when no real event data is available; do not populate it with fabricated events.

Latest commit `83d1bcfbc9b5a8fefc63a9b4255f213f6ddf3a4c` passed both available Safe CI runs. Verified checks include TypeScript, unit tests, build-only (no deployment), static Firestore rules audit, rules-file parity, and Firestore Emulator authorization tests against both synchronized rule files. PR #3 remains open and unmerged. No production deployment, Firestore rules publication, or production data access occurred.


## Help-request coordinate boundary regression tests — 2026-10-26

Extended the non-production Firestore Emulator suite to verify that help-request creation rejects latitude above 90, longitude below -180, and nonnumeric coordinate values, in addition to the existing incomplete-coordinate-pair tests. The tests exercise the existing rules; no production rules or data were changed. The new commit must pass the branch's CI before these checks are considered verified.


## Help-request helper-list integrity regression — 2026-10-26

Added an emulator regression asserting that a rider cannot accept a help request while appending another rider's UID to the helper list. The valid acceptance path remains tested immediately afterward. This is test-only hardening against unauthorized helper enrollment; no rules or production data were changed. CI for the new commit is the required verification gate.


## Legacy help-request visibility regression coverage — 2026-10-26

Extended the isolated Firestore Emulator fixtures and assertions for legacy help requests. The suite now checks that an email-bearing legacy helper entry is readable only by the authenticated matching helper, and that an active legacy request with an unexpected private field is not exposed to unrelated signed-in users. The owner retains access for review/cleanup. This is test-only; no Firestore rules or production records were changed. Await CI for the latest commit before treating the tests as verified.


## Legacy helper chat authorization regression — 2026-10-26

Added a seeded message under a legacy help request whose helper list contains an email address. The emulator suite verifies that the matching authenticated helper can read the message while an unrelated authenticated rider is denied. This checks the nested-message authorization path as well as parent-document visibility. Test-only change; no rules were edited and no production data was accessed.


## Help-request legacy helper identity exposure — 2026-10-26

CI exposed a real regression-test gap: an active help request with a legacy email value inside `helpers` could pass the public-read branch because the rules validated field names but not the identities inside the list. Public discovery now permits only active requests with an empty helper list, and the client subscription filters to `helpers == []` so accepted requests are no longer included in discovery. The matching legacy helper retains parent and nested-message access through the identity-specific rules; unrelated riders are denied in emulator tests.

Compatibility caveat: strict public-schema checks can deny a broad collection query while unsafe legacy documents remain in the same collection, because Firestore rules do not filter query results. A controlled, separately reviewed migration or a dedicated public-discovery index is needed before claiming legacy collections are fully compatible. No production rules were published and no production data was read or modified.


## Explicit public-discovery marker

Follow-up hardening adds `publicVisible: true` only to newly created help requests and requires that marker for public reads. The real-time discovery query now filters on `publicVisible == true`, `active == true`, and an empty helper list. Legacy records without the marker therefore cannot make the public query fail merely by sharing the collection. The marker is not a migration: legacy records remain private to their owner, authorized helper, or admin under the existing identity checks. Emulator fixtures for valid help requests were updated to exercise the new schema. Both rules files remain synchronized; CI must be green on the final commit before this change is considered verified.


The emulator suite now explicitly checks both sides of the discovery boundary: a valid request created with `publicVisible: true` is readable by another signed-in rider, while a legacy request with an otherwise public-shaped schema but no marker remains readable only by its owner. This guards against accidentally treating legacy records as public by default.


## CI follow-up: visibility marker must be enforced by the read rule

The first explicit-marker iteration updated the create schema and client query, but the public-read predicate still used the prior field whitelist. The emulator test caught this because a newly created public request was denied. Corrected the read predicate to require `publicVisible == true` and allow the marker in the exact public schema; mirrored the same rules into both rule files. This is a test-driven correction, not a production deployment.

## Latest verification snapshot — 2026-10-26

Latest audited commit: `e3afdadbdf952bdc09c596cab0226fed796aa73e`.

Both CI runs for this exact commit completed successfully:
- [Push CI](https://github.com/serkansirinoglu-ship-it/motosos1/actions/runs/40292514054)
- [Pull-request CI](https://github.com/serkansirinoglu-ship-it/motosos1/actions/runs/40292520155)

The successful jobs include TypeScript, unit tests, build without deployment, Firestore static audit and strict gate, rules-file synchronization, and emulator authorization tests against both checked-in rules files. The migration-assessment tests also cover redaction of raw email values from blocked and ambiguous results.

This status applies only to the isolated branch and exact commit above. It does not certify production data cleanliness or production deployment. `client/src/pages/Home.tsx` remains unchanged, `firestore.rules` and `firestore.prod.rules` remain byte-identical, PR #3 remains open and unmerged, and no production Firestore rules or records were changed.


## Latest verification snapshot — migration assessment hardening — 2026-10-26

The offline legacy help-request migration assessment now blocks Firestore document IDs containing `/`, equal to `.` or `..`, matching the reserved `__...__` form, or exceeding the length limit. Regression tests cover these invalid IDs and confirm a valid ID remains accepted. This is assessment-only validation; it does not connect to Firebase or write/migrate records.

Current audited commit: `61b5da7058d13ead7001ea53ab202da528cc7faa`.

Both CI runs for this exact commit completed successfully:
- [Push CI](https://github.com/serkansirinoglu-ship-it/motosos1/actions/runs/40294131305)
- [Pull-request CI](https://github.com/serkansirinoglu-ship-it/motosos1/actions/runs/40294137597)

The successful CI jobs run type checking, unit tests, production build without deployment, static Firestore audit and strict gate, rule-file synchronization, and emulator authorization tests against both rule files. The isolated branch remains non-production: `client/src/pages/Home.tsx` is unchanged, `firestore.rules` and `firestore.prod.rules` are byte-identical, PR #3 remains open and unmerged, and no production rules or records were changed. This does not certify that historical production records are clean or that deployment is approved.


## Latest verification snapshot — UID mapping conflict regression — 2026-10-26

Current audited commit at the time of this snapshot: `6535eca0c10b99370d7e5d74d994e9ae2e7adba3`.

Both CI runs for this exact commit completed successfully:
- [Push CI](https://github.com/serkansirinoglu-ship-it/motosos1/actions/runs/40295717674)
- [Pull-request CI](https://github.com/serkansirinoglu-ship-it/motosos1/actions/runs/40295724726)

Verified jobs include TypeScript, unit tests, production build without deployment, Firestore static audit and strict gate, rule-file parity, and Emulator authorization tests against both checked-in rules files. The added regression test confirms a malformed UID in one normalized duplicate email mapping makes the mapping ambiguous even if another duplicate contains a valid UID.

The current source hashes checked on the branch are:
- `client/src/pages/Home.tsx`: `a45976c8085709adce1a6186e4a72865d440c654` (unchanged)
- `firestore.rules` and `firestore.prod.rules`: both `f5d197e0a0d6639021ff777efa98199a6a73c668` (byte-identical)

## Client implementation scope — verified 2026-10-26

Source review confirms that `client/src/services/sosService.ts` and `client/src/services/marketplaceService.ts` maintain in-memory arrays, not durable Firestore-backed records. The marketplace page currently reports a listing as published after adding it to that in-memory service; this is not evidence of server persistence. The SOS page has Firestore helper calls, but also creates local SOS state, so end-to-end persistence and live multi-user behavior must be validated separately. Help requests/messages have Firestore realtime helper calls and localStorage-backed state; their full behavior still requires authenticated end-to-end checks against a non-production environment.

Therefore, passing rules Emulator tests validates the checked-in authorization rules and tested scenarios only. It does not establish that SOS, chat, map, marketplace, or community workflows are fully integrated, persistent, or production-ready. No production deployment, rules publication, or production-data access or mutation was performed. PR #3 remains open and unmerged.


## Map/SOS discovery integration gap — verified 2026-10-26

Source review of `client/src/pages/MapPage.tsx` shows the map initializes its SOS list from `sosService.getActiveRequests()` only. That service is an in-memory array in `client/src/services/sosService.ts`. Although `firebase.js` exposes `getActiveSOSRequests()`, the map page does not call it or subscribe to Firestore SOS updates. Consequently, the map's local SOS cards are not evidence of cross-user, persisted SOS discovery; calls created in another session may not appear in this map. This is a confirmed client integration gap, not a Firestore rules bypass.

Related UX behavior reviewed in `client/src/pages/SOSPage.tsx` is appropriately cautious in its toast text: it distinguishes a local-only SOS from a confirmed Firestore save and does not claim that automatic nearby-rider notifications were sent. End-to-end multi-account tests for remote SOS discovery, claim lifecycle, and exact-location access remain outstanding.

Additional client-side review confirms:
- `client/src/pages/MarketplacePage.tsx` calls the in-memory `marketplaceService.createListing()` and then reports the listing published; it does not call a Firestore listing creation helper.
- `client/src/contexts/MessageContext.tsx` intentionally retains local optimistic fallback after Firestore write failures. This can make local-only help requests/messages appear in the current browser without server persistence; production UI should distinguish unsynced local data from confirmed remote writes.
- `client/src/pages/ChatPage.tsx` shows accept/resolve success toasts immediately after invoking local-first context methods, before the asynchronous Firestore update is confirmed. That is a reliability/UX mismatch; the UI message is not proof that a server-side state transition succeeded.

These findings are documented for follow-up; no broad client workflow rewrite was made in this security-gate pass because it would require dedicated non-production integration tests and explicit error/loading-state coverage. No production deployment, rules publication, or production-data access/mutation occurred.


## Local persistence error handling review — 2026-10-26

Further source review of `client/src/contexts/MessageContext.tsx` found that the effect persisting `helpRequests` and `messages` calls `localStorage.setItem(STORAGE_KEY, ...)` without a try/catch, while adjacent localStorage reads and the separate user-stats write are guarded. Browser storage can reject writes (for example, quota exhaustion or storage restrictions), so this persistence effect can throw instead of degrading gracefully. This is a client reliability finding, separate from Firestore authorization. A fix should guard the write and surface unsynced/local-only state explicitly; it should be paired with a test that simulates storage write failure. No code change was made without a focused test harness for this provider.

The latest Safe CI run for commit `2e27fefa67773d8cdc1bd03deb2b5382d5201e10` completed successfully: [run #40313589978](https://github.com/serkansirinoglu-ship-it/motosos1/actions/runs/40313589978). Verified steps include the protected-homepage guard, frozen dependency install, TypeScript, unit tests, build-only (no deploy step in this workflow), static and strict Firestore checks, rules-file byte parity, and emulator authorization tests against both rule files. This CI result does not by itself establish whether external hosting integrations created a preview deployment; production deployment remains prohibited for this audit.


## Marketplace demo-data and persistence disclosure fix — 2026-10-26

The audit branch now removes hard-coded marketplace sample offers that looked like real user listings. `MarketplaceService` starts with an empty list until a user creates an offer in the current session. The Marketplace page explicitly discloses that listings are session-local, are not published to other users, and may disappear on refresh; the success toast no longer claims successful publication. A focused service test covers the empty initial state and create/filter/delete lifecycle. This does not add backend persistence; a Firestore-backed marketplace still requires a separately tested implementation and authorization integration. This change does not touch `client/src/pages/Home.tsx` or either Firestore rules file.

## Local storage write-failure guard — 2026-10-26

Implemented a narrow reliability fix in `client/src/contexts/MessageContext.tsx`: the effect that serializes help requests and messages to browser localStorage now catches storage-write exceptions and logs a warning, allowing the in-memory UI state to remain usable when browser storage is full or unavailable. This does not make local data server-persistent and does not change Firestore behavior. A dedicated provider-level test that simulates localStorage write failure has not yet been added; the current change must be validated by Safe CI before it is considered verified. No changes were made to the protected home page or Firestore rules files.

## Help-action server confirmation — 2026-10-26

Updated `client/src/contexts/MessageContext.tsx` so accepting or resolving a help request returns a boolean and updates local state only after the Firestore update promise resolves. Missing Firestore configuration, inactive/missing requests, and rejected writes return failure; resolving also does not increment local help counts or award badges unless the server confirms the update. Updated `client/src/pages/ChatPage.tsx` to show success toasts only after confirmation and an error toast otherwise. This avoids claiming a remote operation succeeded when it was only an optimistic local mutation. The behavior still requires Safe CI and manual multi-user validation; no production data or production deployment was used. Dedicated component-level tests for these failure/success paths are not yet present.

## Live SOS map discovery — 2026-10-26

Added `subscribeActiveSOSRequests` in `firebase.js`, a Firestore `onSnapshot` subscription restricted to public parent documents with `status == active`, ordered by creation time. It exposes only public fields and never reads the private `privateDetails` subcollection. `client/src/pages/MapPage.tsx` now normalizes those public records into the map's SOS card shape and merges them with local-only requests, deduplicating by ID. If the subscription cannot be established or errors, the map retains its local SOS list. Exact coordinates and requester email are not fetched for public map display; the public rounded coordinates are used. This adds the missing realtime client path, but live cross-user behavior still depends on authenticated Firebase configuration, deployed-compatible rules, and runtime validation. No rules were changed or published, and no production data was accessed. Safe CI is required before this change is considered verified.

## Map SOS acceptance flow — 2026-10-26

Added an authenticated “Yardım Çağrısını Üstlen” action to the MapPage SOS detail modal for remote active requests only. The UI hides the action for local-only entries, the request owner, and requests already marked as accepted. It calls the existing `acceptSOSRequest` Firebase helper, shows a pending state while awaiting the server, and only reports success if the Firestore update resolves; failure is reported without optimistic success. The existing Firestore rule restricts the claim to a signed-in user other than the requester, with `acceptedBy == null`, so concurrent attempts should be rejected by the server after the first successful claim. This flow remains subject to Safe CI and multi-user runtime verification. No Firestore rules were changed or published, and no production deployment or data access occurred.

## SOS discovery query portability — 2026-10-26

Updated both one-shot and realtime active-SOS queries to filter by `status == active` using the single-field index and sort returned documents by `createdAt` in memory. The repository does not define a Firestore composite-index manifest, so the previous `status` + `createdAt` query could require an index that was not declared in source control and leave the map in local-only fallback mode. The change does not alter Firestore rules, document fields, access scope, or production configuration. CI verification for this commit is pending.

## SOS self-acceptance regression test — 2026-10-26

Extended the non-production Firestore emulator suite to assert that an SOS requester cannot set themselves as the accepted helper. The test exercises the deployed-rules-equivalent emulator policy without modifying either rules file or accessing production. The existing test already verifies a different signed-in rider can claim an active request and that subsequent claim attempts cannot replace the accepted helper.

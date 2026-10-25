# Firestore Security Audit — isolated branch

Date: 2026-10-25  
Scope: source review of `firestore.rules`, `firestore.prod.rules`, and current client calls.  
Status: findings recorded; no Firebase rules have been published or changed by this audit.

## Confirmed risks in the checked-in rules

The checked-in `firestore.rules` and `firestore.prod.rules` currently contain the same broad access patterns:

1. **SOS reads:** every signed-in user can read every document in `sosRequests`, including inactive requests and requester details.
2. **SOS updates:** the requester can update any fields of their request. The rules do not restrict allowed changed fields or state transitions.
3. **Help request reads:** every signed-in user can read every `helpRequests` document.
4. **Message subcollection:** every signed-in user can read and create messages under every help request; the rules do not verify that the user owns the request or is an accepted helper.
5. **Help request creation:** any signed-in user can create a request without validating owner identity, required fields, or data shape.
6. **Profile updates:** the owner can update any fields in `users/{uid}`, including counters, points, badges, or other fields that should be server-controlled.
7. **Presence reads:** `presence` is publicly readable. The documents are intended to contain only `uid` and `lastSeen`, but public access should be reviewed against the actual online-count feature and privacy requirements.

## Why rules were not changed in this commit

Rules are enforced server-side and a client-only change cannot secure the database. A premature restrictive rule can also break helper discovery, request acceptance, message subscriptions, or account flows. The checked-in code uses different identifiers and access patterns in SOS and legacy help-request flows, so those relationships must be mapped before choosing predicates.

No rule change should be published until the following tests run against a dedicated Firebase Emulator project—not production—and the actual Firebase project/rules deployment target is confirmed.

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

1. Add the Firebase Emulator and rules-unit-testing harness as development-only tooling, with a reproducible lockfile update.
2. Encode the matrix above as automated tests and confirm the current rules fail the intended negative cases.
3. Map every client query and state transition to the authorization model.
4. Tighten both checked-in rules files together, run emulator tests, TypeScript/unit/build CI, and a non-production preview.
5. Publish rules only after a separate explicit production release decision.

## Release safety

- No production deployment was performed.
- No Firestore rules were published or modified in this audit.
- No user data or Firebase secrets were accessed or changed.
- The isolated branch and pull request remain the review surface.

## Emulator characterization added on the audit branch

The Safe CI workflow now installs pinned Firebase Emulator test tooling into a temporary CI-only directory (not into the app dependency tree) and runs `scripts/firestore-rules.emulator.test.cjs` against the Firestore Emulator with the demo project ID `demo-motoguard-firestore-rules`. It does not connect to the production Firebase project.

The current test mode is **baseline characterization**: tests intentionally reproduce the known permissive behaviors and print each as `KNOWN RISK reproduced`. This makes the current exposure executable and repeatable without pretending the current rules are secure. The suite also checks a small number of existing denials. When rules are hardened, invert the vulnerable cases to expected denials and switch CI to strict mode.

The static scanner has two modes:
- `pnpm security:rules`: reports current findings without blocking baseline CI; this is an audit report, **not** a security pass.
- `pnpm security:rules:strict`: fails while the known risky patterns remain. Do not treat the branch as release-ready until strict static checks and strict emulator authorization tests pass.

This harness is transitional by design. It does not justify changing or publishing production rules; both rules files remain unchanged.

The emulator configuration is explicitly checked into `firebase.json` and points the local Firestore Emulator at `firestore.rules`. This avoids the dangerous Firebase CLI default of allowing all emulator reads/writes when no rules path is configured. The emulator characterization must not be considered valid unless startup logs confirm the configured rules file is loaded.

The emulator characterization is now run twice in the same CI step: once with `firestore.rules`, then with `FIRESTORE_RULES_FILE=firestore.prod.rules`. Both are supplied directly to `initializeTestEnvironment`; no production Firebase project is used.

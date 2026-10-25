# MotoGuard

## Build and checks

- `pnpm dev` starts local development.
- `pnpm build` creates the production build.
- `pnpm check` runs TypeScript validation.

## Firebase client configuration

The real-time sign-in and online-member count require these Vite variables, obtained from the correct Firebase Web app settings:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Use `.env.local` locally and add the matching values to Vercel Preview and Production environment settings. Do not commit actual values or guess a project configuration.

## Online member count and Firestore rules

The header count is based on authenticated users with a recent heartbeat, not a hard-coded or random number. If Firebase is not configured or realtime data is unavailable, the count stays hidden. The heartbeat refreshes about every 45 seconds and records older than two minutes are excluded.

The rules in `firestore.rules` must be published to the intended Firebase project before the feature can be verified. First confirm the project ID, then use Firebase CLI to select that project and deploy only the Firestore rules. This changes live security policy, so never deploy before confirming the target project.

## Release checklist

1. Run `pnpm install --frozen-lockfile`. If it fails, regenerate and review `pnpm-lock.yaml` with the project's pnpm version; disabling frozen lockfile is not a permanent fix.
2. Run `pnpm check` and `pnpm build`.
3. In Preview, test Firebase sign-in and Firestore access.
4. Test the counter with two separate signed-in sessions and verify that it updates after one session leaves.
5. Test SOS, profile, and other critical flows in Preview.
6. Do not deploy to Production until Firebase configuration, published rules, and the above tests are verified.

Never place Firebase Admin service-account private keys, access tokens, or passwords in frontend variables or source control. Firestore security depends on deployed Security Rules, not only the local rules file.

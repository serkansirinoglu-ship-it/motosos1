/**
 * Fail closed for Vercel Production builds when the Firebase web app is not configured.
 * Preview and CI builds remain possible, but they must not be mistaken for live persistence.
 * Firebase web config is public client configuration; never put server secrets here.
 */
export const REQUIRED_FIREBASE_ENV = [
  "VITE_FIREBASE_API_KEY",
  "VITE_FIREBASE_AUTH_DOMAIN",
  "VITE_FIREBASE_PROJECT_ID",
  "VITE_FIREBASE_STORAGE_BUCKET",
  "VITE_FIREBASE_MESSAGING_SENDER_ID",
  "VITE_FIREBASE_APP_ID",
];

export function getMissingFirebaseEnv(env = process.env) {
  return REQUIRED_FIREBASE_ENV.filter((key) => typeof env[key] !== "string" || env[key].trim() === "");
}

export function verifyProductionFirebaseEnv(env = process.env) {
  if (env.VERCEL_ENV !== "production") return [];
  return getMissingFirebaseEnv(env);
}

if (process.env.VERCEL_ENV === "production") {
  const missing = getMissingFirebaseEnv();
  if (missing.length > 0) {
    console.error(
      [
        "MotoGuard release blocked: required Firebase client configuration is missing from the Vercel Production environment.",
        "Add the correct values from the intended Firebase Web App, then redeploy. Existing Production deployment is not modified by this check.",
        "Missing variable names:",
        ...missing.map((key) => `- ${key}`),
      ].join("\n"),
    );
    process.exitCode = 1;
  }
}

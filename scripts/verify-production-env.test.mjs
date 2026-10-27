import { describe, expect, it } from "vitest";
import { getMissingFirebaseEnv, verifyProductionFirebaseEnv, REQUIRED_FIREBASE_ENV } from "./verify-production-env.mjs";

describe("Vercel production Firebase configuration gate", () => {
  it("requires the complete Firebase web app configuration in production", () => {
    expect(getMissingFirebaseEnv({})).toEqual([...REQUIRED_FIREBASE_ENV]);
    expect(verifyProductionFirebaseEnv({ VERCEL_ENV: "production" })).toEqual([...REQUIRED_FIREBASE_ENV]);
  });

  it("passes when all required values are present", () => {
    const env = Object.fromEntries(REQUIRED_FIREBASE_ENV.map((key) => [key, "configured"]));
    env.VERCEL_ENV = "production";
    expect(getMissingFirebaseEnv(env)).toEqual([]);
    expect(verifyProductionFirebaseEnv(env)).toEqual([]);
  });

  it("does not block CI or Preview builds that intentionally lack production config", () => {
    expect(verifyProductionFirebaseEnv({ VERCEL_ENV: "preview" })).toEqual([]);
    expect(verifyProductionFirebaseEnv({})).toEqual([]);
  });

  it("rejects whitespace-only values", () => {
    const env = Object.fromEntries(REQUIRED_FIREBASE_ENV.map((key) => [key, "configured"]));
    env.VITE_FIREBASE_PROJECT_ID = "   ";
    expect(getMissingFirebaseEnv(env)).toContain("VITE_FIREBASE_PROJECT_ID");
  });
});

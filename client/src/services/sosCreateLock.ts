const inFlightSOSCreations = new Set<string>();

/**
 * Prevent concurrent SOS creation attempts for the same account in this JS runtime.
 * This is a race guard, not a replacement for Firestore-enforced uniqueness.
 */
export function acquireSOSCreationLock(uid: unknown): boolean {
  if (typeof uid !== "string" || uid.length === 0 || inFlightSOSCreations.has(uid)) {
    return false;
  }
  inFlightSOSCreations.add(uid);
  return true;
}

/** Release a previously acquired per-account SOS creation lock. */
export function releaseSOSCreationLock(uid: unknown): void {
  if (typeof uid === "string" && uid.length > 0) inFlightSOSCreations.delete(uid);
}

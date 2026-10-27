/** Calculate the elapsed whole seconds for an SOS using its persisted creation time. */
export function getElapsedSOSSeconds(createdAt: unknown, now = Date.now()): number {
  if (!Number.isFinite(now)) return 0;

  let createdAtMs: number;
  if (createdAt instanceof Date) {
    createdAtMs = createdAt.getTime();
  } else if (typeof createdAt === "string") {
    createdAtMs = Date.parse(createdAt);
  } else if (
    createdAt !== null &&
    typeof createdAt === "object" &&
    "toMillis" in createdAt &&
    typeof createdAt.toMillis === "function"
  ) {
    try {
      createdAtMs = createdAt.toMillis();
    } catch {
      return 0;
    }
  } else {
    return 0;
  }

  if (!Number.isFinite(createdAtMs) || createdAtMs > now) return 0;
  return Math.floor((now - createdAtMs) / 1000);
}

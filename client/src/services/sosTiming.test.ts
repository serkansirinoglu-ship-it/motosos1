import { describe, expect, it } from "vitest";
import { getElapsedSOSSeconds } from "./sosTiming";

describe("getElapsedSOSSeconds", () => {
  it("calculates elapsed seconds from a Firestore Timestamp-like value", () => {
    expect(getElapsedSOSSeconds({ toMillis: () => 1_000 }, 11_999)).toBe(10);
  });

  it("supports Date and ISO timestamp values", () => {
    expect(getElapsedSOSSeconds(new Date(1_000), 11_999)).toBe(10);
    expect(getElapsedSOSSeconds(new Date(1_000).toISOString(), 11_999)).toBe(10);
  });

  it("never returns a negative duration for future or invalid timestamps", () => {
    expect(getElapsedSOSSeconds({ toMillis: () => 12_000 }, 11_999)).toBe(0);
    expect(getElapsedSOSSeconds("not-a-date", 11_999)).toBe(0);
    expect(getElapsedSOSSeconds(null, 11_999)).toBe(0);
  });

  it("returns zero if the timestamp conversion throws", () => {
    expect(getElapsedSOSSeconds({ toMillis: () => { throw new Error("invalid timestamp"); } }, 11_999)).toBe(0);
  });
});

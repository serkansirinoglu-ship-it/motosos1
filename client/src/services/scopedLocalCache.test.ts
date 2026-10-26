import { describe, expect, it } from "vitest";
import { readScopedJson, scopedStorageKey, writeScopedJson } from "./scopedLocalCache";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
  };
}

describe("scoped local cache", () => {
  it("isolates keys for separate authenticated users", () => {
    expect(scopedStorageKey("help", "uid-a")).not.toBe(scopedStorageKey("help", "uid-b"));
    expect(scopedStorageKey("help", null)).toBe(scopedStorageKey("help", undefined));
  });

  it("round-trips JSON within one user's key only", () => {
    const storage = memoryStorage();
    const keyA = scopedStorageKey("help", "uid-a");
    const keyB = scopedStorageKey("help", "uid-b");
    expect(writeScopedJson(storage, keyA, { messages: ["private"] })).toBe(true);
    expect(readScopedJson(storage, keyA, { messages: [] })).toEqual({ messages: ["private"] });
    expect(readScopedJson(storage, keyB, { messages: [] })).toEqual({ messages: [] });
  });

  it("returns fallbacks for missing, malformed, or unavailable storage", () => {
    expect(readScopedJson(null, "key", [])).toEqual([]);
    expect(readScopedJson({ getItem: () => "{" }, "key", [])).toEqual([]);
    expect(writeScopedJson(null, "key", {})).toBe(false);
  });
});

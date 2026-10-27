import { describe, expect, it } from "vitest";
import { migrateLegacyScopedArray, readScopedJson, scopedStorageKey, writeScopedJson } from "./scopedLocalCache";

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
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

  it("migrates the current user's cities and removes the legacy email map", () => {
    const storage = memoryStorage();
    storage.setItem("legacy", JSON.stringify({
      "rider@example.test": ["İzmir"],
      "other@example.test": ["Ankara"],
    }));

    expect(migrateLegacyScopedArray(storage, "legacy", "memberships:uid-a", "rider@example.test")).toEqual(["İzmir"]);
    expect(storage.getItem("memberships:uid-a")).toBe(JSON.stringify(["İzmir"]));
    expect(storage.getItem("legacy")).toBeNull();
  });

  it("does not delete the legacy map if the scoped write fails", () => {
    const storage = {
      getItem: () => JSON.stringify({ "rider@example.test": ["İzmir"] }),
      setItem: () => { throw new Error("storage unavailable"); },
      removeItem: () => { throw new Error("must not remove"); },
    };
    expect(migrateLegacyScopedArray(storage, "legacy", "memberships:uid-a", "rider@example.test")).toBeNull();
  });
});

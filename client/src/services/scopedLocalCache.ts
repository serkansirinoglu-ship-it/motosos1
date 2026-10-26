/** Browser-local cache helpers that isolate data by Firebase UID. */
export function scopedStorageKey(baseKey: string, uid: string | null | undefined): string {
  const scope = typeof uid === "string" && uid.trim() ? uid.trim() : "anonymous";
  return `${baseKey}:${encodeURIComponent(scope)}`;
}

export function readScopedJson<T>(storage: Pick<Storage, "getItem"> | null | undefined, key: string, fallback: T): T {
  try {
    const raw = storage?.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

export function writeScopedJson(storage: Pick<Storage, "setItem"> | null | undefined, key: string, value: unknown): boolean {
  try {
    storage?.setItem(key, JSON.stringify(value));
    return Boolean(storage);
  } catch {
    return false;
  }
}

/**
 * Move one signed-in user's array out of the legacy email-keyed map.
 * The legacy map is removed only after the UID-scoped write succeeds, so email
 * identifiers for other local accounts are not retained in browser storage.
 */
export function migrateLegacyScopedArray(
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> | null | undefined,
  legacyKey: string,
  scopedKey: string,
  legacyEntryKey: string | null | undefined,
): unknown[] | null {
  if (!storage) return null;
  try {
    const legacyRaw = storage.getItem(legacyKey);
    if (legacyRaw === null) return null;
    const parsed: unknown = JSON.parse(legacyRaw);
    const legacyValue = parsed && typeof parsed === "object" && !Array.isArray(parsed) && legacyEntryKey
      ? (parsed as Record<string, unknown>)[legacyEntryKey]
      : undefined;
    const migrated = Array.isArray(legacyValue) ? legacyValue : [];
    storage.setItem(scopedKey, JSON.stringify(migrated));
    storage.removeItem(legacyKey);
    return migrated;
  } catch {
    return null;
  }
}

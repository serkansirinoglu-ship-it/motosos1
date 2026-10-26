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

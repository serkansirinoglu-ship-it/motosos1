import { useRoute } from "wouter";
import { useEffect, useState } from "react";
import { useMembership } from "@/contexts/MembershipContext";
import { useAuth } from "@/contexts/AuthContext";
import { readScopedJson, scopedStorageKey, writeScopedJson } from "@/services/scopedLocalCache";

const STORAGE_KEY = "motosos_group_posts_v1";
type GroupPost = { id: string; from: string; text: string; ts: number };
type GroupStore = Record<string, GroupPost[]>;

export default function GroupPage() {
  const [, params] = useRoute("/group/:city");
  const city = params?.city ? decodeURIComponent(params.city) : null;
  const { isMember, joinCity } = useMembership();
  const { user, authReady } = useAuth();
  const uid = typeof user?.uid === "string" ? user.uid : null;
  const storageKey = scopedStorageKey(STORAGE_KEY, uid);
  const [cacheForKey, setCacheForKey] = useState<string | null>(null);
  const [store, setStore] = useState<GroupStore>({});
  const [text, setText] = useState("");

  useEffect(() => {
    if (!authReady) return;
    const storage = typeof localStorage === "undefined" ? null : localStorage;
    const next = readScopedJson<GroupStore>(storage, storageKey, {});
    setStore(next && typeof next === "object" && !Array.isArray(next) ? next : {});
    setCacheForKey(storageKey);
  }, [authReady, storageKey]);

  useEffect(() => {
    if (!authReady || cacheForKey !== storageKey) return;
    const storage = typeof localStorage === "undefined" ? null : localStorage;
    writeScopedJson(storage, storageKey, store);
  }, [authReady, cacheForKey, storageKey, store]);

  function submit() {
    const cleanText = text.trim();
    if (!authReady || cacheForKey !== storageKey || !cleanText || cleanText.length > 1000 || !city) return;
    const entry: GroupPost = {
      id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      from: user?.displayName || user?.email?.split("@")[0] || "Anonim",
      text: cleanText,
      ts: Date.now(),
    };
    setStore((current) => ({ ...current, [city]: [ ...(current[city] || []), entry ] }));
    setText("");
  }

  const visiblePosts = authReady && cacheForKey === storageKey ? (store[city || ""] || []) : [];

  if (!city) return <div className="min-h-screen bg-asphalt-light p-4 text-white page-surface-light">Geçersiz grup.</div>;

  return (
    <div className="min-h-screen bg-asphalt-light p-4 page-surface-light">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl text-white">{city} Grubu</h1>
        {!isMember(city) && <button onClick={() => joinCity(city)} className="px-3 py-1 rounded bg-primary text-white">Katıl</button>}
      </div>

      <p className="mb-3 text-xs text-amber-300">Grup mesajları şu anda yalnızca bu hesapta ve bu cihazda tutulur; diğer kullanıcılara yayınlanmaz.</p>

      <div className="mb-4">
        {visiblePosts.map((post) => (
          <div key={post.id} className="p-3 bg-card-gradient border border-border rounded mb-2">
            <div className="text-xs text-muted-foreground">{post.from} • {new Date(post.ts).toLocaleString()}</div>
            <div className="mt-1 text-foreground">{post.text}</div>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input value={text} onChange={(event) => setText(event.target.value)} maxLength={1000} className="flex-1 px-3 py-2 rounded bg-card-gradient border border-border" placeholder="Gruba mesaj yaz..." />
        <button onClick={submit} disabled={!authReady || cacheForKey !== storageKey || !text.trim()} className="px-3 py-2 rounded bg-primary text-white disabled:opacity-50">Gönder</button>
      </div>
    </div>
  );
}

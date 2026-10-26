import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { subscribeHelpRequestsRealtime, createHelpRequestRealtime, subscribeMessagesRealtime, sendMessageRealtime, updateHelpRequestRealtime } from '../../../firebase';
import { nanoid } from "nanoid";
import { validateHelpMessageInput, validateHelpRequestInput } from "@/services/helpMessageValidation";
import { useAuth } from "./AuthContext";
import { readScopedJson, scopedStorageKey, writeScopedJson } from "@/services/scopedLocalCache";

type Message = {
  id: string;
  from: string | null;
  fromName?: string;
  text: string;
  ts: number;
  // Explicitly marks a browser-only fallback; it is never proof of server persistence.
  localOnly?: boolean;
};

type HelpRequest = {
  id: string;
  title: string;
  description: string;
  // ownerId is the Firebase UID; user is retained only for legacy local-cache records.
  ownerId?: string | null;
  user?: string | null;
  lat?: number;
  lng?: number;
  createdAt: number;
  active: boolean;
  helpers?: string[];
  resolvedBy?: string | null;
  resolvedAt?: number | null;
  // Explicitly marks a browser-only fallback that has not been confirmed by Firestore.
  localOnly?: boolean;
};

type MessageContextType = {
  helpRequests: HelpRequest[];
  messages: Record<string, Message[]>;
  createHelpRequest: (r: Omit<HelpRequest, "id" | "createdAt" | "active">) => HelpRequest | null;
  sendMessage: (requestId: string, text: string, from?: string | null, fromName?: string) => Message | null;
  subscribeToMessages: (requestId: string, onUpdate: (arr: Message[]) => void) => (() => void);
  acceptHelp: (requestId: string, helperUid: string) => Promise<boolean>;
  resolveHelp: (requestId: string, helperUid: string, helperEmail?: string | null) => Promise<boolean>;
  getTopHelpers: (limit?: number) => {email:string,count:number}[];
  getHelpCount: (email?: string) => number;
};

const MessageContext = createContext<MessageContextType | undefined>(undefined);

const STORAGE_KEY = "motosos_help_requests_v1";
const STATS_STORAGE_KEY = "motosos_user_stats_v1";
const PROFILES_STORAGE_KEY = "motosos_user_profiles_v1";
type HelpCache = { helpRequests: HelpRequest[]; messages: Record<string, Message[]> };

export function MessageProvider({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuth();
  const uid = typeof user?.uid === "string" ? user.uid : null;
  const storageKey = scopedStorageKey(STORAGE_KEY, uid);
  const statsStorageKey = scopedStorageKey(STATS_STORAGE_KEY, uid);
  const profilesStorageKey = scopedStorageKey(PROFILES_STORAGE_KEY, uid);
  const [cacheForKey, setCacheForKey] = useState<string | null>(null);
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>([]);
  const localOnlyHelpRequestIds = useRef(new Set<string>());
  const [messages, setMessages] = useState<Record<string, Message[]>>({});
  // Keep the latest message cache available without recreating realtime subscriptions.
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  // Preserve explicitly local-only messages across realtime snapshots and reloads.
  const localOnlyMessagesByRequest = useRef<Map<string, Message[]>>(
    new Map(
      Object.entries(messages)
        .map(([requestId, items]) => [requestId, items.filter((item) => item.localOnly)] as [string, Message[]])
        .filter(([, items]) => items.length > 0),
    ),
  );

  // Do not hydrate or persist private browser caches until Firebase has resolved the account.
  // Each UID gets a separate namespace; legacy unscoped cache keys are intentionally not read.
  useEffect(() => {
    if (!authReady) return;
    const storage = typeof localStorage === "undefined" ? null : localStorage;
    const cached = readScopedJson<HelpCache>(storage, storageKey, { helpRequests: [], messages: {} });
    const nextRequests = Array.isArray(cached.helpRequests) ? cached.helpRequests : [];
    const nextMessages = cached.messages && typeof cached.messages === "object" ? cached.messages : {};
    setHelpRequests(nextRequests);
    setMessages(nextMessages);
    localOnlyHelpRequestIds.current = new Set(nextRequests.filter((item) => item.localOnly).map((item) => item.id));
    localOnlyMessagesByRequest.current = new Map(
      Object.entries(nextMessages)
        .map(([requestId, items]) => [requestId, items.filter((item) => item.localOnly)] as [string, Message[]])
        .filter(([, items]) => items.length > 0),
    );
    setHelpCounts(readScopedJson<Record<string, number>>(storage, statsStorageKey, {}));
    setCacheForKey(storageKey);
  }, [authReady, storageKey, statsStorageKey]);

  useEffect(() => {
    if (!authReady || cacheForKey !== storageKey) return;
    const storage = typeof localStorage === "undefined" ? null : localStorage;
    writeScopedJson(storage, storageKey, { helpRequests, messages });
  }, [authReady, cacheForKey, storageKey, helpRequests, messages]);

  // helpCounts per user
  const [helpCounts, setHelpCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!authReady || cacheForKey !== storageKey) return;
    const storage = typeof localStorage === "undefined" ? null : localStorage;
    writeScopedJson(storage, statsStorageKey, helpCounts);
  }, [authReady, cacheForKey, storageKey, statsStorageKey, helpCounts]);

  function incrementHelpCount(email?: string) {
	if (!email) return;
	setHelpCounts(s => ({ ...s, [email]: (s[email] || 0) + 1 }));
  }

  function getTopHelpers(limit = 10) {
	return Object.entries(helpCounts).sort((a,b)=>b[1]-a[1]).slice(0,limit).map(([email,count])=>({email,count}));
  }

  function getHelpCount(email?: string){
	if (!email) return 0;
	return helpCounts[email] || 0;
  }

  // Realtime subscription to helpRequests (Firestore). If available, it will keep local state in sync.
  useEffect(() => {
    if (!authReady) return;
	let unsub = null;
	try {
	  unsub = subscribeHelpRequestsRealtime((arr: any[]) => {
		// Map Firestore timestamp to number if necessary
		const normalized = arr.map((d: any) => ({
		  ...d,
		  createdAt: d.createdAt && d.createdAt.toMillis ? d.createdAt.toMillis() : d.createdAt || Date.now(),
		}));
        setHelpRequests((current) => {
          const remoteIds = new Set(normalized.map((item: HelpRequest) => item.id));
          for (const id of remoteIds) localOnlyHelpRequestIds.current.delete(id);
          const localOnly = current.filter((item) =>
            localOnlyHelpRequestIds.current.has(item.id) && !remoteIds.has(item.id)
          ).map((item) => ({ ...item, localOnly: true }));
          return [...localOnly, ...(normalized as HelpRequest[])];
        });
	  });
	} catch (e) {
	  console.info("Realtime helpRequests not available", e);
	}

	return () => {
	  if (unsub) unsub();
	};
  }, [authReady, storageKey]);

  function createHelpRequest(r: Omit<HelpRequest, "id" | "createdAt" | "active">): HelpRequest | null {
    // Do not create even a local-only request before authentication is resolved.
    if (!authReady || !uid || (r.ownerId != null && r.ownerId !== uid)) return null;

    const id = nanoid();
    const hr: HelpRequest = {
      ...r,
      ownerId: uid,
      id,
      createdAt: Date.now(),
      active: true,
      helpers: [],
      resolvedBy: null,
      resolvedAt: null,
    };
    if (validateHelpRequestInput(hr, uid)) return null;

    // Render optimistically so a slow or unavailable realtime connection does
    // not leave the newly created request invisible in the current session.
    setHelpRequests((current) =>
      current.some((item) => item.id === hr.id) ? current : [hr, ...current]
    );

    // Firebase calls are asynchronous: a surrounding try/catch does not catch
    // permission/network rejections unless the returned promise is observed.
    try {
      const pending = createHelpRequestRealtime(hr);
      void Promise.resolve(pending).then((result) => {
        if (result) return;
        console.warn("Realtime help request unavailable; keeping a local copy");
        localOnlyHelpRequestIds.current.add(hr.id);
        setHelpRequests((current) => current.map((item) =>
          item.id === hr.id ? { ...item, localOnly: true } : item
        ));
      }).catch((error) => {
        console.warn("Realtime help request failed; keeping a local copy", error);
        localOnlyHelpRequestIds.current.add(hr.id);
        setHelpRequests((current) => current.map((item) =>
          item.id === hr.id ? { ...item, localOnly: true } : item
        ));
      });
      setMessages((current) => ({ ...current, [id]: [] }));
      return hr;
    } catch (error) {
      console.warn("Realtime help request unavailable; keeping a local copy", error);
      localOnlyHelpRequestIds.current.add(hr.id);
      setHelpRequests((current) => current.map((item) =>
        item.id === hr.id ? { ...item, localOnly: true } : item
      ));
      setMessages((current) => ({ ...current, [id]: [] }));
      return hr;
    }
  }

  // Only report success after Firestore confirms the update.
  async function acceptHelp(requestId: string, helperUid: string): Promise<boolean> {
    // Only the resolved Firebase account may claim help; never trust a caller-supplied UID.
    if (!authReady || !uid || helperUid !== uid) return false;
    const request = helpRequests.find((item) => item.id === requestId);
    if (!request || !request.active) return false;
    const helpers = Array.from(new Set([...(request.helpers || []), helperUid]));
    try {
      const pending = updateHelpRequestRealtime(requestId, { helpers });
      if (!pending) return false;
      await pending;
      setHelpRequests((current) =>
        current.map((item) => item.id === requestId ? { ...item, helpers } : item)
      );
      return true;
    } catch (error) {
      console.warn("Realtime helper acceptance failed; server did not confirm the update", error);
      return false;
    }
  }

  // Credit the helper and update local state only after Firestore confirms resolution.
  async function resolveHelp(requestId: string, helperUid: string, _helperEmail?: string | null): Promise<boolean> {
    // Only the resolved Firebase account may resolve a request or receive credit.
    if (!authReady || !uid || helperUid !== uid) return false;
    const request = helpRequests.find((item) => item.id === requestId);
    if (!request || !request.active) return false;
    const resolvedAt = Date.now();
    try {
      const pending = updateHelpRequestRealtime(requestId, {
        resolvedBy: helperUid,
        resolvedAt,
        active: false,
      });
      if (!pending) return false;
      await pending;
      setHelpRequests((current) =>
        current.map((item) => item.id === requestId
          ? { ...item, resolvedBy: helperUid, resolvedAt, active: false }
          : item)
      );
      // Use the authenticated profile, not an email supplied by the UI caller.
      const statsKey = typeof user?.email === "string" && user.email.trim() ? user.email : uid;
      incrementHelpCount(statsKey);
      const newCount = (helpCounts[statsKey] || 0) + 1;
      if (newCount >= 1) addBadgeToProfile(statsKey, "Koruyucu Kardeş");
      if (newCount >= 5) addBadgeToProfile(statsKey, "Yol Meleği");
      return true;
    } catch (error) {
      console.warn("Realtime help resolution failed; server did not confirm the update", error);
      return false;
    }
  }

  // add badge to user's profile based on thresholds
  function addBadgeToProfile(email: string, badge: string){
	if(!email) return;
	try{
	  const raw = localStorage.getItem(profilesStorageKey);
	  const obj = raw ? JSON.parse(raw) : {};
	  const prof = obj[email] || { contacts: [], badges: [] };
	  prof.badges = prof.badges || [];
	  if(!prof.badges.includes(badge)) prof.badges.push(badge);
	  obj[email] = prof;
	  localStorage.setItem(profilesStorageKey, JSON.stringify(obj));
	}catch(e){console.error(e)}
  }

  function sendMessage(requestId: string, text: string, from: string | null = null, fromName = "Motorcu"): Message | null {
    // Never persist or submit a message unless its sender matches the resolved Firebase account.
    if (!authReady || !uid || from !== uid) return null;

    // Enforce conversation membership at the context boundary too, so callers
    // cannot create misleading local-only messages in another rider's request.
    const request = helpRequests.find((item) => item.id === requestId);
    if (!request || !request.active) return null;
    const helpers = request.helpers || [];
    const authenticatedEmail = typeof user?.email === "string" ? user.email : null;
    const isOwner = request.ownerId === uid || (!!authenticatedEmail && request.user === authenticatedEmail);
    const isHelper = helpers.includes(uid) || (!!authenticatedEmail && helpers.includes(authenticatedEmail));
    if (!isOwner && !isHelper) return null;

    if (validateHelpMessageInput({ requestId, text, from, fromName, authenticatedUid: uid })) return null;
    const msg: Message = {
      id: nanoid(),
      from,
      fromName: fromName.trim(),
      text: text.trim(),
      ts: Date.now(),
    };
    const keepLocal = () => {
      const localMessage: Message = { ...msg, localOnly: true };
      const retained = localOnlyMessagesByRequest.current.get(requestId) || [];
      if (!retained.some((item) => item.id === localMessage.id)) {
        localOnlyMessagesByRequest.current.set(requestId, [...retained, localMessage]);
      }
      setMessages((current) => {
        const existing = current[requestId] || [];
        return existing.some((item) => item.id === localMessage.id)
          ? current
          : { ...current, [requestId]: [...existing, localMessage] };
      });
    };

    try {
      const pending = sendMessageRealtime(requestId, msg);
      void Promise.resolve(pending).then((result) => {
        if (result) return;
        console.warn("Realtime message unavailable; keeping a local copy");
        keepLocal();
      }).catch((error) => {
        console.warn("Realtime message failed; keeping a local copy", error);
        keepLocal();
      });
      return msg;
    } catch (error) {
      console.warn("Realtime message unavailable; keeping a local copy", error);
      keepLocal();
      return msg;
    }
  }

  // Keep this callback stable so consumers do not churn Firestore listeners on provider renders.
  const subscribeToMessages = useCallback((requestId: string, onUpdate: (arr: Message[]) => void) => {
    // Deliver the latest cached conversation immediately, including local-only messages.
    onUpdate([...(messagesRef.current[requestId] || [])].sort((a, b) => a.ts - b.ts));
    try {
      return subscribeMessagesRealtime(requestId, (arr: any[]) => {
        const normalized = arr.map((d) => ({ ...d, ts: d.ts && d.ts.toMillis ? d.ts.toMillis() : d.ts })) as Message[];
        const remoteIds = new Set(normalized.map((item) => item.id));
        const localOnly = (localOnlyMessagesByRequest.current.get(requestId) || [])
          .filter((item) => !remoteIds.has(item.id));
        localOnlyMessagesByRequest.current.set(requestId, localOnly);
        const merged = [...normalized, ...localOnly].sort((a, b) => a.ts - b.ts);
        // Avoid needless provider rerenders when the realtime snapshot is unchanged.
        setMessages((current) => {
          const previous = current[requestId] || [];
          const unchanged = previous.length === merged.length && previous.every((item, index) => {
            const nextItem = merged[index];
            return item.id === nextItem.id && item.text === nextItem.text &&
              item.from === nextItem.from && item.fromName === nextItem.fromName &&
              item.ts === nextItem.ts && item.localOnly === nextItem.localOnly;
          });
          return unchanged ? current : { ...current, [requestId]: merged };
        });
        onUpdate(merged);
      });
    } catch (error) {
      console.warn("Message subscription unavailable", error);
      return () => {};
    }
  }, []);
  // Hide the previous account's in-memory state immediately while a new account cache hydrates.
  const cacheReadyForCurrentUser = authReady && cacheForKey === storageKey;
  const value: MessageContextType = {
	helpRequests: cacheReadyForCurrentUser ? helpRequests : [],
	messages: cacheReadyForCurrentUser ? messages : {},
	createHelpRequest,
	sendMessage,
	  subscribeToMessages,
	  acceptHelp,
	  resolveHelp,
	  getTopHelpers,
	  getHelpCount,
  };

  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
}

export function useMessages() {
  const ctx = useContext(MessageContext);
  if (!ctx) throw new Error("useMessages must be used within MessageProvider");
  return ctx;
}

export default MessageContext;

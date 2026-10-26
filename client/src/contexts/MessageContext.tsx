import React, { createContext, useContext, useEffect, useState } from "react";
import { subscribeHelpRequestsRealtime, createHelpRequestRealtime, subscribeMessagesRealtime, sendMessageRealtime, updateHelpRequestRealtime } from '../../../firebase';
import { nanoid } from "nanoid";

type Message = {
  id: string;
  from: string | null;
  fromName?: string;
  text: string;
  ts: number;
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
};

type MessageContextType = {
  helpRequests: HelpRequest[];
  messages: Record<string, Message[]>;
  createHelpRequest: (r: Omit<HelpRequest, "id" | "createdAt" | "active">) => HelpRequest;
  sendMessage: (requestId: string, text: string, from?: string | null, fromName?: string) => Message;
  subscribeToMessages: (requestId: string, onUpdate: (arr: Message[]) => void) => (() => void);
  acceptHelp: (requestId: string, helperUid: string) => void;
  resolveHelp: (requestId: string, helperUid: string, helperEmail?: string | null) => void;
  getTopHelpers: (limit?: number) => {email:string,count:number}[];
  getHelpCount: (email?: string) => number;
};

const MessageContext = createContext<MessageContextType | undefined>(undefined);

const STORAGE_KEY = "motosos_help_requests_v1";

export function MessageProvider({ children }: { children: React.ReactNode }) {
  const [helpRequests, setHelpRequests] = useState<HelpRequest[]>(() => {
	try {
	  const raw = localStorage.getItem(STORAGE_KEY);
	  return raw ? JSON.parse(raw).helpRequests || [] : [];
	} catch (e) {
	  return [];
	}
  });

  const [messages, setMessages] = useState<Record<string, Message[]>>(() => {
	try {
	  const raw = localStorage.getItem(STORAGE_KEY);
	  return raw ? JSON.parse(raw).messages || {} : {};
	} catch (e) {
	  return {};
	}
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ helpRequests, messages }));
    } catch (error) {
      // Browser storage may be unavailable or full. Keep the in-memory state usable.
      console.warn("Could not persist local help requests/messages in browser storage", error);
    }
  }, [helpRequests, messages]);

  // helpCounts per user
  const [helpCounts, setHelpCounts] = useState<Record<string, number>>(() => {
	try {
	  const raw = localStorage.getItem("motosos_user_stats_v1");
	  return raw ? JSON.parse(raw) : {};
	} catch (e) { return {}; }
  });

  useEffect(() => {
	try { localStorage.setItem("motosos_user_stats_v1", JSON.stringify(helpCounts)); } catch(e){}
  }, [helpCounts]);

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
	let unsub = null;
	try {
	  unsub = subscribeHelpRequestsRealtime((arr: any[]) => {
		// Map Firestore timestamp to number if necessary
		const normalized = arr.map((d: any) => ({
		  ...d,
		  createdAt: d.createdAt && d.createdAt.toMillis ? d.createdAt.toMillis() : d.createdAt || Date.now(),
		}));
		setHelpRequests(normalized as HelpRequest[]);
	  });
	} catch (e) {
	  console.info("Realtime helpRequests not available", e);
	}

	return () => {
	  if (unsub) unsub();
	};
  }, []);

  function createHelpRequest(r: Omit<HelpRequest, "id" | "createdAt" | "active">) {
    const id = nanoid();
    const hr: HelpRequest = {
      ...r,
      id,
      createdAt: Date.now(),
      active: true,
      helpers: [],
      resolvedBy: null,
      resolvedAt: null,
    };

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
        setHelpRequests((current) =>
          current.some((item) => item.id === hr.id) ? current : [hr, ...current]
        );
      }).catch((error) => {
        console.warn("Realtime help request failed; keeping a local copy", error);
        setHelpRequests((current) =>
          current.some((item) => item.id === hr.id) ? current : [hr, ...current]
        );
      });
      setMessages((current) => ({ ...current, [id]: [] }));
      return hr;
    } catch (error) {
      console.warn("Realtime help request unavailable; keeping a local copy", error);
      setHelpRequests((current) => [hr, ...current]);
      setMessages((current) => ({ ...current, [id]: [] }));
      return hr;
    }
  }

  // accept helping a request
  function acceptHelp(requestId: string, helperUid: string) {
	// update local
	setHelpRequests((s) => s.map(hr => hr.id === requestId ? { ...hr, helpers: Array.from(new Set([...(hr.helpers||[]), helperUid])) } : hr));
    try {
      const helpers = Array.from(
        new Set([...(helpRequests.find((item) => item.id === requestId)?.helpers || []), helperUid])
      );
      void Promise.resolve(updateHelpRequestRealtime(requestId, { helpers })).catch((error) => {
        console.warn("Realtime helper acceptance failed; local state retained", error);
      });
    } catch (error) {
      console.warn("Realtime helper acceptance unavailable; local state retained", error);
    }
  }

  // resolve help: credit helper and mark resolved
  function resolveHelp(requestId: string, helperUid: string, helperEmail?: string | null) {
	setHelpRequests((s) => s.map(hr => hr.id === requestId ? { ...hr, resolvedBy: helperUid, resolvedAt: Date.now(), active: false } : hr));
    const statsKey = helperEmail || helperUid;
	incrementHelpCount(statsKey);
    try {
      void Promise.resolve(
        updateHelpRequestRealtime(requestId, {
          resolvedBy: helperUid,
          resolvedAt: Date.now(),
          active: false,
        })
      ).catch((error) => {
        console.warn("Realtime help resolution failed; local state retained", error);
      });
    } catch (error) {
      console.warn("Realtime help resolution unavailable; local state retained", error);
    }
	  // after increment, check thresholds and award badges
	const newCount = (helpCounts[statsKey] || 0) + 1;
	if (newCount >= 1) addBadgeToProfile(statsKey, 'Koruyucu Kardeş');
	if (newCount >= 5) addBadgeToProfile(statsKey, 'Yol Meleği');
  }

  // add badge to user's profile based on thresholds
  function addBadgeToProfile(email: string, badge: string){
	if(!email) return;
	try{
	  const raw = localStorage.getItem('motosos_user_profiles_v1');
	  const obj = raw ? JSON.parse(raw) : {};
	  const prof = obj[email] || { contacts: [], badges: [] };
	  prof.badges = prof.badges || [];
	  if(!prof.badges.includes(badge)) prof.badges.push(badge);
	  obj[email] = prof;
	  localStorage.setItem('motosos_user_profiles_v1', JSON.stringify(obj));
	}catch(e){console.error(e)}
  }

  function sendMessage(requestId: string, text: string, from: string | null = null, fromName = "Motorcu") {
    const msg: Message = { id: nanoid(), from, fromName, text, ts: Date.now() };
    const keepLocal = () => {
      setMessages((current) => {
        const existing = current[requestId] || [];
        return existing.some((item) => item.id === msg.id)
          ? current
          : { ...current, [requestId]: [...existing, msg] };
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

  // Allow components to subscribe to realtime messages for a specific request
  function subscribeToMessages(requestId: string, onUpdate: (arr: Message[]) => void) {
	try {
	  return subscribeMessagesRealtime(requestId, (arr: any[]) => {
		const normalized = arr.map((d) => ({ ...d, ts: d.ts && d.ts.toMillis ? d.ts.toMillis() : d.ts }));
		// update local messages store as well
		setMessages((m) => ({ ...m, [requestId]: normalized }));
		onUpdate(normalized as Message[]);
	  });
	} catch (e) {
	  // fallback: no-op unsubscribe
	  return () => {};
	}
  }

  const value: MessageContextType = {
	helpRequests,
	messages,
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

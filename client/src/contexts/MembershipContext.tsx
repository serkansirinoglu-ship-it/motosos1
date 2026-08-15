import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

type MembershipContextType = {
  joinedCities: string[];
  isMember: (city: string) => boolean;
  joinCity: (city: string) => void;
  leaveCity: (city: string) => void;
  getMemberCount: (city: string) => number;
};

const STORAGE_KEY = "motosos_memberships_v1"; // maps email -> string[]

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userKey = user?.email || "__anon__";

  const [store, setStore] = useState<Record<string, string[]>>(() => {
	try {
	  const raw = localStorage.getItem(STORAGE_KEY);
	  return raw ? JSON.parse(raw) : {};
	} catch (e) {
	  return {};
	}
  });

  useEffect(() => {
	try {
	  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
	} catch (e) {}
  }, [store]);

  const joinedCities = store[userKey] || [];

  function isMember(city: string) {
	return joinedCities.includes(city);
  }

  function joinCity(city: string) {
	if (!user) return; // require login to join
	setStore((s) => ({ ...s, [userKey]: Array.from(new Set([...(s[userKey] || []), city])) }));
  }

  function leaveCity(city: string) {
	if (!user) return;
	setStore((s) => ({ ...s, [userKey]: (s[userKey] || []).filter((c) => c !== city) }));
  }

  function getMemberCount(city: string) {
	let count = 0;
	for (const k of Object.keys(store)) {
	  if ((store[k] || []).includes(city)) count++;
	}
	return count;
  }

  return (
	<MembershipContext.Provider value={{ joinedCities, isMember, joinCity, leaveCity, getMemberCount }}>
	  {children}
	</MembershipContext.Provider>
  );
}

export function useMembership() {
  const ctx = useContext(MembershipContext);
  if (!ctx) throw new Error("useMembership must be used within MembershipProvider");
  return ctx;
}

export default MembershipContext;

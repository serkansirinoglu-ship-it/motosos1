import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { scopedStorageKey } from "@/services/scopedLocalCache";

type MembershipContextType = {
  joinedCities: string[];
  isMember: (city: string) => boolean;
  joinCity: (city: string) => void;
  leaveCity: (city: string) => void;
};

const LEGACY_STORAGE_KEY = "motosos_memberships_v1";
const STORAGE_KEY = "motosos_memberships_v2";

const MembershipContext = createContext<MembershipContextType | undefined>(undefined);

function cleanCities(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((city): city is string => typeof city === "string" && city.trim().length > 0 && city.length <= 100).map((city) => city.trim())));
}

export function MembershipProvider({ children }: { children: React.ReactNode }) {
  const { user, authReady } = useAuth();
  const uid = typeof user?.uid === "string" && user.uid.trim() ? user.uid : null;
  const email = typeof user?.email === "string" ? user.email : null;
  const storageKey = scopedStorageKey(STORAGE_KEY, uid);
  const [joinedCities, setJoinedCities] = useState<string[]>([]);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  useEffect(() => {
    if (!authReady) return;
    if (!uid) {
      setJoinedCities([]);
      setLoadedKey(null);
      return;
    }

    let nextCities: string[] = [];
    try {
      const existing = localStorage.getItem(storageKey);
      if (existing !== null) {
        nextCities = cleanCities(JSON.parse(existing));
      } else {
        // One-time migration of this signed-in user's legacy entry; preserve other local entries.
        const legacyRaw = localStorage.getItem(LEGACY_STORAGE_KEY);
        if (legacyRaw !== null) {
          const legacy = JSON.parse(legacyRaw) as Record<string, unknown>;
          if (legacy && typeof legacy === "object" && !Array.isArray(legacy)) {
            if (email && Object.prototype.hasOwnProperty.call(legacy, email)) {
              nextCities = cleanCities(legacy[email]);
              localStorage.setItem(storageKey, JSON.stringify(nextCities));
              delete legacy[email];
              if (Object.keys(legacy).length > 0) localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(legacy));
              else localStorage.removeItem(LEGACY_STORAGE_KEY);
            }
          }
        }
      }
    } catch {
      nextCities = [];
    }

    setJoinedCities(nextCities);
    setLoadedKey(storageKey);
  }, [authReady, uid, email, storageKey]);

  useEffect(() => {
    if (!authReady || !uid || loadedKey !== storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(joinedCities));
    } catch {
      // Local membership is optional; do not claim server persistence.
    }
  }, [authReady, uid, loadedKey, storageKey, joinedCities]);

  function isMember(city: string) {
    return joinedCities.includes(city);
  }

  function joinCity(city: string) {
    if (!authReady || !uid || loadedKey !== storageKey || !city.trim() || city.length > 100) return;
    const cleanCity = city.trim();
    setJoinedCities((current) => Array.from(new Set([...current, cleanCity])));
  }

  function leaveCity(city: string) {
    if (!authReady || !uid || loadedKey !== storageKey) return;
    setJoinedCities((current) => current.filter((item) => item !== city));
  }

  return (
    <MembershipContext.Provider value={{ joinedCities, isMember, joinCity, leaveCity }}>
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

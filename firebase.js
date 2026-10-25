import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs, limit, doc, setDoc, getDoc, updateDoc, deleteDoc, where, Timestamp } from "firebase/firestore";

// Read config from Vite environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
};

const hasFirebaseConfig = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

if (!hasFirebaseConfig) {
  console.warn(
    "Firebase config incomplete — realtime features will run in local/mock mode. Set VITE_FIREBASE_* vars in .env.local for realtime features."
  );
}

let app = null;
let auth = null;
let db = null;

if (hasFirebaseConfig) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

export { auth, db };

// Online member presence (authenticated members only).
// Presence records contain no profile details; stale sessions expire after 2 minutes.
export function subscribeOnlineMembers(uid, onCount) {
  if (!db || !uid) return () => {};

  let stopped = false;
  let stopSnapshot = () => {};
  let refreshTimer;
  const presenceRef = doc(db, "presence", uid);
  const heartbeat = async () => {
    try {
      await setDoc(presenceRef, { uid, lastSeen: serverTimestamp() }, { merge: true });
    } catch (error) {
      console.warn("Online presence heartbeat unavailable", error);
    }
  };
  const refreshCount = () => {
    stopSnapshot();
    const cutoff = Timestamp.fromMillis(Date.now() - 2 * 60 * 1000);
    const activeQuery = query(collection(db, "presence"), where("lastSeen", ">=", cutoff));
    stopSnapshot = onSnapshot(activeQuery, (snapshot) => {
      if (stopped) return;
      const now = Date.now();
      const activeCount = snapshot.docs.filter((item) => {
        const lastSeen = item.data().lastSeen;
        return lastSeen && typeof lastSeen.toMillis === "function" &&
          now - lastSeen.toMillis() <= 2 * 60 * 1000;
      }).length;
      onCount(activeCount);
    }, (error) => {
      console.warn("Online presence count unavailable", error);
    });
  };

  void heartbeat();
  refreshCount();
  refreshTimer = setInterval(() => {
    void heartbeat();
    refreshCount();
  }, 45 * 1000);

  return () => {
    stopped = true;
    clearInterval(refreshTimer);
    stopSnapshot();
    void deleteDoc(presenceRef).catch(() => {});
  };
}


// Authentication helpers
// Use these wrappers from your React components instead of importing firebase/auth directly.
export function signIn(email, password) {
  if (!auth) return Promise.reject(new Error("Firebase not configured"));
  return signInWithEmailAndPassword(auth, email, password);
}

export function signUp(email, password) {
  if (!auth) return Promise.reject(new Error("Firebase not configured"));
  return createUserWithEmailAndPassword(auth, email, password);
}

export function signOutUser() {
  if (!auth) return Promise.resolve();
  return firebaseSignOut(auth);
}

export function onAuthStateChangedListener(callback) {
  if (!auth) {
    // mock: call back null and return noop unsubscribe
    setTimeout(() => callback(null), 0);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

/**
 * Create a secure user profile document in Firestore under `users/{uid}`.
 * Only the authenticated user (matching uid) is allowed to create/update it (enforced by rules).
 * This does NOT overwrite an existing profile.
 */
export async function createUserProfile(uid, email, extra = {}) {
  if (!db || !uid) return null;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) return snap.data();
    const profile = {
      uid,
      email: email || "",
      displayName: extra.displayName || "",
      city: extra.city || "",
      motorcycle: extra.motorcycle || "",
      photoURL: extra.photoURL || "",
      bio: extra.bio || "",
      privacyLocation: false,
      points: 0,
      helpCount: 0,
      receivedHelpCount: 0,
      badges: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, profile);
    return profile;
  } catch (e) {
    console.error("createUserProfile error", e);
    return null;
  }
}

/**
 * Get a user's own profile (or a public one). Returns null if not found or error.
 */
export async function getUserProfile(uid) {
  if (!db || !uid) return null;
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : null;
  } catch (e) {
    console.error("getUserProfile error", e);
    return null;
  }
}

export async function updateUserProfile(uid, patch) {
  if (!db || !uid) return null;
  try {
    const ref = doc(db, "users", uid);
    await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
    return true;
  } catch (e) {
    console.error("updateUserProfile error", e);
    return false;
  }
}

/**
 * Create an SOS help request. Prevents duplicate active SOS for same user
 * (rate limit / duplicate active SOS control).
 */
export async function createSOSRequest(data) {
  if (!db) return null;
  try {
    // Prevent multiple active SOS by same user
    const activeQ = query(
      collection(db, "sosRequests"),
      where("requesterId", "==", data.requesterId),
      where("status", "==", "active")
    );
    const activeSnap = await getDocs(activeQ);
    if (!activeSnap.empty) {
      return { id: null, error: "active_duplicate" };
    }
    const now = serverTimestamp();
    const payload = {
      requesterId: data.requesterId,
      requesterEmail: data.requesterEmail || "",
      helpType: data.helpType || "other",
      latitude: data.latitude || 0,
      longitude: data.longitude || 0,
      note: data.note || "",
      status: "active",
      acceptedBy: null,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      cancelledAt: null,
    };
    const ref = await addDoc(collection(db, "sosRequests"), payload);
    return { id: ref.id, error: null };
  } catch (e) {
    console.error("createSOSRequest error", e);
    return { id: null, error: "network" };
  }
}

export async function updateSOSRequest(id, patch) {
  if (!db || !id) return null;
  try {
    const ref = doc(db, "sosRequests", id);
    await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
    return true;
  } catch (e) {
    console.error("updateSOSRequest error", e);
    return false;
  }
}

export async function getActiveSOSRequests() {
  if (!db) return [];
  try {
    const q = query(
      collection(db, "sosRequests"),
      where("status", "==", "active"),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error("getActiveSOSRequests error", e);
    return [];
  }
}

// Realtime helpers (Firestore)
export function subscribeHelpRequestsRealtime(onUpdate) {
  if (!db) {
    console.info("subscribeHelpRequestsRealtime: Firestore not configured, running in local/mock mode");
    return () => {};
  }

  try {
    const q = query(collection(db, "helpRequests"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onUpdate(arr);
    });
  } catch (e) {
    console.error("subscribeHelpRequestsRealtime error", e);
    return () => {};
  }
}

export async function createHelpRequestRealtime(data) {
  if (!db) {
    console.info("createHelpRequestRealtime: Firestore not configured, skipping realtime write");
    return null;
  }

  // Keep the request ID used by the client and nested message path aligned with
  // the Firestore document ID. Fall back to an auto-ID for older callers.
  const { id, ...payload } = data || {};
  const documentData = { ...payload, createdAt: serverTimestamp(), active: true };
  if (id) {
    const requestRef = doc(db, "helpRequests", id);
    await setDoc(requestRef, documentData);
    return { id };
  }

  return addDoc(collection(db, "helpRequests"), documentData);
}

export function subscribeMessagesRealtime(requestId, onUpdate) {
  if (!db) {
    console.info("subscribeMessagesRealtime: Firestore not configured, running in local/mock mode");
    return () => {};
  }

  try {
    const q = query(collection(db, "helpRequests", requestId, "messages"), orderBy("ts", "asc"));
    return onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onUpdate(arr);
    });
  } catch (e) {
    console.error("subscribeMessagesRealtime error", e);
    return () => {};
  }
}

export async function sendMessageRealtime(requestId, msg) {
  if (!db) {
    console.info("sendMessageRealtime: Firestore not configured, skipping realtime write");
    return null;
  }
  return addDoc(collection(db, "helpRequests", requestId, "messages"), { ...msg, ts: serverTimestamp() });
}

export function updateHelpRequestRealtime(id, patch) {
  if (!db) return null;
  try {
    const dref = doc(db, "helpRequests", id);
    return updateDoc(dref, patch);
  } catch (e) {
    console.error("updateHelpRequestRealtime error", e);
    return null;
  }
}

// Products & Banners realtime helpers
export function subscribeProductsRealtime(onUpdate) {
  if (!db) {
    console.info("subscribeProductsRealtime: Firestore not configured");
    return () => {};
  }
  try {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onUpdate(arr);
    });
  } catch (e) {
    console.error("subscribeProductsRealtime error", e);
    return () => {};
  }
}

export async function createProductRealtime(data) {
  if (!db) {
    console.info("createProductRealtime: Firestore not configured, skipping");
    return null;
  }
  return addDoc(collection(db, "products"), { ...data, createdAt: serverTimestamp() });
}

export async function updateProductRealtime(id, patch) {
  if (!db) return null;
  try {
    const dref = doc(db, "products", id);
    return updateDoc(dref, patch);
  } catch (e) {
    console.error("updateProductRealtime error", e);
    return null;
  }
}

export async function deleteProductRealtime(id) {
  if (!db) return null;
  try {
    const dref = doc(db, "products", id);
    return deleteDoc(dref);
  } catch (e) {
    console.error("deleteProductRealtime error", e);
    return null;
  }
}

export function subscribeBannersRealtime(onUpdate) {
  if (!db) return () => {};
  try {
    const q = query(collection(db, "banners"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      onUpdate(arr);
    });
  } catch (e) {
    console.error("subscribeBannersRealtime error", e);
    return () => {};
  }
}

export async function createBannerRealtime(data) {
  if (!db) return null;
  return addDoc(collection(db, "banners"), { ...data, createdAt: serverTimestamp() });
}

export async function updateBannerRealtime(id, patch) {
  if (!db) return null;
  try {
    const dref = doc(db, "banners", id);
    return updateDoc(dref, patch);
  } catch (e) {
    console.error("updateBannerRealtime error", e);
    return null;
  }
}

export async function deleteBannerRealtime(id) {
  if (!db) return null;
  try {
    const dref = doc(db, "banners", id);
    return deleteDoc(dref);
  } catch (e) {
    console.error("deleteBannerRealtime error", e);
    return null;
  }
}

// Client-side seed helper: create initial products and banners if collections empty.
// NOTE: This is for development only. In production, seeding should not run automatically.
export async function createInitialSeed() {
  if (!db) {
    console.info("createInitialSeed: Firestore not configured, skipping seed.");
    return;
  }
  try {
    const prodQuery = query(collection(db, "products"), limit(1));
    const prodSnap = await getDocs(prodQuery);
    const banQuery = query(collection(db, "banners"), limit(1));
    const banSnap = await getDocs(banQuery);

    if (prodSnap.empty) {
      const sampleProducts = [
        { name: "Shoei NXR2 Kask", price: 4500, stock: 5, description: "Full-face kask, M beden", image: "" },
        { name: "Alpinestars Mont", price: 2800, stock: 8, description: "Su geçirmez touring mont", image: "" },
      ];
      for (const p of sampleProducts) {
        await addDoc(collection(db, "products"), { ...p, createdAt: serverTimestamp() });
      }
      console.info("Seeded sample products");
    }

    if (banSnap.empty) {
      const sampleBanners = [
        { title: "Sponsor: MegaMotos", image: "", link: "https://example.com", active: true },
        { title: "Kampanya: Kask %20 İndirim", image: "", link: "https://example.com/promo", active: true },
      ];
      for (const b of sampleBanners) {
        await addDoc(collection(db, "banners"), { ...b, createdAt: serverTimestamp() });
      }
      console.info("Seeded sample banners");
    }
  } catch (e) {
    console.error("createInitialSeed error", e);
  }
}
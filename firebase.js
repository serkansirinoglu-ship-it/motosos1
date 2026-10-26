import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, where, Timestamp, writeBatch } from "firebase/firestore";
import { validateSOSRequestInput, validateSOSStatusUpdatePatch, validateUserProfilePatch } from "./client/src/services/sosInputValidation";
import { validateHelpMessageInput, validateHelpRequestInput } from "./client/src/services/helpMessageValidation";

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
  // Only the authenticated owner may update explicitly editable profile fields.
  // Firestore rules remain authoritative; this rejects over-broad writes before network I/O.
  if (!db || !uid || auth?.currentUser?.uid !== uid || validateUserProfilePatch(patch)) return false;
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
  if (!db) return { id: null, error: "firebase_unavailable" };

  // Treat client validation as defense in depth; Firestore rules remain authoritative.
  const authenticatedUid = auth?.currentUser?.uid;
  const inputError = validateSOSRequestInput(authenticatedUid, data || {});
  if (inputError) return { id: null, error: inputError };

  try {
    // Prevent multiple active SOS by same user
    // Query by requester only so duplicate protection does not depend on
    // an undeclared requesterId + status composite index.
    const requesterQ = query(
      collection(db, "sosRequests"),
      where("requesterId", "==", data.requesterId)
    );
    const requesterSnap = await getDocs(requesterQ);
    const hasActiveRequest = requesterSnap.docs.some(
      (item) => item.data()?.status === "active"
    );
    if (hasActiveRequest) {
      return { id: null, error: "active_duplicate" };
    }
    const batch = writeBatch(db);
    const sosRef = doc(collection(db, "sosRequests"));
    const now = serverTimestamp();
    // Public active SOS documents expose only an approximate location (~1 km grid).
    // Exact coordinates, contact email and free-text notes stay in an owner-only subdocument.
    const payload = {
      requesterId: data.requesterId,
      helpType: data.helpType,
      latitude: Math.round(data.latitude * 100) / 100,
      longitude: Math.round(data.longitude * 100) / 100,
      status: "active",
      acceptedBy: null,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      cancelledAt: null,
    };
    batch.set(sosRef, payload);
    batch.set(doc(db, "sosRequests", sosRef.id, "privateDetails", "owner"), {
      requesterEmail: auth.currentUser.email || "",
      latitude: data.latitude,
      longitude: data.longitude,
      note: typeof data.note === "string" ? data.note : "",
      createdAt: now,
    });
    await batch.commit();
    return { id: sosRef.id, error: null };
  } catch (e) {
    console.error("createSOSRequest error", e);
    return { id: null, error: "network" };
  }
}

export async function acceptSOSRequest(id) {
  if (!db || !auth?.currentUser?.uid || !id) return false;
  try {
    await updateDoc(doc(db, "sosRequests", id), {
      acceptedBy: auth.currentUser.uid,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.error("acceptSOSRequest error", e);
    return false;
  }
}

export async function updateSOSRequest(id, patch) {
  // Only owner terminal transitions are supported by this client API.
  // Firestore rules remain authoritative, but reject malformed/over-broad writes early.
  if (!db || !auth?.currentUser?.uid || !id || !validateSOSStatusUpdatePatch(patch)) return false;
  try {
    const ref = doc(db, "sosRequests", id);
    const safePatch = { status: patch.status, updatedAt: serverTimestamp() };
    if (patch.status === "resolved") safePatch.resolvedAt = serverTimestamp();
    if (patch.status === "cancelled") safePatch.cancelledAt = serverTimestamp();
    await updateDoc(ref, safePatch);
    return true;
  } catch (e) {
    console.error("updateSOSRequest error", e);
    return false;
  }
}

export async function getActiveSOSRequests() {
  if (!db) return [];
  try {
    // Filter on the single indexed status field, then sort client-side.
    // This avoids requiring an undeclared composite index for status + createdAt.
    const q = query(
      collection(db, "sosRequests"),
      where("status", "==", "active")
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const time = (value) => value?.toMillis?.() ?? (typeof value === "string" ? Date.parse(value) : 0);
        return time(b.createdAt) - time(a.createdAt);
      });
  } catch (e) {
    console.error("getActiveSOSRequests error", e);
    return [];
  }
}

/**
 * Subscribe to public active SOS documents for live map discovery.
 * Only fields stored on the public parent document are emitted; private
 * owner details remain in the privateDetails subcollection.
 */
export function subscribeActiveSOSRequests(onUpdate, onError) {
  if (!db) {
    console.info("subscribeActiveSOSRequests: Firestore not configured");
    return () => {};
  }
  try {
    // Use the single-field status index; sort timestamps in memory so the
    // live map does not depend on an undeclared composite Firestore index.
    const q = query(
      collection(db, "sosRequests"),
      where("status", "==", "active")
    );
    return onSnapshot(
      q,
      (snap) => onUpdate(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const time = (value) => value?.toMillis?.() ?? (typeof value === "string" ? Date.parse(value) : 0);
            return time(b.createdAt) - time(a.createdAt);
          })
      ),
      (error) => {
        console.error("subscribeActiveSOSRequests error", error);
        if (typeof onError === "function") onError(error);
      }
    );
  } catch (error) {
    console.error("subscribeActiveSOSRequests setup error", error);
    if (typeof onError === "function") onError(error);
    return () => {};
  }
}

// Realtime helpers (Firestore)
export function subscribeHelpRequestsRealtime(onUpdate) {
  if (!db) {
    console.info("subscribeHelpRequestsRealtime: Firestore not configured, running in local/mock mode");
    return () => {};
  }

  try {
    const q = query(collection(db, "helpRequests"), where("active", "==", true), where("publicVisible", "==", true), where("helpers", "==", []), orderBy("createdAt", "desc"));
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

  // Reject unauthenticated or mismatched owners before any network write.
  const authenticatedUid = auth?.currentUser?.uid;
  if (validateHelpRequestInput(data, authenticatedUid)) return null;

  const id = data.id;
  const documentData = {
    title: data.title.trim(),
    description: data.description,
    ownerId: authenticatedUid,
    createdAt: serverTimestamp(),
    active: true,
    helpers: [],
    resolvedBy: null,
    resolvedAt: null,
    publicVisible: true,
  };
  if (data.lat !== undefined && data.lat !== null) {
    documentData.lat = data.lat;
    documentData.lng = data.lng;
  }

  // Preserve the caller's ID so the nested messages path stays aligned.
  if (id) {
    await setDoc(doc(db, "helpRequests", id), documentData);
    return { id };
  }

  const created = await addDoc(collection(db, "helpRequests"), documentData);
  return { id: created.id };
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

  // Never trust a caller-supplied sender UID or arbitrary message fields.
  const authenticatedUid = auth?.currentUser?.uid;
  if (!authenticatedUid || !msg || validateHelpMessageInput({
    requestId,
    text: msg.text,
    from: authenticatedUid,
    fromName: msg.fromName,
  })) return null;

  return addDoc(collection(db, "helpRequests", requestId, "messages"), {
    from: authenticatedUid,
    fromName: typeof msg.fromName === "string" ? msg.fromName.trim() : "",
    text: msg.text.trim(),
    ts: serverTimestamp(),
  });
}

export function updateHelpRequestRealtime(id, patch) {
  if (!db) return null;
  try {
    const dref = doc(db, "helpRequests", id);
    const safePatch = { ...patch, updatedAt: serverTimestamp() };
    // Server timestamps are required by the Firestore authorization rules.
    if (patch?.active === false && patch?.resolvedBy) {
      safePatch.resolvedAt = serverTimestamp();
    }
    return updateDoc(dref, safePatch);
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

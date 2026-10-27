import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, getIdTokenResult } from "firebase/auth";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, serverTimestamp, getDocs, doc, setDoc, getDoc, updateDoc, deleteDoc, where, Timestamp, writeBatch } from "firebase/firestore";
import { isCurrentSOSAuthSession, validateSOSRequestInput, validateSOSStatusUpdatePatch, validateUserProfilePatch, validateUserProfileCreation, validateProductInput, validateProductPatch, validateBannerInput, validateBannerPatch, validateAdminDocumentId } from "./client/src/services/sosInputValidation";
import { acquireSOSCreationLock, releaseSOSCreationLock } from "./client/src/services/sosCreateLock";
import { validateHelpMessageInput, validateHelpRequestInput, validateHelpRequestUpdatePatch } from "./client/src/services/helpMessageValidation";

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

/** Read the current Firebase Auth UID without exposing the Auth instance to UI modules.
 * @returns {string | null}
 */
export function getCurrentAuthUid() {
  return auth?.currentUser?.uid ?? null;
}

/** Defense in depth for admin-only client operations; Firestore rules remain authoritative. */
async function hasAdminClaim() {
  const user = auth?.currentUser;
  if (!user) return false;
  try {
    const token = await getIdTokenResult(user);
    if (token.claims.admin === true) return true;

    // A recently granted custom claim may be missing from the cached ID token.
    // Refresh only after a cached negative result; Firestore rules remain authoritative.
    const refreshedToken = await getIdTokenResult(user, true);
    return refreshedToken.claims.admin === true;
  } catch (error) {
    console.warn("Admin claim check failed", error);
    return false;
  }
}

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
    // Do not delete the shared UID presence document here: another tab/device
    // may still be active. The lastSeen cutoff naturally expires stale sessions.
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
  if (!db || validateUserProfileCreation(uid, email, extra, auth?.currentUser?.uid, auth?.currentUser?.email)) return null;
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

  // Capture one identity snapshot so a mid-flight account switch cannot mix identities.
  const authenticatedUser = auth?.currentUser;
  const authenticatedUid = authenticatedUser?.uid;
  const authenticatedEmail = authenticatedUser?.email || "";

  // Treat client validation as defense in depth; Firestore rules remain authoritative.
  const inputError = validateSOSRequestInput(authenticatedUid, data || {});
  if (inputError) return { id: null, error: inputError };
  if (!acquireSOSCreationLock(authenticatedUid)) {
    return { id: null, error: "creation_in_progress" };
  }

  try {
    // Prevent multiple active SOS by same user
    // Query by requester only so duplicate protection does not depend on
    // an undeclared requesterId + status composite index.
    const requesterQ = query(
      collection(db, "sosRequests"),
      where("requesterId", "==", data.requesterId)
    );
    const requesterSnap = await getDocs(requesterQ);
    if (!isCurrentSOSAuthSession(authenticatedUid, auth?.currentUser?.uid)) {
      return { id: null, error: "auth_changed" };
    }
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
      requesterEmail: authenticatedEmail,
      latitude: data.latitude,
      longitude: data.longitude,
      note: typeof data.note === "string" ? data.note : "",
      createdAt: now,
    });
    // Recheck immediately before the write; Firestore rules also validate request.auth.
    if (!isCurrentSOSAuthSession(authenticatedUid, auth?.currentUser?.uid)) {
      return { id: null, error: "auth_changed" };
    }
    await batch.commit();
    return { id: sosRef.id, error: null };
  } catch (e) {
    console.error("createSOSRequest error", e);
    return { id: null, error: "network" };
  } finally {
    releaseSOSCreationLock(authenticatedUid);
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

export async function updateSOSRequest(id, patch, expectedUid = auth?.currentUser?.uid) {
  // Only owner terminal transitions are supported by this client API.
  // Firestore rules remain authoritative, but reject malformed/over-broad writes early.
  if (
    !db ||
    typeof expectedUid !== "string" ||
    !expectedUid ||
    auth?.currentUser?.uid !== expectedUid ||
    !id ||
    !validateSOSStatusUpdatePatch(patch)
  ) return false;
  try {
    const ref = doc(db, "sosRequests", id);
    const safePatch = { status: patch.status, updatedAt: serverTimestamp() };
    if (patch.status === "resolved") safePatch.resolvedAt = serverTimestamp();
    if (patch.status === "cancelled") safePatch.cancelledAt = serverTimestamp();
    // Recheck immediately before the write; Firestore rules remain authoritative.
    if (auth?.currentUser?.uid !== expectedUid) return false;
    await updateDoc(ref, safePatch);
    return true;
  } catch (e) {
    console.error("updateSOSRequest error", e);
    return false;
  }
}

/**
 * Restore only the caller's active public SOS record after a refresh.
 * @returns {Promise<({id: string, latitude?: number, longitude?: number, helpType?: string, acceptedBy?: string | null, createdAt?: {toMillis?: () => number} | Date | string | null} | null)>}
 */
export async function getMyActiveSOSRequest(uid) {
  if (!db || !uid || auth?.currentUser?.uid !== uid) return null;
  try {
    // Query by owner only; filter active status client-side to avoid a new composite index.
    const q = query(
      collection(db, "sosRequests"),
      where("requesterId", "==", uid)
    );
    const snap = await getDocs(q);
    if (auth?.currentUser?.uid !== uid) return null;
    const active = snap.docs
      .map((item) => ({ ...item.data(), id: item.id }))
      .filter((item) => item.status === "active")
      .sort((a, b) => {
        const time = (value) => value?.toMillis?.() ?? (typeof value === "string" ? Date.parse(value) : 0);
        return time(b.createdAt) - time(a.createdAt);
      });
    return active[0] || null;
  } catch (error) {
    console.error("getMyActiveSOSRequest error", error);
    throw error;
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
      .map((d) => ({ ...d.data(), id: d.id }))
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
      (snap) => {
        const activeRequests = snap.docs
          .map((d) => ({ ...d.data(), id: d.id }))
          .sort((a, b) => {
            const time = (value) => value?.toMillis?.() ?? (typeof value === "string" ? Date.parse(value) : 0);
            return time(b.createdAt) - time(a.createdAt);
          });
        onUpdate(activeRequests, { fromCache: snap.metadata.fromCache });
      },
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

  const currentUser = auth?.currentUser;
  const uid = currentUser?.uid || null;
  const email = currentUser?.email || null;
  const sources = new Map();
  const unsubscribers = [];

  // Public discovery only includes unclaimed requests. Separate authenticated
  // queries keep each owner's and accepted helper's conversations available.
  const publish = () => {
    const merged = new Map();
    for (const sourceName of ["public", "owner", "helperUid", "legacyOwner", "helperEmail"]) {
      for (const [id, item] of sources.get(sourceName) || []) merged.set(id, item);
    }
    const toMillis = (value) => value && typeof value.toMillis === "function"
      ? value.toMillis()
      : typeof value === "number" ? value : 0;
    onUpdate(Array.from(merged.values()).sort(
      (a, b) => toMillis(b.createdAt) - toMillis(a.createdAt)
    ));
  };

  const listen = (sourceName, q) => {
    sources.set(sourceName, new Map());
    try {
      const stop = onSnapshot(q, (snap) => {
        sources.set(sourceName, new Map(
          snap.docs.map((d) => [d.id, { ...d.data(), id: d.id }])
        ));
        publish();
      }, (error) => {
        console.warn(`Help request ${sourceName} subscription unavailable`, error);
      });
      unsubscribers.push(stop);
    } catch (error) {
      console.warn(`Help request ${sourceName} subscription unavailable`, error);
    }
  };

  try {
    listen("public", query(
      collection(db, "helpRequests"),
      where("active", "==", true),
      where("publicVisible", "==", true),
      where("helpers", "==", []),
      orderBy("createdAt", "desc")
    ));
    if (uid) {
      listen("owner", query(collection(db, "helpRequests"), where("ownerId", "==", uid)));
      listen("helperUid", query(collection(db, "helpRequests"), where("helpers", "array-contains", uid)));
    }
    if (email) {
      listen("legacyOwner", query(collection(db, "helpRequests"), where("user", "==", email)));
      listen("helperEmail", query(collection(db, "helpRequests"), where("helpers", "array-contains", email)));
    }
  } catch (error) {
    console.error("subscribeHelpRequestsRealtime error", error);
  }

  return () => unsubscribers.forEach((stop) => stop());
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
      const arr = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
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
  const authenticatedUid = auth?.currentUser?.uid;
  if (validateHelpRequestUpdatePatch(id, patch, authenticatedUid)) return null;
  try {
    const dref = doc(db, "helpRequests", id);
    const safePatch = { ...patch, updatedAt: serverTimestamp() };
    // Firestore rules require server-generated resolution timestamps.
    if (patch.active === false && patch.resolvedBy === authenticatedUid) {
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
      const arr = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      onUpdate(arr);
    });
  } catch (e) {
    console.error("subscribeProductsRealtime error", e);
    return () => {};
  }
}

export async function createProductRealtime(data) {
  if (!db || !(await hasAdminClaim()) || !validateProductInput(data)) return null;
  const payload = {
    name: data.name.trim(),
    price: data.price,
    stock: data.stock,
    ...(data.image !== undefined ? { image: data.image } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    createdAt: serverTimestamp(),
  };
  try {
    return await addDoc(collection(db, "products"), payload);
  } catch (e) {
    console.error("createProductRealtime error", e);
    return null;
  }
}

export async function updateProductRealtime(id, patch) {
  if (!db || !(await hasAdminClaim()) || !validateProductPatch(id, patch)) return null;
  try {
    const dref = doc(db, "products", id);
    return await updateDoc(dref, patch);
  } catch (e) {
    console.error("updateProductRealtime error", e);
    return null;
  }
}

export async function deleteProductRealtime(id) {
  if (!db || !(await hasAdminClaim()) || !validateAdminDocumentId(id)) return null;
  try {
    const dref = doc(db, "products", id);
    return await deleteDoc(dref);
  } catch (e) {
    console.error("deleteProductRealtime error", e);
    return null;
  }
}

export function subscribeBannersRealtime(onUpdate, onError = () => {}) {
  if (!db) {
    onError(new Error("firebase_not_configured"));
    return () => {};
  }
  try {
    const q = query(collection(db, "banners"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      const arr = snap.docs.map((d) => ({ ...d.data(), id: d.id }));
      onUpdate(arr);
    }, (error) => {
      console.error("subscribeBannersRealtime snapshot error", error);
      onError(error);
    });
  } catch (e) {
    console.error("subscribeBannersRealtime error", e);
    onError(e);
    return () => {};
  }
}

export async function createBannerRealtime(data) {
  if (!db || !(await hasAdminClaim()) || !validateBannerInput(data)) return null;
  const payload = {
    title: data.title.trim(),
    active: data.active,
    ...(data.subtitle !== undefined ? { subtitle: data.subtitle.trim() } : {}),
    ...(data.sponsorName !== undefined ? { sponsorName: data.sponsorName.trim() } : {}),
    ...(data.image !== undefined ? { image: data.image.trim() } : {}),
    ...(data.link !== undefined ? { link: data.link.trim() } : {}),
    createdAt: serverTimestamp(),
  };
  try {
    return await addDoc(collection(db, "banners"), payload);
  } catch (e) {
    console.error("createBannerRealtime error", e);
    return null;
  }
}

export async function updateBannerRealtime(id, patch) {
  if (!db || !(await hasAdminClaim()) || !validateBannerPatch(id, patch)) return null;
  try {
    const dref = doc(db, "banners", id);
    return await updateDoc(dref, patch);
  } catch (e) {
    console.error("updateBannerRealtime error", e);
    return null;
  }
}

export async function deleteBannerRealtime(id) {
  if (!db || !(await hasAdminClaim()) || !validateAdminDocumentId(id)) return null;
  try {
    const dref = doc(db, "banners", id);
    return await deleteDoc(dref);
  } catch (e) {
    console.error("deleteBannerRealtime error", e);
    return null;
  }
}


// Persistent user reports. Firestore rules permit creation by signed-in users
// and reading/status changes only by admins.
export async function submitReportRealtime(report) {
  if (!db || !auth?.currentUser?.uid) {
    return { ok: false, error: "auth_required" };
  }
  const targetTypes = ["post", "listing", "user", "message", "sos"];
  if (!report || !targetTypes.includes(report.targetType) ||
      typeof report.targetId !== "string" || !report.targetId.trim() ||
      report.targetId.length > 200 ||
      typeof report.reason !== "string" || !report.reason.trim() ||
      report.reason.length > 160 ||
      typeof report.details !== "string" || report.details.length > 1000) {
    return { ok: false, error: "invalid_report" };
  }
  try {
    const user = auth.currentUser;
    const ref = await addDoc(collection(db, "reports"), {
      targetType: report.targetType,
      targetId: report.targetId.trim(),
      reason: report.reason.trim(),
      details: report.details.trim(),
      reporterUid: user.uid,
      reporterEmail: user.email || "",
      status: "pending",
      createdAt: serverTimestamp(),
    });
    return { ok: true, id: ref.id };
  } catch (error) {
    console.error("submitReportRealtime error", error);
    return { ok: false, error: "write_failed" };
  }
}

export async function subscribeReportsRealtime(onUpdate, onError = () => {}) {
  if (!db || !(await hasAdminClaim())) {
    onError(new Error("admin_or_firebase_required"));
    return () => {};
  }
  try {
    return onSnapshot(
      query(collection(db, "reports"), orderBy("createdAt", "desc")),
      (snapshot) => onUpdate(snapshot.docs.map((item) => {
        const data = item.data();
        const createdAt = data.createdAt?.toDate?.();
        return {
          id: item.id,
          targetType: data.targetType,
          targetId: data.targetId,
          reason: data.reason,
          details: data.details || "",
          reportedBy: data.reporterEmail || data.reporterUid,
          status: data.status,
          createdAt: createdAt ? createdAt.toLocaleString("tr-TR") : "Yeni",
        };
      })),
      onError
    );
  } catch (error) {
    onError(error);
    return () => {};
  }
}

export async function resolveReportRealtime(id, status) {
  if (!db || !(await hasAdminClaim()) || !validateAdminDocumentId(id) ||
      !["resolved", "dismissed"].includes(status)) return false;
  try {
    await updateDoc(doc(db, "reports", id), {
      status,
      resolvedAt: serverTimestamp(),
      resolvedBy: auth.currentUser.uid,
    });
    return true;
  } catch (error) {
    console.error("resolveReportRealtime error", error);
    return false;
  }
}

/**
 * Non-production SOS active-guard transaction primitives.
 *
 * This module is deliberately not wired to an HTTP route or the client.
 * Callers must authenticate the Firebase ID token, derive uid from verified
 * claims (never from request input), authorize lifecycle transitions, and add
 * rate limiting/observability before this is used by a deployed backend.
 */
async function createOrGetActiveSOS(db, FieldValue, uid) {
  if (typeof uid !== "string" || uid.length === 0) {
    throw new TypeError("uid must be a non-empty authenticated UID");
  }

  const guardRef = db.collection("activeSOSLocks").doc(uid);
  const newSOSRef = db.collection("sosRequests").doc();

  return db.runTransaction(async (tx) => {
    const guardSnap = await tx.get(guardRef);
    if (guardSnap.exists) {
      const guard = guardSnap.data();
      if (typeof guard?.sosId === "string" && guard.sosId.length > 0) {
        const currentRef = db.collection("sosRequests").doc(guard.sosId);
        const currentSnap = await tx.get(currentRef);
        const current = currentSnap.data();
        if (currentSnap.exists && current?.status === "active") {
          if (current?.requesterId !== uid) {
            // A guard pointing at another owner's active SOS is an integrity
            // violation. Fail closed instead of replacing the guard and orphaning
            // an active record that the transaction cannot safely reconcile.
            throw new Error("active SOS guard points to a different owner");
          }
          return { created: false, id: currentRef.id };
        }
      }
    }

    tx.set(newSOSRef, {
      requesterId: uid,
      status: "active",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    tx.set(guardRef, {
      sosId: newSOSRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { created: true, id: newSOSRef.id };
  });
}

async function closeActiveSOS(db, FieldValue, uid, sosId, status) {
  if (typeof uid !== "string" || uid.length === 0) {
    throw new TypeError("uid must be a non-empty authenticated UID");
  }
  if (typeof sosId !== "string" || sosId.length === 0) {
    throw new TypeError("sosId must be a non-empty request ID");
  }
  if (status !== "cancelled" && status !== "resolved") {
    throw new TypeError("terminal status must be cancelled or resolved");
  }

  const guardRef = db.collection("activeSOSLocks").doc(uid);
  const sosRef = db.collection("sosRequests").doc(sosId);

  return db.runTransaction(async (tx) => {
    const [sosSnap, guardSnap] = await Promise.all([tx.get(sosRef), tx.get(guardRef)]);
    const sos = sosSnap.data();
    if (!sosSnap.exists || sos?.requesterId !== uid || sos?.status !== "active") return false;

    // Keep terminal timestamps aligned with the existing Firestore lifecycle schema.
    // Admin SDK bypasses rules, so this consistency must be enforced by the server primitive.
    const terminalPatch = {
      status,
      updatedAt: FieldValue.serverTimestamp(),
      cancelledAt: status === "cancelled"
        ? FieldValue.serverTimestamp()
        : (sos.cancelledAt ?? null),
      resolvedAt: status === "resolved"
        ? FieldValue.serverTimestamp()
        : (sos.resolvedAt ?? null),
    };
    tx.update(sosRef, terminalPatch);
    if (guardSnap.exists && guardSnap.data()?.sosId === sosId) tx.delete(guardRef);
    return true;
  });
}

module.exports = { createOrGetActiveSOS, closeActiveSOS };

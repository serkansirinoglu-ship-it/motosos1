/**
 * Non-production proof of concept for atomic per-user active SOS uniqueness.
 *
 * Runs only against the Firestore emulator from Safe CI. Admin SDK bypasses
 * Firestore Security Rules; this script validates the transaction pattern only,
 * not endpoint authentication/authorization or production readiness.
 */
const assert = require("node:assert/strict");
const path = require("node:path");
const { createRequire } = require("node:module");
const { randomUUID } = require("node:crypto");
const testRequire = createRequire(path.resolve(".firestore-test-runtime/package.json"));
const { initializeApp, deleteApp } = testRequire("firebase-admin/app");
const { getFirestore, FieldValue } = testRequire("firebase-admin/firestore");

const projectId = process.env.GCLOUD_PROJECT || "demo-motoguard-firestore-rules";
if (!process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error("Refusing to run without FIRESTORE_EMULATOR_HOST; emulator only.");
}
if (!projectId.startsWith("demo-")) {
  throw new Error(`Refusing to run with non-demo project ID: ${projectId}`);
}

const app = initializeApp({ projectId, name: `sos-guard-test-${randomUUID()}` });
const db = getFirestore(app);

async function createOrGetActiveSOS(uid) {
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
        if (currentSnap.exists && current?.requesterId === uid && current?.status === "active") {
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

async function closeActiveSOS(uid, sosId, status) {
  assert.ok(status === "cancelled" || status === "resolved");
  const guardRef = db.collection("activeSOSLocks").doc(uid);
  const sosRef = db.collection("sosRequests").doc(sosId);

  return db.runTransaction(async (tx) => {
    const [sosSnap, guardSnap] = await Promise.all([tx.get(sosRef), tx.get(guardRef)]);
    const sos = sosSnap.data();
    if (!sosSnap.exists || sos?.requesterId !== uid || sos?.status !== "active") return false;

    tx.update(sosRef, { status, updatedAt: FieldValue.serverTimestamp() });
    if (guardSnap.exists && guardSnap.data()?.sosId === sosId) tx.delete(guardRef);
    return true;
  });
}

async function run() {
  const uid = `emulator-sos-user-${randomUUID()}`;
  const guardRef = db.collection("activeSOSLocks").doc(uid);
  const sosCollection = db.collection("sosRequests");
  const createdIds = new Set();
  let staleUid = null;
  let staleGuardRef = null;
  let recoveredId = null;

  try {
    const simultaneous = await Promise.all(
      Array.from({ length: 6 }, () => createOrGetActiveSOS(uid)),
    );
    for (const result of simultaneous) createdIds.add(result.id);
    assert.equal(createdIds.size, 1, "simultaneous requests must resolve to one SOS ID");
    assert.equal(simultaneous.filter((result) => result.created).length, 1,
      "exactly one transaction should create the active SOS");

    const activeId = [...createdIds][0];
    const [activeSnap, guardSnap] = await Promise.all([
      sosCollection.doc(activeId).get(),
      guardRef.get(),
    ]);
    assert.equal(activeSnap.data()?.status, "active");
    assert.equal(guardSnap.data()?.sosId, activeId);

    const retry = await createOrGetActiveSOS(uid);
    assert.equal(retry.created, false, "retry must return existing active SOS");
    assert.equal(retry.id, activeId);

    assert.equal(await closeActiveSOS(`${uid}-not-owner`, activeId, "resolved"), false,
      "a different owner must not close another user's SOS");
    assert.equal((await sosCollection.doc(activeId).get()).data()?.status, "active",
      "unauthorized close must leave SOS active");
    assert.equal((await guardRef.get()).data()?.sosId, activeId,
      "unauthorized close must leave the active guard untouched");

    assert.equal(await closeActiveSOS(uid, activeId, "cancelled"), true);
    assert.equal((await guardRef.get()).exists, false, "closing the guarded SOS clears the guard");

    const next = await createOrGetActiveSOS(uid);
    assert.equal(next.created, true, "new SOS is allowed after terminal close");
    assert.notEqual(next.id, activeId);
    createdIds.add(next.id);

    // A stale close must never remove a guard now owned by a different request.
    const newerGuardTarget = "newer-guard-owner-marker";
    await guardRef.set({ sosId: newerGuardTarget });
    assert.equal(await closeActiveSOS(uid, next.id, "resolved"), true);
    assert.equal((await guardRef.get()).data()?.sosId, newerGuardTarget,
      "closing an older SOS must not clear a guard owned by another SOS");
    await guardRef.delete();

    // Stale guard recovery: a guard pointing at a missing request must not block creation.
    staleUid = `emulator-sos-stale-${randomUUID()}`;
    staleGuardRef = db.collection("activeSOSLocks").doc(staleUid);
    await staleGuardRef.set({ sosId: "missing-sos-document" });
    const recovered = await createOrGetActiveSOS(staleUid);
    recoveredId = recovered.id;
    assert.equal(recovered.created, true);
    assert.equal((await staleGuardRef.get()).data()?.sosId, recovered.id);

    console.log("PASS: emulator SOS guard transaction serializes concurrent creates, retries, ownership checks, safe close, and stale guards.");
  } finally {
    const guardSnap = await guardRef.get().catch(() => null);
    const testIds = new Set([...createdIds]);
    if (guardSnap?.exists && guardSnap.data()?.sosId) testIds.add(guardSnap.data().sosId);
    for (const id of testIds) await sosCollection.doc(id).delete().catch(() => {});
    await guardRef.delete().catch(() => {});

    if (staleUid && staleGuardRef) {
      if (recoveredId) await sosCollection.doc(recoveredId).delete().catch(() => {});
      await staleGuardRef.delete().catch(() => {});
    }
    await deleteApp(app);
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

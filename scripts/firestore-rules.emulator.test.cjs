const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const moduleRoot = path.resolve(".firestore-test-runtime/node_modules");
const testRequire = createRequire(path.join(path.dirname(moduleRoot), "package.json"));
const { initializeTestEnvironment, assertSucceeds, assertFails } = testRequire("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, updateDoc, serverTimestamp } = testRequire("firebase/firestore");

async function main() {
  const rulesFile = process.env.FIRESTORE_RULES_FILE || "firestore.rules";
  const rules = fs.readFileSync(rulesFile, "utf8");
  console.log(`Testing rules file: ${rulesFile}`);

  const env = await initializeTestEnvironment({
    projectId: "demo-motoguard-firestore-rules",
    firestore: { rules },
  });

  try {
    // The CI step runs both rule files against one emulator process. Clear fixtures
    // between runs so the second suite starts from the same isolated baseline.
    await env.clearFirestore();
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "sosRequests", "private-sos"), {
        requesterId: "owner", requesterEmail: "owner@example.test", status: "resolved",
        helpType: "repair", latitude: 40, longitude: 29,
        note: "", acceptedBy: null, createdAt: new Date(), updatedAt: new Date(),
        resolvedAt: null, cancelledAt: null,
      });
      await setDoc(doc(db, "sosRequests", "active-sos"), {
        requesterId: "owner", requesterEmail: "owner@example.test", status: "active",
        helpType: "repair", latitude: 40, longitude: 29,
        note: "", acceptedBy: null, createdAt: new Date(), updatedAt: new Date(),
        resolvedAt: null, cancelledAt: null,
      });
      await setDoc(doc(db, "helpRequests", "private-help"), {
        id: "private-help", user: "owner@example.test", title: "Private help",
        description: "test fixture", active: true, helpers: [], resolvedBy: null,
        resolvedAt: null, createdAt: new Date(),
      });
      await setDoc(doc(db, "helpRequests", "closed-help"), {
        id: "closed-help", user: "owner@example.test", title: "Closed help",
        description: "closed test fixture", active: false, helpers: [], resolvedBy: null,
        resolvedAt: null, createdAt: new Date(),
      });
      await setDoc(doc(db, "helpRequests", "private-help", "messages", "seed"), {
        id: "seed", from: "owner@example.test", text: "private message", ts: Date.now(),
      });
      await setDoc(doc(db, "users", "owner"), {
        uid: "owner", email: "owner@example.test", displayName: "Owner",
        points: 10, helpCount: 0, receivedHelpCount: 0, badges: [],
      });
      await setDoc(doc(db, "internalPrivate", "secret"), { value: "not public" });
      await setDoc(doc(db, "products", "public-product"), { name: "Public catalog fixture" });
    });

    const outsider = env.authenticatedContext("outsider", { email: "outsider@example.test" }).firestore();
    const anonymous = env.unauthenticatedContext().firestore();
    const owner = env.authenticatedContext("owner", { email: "owner@example.test" }).firestore();

    await assertFails(getDoc(doc(outsider, "sosRequests", "private-sos")));
    console.log("PASS: outsider cannot read inactive SOS");
    await assertSucceeds(getDoc(doc(outsider, "sosRequests", "active-sos")));
    console.log("PASS: signed-in helper can discover active SOS");
    await assertFails(updateDoc(doc(outsider, "sosRequests", "active-sos"), {
      status: "resolved", resolvedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(updateDoc(doc(owner, "sosRequests", "active-sos"), {
      status: "cancelled", cancelledAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    console.log("PASS: only the SOS owner can make an allowed active-to-terminal transition");
    await assertSucceeds(setDoc(doc(owner, "sosRequests", "valid-sos"), {
      requesterId: "owner", requesterEmail: "owner@example.test", status: "active",
      helpType: "ariza", latitude: 40, longitude: 29, note: "", acceptedBy: null,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), resolvedAt: null, cancelledAt: null,
    }));
    console.log("PASS: owner can create a valid SOS with server timestamps");

    await assertSucceeds(getDoc(doc(outsider, "helpRequests", "private-help")));
    console.log("PASS: active help request remains discoverable");
    await assertFails(getDoc(doc(outsider, "helpRequests", "closed-help")));
    console.log("PASS: outsider cannot read closed help request");
    await assertFails(getDoc(doc(outsider, "helpRequests", "private-help", "messages", "seed")));
    console.log("PASS: outsider cannot read chat before accepting the request");
    await assertFails(setDoc(doc(outsider, "helpRequests", "private-help", "messages", "outsider-message"), {
      id: "outsider-message", from: "outsider@example.test", text: "unauthorized", ts: serverTimestamp(),
    }));
    console.log("PASS: outsider cannot send chat before accepting the request");

    await assertSucceeds(updateDoc(doc(outsider, "helpRequests", "private-help"), {
      helpers: ["outsider@example.test"], updatedAt: serverTimestamp(),
    }));
    console.log("PASS: helper can accept an active request by adding only their own identity");
    await assertSucceeds(getDoc(doc(outsider, "helpRequests", "private-help", "messages", "seed")));
    await assertSucceeds(setDoc(doc(outsider, "helpRequests", "private-help", "messages", "accepted-helper-message"), {
      id: "accepted-helper-message", from: "outsider@example.test", text: "accepted helper message", ts: serverTimestamp(),
    }));
    console.log("PASS: accepted helper can read and send chat messages");

    await assertSucceeds(setDoc(doc(owner, "helpRequests", "valid-help"), {
      title: "Valid help", description: "test", user: "owner@example.test",
      active: true, helpers: [], resolvedBy: null, resolvedAt: null,
      createdAt: serverTimestamp(),
    }));
    console.log("PASS: owner can create a valid help request");
    await assertFails(setDoc(doc(outsider, "helpRequests", "spoofed-help"), {
      id: "spoofed-help", user: "owner@example.test", title: "spoofed",
      description: "test", active: true, helpers: [], resolvedBy: null, resolvedAt: null,
      createdAt: serverTimestamp(),
    }));
    console.log("PASS: user cannot create a help request claiming another owner");

    await assertFails(updateDoc(doc(owner, "users", "owner"), {
      points: 999999, updatedAt: serverTimestamp(),
    }));
    console.log("PASS: profile owner cannot edit server-controlled points");
    await assertSucceeds(updateDoc(doc(owner, "users", "owner"), {
      displayName: "Owner Updated", updatedAt: serverTimestamp(),
    }));
    console.log("PASS: profile owner can edit an approved profile field");
    await assertFails(setDoc(doc(outsider, "users", "outsider"), {
      uid: "outsider", email: "outsider@example.test", displayName: "Spoofed",
      points: 999999, helpCount: 0, receivedHelpCount: 0, badges: [],
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    console.log("PASS: user cannot create a profile with forged points");

    await assertFails(getDoc(doc(anonymous, "internalPrivate", "secret")));
    await assertFails(getDoc(doc(anonymous, "users", "owner")));
    console.log("PASS: default-deny prevents anonymous reads of private/unmatched documents");
    await assertSucceeds(getDoc(doc(anonymous, "products", "public-product")));
    console.log("PASS: explicit public product catalog remains readable");
    await assertFails(setDoc(doc(outsider, "sosRequests", "spoofed-sos"), {
      requesterId: "owner", requesterEmail: "owner@example.test", status: "active",
      helpType: "repair", latitude: 0, longitude: 0,
    }));
    console.log("PASS: user cannot create an SOS on behalf of another rider");
    console.log(`PASS: Firestore authorization tests completed for ${rulesFile}`);
  } finally {
    await env.cleanup();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

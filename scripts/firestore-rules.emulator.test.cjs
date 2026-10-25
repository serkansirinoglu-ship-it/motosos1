const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const moduleRoot = path.resolve(".firestore-test-runtime/node_modules");
const testRequire = createRequire(path.join(path.dirname(moduleRoot), "package.json"));
const { initializeTestEnvironment, assertSucceeds, assertFails } = testRequire("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, updateDoc, serverTimestamp, writeBatch } = testRequire("firebase/firestore");

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
        requesterId: "owner", status: "resolved",
        helpType: "ariza", latitude: 40, longitude: 29,
        acceptedBy: null, createdAt: new Date(), updatedAt: new Date(),
        resolvedAt: null, cancelledAt: null,
      });
      await setDoc(doc(db, "sosRequests", "active-sos"), {
        requesterId: "owner", status: "active",
        helpType: "ariza", latitude: 40, longitude: 29,
        acceptedBy: null, createdAt: new Date(), updatedAt: new Date(),
        resolvedAt: null, cancelledAt: null,
      });
      await setDoc(doc(db, "sosRequests", "active-sos", "privateDetails", "owner"), {
        requesterEmail: "owner@example.test", latitude: 40.12345, longitude: 29.54321,
        note: "Exact meeting point", createdAt: new Date(),
      });
      await setDoc(doc(db, "helpRequests", "private-help"), {
        id: "private-help", ownerId: "owner", title: "Private help",
        description: "test fixture", active: true, helpers: [], resolvedBy: null,
        resolvedAt: null, createdAt: new Date(),
      });
      await setDoc(doc(db, "helpRequests", "closed-help"), {
        id: "closed-help", ownerId: "owner", title: "Closed help",
        description: "closed test fixture", active: false, helpers: [], resolvedBy: null,
        resolvedAt: null, createdAt: new Date(),
      });
      await setDoc(doc(db, "helpRequests", "private-help", "messages", "seed"), {
        id: "seed", from: "owner", fromName: "Owner", text: "private message", ts: Date.now(),
      });
      await setDoc(doc(db, "users", "owner"), {
        uid: "owner", email: "owner@example.test", displayName: "Owner",
        points: 10, helpCount: 0, receivedHelpCount: 0, badges: [],
      });
      await setDoc(doc(db, "internalPrivate", "secret"), { value: "not public" });
      await setDoc(doc(db, "products", "public-product"), { name: "Public catalog fixture" });
      await setDoc(doc(db, "banners", "public-banner"), { title: "Public banner fixture" });
      await setDoc(doc(db, "communityPosts", "public-post"), { authorId: "owner", text: "Public post fixture" });
      await setDoc(doc(db, "events", "public-event"), { organizerId: "owner", title: "Public event fixture" });
      await setDoc(doc(db, "listings", "public-listing"), { sellerId: "owner", title: "Public listing fixture" });
      await setDoc(doc(db, "presence", "owner"), { uid: "owner", lastSeen: new Date() });
    });

    const outsider = env.authenticatedContext("outsider", { email: "outsider@example.test" }).firestore();
    const anonymous = env.unauthenticatedContext().firestore();
    const owner = env.authenticatedContext("owner", { email: "owner@example.test" }).firestore();
    const helper = env.authenticatedContext("helper", { email: "helper@example.test" }).firestore();

    await assertFails(getDoc(doc(outsider, "sosRequests", "private-sos")));
    console.log("PASS: outsider cannot read inactive SOS");
    const publicSOS = await getDoc(doc(outsider, "sosRequests", "active-sos"));
    assert.equal("requesterEmail" in publicSOS.data(), false);
    assert.equal("note" in publicSOS.data(), false);
    assert.equal(publicSOS.data().latitude, 40);
    assert.equal(publicSOS.data().longitude, 29);
    assert.notEqual(publicSOS.data().latitude, 40.12345);
    assert.notEqual(publicSOS.data().longitude, 29.54321);
    await assertFails(getDoc(doc(outsider, "sosRequests", "active-sos", "privateDetails", "owner")));
    await assertSucceeds(getDoc(doc(owner, "sosRequests", "active-sos", "privateDetails", "owner")));
    await assertSucceeds(updateDoc(doc(helper, "sosRequests", "active-sos"), {
      acceptedBy: "helper", updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(getDoc(doc(helper, "sosRequests", "active-sos", "privateDetails", "owner")));
    await assertFails(updateDoc(doc(outsider, "sosRequests", "active-sos"), {
      acceptedBy: "outsider", updatedAt: serverTimestamp(),
    }));
    console.log("PASS: exact SOS details are visible to owner and accepted helper only");
    await assertFails(updateDoc(doc(outsider, "sosRequests", "active-sos"), {
      status: "resolved", resolvedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(doc(helper, "sosRequests", "active-sos"), {
      status: "resolved", resolvedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(updateDoc(doc(owner, "sosRequests", "active-sos"), {
      status: "cancelled", cancelledAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(doc(owner, "sosRequests", "active-sos"), {
      status: "active", updatedAt: serverTimestamp(),
    }));
    await assertFails(getDoc(doc(helper, "sosRequests", "active-sos", "privateDetails", "owner")));
    await assertSucceeds(getDoc(doc(owner, "sosRequests", "active-sos", "privateDetails", "owner")));
    console.log("PASS: only the SOS owner can make an allowed active-to-terminal transition; helper loses exact-location access after closure");
    const sosBatch = writeBatch(owner);
    sosBatch.set(doc(owner, "sosRequests", "valid-sos"), {
      requesterId: "owner", status: "active", helpType: "ariza",
      latitude: 40.12, longitude: 29.54, acceptedBy: null,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), resolvedAt: null, cancelledAt: null,
    });
    sosBatch.set(doc(owner, "sosRequests", "valid-sos", "privateDetails", "owner"), {
      requesterEmail: "owner@example.test", latitude: 40.12345, longitude: 29.54321,
      note: "Exact meeting point", createdAt: serverTimestamp(),
    });
    await assertSucceeds(sosBatch.commit());
    console.log("PASS: owner can create a valid SOS with server timestamps");

    const publicHelp = await getDoc(doc(outsider, "helpRequests", "private-help"));
    assert.equal("user" in publicHelp.data(), false);
    assert.equal(publicHelp.data().ownerId, "owner");
    assert.equal(publicHelp.data().ownerEmail, undefined);
    console.log("PASS: active help request is discoverable without publishing owner email");
    await assertFails(getDoc(doc(outsider, "helpRequests", "closed-help")));
    console.log("PASS: outsider cannot read closed help request");
    await assertFails(getDoc(doc(outsider, "helpRequests", "private-help", "messages", "seed")));
    console.log("PASS: outsider cannot read chat before accepting the request");
    await assertFails(setDoc(doc(outsider, "helpRequests", "private-help", "messages", "outsider-message"), {
      id: "outsider-message", from: "outsider", fromName: "Outsider", text: "unauthorized", ts: serverTimestamp(),
    }));
    console.log("PASS: outsider cannot send chat before accepting the request");
    await assertFails(updateDoc(doc(outsider, "helpRequests", "private-help"), {
      active: false, resolvedBy: "outsider", resolvedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    console.log("PASS: unaccepted user cannot resolve another rider request");

    await assertSucceeds(updateDoc(doc(outsider, "helpRequests", "private-help"), {
      helpers: ["outsider"], updatedAt: serverTimestamp(),
    }));
    console.log("PASS: helper can accept an active request by adding only their own identity");
    await assertSucceeds(getDoc(doc(outsider, "helpRequests", "private-help", "messages", "seed")));
    await assertSucceeds(setDoc(doc(outsider, "helpRequests", "private-help", "messages", "accepted-helper-message"), {
      id: "accepted-helper-message", from: "outsider", fromName: "Outsider", text: "accepted helper message", ts: serverTimestamp(),
    }));
    console.log("PASS: accepted helper can read and send chat messages");
    await assertFails(setDoc(doc(outsider, "helpRequests", "private-help", "messages", "spoofed-sender"), {
      id: "spoofed-sender", from: "owner", fromName: "Spoofed", text: "spoofed sender", ts: serverTimestamp(),
    }));
    await assertFails(setDoc(doc(outsider, "helpRequests", "private-help", "messages", "oversized-message"), {
      id: "oversized-message", from: "outsider", fromName: "Outsider", text: "x".repeat(2001), ts: serverTimestamp(),
    }));
    console.log("PASS: chat rejects spoofed sender IDs and oversized messages");
    await assertFails(updateDoc(doc(outsider, "helpRequests", "private-help"), {
      active: false, resolvedBy: "outsider", resolvedAt: serverTimestamp(), updatedAt: Date.now(),
    }));
    await assertSucceeds(updateDoc(doc(outsider, "helpRequests", "private-help"), {
      active: false, resolvedBy: "outsider", resolvedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    console.log("PASS: accepted helper must use server timestamps to resolve the request");
    await assertFails(updateDoc(doc(owner, "helpRequests", "private-help"), {
      active: false, resolvedBy: "owner", resolvedAt: serverTimestamp(), updatedAt: serverTimestamp(),
    }));
    console.log("PASS: owner cannot impersonate a helper when resolving");

    await assertSucceeds(setDoc(doc(owner, "helpRequests", "valid-help"), {
      title: "Valid help", description: "test", ownerId: "owner",
      active: true, helpers: [], resolvedBy: null, resolvedAt: null,
      createdAt: serverTimestamp(),
    }));
    console.log("PASS: owner can create a valid help request");
    await assertFails(updateDoc(doc(outsider, "helpRequests", "valid-help"), {
      active: false, updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(updateDoc(doc(owner, "helpRequests", "valid-help"), {
      active: false, updatedAt: serverTimestamp(),
    }));
    await assertFails(updateDoc(doc(owner, "helpRequests", "closed-help"), {
      active: false, updatedAt: serverTimestamp(),
    }));
    console.log("PASS: only the owner can close an active request; closed requests cannot be re-closed");
    await assertFails(setDoc(doc(outsider, "helpRequests", "spoofed-help"), {
      id: "spoofed-help", ownerId: "owner", title: "spoofed",
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
    await assertSucceeds(getDoc(doc(anonymous, "banners", "public-banner")));
    await assertSucceeds(getDoc(doc(anonymous, "communityPosts", "public-post")));
    await assertSucceeds(getDoc(doc(anonymous, "events", "public-event")));
    await assertSucceeds(getDoc(doc(anonymous, "listings", "public-listing")));
    console.log("PASS: explicitly public catalog, banners, posts, events, and listings remain readable");

    await assertSucceeds(setDoc(doc(owner, "presence", "owner"), {
      uid: "owner", lastSeen: serverTimestamp(),
    }));
    await assertFails(setDoc(doc(outsider, "presence", "owner"), {
      uid: "owner", lastSeen: serverTimestamp(),
    }));
    await assertSucceeds(getDoc(doc(anonymous, "presence", "owner")));
    console.log("PASS: presence is publicly readable but only its owner can update it");

    await assertFails(setDoc(doc(outsider, "communityPosts", "spoofed-post"), {
      authorId: "owner", text: "spoofed",
    }));
    await assertFails(setDoc(doc(outsider, "listings", "spoofed-listing"), {
      sellerId: "owner", title: "spoofed",
    }));
    await assertFails(setDoc(doc(outsider, "products", "unauthorized-product"), {
      name: "unauthorized",
    }));
    await assertFails(setDoc(doc(outsider, "banners", "unauthorized-banner"), {
      title: "unauthorized",
    }));
    await assertSucceeds(updateDoc(doc(owner, "communityPosts", "public-post"), { text: "Edited public post" }));
    await assertFails(updateDoc(doc(owner, "communityPosts", "public-post"), { authorId: "outsider" }));
    await assertSucceeds(updateDoc(doc(owner, "events", "public-event"), { title: "Edited public event" }));
    await assertFails(updateDoc(doc(owner, "events", "public-event"), { organizerId: "outsider" }));
    await assertSucceeds(updateDoc(doc(owner, "listings", "public-listing"), { title: "Edited public listing" }));
    await assertFails(updateDoc(doc(owner, "listings", "public-listing"), { sellerId: "outsider" }));
    await assertSucceeds(setDoc(doc(owner, "events", "owner-event"), {
      organizerId: "owner", title: "Owner event",
    }));
    await assertFails(setDoc(doc(outsider, "events", "spoofed-event"), {
      organizerId: "owner", title: "Spoofed event",
    }));
    console.log("PASS: public content ownership fields cannot be forged or transferred");
    await assertFails(setDoc(doc(outsider, "sosRequests", "spoofed-sos"), {
      requesterId: "owner", status: "active", helpType: "ariza",
      latitude: 0, longitude: 0, acceptedBy: null,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), resolvedAt: null, cancelledAt: null,
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

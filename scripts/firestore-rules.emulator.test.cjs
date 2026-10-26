const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const moduleRoot = path.resolve(".firestore-test-runtime/node_modules");
const testRequire = createRequire(path.join(path.dirname(moduleRoot), "package.json"));
const { initializeTestEnvironment, assertSucceeds, assertFails } = testRequire("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, updateDoc, serverTimestamp, writeBatch, deleteDoc } = testRequire("firebase/firestore");

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
      await setDoc(doc(db, "sosRequests", "active-no-private"), {
        requesterId: "owner", status: "active",
        helpType: "ariza", latitude: 40, longitude: 29,
        acceptedBy: null, createdAt: new Date(), updatedAt: new Date(),
        resolvedAt: null, cancelledAt: null,
      });
      await setDoc(doc(db, "sosRequests", "active-sos", "privateDetails", "owner"), {
        requesterEmail: "owner@example.test", latitude: 40.12345, longitude: 29.54321,
        note: "Exact meeting point", createdAt: new Date(),
      });
      await setDoc(doc(db, "sosRequests", "active-sos", "privateDetails", "unexpected"), {
        requesterEmail: "other@example.test", latitude: 40.22222, longitude: 29.66666,
        note: "Unexpected subdocument", createdAt: new Date(),
      });
      await setDoc(doc(db, "helpRequests", "private-help"), {
        id: "private-help", ownerId: "owner", title: "Private help",
        description: "test fixture", active: true, helpers: [], resolvedBy: null,
        resolvedAt: null, createdAt: new Date(),
      });
      await setDoc(doc(db, "helpRequests", "closed-help"), {
        id: "closed-help", ownerId: "owner", title: "Closed help",
        description: "closed test fixture", active: false, helpers: ["helper"], resolvedBy: "helper",
        resolvedAt: new Date(), createdAt: new Date(),
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
      await setDoc(doc(db, "communityPosts", "public-post"), { authorId: "owner", authorName: "Owner", city: "İzmir", content: "Public post fixture", likes: [], comments: [], createdAt: new Date() });
      await setDoc(doc(db, "communityPosts", "legacy-email-post"), { authorId: "owner", authorName: "Owner", authorEmail: "legacy@example.test", city: "İzmir", content: "Legacy email-bearing post", likes: [], comments: [], createdAt: new Date() });
      await setDoc(doc(db, "events", "public-event"), { organizerId: "owner", title: "Public event fixture" });
      await setDoc(doc(db, "listings", "public-listing"), { sellerId: "owner", sellerName: "Owner", title: "Public listing fixture", category: "Kask", price: 1000, city: "İzmir", description: "Valid listing fixture", createdAt: new Date(), featured: false });
      await setDoc(doc(db, "listings", "legacy-email-listing"), { sellerId: "owner", sellerName: "Owner", sellerEmail: "legacy@example.test", title: "Legacy listing with email", category: "Kask", price: 500, city: "İzmir", description: "Legacy fixture", createdAt: new Date(), featured: false });
      await setDoc(doc(db, "presence", "owner"), { uid: "owner", lastSeen: new Date() });
      // Simulate a legacy document that would expose an extra field if public reads were unconditional.
      await setDoc(doc(db, "presence", "malformed-legacy"), { uid: "owner", lastSeen: new Date(), email: "private@example.test" });
      await setDoc(doc(db, "presence", "wrong-uid"), { uid: "outsider", lastSeen: new Date() });
      await setDoc(doc(db, "presence", "invalid-timestamp"), { uid: "invalid-timestamp", lastSeen: "yesterday" });
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
    await assertFails(setDoc(doc(outsider, "sosRequests", "active-no-private", "privateDetails", "owner"), {
      requesterEmail: "outsider@example.test", latitude: 40.11111, longitude: 29.22222,
      note: "forged private details", createdAt: serverTimestamp(),
    }));
    console.log("PASS: another rider cannot create private SOS details for the request owner");
    await assertSucceeds(updateDoc(doc(helper, "sosRequests", "active-sos"), {
      acceptedBy: "helper", updatedAt: serverTimestamp(),
    }));
    await assertSucceeds(getDoc(doc(helper, "sosRequests", "active-sos", "privateDetails", "owner")));
    await assertFails(getDoc(doc(helper, "sosRequests", "active-sos", "privateDetails", "unexpected")));
    console.log("PASS: accepted helper can read only the designated SOS owner-details document");
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

    const invalidNoteBatch = writeBatch(owner);
    invalidNoteBatch.set(doc(owner, "sosRequests", "invalid-note-sos"), {
      requesterId: "owner", status: "active", helpType: "ariza",
      latitude: 40.12, longitude: 29.54, acceptedBy: null,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), resolvedAt: null, cancelledAt: null,
    });
    invalidNoteBatch.set(doc(owner, "sosRequests", "invalid-note-sos", "privateDetails", "owner"), {
      requesterEmail: "owner@example.test", latitude: 40.12345, longitude: 29.54321,
      note: "x".repeat(1001), createdAt: serverTimestamp(),
    });
    await assertFails(invalidNoteBatch.commit());
    await env.withSecurityRulesDisabled(async (context) => { assert.equal((await getDoc(doc(context.firestore(), "sosRequests", "invalid-note-sos"))).exists(), false); });
    console.log("PASS: SOS batch rejects private notes over 1000 characters atomically");

    const spoofedEmailBatch = writeBatch(owner);
    spoofedEmailBatch.set(doc(owner, "sosRequests", "spoofed-email-sos"), {
      requesterId: "owner", status: "active", helpType: "ariza",
      latitude: 40.12, longitude: 29.54, acceptedBy: null,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), resolvedAt: null, cancelledAt: null,
    });
    spoofedEmailBatch.set(doc(owner, "sosRequests", "spoofed-email-sos", "privateDetails", "owner"), {
      requesterEmail: "someone-else@example.test", latitude: 40.12345, longitude: 29.54321,
      note: "Exact meeting point", createdAt: serverTimestamp(),
    });
    await assertFails(spoofedEmailBatch.commit());
    await env.withSecurityRulesDisabled(async (context) => { assert.equal((await getDoc(doc(context.firestore(), "sosRequests", "spoofed-email-sos"))).exists(), false); });
    console.log("PASS: SOS batch rejects mismatched contact email without partial parent creation");

    await assertFails(setDoc(doc(owner, "sosRequests", "invalid-coordinate-sos"), {
      requesterId: "owner", status: "active", helpType: "ariza",
      latitude: 91, longitude: 29.54, acceptedBy: null,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), resolvedAt: null, cancelledAt: null,
    }));
    console.log("PASS: SOS creation rejects out-of-range coordinates");

    const precisePublicSOSBatch = writeBatch(owner);
    precisePublicSOSBatch.set(doc(owner, "sosRequests", "precise-public-sos"), {
      requesterId: "owner", status: "active", helpType: "ariza",
      latitude: 40.12345, longitude: 29.54321, acceptedBy: null,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), resolvedAt: null, cancelledAt: null,
    });
    precisePublicSOSBatch.set(doc(owner, "sosRequests", "precise-public-sos", "privateDetails", "owner"), {
      requesterEmail: "owner@example.test", latitude: 40.12345, longitude: 29.54321,
      note: "Exact meeting point", createdAt: serverTimestamp(),
    });
    await assertFails(precisePublicSOSBatch.commit());
    await assertFails(getDoc(doc(owner, "sosRequests", "precise-public-sos")));
    console.log("PASS: server rules reject precise coordinates on public SOS documents atomically");

    const negativeRoundedSOSBatch = writeBatch(owner);
    negativeRoundedSOSBatch.set(doc(owner, "sosRequests", "negative-rounded-sos"), {
      requesterId: "owner", status: "active", helpType: "ariza",
      latitude: -40.12, longitude: -29.54, acceptedBy: null,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(), resolvedAt: null, cancelledAt: null,
    });
    negativeRoundedSOSBatch.set(doc(owner, "sosRequests", "negative-rounded-sos", "privateDetails", "owner"), {
      requesterEmail: "owner@example.test", latitude: -40.12345, longitude: -29.54321,
      note: "Exact meeting point", createdAt: serverTimestamp(),
    });
    await assertSucceeds(negativeRoundedSOSBatch.commit());
    console.log("PASS: negative rounded SOS coordinates are accepted without weakening precision checks");

    const publicHelp = await getDoc(doc(outsider, "helpRequests", "private-help"));
    assert.equal("user" in publicHelp.data(), false);
    assert.equal(publicHelp.data().ownerId, "owner");
    assert.equal(publicHelp.data().ownerEmail, undefined);
    console.log("PASS: active help request is discoverable without publishing owner email");
    await assertFails(getDoc(doc(outsider, "helpRequests", "closed-help")));
    console.log("PASS: outsider cannot read closed help request");
    await assertFails(setDoc(doc(helper, "helpRequests", "closed-help", "messages", "after-close"), {
      id: "after-close", from: "helper", fromName: "Helper", text: "message after closure", ts: serverTimestamp(),
    }));
    console.log("PASS: listed helper cannot send chat messages after request closure");
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
    await assertFails(getDoc(doc(anonymous, "communityPosts", "legacy-email-post")));
    await assertSucceeds(getDoc(doc(owner, "communityPosts", "legacy-email-post")));
    console.log("PASS: legacy community posts with email fields are not publicly readable");
    await assertSucceeds(getDoc(doc(anonymous, "events", "public-event")));
    await assertSucceeds(getDoc(doc(anonymous, "listings", "public-listing")));
    await assertFails(getDoc(doc(anonymous, "listings", "legacy-email-listing")));
    await assertSucceeds(getDoc(doc(owner, "listings", "legacy-email-listing")));
    console.log("PASS: legacy listings containing seller email are private to owner/admin");
    console.log("PASS: explicitly public catalog, banners, posts, events, and listings remain readable");

    await assertSucceeds(setDoc(doc(owner, "presence", "owner"), {
      uid: "owner", lastSeen: serverTimestamp(),
    }));
    await assertFails(setDoc(doc(outsider, "presence", "owner"), {
      uid: "owner", lastSeen: serverTimestamp(),
    }));
    await assertFails(updateDoc(doc(owner, "presence", "owner"), {
      lastSeen: new Date("2020-01-01T00:00:00Z"),
    }));
    await assertFails(updateDoc(doc(owner, "presence", "owner"), {
      email: "owner@example.test", lastSeen: serverTimestamp(),
    }));
    await assertFails(deleteDoc(doc(outsider, "presence", "owner")));
    await assertSucceeds(getDoc(doc(anonymous, "presence", "owner")));
    await assertFails(getDoc(doc(anonymous, "presence", "malformed-legacy")));
    await assertFails(getDoc(doc(anonymous, "presence", "wrong-uid")));
    await assertFails(getDoc(doc(anonymous, "presence", "invalid-timestamp")));
    console.log("PASS: public presence reads reject extra fields, mismatched UIDs, and non-timestamp heartbeats");
    console.log("PASS: presence is publicly readable but only its owner can update it");
    console.log("PASS: presence rejects stale heartbeat timestamps, extra identity fields, and cross-user deletion");

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
    await assertSucceeds(updateDoc(doc(owner, "communityPosts", "public-post"), { content: "Edited public post" }));
    await assertFails(updateDoc(doc(owner, "communityPosts", "public-post"), { city: "" }));
    await assertFails(updateDoc(doc(owner, "communityPosts", "public-post"), { authorId: "outsider" }));
    await assertFails(updateDoc(doc(owner, "communityPosts", "public-post"), { likes: ["outsider@example.test"] }));
    await assertFails(updateDoc(doc(owner, "communityPosts", "public-post"), { createdAt: serverTimestamp() }));
    // A different authenticated rider must not edit or delete another author's post.
    await assertFails(updateDoc(doc(outsider, "communityPosts", "public-post"), { content: "Unauthorized edit" }));
    await assertFails(deleteDoc(doc(outsider, "communityPosts", "public-post")));
    // Likes/comments arrays are not an authorized client-side mutation surface.
    await assertFails(updateDoc(doc(owner, "communityPosts", "public-post"), { comments: [{ from: "owner", text: "injected" }] }));
    await assertFails(setDoc(doc(owner, "communityPosts", "invalid-post"), {
      authorId: "owner", content: "x".repeat(5001), city: "İzmir", likes: [], comments: [],
    }));
    await assertFails(setDoc(doc(owner, "communityPosts", "extra-field-post"), {
      authorId: "owner", authorName: "Owner", content: "Post", city: "İzmir", likes: [], comments: [], isAdmin: true, createdAt: serverTimestamp(),
    }));
    await assertFails(setDoc(doc(owner, "communityPosts", "forged-likes-post"), {
      authorId: "owner", authorName: "Owner", content: "Post", city: "İzmir", likes: ["outsider"], comments: [], createdAt: serverTimestamp(),
    }));
    await assertFails(setDoc(doc(owner, "communityPosts", "email-exposure-post"), {
      authorId: "owner", authorName: "Owner", authorEmail: "owner@example.test", content: "Post", city: "İzmir", likes: [], comments: [], createdAt: serverTimestamp(),
    }));
    await assertFails(setDoc(doc(owner, "communityPosts", "missing-timestamp-post"), {
      authorId: "owner", authorName: "Owner", content: "Post", city: "İzmir", likes: [], comments: [],
    }));
    await assertSucceeds(updateDoc(doc(owner, "events", "public-event"), { title: "Edited public event" }));
    await assertFails(updateDoc(doc(owner, "events", "public-event"), { organizerId: "outsider" }));
    await assertFails(updateDoc(doc(owner, "events", "public-event"), { createdAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(owner, "events", "public-event"), { isAdmin: true }));
    await assertFails(updateDoc(doc(outsider, "events", "public-event"), { title: "Unauthorized event edit" }));
    await assertFails(deleteDoc(doc(outsider, "events", "public-event")));
    await assertFails(setDoc(doc(owner, "events", "extra-field-event"), {
      organizerId: "owner", title: "Event", isAdmin: true,
    }));
    await assertFails(setDoc(doc(owner, "events", "oversized-event"), {
      organizerId: "owner", title: "x".repeat(161),
    }));
    await assertSucceeds(updateDoc(doc(owner, "listings", "public-listing"), { title: "Edited public listing" }));
    await assertFails(updateDoc(doc(owner, "listings", "public-listing"), { sellerId: "outsider" }));
    await assertFails(updateDoc(doc(owner, "listings", "public-listing"), { featured: true }));
    await assertFails(updateDoc(doc(owner, "listings", "public-listing"), { sellerEmail: "attacker@example.test" }));
    await assertFails(updateDoc(doc(owner, "listings", "public-listing"), { createdAt: serverTimestamp() }));
    await assertFails(updateDoc(doc(owner, "listings", "public-listing"), { price: -1 }));
    await assertFails(setDoc(doc(owner, "listings", "invalid-price-listing"), {
      sellerId: "owner", title: "Invalid", category: "Kask", price: -10, city: "İzmir", description: "Invalid price",
    }));
    await assertFails(setDoc(doc(owner, "listings", "promoted-listing"), {
      sellerId: "owner", title: "Promoted", category: "Kask", price: 100, city: "İzmir", description: "Self-promoted", featured: true,
    }));
    await assertFails(setDoc(doc(owner, "listings", "email-listing"), {
      sellerId: "owner", title: "Email-bearing listing", category: "Kask", price: 100, city: "İzmir", description: "Must not publish email", sellerEmail: "owner@example.test", createdAt: serverTimestamp(),
    }));
    console.log("PASS: new listings cannot store seller email in publicly readable documents");
    await assertSucceeds(setDoc(doc(owner, "events", "owner-event"), {
      organizerId: "owner", title: "Owner event", createdAt: serverTimestamp(),
    }));
    await assertFails(setDoc(doc(owner, "events", "event-missing-created-at"), {
      organizerId: "owner", title: "Missing creation timestamp",
    }));
    await assertFails(setDoc(doc(owner, "events", "event-forged-created-at"), {
      organizerId: "owner", title: "Forged creation timestamp", createdAt: new Date("2020-01-01T00:00:00Z"),
    }));
    await assertSucceeds(setDoc(doc(owner, "listings", "valid-owner-listing"), {
      sellerId: "owner", title: "Valid", category: "Kask", price: 100, city: "İzmir",
      description: "Valid listing", createdAt: serverTimestamp(),
    }));
    await assertFails(setDoc(doc(owner, "listings", "listing-missing-created-at"), {
      sellerId: "owner", title: "Missing timestamp", category: "Kask", price: 100, city: "İzmir",
      description: "Missing timestamp",
    }));
    await assertFails(setDoc(doc(owner, "listings", "listing-forged-created-at"), {
      sellerId: "owner", title: "Forged timestamp", category: "Kask", price: 100, city: "İzmir",
      description: "Forged timestamp", createdAt: new Date("2020-01-01T00:00:00Z"),
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

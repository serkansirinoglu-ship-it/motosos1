const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");

const moduleRoot = path.resolve(".firestore-test-runtime/node_modules");
const testRequire = createRequire(path.join(path.dirname(moduleRoot), "package.json"));
const { initializeTestEnvironment, assertSucceeds, assertFails } = testRequire("@firebase/rules-unit-testing");
const { doc, getDoc, setDoc, updateDoc } = testRequire("firebase/firestore");

const mode = process.env.FIRESTORE_RULES_TEST_MODE || "baseline";
if (!["baseline", "strict"].includes(mode)) throw new Error(`Unknown FIRESTORE_RULES_TEST_MODE: ${mode}`);

async function main() {
  const rulesFile = process.env.FIRESTORE_RULES_FILE || "firestore.rules";
  const rules = fs.readFileSync(rulesFile, "utf8");
  console.log(`Testing rules file: ${rulesFile}`);
  const env = await initializeTestEnvironment({
    projectId: "demo-motoguard-firestore-rules",
    firestore: { rules },
  });

  const check = async (label, operation, vulnerableInBaseline) => {
    if (mode === "baseline" && vulnerableInBaseline) {
      await assertSucceeds(operation);
      console.log(`KNOWN RISK reproduced: ${label}`);
      return;
    }
    await assertFails(operation);
    console.log(`DENIED as expected: ${label}`);
  };

  try {
    await env.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "sosRequests", "private-sos"), {
        requesterId: "owner", requesterEmail: "owner@example.test", status: "resolved",
        helpType: "repair", latitude: 40, longitude: 29,
      });
      await setDoc(doc(db, "helpRequests", "private-help"), {
        id: "private-help", user: "owner@example.test", title: "Private help",
        description: "test fixture", active: true, helpers: [],
      });
      await setDoc(doc(db, "helpRequests", "private-help", "messages", "seed"), {
        id: "seed", from: "owner@example.test", text: "private message", ts: Date.now(),
      });
      await setDoc(doc(db, "users", "owner"), {
        uid: "owner", email: "owner@example.test", points: 10, badges: [],
      });
      await setDoc(doc(db, "internalPrivate", "secret"), { value: "not public" });
    });

    const outsider = env.authenticatedContext("outsider", { email: "outsider@example.test" }).firestore();
    const anonymous = env.unauthenticatedContext().firestore();
    const owner = env.authenticatedContext("owner", { email: "owner@example.test" }).firestore();

    // These cases intentionally reproduce the currently documented weaknesses.
    await check("signed-in outsider reads another user's SOS", getDoc(doc(outsider, "sosRequests", "private-sos")), true);
    await check("signed-in outsider reads another user's help request", getDoc(doc(outsider, "helpRequests", "private-help")), true);
    await check("signed-in outsider reads another request's message", getDoc(doc(outsider, "helpRequests", "private-help", "messages", "seed")), true);
    await check("signed-in outsider creates a message in another request", setDoc(doc(outsider, "helpRequests", "private-help", "messages", "outsider-message"), {
      id: "outsider-message", from: "outsider@example.test", text: "unauthorized", ts: Date.now(),
    }), true);
    await check("signed-in outsider creates a help request claiming another user", setDoc(doc(outsider, "helpRequests", "spoofed-help"), {
      id: "spoofed-help", user: "owner@example.test", title: "spoofed", description: "test", active: true,
    }), true);
    await check("profile owner edits server-controlled points", updateDoc(doc(owner, "users", "owner"), { points: 999999 }), true);
    await check("anonymous user reads an unmatched private collection", getDoc(doc(anonymous, "internalPrivate", "secret")), true);

    // A couple of existing restrictions are also characterized.
    await check("anonymous user reads a private user profile because the catch-all grants public read", getDoc(doc(anonymous, "users", "owner")), true);
    await assertFails(setDoc(doc(outsider, "sosRequests", "spoofed-sos"), {
      requesterId: "owner", status: "active", helpType: "repair", latitude: 0, longitude: 0,
    }));
    console.log("PASS: baseline rules characterization completed. Known risks above are expected until the rules are hardened.");
  } finally {
    await env.cleanup();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

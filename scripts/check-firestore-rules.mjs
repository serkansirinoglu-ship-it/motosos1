import { readFileSync } from "node:fs";

const files = ["firestore.rules", "firestore.prod.rules"];
const checks = [
  {
    id: "catch-all-public-read",
    description: "Catch-all rule grants public reads to every unmatched collection",
    test: (source) => /match\s+\/\{document=\*\*\}[\s\S]*?allow\s+read\s*:\s*if\s+true\s*;/.test(source),
  },
  {
    id: "broad-sos-read",
    description: "All signed-in users can read all SOS requests, including inactive records",
    test: (source) => /match\s+\/sosRequests\/\{[^}]+\}[\s\S]*?allow\s+read\s*:\s*if\s+isSignedIn\(\)\s*;/.test(source),
  },
  {
    id: "unrestricted-sos-update",
    description: "SOS owner updates are not restricted to safe fields or lifecycle transitions",
    test: (source) => /match\s+\/sosRequests\/\{[^}]+\}[\s\S]*?allow\s+update\s*:\s*if\s+isSignedIn\(\)\s*&&\s*\([\s\S]*?resource\.data\.requesterId\s*==\s*request\.auth\.uid/.test(source),
  },
  {
    id: "broad-help-read",
    description: "All signed-in users can read every help request",
    test: (source) => /match\s+\/helpRequests\/\{[^}]+\}[\s\S]*?allow\s+read\s*:\s*if\s+isSignedIn\(\)\s*;/.test(source),
  },
  {
    id: "broad-message-access",
    description: "Any signed-in user can read and create messages for any request",
    test: (source) => /match\s+\/messages\/\{[^}]+\}[\s\S]*?allow\s+read\s*:\s*if\s+isSignedIn\(\)\s*;[\s\S]*?allow\s+create\s*:\s*if\s+isSignedIn\(\)\s*;/.test(source),
  },
  {
    id: "unrestricted-profile-update",
    description: "Profile owner can modify server-controlled fields such as points and badges",
    test: (source) => /match\s+\/users\/\{[^}]+\}[\s\S]*?allow\s+update\s*:\s*if\s+isOwner\([^)]*\)\s*\|\|\s*isAdmin\(\)\s*;/.test(source),
  },
];

let failures = 0;
for (const file of files) {
  const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  for (const check of checks) {
    if (check.test(source)) {
      failures += 1;
      console.error(`FAIL [${file}] ${check.id}: ${check.description}`);
    }
  }
}

if (failures > 0 && process.env.STRICT_FIRESTORE_RULES === "1") {
  console.error(`\nStrict Firestore security gate failed with ${failures} finding(s). See docs/FIRESTORE_SECURITY_AUDIT.md. Rules were not deployed.`);
  process.exitCode = 1;
} else if (failures > 0) {
  console.warn(`\nAudit mode: ${failures} known finding(s) recorded. This report is not a security pass; strict mode remains blocked until findings are fixed.`);
} else {
  console.log("Firestore static security gate passed for both rules files.");
}

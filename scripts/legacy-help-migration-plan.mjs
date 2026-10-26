import fs from "node:fs";
import { pathToFileURL } from "node:url";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SAFE_UID_RE = /^[A-Za-z0-9_-]{1,128}$/;

function normalizeEmail(value) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

/** Offline assessment only: no Firebase connection, writes, or raw email output. */
export function planLegacyHelpMigration(records, emailToUid) {
  if (!Array.isArray(records)) throw new TypeError("records must be an array");
  if (!emailToUid || typeof emailToUid !== "object" || Array.isArray(emailToUid)) {
    throw new TypeError("emailToUid must be an email-to-UID object");
  }

  const mapping = new Map();
  for (const [email, uid] of Object.entries(emailToUid)) {
    const key = normalizeEmail(email);
    if (!EMAIL_RE.test(key) || typeof uid !== "string" || !SAFE_UID_RE.test(uid.trim())) continue;
    const normalizedUid = uid.trim();
    if (mapping.has(key) && mapping.get(key) !== normalizedUid) mapping.set(key, null);
    else if (!mapping.has(key)) mapping.set(key, normalizedUid);
  }

  const idCounts = new Map();
  for (const record of records) {
    const id = typeof record?.id === "string" ? record.id : "";
    if (id) idCounts.set(id, (idCounts.get(id) || 0) + 1);
  }

  const items = records.map((record) => {
    const data = record?.data && typeof record.data === "object" ? record.data : record;
    const id = typeof record?.id === "string" ? record.id : "";
    const reasons = [];
    if (!id) reasons.push("missing_document_id");
    if (id && idCounts.get(id) > 1) reasons.push("duplicate_document_id");
    if (id && (id.length > 1500 || id.includes("/") || id === "." || id === ".." || /^__.*__$/.test(id))) {
      reasons.push("invalid_document_id");
    }
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      reasons.push("invalid_document_data");
      return { id: id || null, status: "blocked", reasonCodes: [...new Set(reasons)] };
    }

    const legacyOwnerEmail = normalizeEmail(data.user);
    let ownerId = typeof data.ownerId === "string" && data.ownerId.trim() ? data.ownerId.trim() : "";
    if (ownerId && !SAFE_UID_RE.test(ownerId)) reasons.push("invalid_owner_uid");
    if (!ownerId && legacyOwnerEmail) {
      if (!EMAIL_RE.test(legacyOwnerEmail)) reasons.push("invalid_legacy_owner_email");
      else if (!mapping.has(legacyOwnerEmail)) reasons.push("owner_uid_mapping_missing");
      else if (!mapping.get(legacyOwnerEmail)) reasons.push("owner_uid_mapping_ambiguous");
      else ownerId = mapping.get(legacyOwnerEmail);
    } else if (!ownerId) {
      reasons.push("owner_identity_missing");
    }

    const helpers = Array.isArray(data.helpers) ? data.helpers : [];
    if (!Array.isArray(data.helpers)) reasons.push("helpers_not_a_list");
    const mappedHelpers = [];
    for (const helper of helpers) {
      if (typeof helper !== "string" || !helper.trim()) {
        reasons.push("invalid_helper_identity");
        continue;
      }
      const value = helper.trim();
      if (!value.includes("@")) {
        if (!SAFE_UID_RE.test(value)) reasons.push("invalid_helper_uid");
        else mappedHelpers.push(value);
        continue;
      }
      const email = normalizeEmail(value);
      if (!EMAIL_RE.test(email)) reasons.push("invalid_legacy_helper_email");
      else if (!mapping.has(email)) reasons.push("helper_uid_mapping_missing");
      else if (!mapping.get(email)) reasons.push("helper_uid_mapping_ambiguous");
      else mappedHelpers.push(mapping.get(email));
    }

    if (mappedHelpers.length !== new Set(mappedHelpers).size) reasons.push("duplicate_helper_identity_after_mapping");
    const uniqueHelpers = [...new Set(mappedHelpers)];
    const alreadyModern = Boolean(data.ownerId) && SAFE_UID_RE.test(String(data.ownerId)) &&
      !("user" in data) && helpers.every((helper) => typeof helper === "string" && SAFE_UID_RE.test(helper.trim()));
    const status = reasons.length ? "blocked" : alreadyModern ? "already_modern" : "ready_for_review";
    return {
      id: id || null,
      status,
      reasonCodes: [...new Set(reasons)],
      counts: {
        legacyOwnerFieldPresent: "user" in data,
        legacyHelperCount: helpers.filter((helper) => typeof helper === "string" && helper.includes("@")).length,
        proposedHelperCount: uniqueHelpers.length,
      },
      proposedIdentityShape: status === "blocked" ? null : {
        ownerId,
        helpers: uniqueHelpers,
        removeLegacyUserField: "user" in data,
      },
    };
  });

  const summary = {
    total: items.length,
    readyForReview: items.filter((item) => item.status === "ready_for_review").length,
    alreadyModern: items.filter((item) => item.status === "already_modern").length,
    blocked: items.filter((item) => item.status === "blocked").length,
    reasonCounts: {},
  };
  for (const item of items) {
    for (const reason of item.reasonCodes) summary.reasonCounts[reason] = (summary.reasonCounts[reason] || 0) + 1;
  }
  return { summary, items };
}

function main() {
  const [recordsPath, mappingPath] = process.argv.slice(2);
  if (!recordsPath || !mappingPath) {
    console.error("Usage: node scripts/legacy-help-migration-plan.mjs <local-export.json> <email-to-uid-map.json>");
    process.exitCode = 2;
    return;
  }
  try {
    const records = JSON.parse(fs.readFileSync(recordsPath, "utf8"));
    const mapping = JSON.parse(fs.readFileSync(mappingPath, "utf8"));
    const result = planLegacyHelpMigration(records, mapping);
    console.log(JSON.stringify(result.summary, null, 2));
    if (result.summary.blocked > 0) {
      console.error("Assessment blocked for some records. Resolve mapping/shape issues before any separately approved migration.");
      process.exitCode = 1;
    } else {
      console.log("Assessment only: no Firebase connection or writes were performed.");
    }
  } catch (error) {
    console.error("Unable to assess local migration inputs:", error instanceof Error ? error.message : "invalid input");
    process.exitCode = 2;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();

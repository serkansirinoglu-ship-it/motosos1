import { describe, expect, it } from "vitest";
import { planLegacyHelpMigration } from "./legacy-help-migration-plan.mjs";

describe("planLegacyHelpMigration", () => {
  it("maps legacy owner/helper emails to UIDs without returning emails", () => {
    const result = planLegacyHelpMigration([
      { id: "legacy-1", data: { user: " OWNER@example.test ", helpers: ["helper@example.test"], active: false } },
    ], { "owner@example.test": "owner-uid", "helper@example.test": "helper-uid" });
    expect(result.summary.readyForReview).toBe(1);
    expect(result.items[0].proposedIdentityShape).toEqual({
      ownerId: "owner-uid", helpers: ["helper-uid"], removeLegacyUserField: true,
    });
    expect(JSON.stringify(result)).not.toContain("@example.test");
  });

  it("blocks missing and conflicting UID mappings", () => {
    const result = planLegacyHelpMigration([
      { id: "missing-owner", data: { user: "missing@example.test", helpers: [] } },
      { id: "ambiguous-owner", data: { user: "owner@example.test", helpers: [] } },
      { id: "missing-helper", data: { ownerId: "owner-uid", helpers: ["missing@example.test"] } },
    ], { "owner@example.test": "owner-uid", "OWNER@example.test": "other-uid" });
    expect(result.summary.blocked).toBe(3);
    expect(result.summary.reasonCounts.owner_uid_mapping_missing).toBe(1);
    expect(result.summary.reasonCounts.owner_uid_mapping_ambiguous).toBe(1);
    expect(result.summary.reasonCounts.helper_uid_mapping_missing).toBe(1);
  });

  it("does not treat already-modern records as legacy work", () => {
    const result = planLegacyHelpMigration([
      { id: "modern", data: { ownerId: "owner-uid", helpers: ["helper-uid"] } },
    ], {});
    expect(result.items[0].status).toBe("already_modern");
  });

  it("blocks duplicate document IDs and duplicate helper identities after mapping", () => {
    const result = planLegacyHelpMigration([
      { id: "same", data: { user: "owner@example.test", helpers: ["helper@example.test", "helper-uid"] } },
      { id: "same", data: { ownerId: "owner-uid", helpers: [] } },
    ], { "owner@example.test": "owner-uid", "helper@example.test": "helper-uid" });
    expect(result.items[0].reasonCodes).toContain("duplicate_helper_identity_after_mapping");
    expect(result.items[1].reasonCodes).toContain("duplicate_document_id");
    expect(result.summary.blocked).toBe(2);
  });
});

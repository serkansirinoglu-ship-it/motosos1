import { beforeEach, describe, expect, it } from "vitest";
import { sosService, type SOSHelpCategory } from "./sosService";

describe("SOSService in-memory request lifecycle", () => {
  const request = {
    requesterId: "test-user",
    requesterEmail: "rider@example.test",
    category: "lastik" as SOSHelpCategory,
    latitude: 38.4237,
    longitude: 27.1428,
    note: "test request",
  };

  beforeEach(() => {
    for (const item of sosService.getAllRequests()) {
      sosService.updateStatus(item.id, "iptal_edildi");
    }
  });

  it("creates a pending request and returns it in active requests", () => {
    const created = sosService.createRequest(request);
    expect(created.status).toBe("bekleniyor");
    expect(created.helpersCount).toBe(0);
    expect(created.requesterId).toBe(request.requesterId);
    expect(sosService.getActiveRequests().some((item) => item.id === created.id)).toBe(true);
  });

  it("generates distinct IDs for requests created in the same millisecond", () => {
    const first = sosService.createRequest(request);
    const second = sosService.createRequest(request);

    expect(first.id).not.toBe(second.id);
  });

  it("updates status and records the helper when a request is accepted", () => {
    const created = sosService.createRequest(request);
    expect(sosService.updateStatus(created.id, "yanit_geliyor", "helper-user")).toBe(true);
    const updated = sosService.getAllRequests().find((item) => item.id === created.id);
    expect(updated?.status).toBe("yanit_geliyor");
    expect(updated?.acceptedBy).toBe("helper-user");
    expect(updated?.helpersCount).toBe(1);
  });

  it("records completion time and removes completed requests from active requests", () => {
    const created = sosService.createRequest(request);
    expect(sosService.updateStatus(created.id, "tamamlandi")).toBe(true);
    const updated = sosService.getAllRequests().find((item) => item.id === created.id);
    expect(updated?.resolvedAt).toBeTruthy();
    expect(sosService.getActiveRequests().some((item) => item.id === created.id)).toBe(false);
  });

  it("returns false when asked to update a missing request", () => {
    expect(sosService.updateStatus("missing-sos-id", "iptal_edildi")).toBe(false);
  });
});

describe("SOS category and status coverage", () => {
  it("provides a label and description for all seven supported help categories", async () => {
    const { CATEGORY_LABELS } = await import("./sosService");
    const expected = ["lastik", "aku", "yakit", "ariza", "kaza", "cekici", "diger"];
    expect(Object.keys(CATEGORY_LABELS).sort()).toEqual(expected.sort());
    for (const category of expected) {
      expect(CATEGORY_LABELS[category as SOSHelpCategory].label.trim()).not.toBe("");
      expect(CATEGORY_LABELS[category as SOSHelpCategory].desc.trim()).not.toBe("");
    }
  });

  it("provides a visible label and style for every SOS status", async () => {
    const { STATUS_LABELS } = await import("./sosService");
    const expected = ["bekleniyor", "yanit_geliyor", "yardim_bulundu", "tamamlandi", "iptal_edildi"];
    expect(Object.keys(STATUS_LABELS).sort()).toEqual(expected.sort());
    for (const status of expected) {
      expect(STATUS_LABELS[status as keyof typeof STATUS_LABELS].label.trim()).not.toBe("");
      expect(STATUS_LABELS[status as keyof typeof STATUS_LABELS].color.trim()).not.toBe("");
    }
  });
});

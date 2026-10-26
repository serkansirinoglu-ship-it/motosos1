import { describe, expect, it } from "vitest";
import { validateSOSRequestInput, validateSOSStatusUpdatePatch } from "./sosInputValidation";

const validInput = {
  requesterId: "authenticated-rider",
  requesterEmail: "rider@example.test",
  helpType: "lastik",
  latitude: 38.4237,
  longitude: 27.1428,
};

describe("validateSOSRequestInput", () => {
  it("accepts an authenticated rider with a supported category and valid coordinates", () => {
    expect(validateSOSRequestInput("authenticated-rider", validInput)).toBeNull();
  });

  it.each(["lastik", "aku", "yakit", "ariza", "kaza", "cekici", "diger"])(
    "accepts each supported help category: %s",
    (helpType) => {
      expect(validateSOSRequestInput("authenticated-rider", { ...validInput, helpType })).toBeNull();
    },
  );

  it("rejects requests when there is no authenticated user", () => {
    expect(validateSOSRequestInput(null, validInput)).toBe("unauthenticated");
  });

  it("rejects a requester ID that does not match the authenticated user", () => {
    expect(validateSOSRequestInput("different-rider", validInput)).toBe("requester_mismatch");
  });

  it.each(["other", "", null, 4])("rejects unsupported help categories: %s", (helpType) => {
    expect(validateSOSRequestInput("authenticated-rider", { ...validInput, helpType })).toBe("invalid_help_type");
  });

  it.each([
    [Number.NaN, 10],
    [Number.POSITIVE_INFINITY, 10],
    [91, 10],
    [-91, 10],
    [10, Number.NaN],
    [10, Number.NEGATIVE_INFINITY],
    [10, 181],
    [10, -181],
    ["38.4", 10],
    [10, "27.1"],
  ])("rejects invalid coordinates: %s, %s", (latitude, longitude) => {
    expect(validateSOSRequestInput("authenticated-rider", { ...validInput, latitude, longitude })).toBe("invalid_coordinates");
  });

  it("accepts geographic boundary coordinates", () => {
    expect(validateSOSRequestInput("authenticated-rider", { ...validInput, latitude: -90, longitude: 180 })).toBeNull();
    expect(validateSOSRequestInput("authenticated-rider", { ...validInput, latitude: 90, longitude: -180 })).toBeNull();
  });

  it("accepts an omitted or bounded SOS note", () => {
    expect(validateSOSRequestInput("authenticated-rider", validInput)).toBeNull();
    expect(validateSOSRequestInput("authenticated-rider", { ...validInput, note: "" })).toBeNull();
    expect(validateSOSRequestInput("authenticated-rider", { ...validInput, note: "x".repeat(1000) })).toBeNull();
  });

  it.each([null, 7, {}, "x".repeat(1001)])("rejects invalid or oversized SOS notes", (note) => {
    expect(validateSOSRequestInput("authenticated-rider", { ...validInput, note })).toBe("invalid_note");
  });
});

describe("validateSOSStatusUpdatePatch", () => {
  it.each(["resolved", "cancelled"] as const)("accepts the owner terminal status %s", (status) => {
    expect(validateSOSStatusUpdatePatch({ status })).toBe(true);
  });

  it.each([
    null,
    undefined,
    "resolved",
    [],
    {},
    { status: "active" },
    { status: "pending" },
    { status: "resolved", requesterId: "attacker" },
    { status: "cancelled", acceptedBy: "attacker" },
    { status: "resolved", resolvedAt: new Date() },
  ])("rejects malformed or over-broad status patches", (patch) => {
    expect(validateSOSStatusUpdatePatch(patch)).toBe(false);
  });
});


describe("validateUserProfilePatch", () => {
  it("accepts supported profile fields with valid values", () => {
    expect(validateUserProfilePatch({
      displayName: "Rider",
      city: "İzmir",
      motorcycle: "Honda",
      photoURL: "https://example.test/photo.jpg",
      bio: "Weekend rider",
      privacyLocation: true,
      contacts: [{ name: "Yakın", phone: "05550000000" }],
    })).toBeNull();
  });

  it("accepts partial profile preference updates", () => {
    expect(validateUserProfilePatch({ privacyLocation: false })).toBeNull();
  });

  it.each([
    null,
    undefined,
    "profile",
    [],
    {},
    { uid: "other-user" },
    { email: "attacker@example.test" },
    { points: 999999 },
    { helpCount: 999999 },
    { badges: ["admin"] },
    { updatedAt: new Date() },
    { displayName: "x".repeat(81) },
    { city: "x".repeat(101) },
    { motorcycle: "x".repeat(101) },
    { photoURL: "x".repeat(2049) },
    { bio: "x".repeat(501) },
    { privacyLocation: "true" },
    { contacts: "not-an-array" },
    { contacts: Array.from({ length: 11 }, () => ({ name: "A", phone: "1" })) },
    { contacts: [{ name: "A", phone: "1", email: "private@example.test" }] },
    { contacts: [{ name: 42, phone: "1" }] },
    { contacts: [{ name: "A", phone: "x".repeat(41) }] },
  ])("rejects unsupported or malformed profile patch: %s", (patch) => {
    expect(validateUserProfilePatch(patch)).not.toBeNull();
  });
});

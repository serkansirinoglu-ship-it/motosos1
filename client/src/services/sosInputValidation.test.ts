import { describe, expect, it } from "vitest";
import { validateSOSRequestInput, validateSOSStatusUpdatePatch, validateUserProfilePatch, validateUserProfileCreation, validateProductInput, validateProductPatch, validateBannerInput, validateBannerPatch, validateAdminDocumentId } from "./sosInputValidation";

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

  it("accepts empty photo URLs and absolute HTTP(S) profile photo URLs", () => {
    expect(validateUserProfilePatch({ photoURL: "" })).toBeNull();
    expect(validateUserProfilePatch({ photoURL: "https://example.test/photo.jpg" })).toBeNull();
    expect(validateUserProfilePatch({ photoURL: "http://example.test/photo.jpg" })).toBeNull();
  });

  it.each([
    "javascript:alert(1)",
    "data:image/svg+xml,<svg/>",
    "file:///etc/passwd",
    "//example.test/photo.jpg",
    "not a URL",
    "https://",
  ])("rejects a non-HTTP(S) or malformed profile photo URL: %s", (photoURL) => {
    expect(validateUserProfilePatch({ photoURL })).toBe("invalid_photo_url");
  });

  it("accepts a bio at the UI limit and rejects a bio over 280 characters", () => {
    expect(validateUserProfilePatch({ bio: "x".repeat(280) })).toBeNull();
    expect(validateUserProfilePatch({ bio: "x".repeat(281) })).toBe("invalid_bio");
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


describe("validateUserProfileCreation", () => {
  const identity = {
    uid: "rider-uid",
    email: "rider@example.test",
    authenticatedUid: "rider-uid",
    authenticatedEmail: "rider@example.test",
  };

  it("accepts a matching authenticated identity and bounded public fields", () => {
    expect(validateUserProfileCreation(
      identity.uid, identity.email, { displayName: "Rider", city: "İzmir" },
      identity.authenticatedUid, identity.authenticatedEmail,
    )).toBeNull();
  });

  it("validates photo URLs and bio limits during profile creation too", () => {
    expect(validateUserProfileCreation(
      identity.uid, identity.email,
      { photoURL: "https://example.test/avatar.png", bio: "x".repeat(280) },
      identity.authenticatedUid, identity.authenticatedEmail,
    )).toBeNull();
    expect(validateUserProfileCreation(
      identity.uid, identity.email,
      { photoURL: "javascript:alert(1)" },
      identity.authenticatedUid, identity.authenticatedEmail,
    )).toBe("invalid_photo_url");
    expect(validateUserProfileCreation(
      identity.uid, identity.email,
      { bio: "x".repeat(281) },
      identity.authenticatedUid, identity.authenticatedEmail,
    )).toBe("invalid_bio");
  });

  it("rejects unauthenticated or mismatched UID/email values", () => {
    expect(validateUserProfileCreation(identity.uid, identity.email, {}, null, identity.authenticatedEmail)).toBe("invalid_identity");
    expect(validateUserProfileCreation("another-user", identity.email, {}, identity.authenticatedUid, identity.authenticatedEmail)).toBe("invalid_identity");
    expect(validateUserProfileCreation(identity.uid, "attacker@example.test", {}, identity.authenticatedUid, identity.authenticatedEmail)).toBe("invalid_email");
  });

  it("rejects protected fields and malformed profile values before document creation", () => {
    expect(validateUserProfileCreation(identity.uid, identity.email, { points: 999 }, identity.authenticatedUid, identity.authenticatedEmail)).toBe("invalid_extra");
    expect(validateUserProfileCreation(identity.uid, identity.email, { uid: "attacker" }, identity.authenticatedUid, identity.authenticatedEmail)).toBe("invalid_extra");
    expect(validateUserProfileCreation(identity.uid, identity.email, { displayName: "x".repeat(81) }, identity.authenticatedUid, identity.authenticatedEmail)).toBe("invalid_display_name");
    expect(validateUserProfileCreation(identity.uid, identity.email, null, identity.authenticatedUid, identity.authenticatedEmail)).toBe("invalid_extra");
  });
});


describe("admin product and banner input validation", () => {
  it("accepts bounded product and banner payloads", () => {
    expect(validateProductInput({ name: "Helmet", price: 100, stock: 2, image: "", description: "Safe gear" })).toBe(true);
    expect(validateBannerInput({ title: "Campaign", active: true, image: "", link: "https://example.test" })).toBe(true);
  });

  it.each([
    null, [], { name: "Helmet", price: Number.NaN, stock: 1 },
    { name: "Helmet", price: -1, stock: 1 }, { name: "Helmet", price: 1, stock: -1 },
    { name: "Helmet", price: 1, stock: 1.5 }, { name: " ", price: 1, stock: 1 },
    { name: "x".repeat(121), price: 1, stock: 1 }, { name: "Helmet", price: 1, stock: 1, isAdmin: true },
    { name: "Helmet", price: 1, stock: 1, description: "x".repeat(2001) },
  ])("rejects invalid product payloads: %s", (value) => {
    expect(validateProductInput(value)).toBe(false);
  });

  it.each([
    null, [], { title: "Campaign" }, { title: " ", active: true },
    { title: "x".repeat(121), active: true }, { title: "Campaign", active: "true" },
    { title: "Campaign", active: true, createdAt: new Date() },
    { title: "Campaign", active: true, link: "x".repeat(2049) },
  ])("rejects invalid banner payloads: %s", (value) => {
    expect(validateBannerInput(value)).toBe(false);
  });

  it("rejects invalid IDs and protected or empty patches", () => {
    expect(validateProductPatch("../other", { name: "Helmet" })).toBe(false);
    expect(validateProductPatch("product-1", {})).toBe(false);
    expect(validateProductPatch("product-1", { id: "other" })).toBe(false);
    expect(validateBannerPatch("banner/other", { title: "Campaign" })).toBe(false);
    expect(validateBannerPatch("banner-1", { createdAt: new Date() })).toBe(false);
    expect(validateBannerPatch("banner-1", { active: false })).toBe(true);
  });

  it("validates document IDs before delete operations", () => {
    expect(validateAdminDocumentId("product-1")).toBe(true);
    expect(validateAdminDocumentId("")).toBe(false);
    expect(validateAdminDocumentId("nested/id")).toBe(false);
  });
});

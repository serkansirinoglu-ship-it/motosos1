import { describe, expect, it } from "vitest";
import { validateSOSRequestInput } from "./sosInputValidation";

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

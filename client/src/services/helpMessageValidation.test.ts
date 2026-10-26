import { describe, expect, it } from "vitest";
import { validateHelpMessageInput, validateHelpRequestInput } from "./helpMessageValidation";

const valid = { requestId: "request-1", text: "  Yardım edebilirim  ", from: "rider-uid", fromName: "Sürücü" };

describe("validateHelpMessageInput", () => {
  it("accepts a valid message and leaves trimming to the caller", () => {
    expect(validateHelpMessageInput(valid)).toBeNull();
  });

  it.each(["", "   ", null, 42])("rejects empty or non-text message bodies: %s", (text) => {
    expect(validateHelpMessageInput({ ...valid, text })).toBe("invalid_text");
  });

  it("rejects messages longer than the Firestore rule limit", () => {
    expect(validateHelpMessageInput({ ...valid, text: "x".repeat(2001) })).toBe("text_too_long");
    expect(validateHelpMessageInput({ ...valid, text: "x".repeat(2000) })).toBeNull();
  });

  it.each(["", "   ", null, 42])("rejects missing sender identity: %s", (from) => {
    expect(validateHelpMessageInput({ ...valid, from })).toBe("invalid_sender");
  });

  it("rejects missing/overlong request IDs and overlong display names", () => {
    expect(validateHelpMessageInput({ ...valid, requestId: "" })).toBe("invalid_request_id");
    expect(validateHelpMessageInput({ ...valid, requestId: "x".repeat(129) })).toBe("invalid_request_id");
    expect(validateHelpMessageInput({ ...valid, fromName: "x".repeat(81) })).toBe("sender_name_too_long");
  });
});


describe("validateHelpRequestInput", () => {
  const validRequest = {
    id: "request-1",
    ownerId: "rider-uid",
    title: "Yol yardımı",
    description: "Lastik sorunu",
    lat: 38.4,
    lng: 27.1,
  };

  it("accepts an owner-matched request with valid optional coordinates", () => {
    expect(validateHelpRequestInput(validRequest, "rider-uid")).toBeNull();
  });

  it("rejects missing authentication and owner spoofing", () => {
    expect(validateHelpRequestInput(validRequest, null)).toBe("invalid_owner");
    expect(validateHelpRequestInput({ ...validRequest, ownerId: "another-user" }, "rider-uid")).toBe("invalid_owner");
  });

  it("rejects invalid IDs, titles, and oversized descriptions", () => {
    expect(validateHelpRequestInput({ ...validRequest, id: "bad/id" }, "rider-uid")).toBe("invalid_request_id");
    expect(validateHelpRequestInput({ ...validRequest, title: " " }, "rider-uid")).toBe("invalid_title");
    expect(validateHelpRequestInput({ ...validRequest, title: "x".repeat(121) }, "rider-uid")).toBe("invalid_title");
    expect(validateHelpRequestInput({ ...validRequest, description: "x".repeat(2001) }, "rider-uid")).toBe("invalid_description");
  });

  it("requires paired, finite coordinates within geographic bounds", () => {
    expect(validateHelpRequestInput({ ...validRequest, lat: 38.4, lng: undefined }, "rider-uid")).toBe("invalid_coordinates");
    expect(validateHelpRequestInput({ ...validRequest, lat: 91 }, "rider-uid")).toBe("invalid_coordinates");
    expect(validateHelpRequestInput({ ...validRequest, lng: Number.NaN }, "rider-uid")).toBe("invalid_coordinates");
  });
});

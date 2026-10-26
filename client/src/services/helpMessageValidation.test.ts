import { describe, expect, it } from "vitest";
import { validateHelpMessageInput } from "./helpMessageValidation";

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

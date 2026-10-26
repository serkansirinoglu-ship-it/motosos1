export type HelpMessageInputError = "invalid_request_id" | "invalid_sender" | "invalid_text" | "text_too_long" | "sender_name_too_long";

export interface HelpMessageInput {
  requestId: unknown;
  text: unknown;
  from: unknown;
  fromName?: unknown;
}

export function validateHelpMessageInput(input: HelpMessageInput): HelpMessageInputError | null {
  if (typeof input.requestId !== "string" || input.requestId.trim().length === 0 || input.requestId.length > 128) {
    return "invalid_request_id";
  }
  if (typeof input.from !== "string" || input.from.trim().length === 0 || input.from.length > 128) {
    return "invalid_sender";
  }
  if (typeof input.text !== "string" || input.text.trim().length === 0) {
    return "invalid_text";
  }
  if (input.text.trim().length > 2000) {
    return "text_too_long";
  }
  if (input.fromName !== undefined && (typeof input.fromName !== "string" || input.fromName.trim().length > 80)) {
    return "sender_name_too_long";
  }
  return null;
}

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


export type HelpRequestInputError =
  | "invalid_request_id"
  | "invalid_owner"
  | "invalid_title"
  | "invalid_description"
  | "invalid_coordinates";

export interface HelpRequestInput {
  id?: unknown;
  ownerId?: unknown;
  title?: unknown;
  description?: unknown;
  lat?: unknown;
  lng?: unknown;
}

/** Validate help-request writes against the authenticated owner and Firestore's public schema. */
export function validateHelpRequestInput(
  input: HelpRequestInput | null | undefined,
  authenticatedUid: unknown,
): HelpRequestInputError | null {
  if (typeof authenticatedUid !== "string" || !authenticatedUid.trim() || authenticatedUid.length > 128) {
    return "invalid_owner";
  }
  if (!input || typeof input !== "object" || input.ownerId !== authenticatedUid) {
    return "invalid_owner";
  }
  if (input.id !== undefined && (
    typeof input.id !== "string" || !input.id.trim() || input.id.length > 128 || input.id.includes("/")
  )) {
    return "invalid_request_id";
  }
  if (typeof input.title !== "string" || !input.title.trim() || input.title.trim().length > 120) {
    return "invalid_title";
  }
  if (typeof input.description !== "string" || input.description.length > 2000) {
    return "invalid_description";
  }
  const hasLat = input.lat !== undefined && input.lat !== null;
  const hasLng = input.lng !== undefined && input.lng !== null;
  if (hasLat !== hasLng || (hasLat && (
    typeof input.lat !== "number" || !Number.isFinite(input.lat) || input.lat < -90 || input.lat > 90 ||
    typeof input.lng !== "number" || !Number.isFinite(input.lng) || input.lng < -180 || input.lng > 180
  ))) {
    return "invalid_coordinates";
  }
  return null;
}


export type HelpRequestUpdatePatchError = "invalid_request_id" | "unauthenticated" | "invalid_patch";

export function validateHelpRequestUpdatePatch(
  requestId: unknown,
  patch: unknown,
  authenticatedUid: unknown,
): HelpRequestUpdatePatchError | null {
  if (typeof requestId !== "string" || !requestId.trim() || requestId.length > 128 || requestId.includes("/")) {
    return "invalid_request_id";
  }
  if (typeof authenticatedUid !== "string" || !authenticatedUid.trim() || authenticatedUid.length > 128) {
    return "unauthenticated";
  }
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return "invalid_patch";
  const candidate = patch as Record<string, unknown>;
  const keys = Object.keys(candidate);
  if (keys.length === 1 && keys[0] === "helpers") {
    const helpers = candidate.helpers;
    if (!Array.isArray(helpers) || helpers.length > 100 ||
      !helpers.every((uid) => typeof uid === "string" && uid.trim().length > 0 && uid.length <= 128) ||
      new Set(helpers).size !== helpers.length ||
      !helpers.includes(authenticatedUid)) return "invalid_patch";
    return null;
  }
  if (
    keys.length === 3 &&
    keys.every((key) => ["resolvedBy", "resolvedAt", "active"].includes(key)) &&
    candidate.resolvedBy === authenticatedUid &&
    typeof candidate.resolvedAt === "number" &&
    Number.isFinite(candidate.resolvedAt) &&
    candidate.active === false
  ) return null;
  return "invalid_patch";
}

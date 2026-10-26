export const SOS_HELP_TYPES = ["lastik", "aku", "yakit", "ariza", "kaza", "cekici", "diger"] as const;

export interface SOSRequestInput {
  requesterId?: unknown;
  requesterEmail?: unknown;
  helpType?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  note?: unknown;
}

export type SOSInputError = "unauthenticated" | "requester_mismatch" | "invalid_help_type" | "invalid_coordinates" | "invalid_note";

export function validateSOSRequestInput(
  authenticatedUid: string | null | undefined,
  data: SOSRequestInput,
): SOSInputError | null {
  if (!authenticatedUid) return "unauthenticated";
  if (typeof data.requesterId !== "string" || data.requesterId !== authenticatedUid) {
    return "requester_mismatch";
  }
  if (typeof data.helpType !== "string" || !SOS_HELP_TYPES.includes(data.helpType as typeof SOS_HELP_TYPES[number])) {
    return "invalid_help_type";
  }
  if (
    typeof data.latitude !== "number" ||
    !Number.isFinite(data.latitude) ||
    data.latitude < -90 ||
    data.latitude > 90 ||
    typeof data.longitude !== "number" ||
    !Number.isFinite(data.longitude) ||
    data.longitude < -180 ||
    data.longitude > 180
  ) {
    return "invalid_coordinates";
  }
  if (data.note !== undefined && (typeof data.note !== "string" || data.note.length > 1000)) {
    return "invalid_note";
  }
  return null;
}

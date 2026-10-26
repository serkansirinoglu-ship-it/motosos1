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

export type SOSStatusUpdate = { status: "resolved" | "cancelled" };

export function validateSOSStatusUpdatePatch(patch: unknown): patch is SOSStatusUpdate {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return false;
  const candidate = patch as Record<string, unknown>;
  const keys = Object.keys(candidate);
  return keys.length === 1 &&
    keys[0] === "status" &&
    (candidate.status === "resolved" || candidate.status === "cancelled");
}


export type UserProfilePatchError =
  | "invalid_patch"
  | "unsupported_field"
  | "invalid_display_name"
  | "invalid_city"
  | "invalid_motorcycle"
  | "invalid_photo_url"
  | "invalid_bio"
  | "invalid_privacy_location"
  | "invalid_contacts";

const USER_PROFILE_FIELDS = [
  "displayName", "city", "motorcycle", "photoURL", "bio", "privacyLocation", "contacts",
] as const;

/** Defense-in-depth allowlist matching the profile fields editable under Firestore rules. */
export function validateUserProfilePatch(patch: unknown): UserProfilePatchError | null {
  if (!patch || typeof patch !== "object" || Array.isArray(patch)) return "invalid_patch";
  const candidate = patch as Record<string, unknown>;
  const keys = Object.keys(candidate);
  if (keys.length === 0) return "invalid_patch";
  if (keys.some((key) => !(USER_PROFILE_FIELDS as readonly string[]).includes(key))) return "unsupported_field";

  if ("displayName" in candidate && (typeof candidate.displayName !== "string" || candidate.displayName.length > 80)) return "invalid_display_name";
  if ("city" in candidate && (typeof candidate.city !== "string" || candidate.city.length > 100)) return "invalid_city";
  if ("motorcycle" in candidate && (typeof candidate.motorcycle !== "string" || candidate.motorcycle.length > 100)) return "invalid_motorcycle";
  if ("photoURL" in candidate && (typeof candidate.photoURL !== "string" || candidate.photoURL.length > 2048)) return "invalid_photo_url";
  if ("bio" in candidate && (typeof candidate.bio !== "string" || candidate.bio.length > 500)) return "invalid_bio";
  if ("privacyLocation" in candidate && typeof candidate.privacyLocation !== "boolean") return "invalid_privacy_location";
  if ("contacts" in candidate) {
    if (!Array.isArray(candidate.contacts) || candidate.contacts.length > 10) return "invalid_contacts";
    const validContacts = candidate.contacts.every((contact) => {
      if (!contact || typeof contact !== "object" || Array.isArray(contact)) return false;
      const item = contact as Record<string, unknown>;
      return Object.keys(item).every((key) => key === "name" || key === "phone") &&
        typeof item.name === "string" && item.name.length <= 80 &&
        typeof item.phone === "string" && item.phone.length <= 40;
    });
    if (!validContacts) return "invalid_contacts";
  }
  return null;
}

/**
 * Return true only while the Firebase auth session still belongs to the user
 * who initiated an asynchronous SOS write.
 */
export function isCurrentSOSAuthSession(
  authenticatedUid: string | null | undefined,
  currentUid: string | null | undefined,
): boolean {
  return typeof authenticatedUid === "string" &&
    authenticatedUid.length > 0 &&
    authenticatedUid === currentUid;
}

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

/** Empty profile photos are allowed; non-empty values must be absolute HTTP(S) URLs. */
function isValidProfilePhotoURL(value: unknown): boolean {
  if (typeof value !== "string" || value.length > 2048) return false;
  if (value === "") return true;
  try {
    const parsed = new URL(value);
    return (parsed.protocol === "https:" || parsed.protocol === "http:") && Boolean(parsed.hostname);
  } catch {
    return false;
  }
}

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
  if ("photoURL" in candidate && (!isValidProfilePhotoURL(candidate.photoURL))) return "invalid_photo_url";
  if ("bio" in candidate && (typeof candidate.bio !== "string" || candidate.bio.length > 280)) return "invalid_bio";
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


export type UserProfileCreationError =
  | "invalid_identity"
  | "invalid_email"
  | "invalid_extra"
  | "invalid_display_name"
  | "invalid_city"
  | "invalid_motorcycle"
  | "invalid_photo_url"
  | "invalid_bio";

const USER_PROFILE_CREATION_FIELDS = ["displayName", "city", "motorcycle", "photoURL", "bio"] as const;

/** Validate profile creation inputs against the current Firebase identity and public profile schema. */
export function validateUserProfileCreation(
  uid: unknown,
  email: unknown,
  extra: unknown,
  authenticatedUid: unknown,
  authenticatedEmail: unknown,
): UserProfileCreationError | null {
  if (typeof uid !== "string" || !uid.trim() || uid.length > 128 ||
      typeof authenticatedUid !== "string" || uid !== authenticatedUid) return "invalid_identity";
  if (typeof email !== "string" || !email.trim() ||
      typeof authenticatedEmail !== "string" || email !== authenticatedEmail) return "invalid_email";
  if (!extra || typeof extra !== "object" || Array.isArray(extra)) return "invalid_extra";
  const candidate = extra as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => !(USER_PROFILE_CREATION_FIELDS as readonly string[]).includes(key))) return "invalid_extra";
  if ("displayName" in candidate && (typeof candidate.displayName !== "string" || candidate.displayName.length > 80)) return "invalid_display_name";
  if ("city" in candidate && (typeof candidate.city !== "string" || candidate.city.length > 100)) return "invalid_city";
  if ("motorcycle" in candidate && (typeof candidate.motorcycle !== "string" || candidate.motorcycle.length > 100)) return "invalid_motorcycle";
  if ("photoURL" in candidate && (!isValidProfilePhotoURL(candidate.photoURL))) return "invalid_photo_url";
  if ("bio" in candidate && (typeof candidate.bio !== "string" || candidate.bio.length > 280)) return "invalid_bio";
  return null;
}


const PRODUCT_FIELDS = ["name", "price", "stock", "image", "description"] as const;
const BANNER_FIELDS = ["title", "image", "link", "active"] as const;

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function hasOnlyFields(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const keys = Object.keys(value);
  return keys.length > 0 && keys.every((key) => (allowed as readonly string[]).includes(key));
}

function validOptionalText(value: unknown, maxLength: number): boolean {
  return value === undefined || (typeof value === "string" && value.length <= maxLength);
}

function validProductFields(value: Record<string, unknown>, requireAll: boolean): boolean {
  if (!hasOnlyFields(value, PRODUCT_FIELDS)) return false;
  if (requireAll && (!("name" in value) || !("price" in value) || !("stock" in value))) return false;
  if ("name" in value && (typeof value.name !== "string" || !value.name.trim() || value.name.length > 120)) return false;
  if ("price" in value && (typeof value.price !== "number" || !Number.isFinite(value.price) || value.price < 0)) return false;
  if ("stock" in value && (typeof value.stock !== "number" || !Number.isInteger(value.stock) || value.stock < 0)) return false;
  if ("image" in value && !validOptionalText(value.image, 2048)) return false;
  if ("description" in value && !validOptionalText(value.description, 2000)) return false;
  return true;
}

function validBannerFields(value: Record<string, unknown>, requireAll: boolean): boolean {
  if (!hasOnlyFields(value, BANNER_FIELDS)) return false;
  if (requireAll && (!("title" in value) || !("active" in value))) return false;
  if ("title" in value && (typeof value.title !== "string" || !value.title.trim() || value.title.length > 120)) return false;
  if ("image" in value && !validOptionalText(value.image, 2048)) return false;
  if ("link" in value && !validOptionalText(value.link, 2048)) return false;
  if ("active" in value && typeof value.active !== "boolean") return false;
  return true;
}

export function validateProductInput(value: unknown): boolean {
  return isPlainRecord(value) && validProductFields(value, true);
}

export function validateProductPatch(id: unknown, patch: unknown): boolean {
  return typeof id === "string" && id.length > 0 && id.length <= 128 && !id.includes("/") &&
    isPlainRecord(patch) && validProductFields(patch, false);
}

export function validateBannerInput(value: unknown): boolean {
  return isPlainRecord(value) && validBannerFields(value, true);
}

export function validateBannerPatch(id: unknown, patch: unknown): boolean {
  return typeof id === "string" && id.length > 0 && id.length <= 128 && !id.includes("/") &&
    isPlainRecord(patch) && validBannerFields(patch, false);
}

export function validateAdminDocumentId(id: unknown): boolean {
  return typeof id === "string" && id.length > 0 && id.length <= 128 && !id.includes("/");
}

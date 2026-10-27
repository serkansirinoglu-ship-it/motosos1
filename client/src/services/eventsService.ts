import { getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { addDoc, collection, deleteDoc, doc, getFirestore, onSnapshot, orderBy, query, serverTimestamp, type Timestamp } from "firebase/firestore";

const app = getApps()[0];
const db = app ? getFirestore(app) : null;

export interface MotoGuardEvent {
  id: string;
  organizerId: string;
  title: string;
  description: string;
  city: string;
  location: string;
  startsAt: string;
  endsAt: string;
  image?: string;
  createdAt: string;
}

function displayDate(value: unknown): string {
  if (value && typeof value === "object" && "toDate" in value && typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate().toLocaleString("tr-TR");
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("tr-TR");
  }
  return "";
}

export function subscribeMotoGuardEvents(
  onEvents: (events: MotoGuardEvent[]) => void,
  onError: (error: unknown) => void,
): () => void {
  if (!db) throw new Error("Firebase yapılandırılmamış; etkinlikler sunucudan alınamıyor.");
  const eventsQuery = query(collection(db, "events"), orderBy("createdAt", "desc"));
  return onSnapshot(eventsQuery, (snapshot) => {
    const events = snapshot.docs.map((item) => {
      const data = item.data();
      return {
        id: item.id,
        organizerId: String(data.organizerId || ""),
        title: String(data.title || ""),
        description: String(data.description || ""),
        city: String(data.city || ""),
        location: String(data.location || ""),
        startsAt: displayDate(data.startsAt),
        endsAt: displayDate(data.endsAt),
        image: typeof data.image === "string" ? data.image : undefined,
        createdAt: displayDate(data.createdAt),
      } satisfies MotoGuardEvent;
    });
    onEvents(events);
  }, onError);
}


export interface NewMotoGuardEvent {
  title: string;
  description: string;
  city: string;
  location: string;
  startsAt: string;
  endsAt: string;
  image?: string;
}

export async function createMotoGuardEvent(input: NewMotoGuardEvent): Promise<string | null> {
  if (!db || !app) return null;
  const auth = getAuth(app);
  const user = auth.currentUser;
  if (!user) return null;
  const token = await user.getIdTokenResult(true);
  if (token.claims.admin !== true) return null;
  const title = input.title.trim();
  const description = input.description.trim();
  const city = input.city.trim();
  const location = input.location.trim();
  const startsAt = input.startsAt.trim();
  const endsAt = input.endsAt.trim();
  const image = input.image?.trim();
  const validDate = (value: string) => value !== "" && !Number.isNaN(Date.parse(value));
  if (!title || title.length > 160 || description.length > 3000 || city.length > 100 ||
      location.length > 300 || !validDate(startsAt) || !validDate(endsAt) ||
      Date.parse(endsAt) < Date.parse(startsAt) ||
      (image && (image.length > 2048 || !/^https?:\/\//i.test(image)))) return null;
  const ref = await addDoc(collection(db, "events"), {
    organizerId: user.uid, title, description, city, location, startsAt, endsAt,
    ...(image ? { image } : {}), createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteMotoGuardEvent(eventId: string): Promise<boolean> {
  if (!db || !app || !eventId || eventId.includes("/") || eventId.length > 128) return false;
  const auth = getAuth(app);
  const user = auth.currentUser;
  if (!user) return false;
  const token = await user.getIdTokenResult(true);
  if (token.claims.admin !== true) return false;
  await deleteDoc(doc(db, "events", eventId));
  return true;
}

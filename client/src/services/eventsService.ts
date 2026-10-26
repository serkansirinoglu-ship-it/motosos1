import { getApps } from "firebase/app";
import { collection, getFirestore, onSnapshot, orderBy, query, type Timestamp } from "firebase/firestore";

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

import { useEffect, useState } from "react";
import { MapPin, AlertCircle, CalendarDays, Clock, WifiOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { subscribeMotoGuardEvents, type MotoGuardEvent } from "@/services/eventsService";

/**
 * Events are read from Firestore. Creation and editing stay unavailable in this UI
 * because the current product policy requires admin-only event management.
 */
export default function EventsPage() {
  const [events, setEvents] = useState<MotoGuardEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let unsubscribe = () => {};
    try {
      unsubscribe = subscribeMotoGuardEvents(
        (nextEvents) => {
          setEvents(nextEvents);
          setLoading(false);
          setLoadError(false);
        },
        (error) => {
          console.error("Events subscription failed", error);
          setEvents([]);
          setLoading(false);
          setLoadError(true);
        },
      );
    } catch (error) {
      console.error("Events feed unavailable", error);
      setEvents([]);
      setLoading(false);
      setLoadError(true);
    }
    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen bg-asphalt-light page-surface-light pb-8">
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border">
        <div className="px-4 h-14 flex items-center justify-between">
          <h1 className="font-display text-lg font-bold text-white uppercase tracking-wider">Etkinlikler</h1>
        </div>
      </header>

      <div className="px-4 pt-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">Yakındaki Etkinlikler</h2>
        </div>

        <Card className="bg-amber-500/10 border-amber-500/30 p-3 rounded-xl mb-3">
          <p className="text-[11px] text-amber-200 leading-relaxed">
            Etkinlikler sunucudan okunur. Etkinlik oluşturma ve düzenleme yalnızca yönetici panelinden yapılır; kullanıcılar burada yayınlanan etkinlikleri görüntüler.
          </p>
        </Card>

        {loading ? (
          <Card className="bg-card-gradient border-border p-6 text-center rounded-xl">
            <p className="text-sm text-muted-foreground">Etkinlikler sunucudan yükleniyor…</p>
          </Card>
        ) : loadError ? (
          <Card className="bg-card-gradient border-border p-6 flex flex-col items-center text-center rounded-xl">
            <WifiOff className="w-8 h-8 text-amber-400 mb-2" />
            <p className="text-sm font-bold text-foreground">Etkinlikler yüklenemedi.</p>
            <p className="text-xs text-muted-foreground mt-1">Bağlantıyı veya Firebase erişim izinlerini kontrol edin.</p>
          </Card>
        ) : events.length === 0 ? (
          <Card className="bg-card-gradient border-border p-6 flex flex-col items-center text-center rounded-xl">
            <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
            <p className="text-sm font-bold text-foreground">Henüz etkinlik yok.</p>
            <p className="text-xs text-muted-foreground mt-1">Yeni etkinlikler yayınlandığında burada görünecek.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {events.map((event) => (
              <Card key={event.id} className="bg-card-gradient border-border p-4 rounded-xl space-y-2">
                {event.image && <img src={event.image} alt={event.title} className="w-full max-h-56 object-cover rounded-lg border border-border" />}
                <h3 className="font-bold text-white text-sm">{event.title}</h3>
                {(event.city || event.location) && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="w-3.5 h-3.5 text-primary" /> {[event.city, event.location].filter(Boolean).join(" · ")}
                  </p>
                )}
                {event.startsAt && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CalendarDays className="w-3.5 h-3.5 text-primary" /> {event.startsAt}
                  </p>
                )}
                {event.endsAt && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 text-primary" /> Bitiş: {event.endsAt}
                  </p>
                )}
                {event.description && <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{event.description}</p>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

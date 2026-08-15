import { MapPin, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * Design: Asphalt & Steel
 * Etkinlikler — toplu sürüşler, şehir buluşmaları
 * Gerçek etkinlik verisi backend'den gelmediği sürece sahte veri gösterilmez.
 */
export default function EventsPage() {
  return (
    <div className="min-h-screen bg-asphalt">
      <header className="sticky top-0 z-40 bg-card/90 backdrop-blur-xl border-b border-border">
        <div className="px-4 h-14 flex items-center justify-between">
          <h1 className="font-display text-lg font-bold text-white uppercase tracking-wider">
            Etkinlikler
          </h1>
        </div>
      </header>

      <div className="px-4 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <MapPin className="w-4 h-4 text-primary" />
          <h2 className="font-display text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Yakındaki Etkinlikler
          </h2>
        </div>

        <Card className="bg-card-gradient border-border p-6 flex flex-col items-center justify-center text-center">
          <AlertCircle className="w-8 h-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            Henüz etkinlik bulunmuyor. Etkinlik düzenleme özelliği yakında aktif olacak.
          </p>
        </Card>
      </div>
    </div>
  );
}
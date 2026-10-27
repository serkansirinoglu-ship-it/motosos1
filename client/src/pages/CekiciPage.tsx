import { useState, useEffect } from "react";
import { Truck, MapPin, Phone, ExternalLink, Star, ShieldCheck, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import Header from "@/components/Header";
import TURKEY_PROVINCES from "@/lib/turkeyProvinces";
import { businessService, BusinessProfile } from "@/services/businessService";
import { makeDirectionsUrl } from "@/lib/places";

export default function CekiciPage() {
  const [selectedCity, setSelectedCity] = useState<string>("Tümü");
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    const unsubscribeBusinesses = businessService.subscribe(
      () => setBusinesses(businessService.getBusinesses("cekici", selectedCity === "Tümü" ? undefined : selectedCity)),
      (error) => console.warn("Business directory subscription failed", error),
    );

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { timeout: 5000 }
      );
    }
    return () => unsubscribeBusinesses();
  }, [selectedCity]);

  return (
    <div className="min-h-screen bg-asphalt-light pb-8 page-surface-light">
      <Header />

      <div className="px-4 pt-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center font-bold">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-foreground uppercase tracking-wider">
              7/24 Çekici Desteği
            </h1>
            <p className="text-xs text-muted-foreground">Motosiklet taşımaya özel aparata sahip oto kurtarma ekibi</p>
          </div>
        </div>

        {/* City Filter */}
        <div className="mt-4">
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="w-full bg-card-gradient border border-border rounded-xl p-3 text-xs text-foreground font-semibold focus:outline-none focus:border-primary"
          >
            <option value="Tümü">Tüm Türkiye / Yakınımda Bul</option>
            {TURKEY_PROVINCES.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Business Directory List */}
        <div className="mt-4 space-y-3">
          {businesses.length > 0 ? (
            businesses.map((biz) => (
              <Card key={biz.id} className="bg-card-gradient border-border p-4 rounded-xl space-y-3 hover:border-primary/40 transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-muted overflow-hidden flex-shrink-0 border border-border">
                      {biz.photo ? (
                        <img src={biz.photo} alt={biz.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-card">
                          <Truck className="w-6 h-6 text-amber-400" />
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white text-sm">{biz.name}</h3>
                        {biz.tier === "sponsored" && (
                          <span className="text-[9px] font-extrabold bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30 uppercase">
                            Sponsorlu Çekici
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{biz.address}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs">
                        <span className="text-amber-400 font-bold flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-amber-400" /> {biz.rating} ({biz.reviewCount})
                        </span>
                        <span className="text-muted-foreground">{biz.workingHours}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {biz.description && (
                  <p className="text-xs text-foreground/80 bg-card p-2.5 rounded-xl border border-border/60 leading-relaxed">
                    {biz.description}
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <a
                    href={`tel:${biz.phone}`}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-green-600/20"
                  >
                    <Phone className="w-3.5 h-3.5" /> 7/24 Çekiciyi Ara
                  </a>

                  <a
                    href={makeDirectionsUrl(position || { lat: biz.lat, lng: biz.lng }, { lat: biz.lat, lng: biz.lng })}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-primary/20"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Yol Tarifi
                  </a>
                </div>
              </Card>
            ))
          ) : (
            <Card className="bg-card-gradient border-border p-8 flex flex-col items-center justify-center text-center rounded-xl">
              <AlertCircle className="w-10 h-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-bold text-foreground">Henüz doğrulanmış çekici kaydı bağlı değil.</p>
              <p className="text-xs text-muted-foreground mt-1">Acil durumda yerel acil yardım hizmetlerine başvurun; burada doğrulanmış bir çekici listesi henüz yok.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

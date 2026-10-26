import { useState, useEffect, useRef } from "react";
import { MapPin, Wrench, Fuel, Bike, Truck, Navigation, AlertCircle, ShoppingBag, ShieldAlert, Phone, ExternalLink, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import Header from "@/components/Header";
import { businessService, BusinessProfile, BusinessCategory } from "@/services/businessService";
import { sosService, SOSRequestItem } from "@/services/sosService";
import { makeDirectionsUrl } from "@/lib/places";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { acceptSOSRequest, subscribeActiveSOSRequests } from "../../../firebase";

export default function MapPage() {
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<BusinessProfile | SOSRequestItem | null>(null);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [activeSOS, setActiveSOS] = useState<SOSRequestItem[]>([]);
  const [acceptingSOSId, setAcceptingSOSId] = useState<string | null>(null);
  const acceptingSOSRef = useRef(false);
  const { user } = useAuth();

  const handleAcceptSOS = async (request: SOSRequestItem) => {
    if (!user?.uid) {
      (window as any).__openAuthModal?.();
      toast.error("SOS çağrısını üstlenmek için giriş yapmalısınız.");
      return;
    }
    if (request.requesterId === user.uid) {
      toast.error("Kendi SOS çağrınızı üstlenemezsiniz.");
      return;
    }
    if (request.acceptedBy) {
      toast.info("Bu çağrı başka bir sürücü tarafından üstlenilmiş.");
      return;
    }

    if (acceptingSOSRef.current) {
      toast.info("Başka bir SOS çağrısı için sunucu onayı bekleniyor.");
      return;
    }

    acceptingSOSRef.current = true;
    setAcceptingSOSId(request.id);
    try {
      const confirmed = await acceptSOSRequest(request.id);
      if (confirmed) {
        toast.success("SOS çağrısını üstlendiniz. Harita sunucu güncellemesini gösterecek.");
        setSelectedPlace(null);
      } else {
        toast.error("SOS çağrısı sunucuda üstlenilemedi. Çağrı kapanmış veya başka biri tarafından alınmış olabilir.");
      }
    } catch (error) {
      console.error("SOS acceptance failed", error);
      toast.error("SOS çağrısı üstlenilemedi. Bağlantınızı kontrol edin.");
    } finally {
      acceptingSOSRef.current = false;
      setAcceptingSOSId(null);
    }
  };

  useEffect(() => {
    setBusinesses(businessService.getBusinesses());
    setActiveSOS(sosService.getActiveRequests());

    // Merge public Firestore SOS updates with this browser's local-only requests.
    // Never fetch or expose the privateDetails subcollection from the public map.
    const unsubscribe = subscribeActiveSOSRequests(
      (documents: any[]) => {
        const remoteRequests: SOSRequestItem[] = documents.map((doc) => {
          const createdAt = doc.createdAt?.toMillis
            ? new Date(doc.createdAt.toMillis()).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
            : typeof doc.createdAt === "string"
              ? doc.createdAt
              : "";
          const categories: Record<string, SOSRequestItem["category"]> = {
            lastik: "lastik", aku: "aku", yakit: "yakit", ariza: "ariza",
            kaza: "kaza", cekici: "cekici", diger: "diger",
          };
          return {
            id: doc.id,
            requesterId: doc.requesterId || "",
            requesterEmail: "",
            requesterName: undefined,
            category: categories[doc.helpType] || "diger",
            latitude: Number(doc.latitude),
            longitude: Number(doc.longitude),
            status: doc.acceptedBy ? "yanit_geliyor" : "bekleniyor",
            helpersCount: doc.acceptedBy ? 1 : 0,
            acceptedBy: doc.acceptedBy || undefined,
            createdAt,
          };
        });
        const localRequests = sosService.getActiveRequests();
        const remoteIds = new Set(remoteRequests.map((request) => request.id));
        setActiveSOS([...localRequests.filter((request) => !remoteIds.has(request.id)), ...remoteRequests]);
      },
      () => {
        // Keep local requests visible if remote discovery is unavailable.
        setActiveSOS(sosService.getActiveRequests());
      }
    );

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => {},
        { enableHighAccuracy: false, timeout: 5000 }
      );
    }

    return () => unsubscribe();
  }, []);

  const locateMe = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: true, timeout: 7000 }
    );
  };

  const filterTabs = [
    { id: "all", label: "Tümü", icon: MapPin },
    { id: "sos", label: "🆘 Yerel Çağrılar", icon: ShieldAlert },
    { id: "usta", label: "🔧 Ustalar", icon: Wrench },
    { id: "cekici", label: "🚚 Çekiciler", icon: Truck },
    { id: "lastikci", label: "🛞 Lastikçiler", icon: Bike },
    { id: "benzinlik", label: "⛽ Benzinlikler", icon: Fuel },
    { id: "magaza", label: "🏪 Mağazalar", icon: ShoppingBag },
  ];

  const filteredBusinesses =
    activeFilter === "all"
      ? businesses
      : activeFilter === "sos"
      ? []
      : businesses.filter((b) => b.category === activeFilter);

  const filteredSOS = activeFilter === "all" || activeFilter === "sos" ? activeSOS : [];

  return (
    <div className="min-h-screen bg-asphalt-light pb-8 page-surface-light">
      <Header />

      <div className="px-4 pt-3 max-w-lg mx-auto">
        <Card className="bg-amber-500/10 border-amber-500/30 p-3 rounded-xl">
          <p className="text-[11px] text-amber-200 leading-relaxed">
            İşletme rehberi henüz doğrulanmış bir veri kaynağına bağlı değil; sahte adres, telefon veya puan gösterilmiyor. Yerel test SOS kayıtları yalnızca bu cihazda görünür.
          </p>
        </Card>
      </div>

      {/* Map Embed & Locate Header */}
      <div className="relative h-72 bg-card-gradient border-b border-border overflow-hidden">
        {position ? (
          <iframe
            title="MotoGuard İnteraktif Harita"
            className="w-full h-full border-0 filter grayscale-[20%] contrast-[110%]"
            src={`https://www.google.com/maps?q=${position.lat},${position.lng}&z=14&output=embed`}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <MapPin className="w-10 h-10 text-primary mb-2 animate-bounce" />
            <p className="text-sm text-foreground font-bold uppercase tracking-wide">Konumunuz Alınmadı</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs">
              Yakınınızdaki usta, çekici ve motorcu kardeşleri görmek için konumunuza izin verin.
            </p>
            <button
              onClick={locateMe}
              className="mt-3 text-xs font-bold bg-primary text-white px-4 py-2 rounded-xl active:scale-95 transition-all shadow-md shadow-primary/30"
            >
              Konumumu Kullan
            </button>
          </div>
        )}

        <div className="absolute top-3 right-3">
          <button
            onClick={locateMe}
            disabled={locating}
            className="flex items-center gap-1.5 text-xs font-bold bg-card/90 backdrop-blur-md text-foreground border border-border px-3 py-2 rounded-xl shadow-lg active:scale-95 transition-all"
          >
            <Navigation className="w-3.5 h-3.5 text-primary" />
            {locating ? "Alınıyor..." : "Konumumu Bul"}
          </button>
        </div>

        <div className="absolute bottom-2 left-2 right-2 bg-card/90 backdrop-blur-md rounded-xl px-3.5 py-2 border border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Bulunan Noktalar: <span className="text-primary font-bold">{filteredBusinesses.length + filteredSOS.length} Hızlı Erişim</span>
          </p>
          <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
            SOS / Harita
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-4 pt-4 max-w-lg mx-auto">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {filterTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                activeFilter === tab.id
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                  : "bg-card-gradient border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Place & SOS List */}
      <div className="px-4 pt-3 space-y-3 max-w-lg mx-auto">
        {/* Active SOS Cards */}
        {filteredSOS.map((sos) => (
          <Card
            key={sos.id}
            onClick={() => setSelectedPlace(sos)}
            className="bg-gradient-to-r from-card via-card to-red-950/20 border-red-500/50 p-4 rounded-xl active:scale-[0.98] transition-all cursor-pointer shadow-lg"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
                  🆘
                </div>
                <div>
                  <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block">ACİL YARDIM ÇAĞRISI</span>
                  <p className="font-bold text-white text-sm uppercase">{sos.category} Talebi</p>
                  <p className="text-[11px] text-muted-foreground">{sos.requesterName || "Motorcu Kardeş"}</p>
                  {sos.id.startsWith("sos-") && (
                    <span className="mt-1 inline-block text-[9px] font-bold text-amber-400">Yalnızca bu cihazda kayıtlı</span>
                  )}
                </div>
              </div>
              <a
                href={makeDirectionsUrl(position || { lat: sos.latitude, lng: sos.longitude }, { lat: sos.latitude, lng: sos.longitude })}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all shadow-md shadow-red-600/30 flex items-center gap-1"
              >
                Yol Tarifi <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </Card>
        ))}

        {/* Business Cards */}
        {filteredBusinesses.length > 0 ? (
          filteredBusinesses.map((biz) => (
            <Card
              key={biz.id}
              onClick={() => setSelectedPlace(biz)}
              className="bg-card-gradient border-border p-4 rounded-xl active:scale-[0.98] transition-all cursor-pointer hover:border-primary/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-muted overflow-hidden flex-shrink-0 border border-border">
                    {biz.photo ? (
                      <img src={biz.photo} alt={biz.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-card">
                        <Wrench className="w-5 h-5 text-primary" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-white text-sm">{biz.name}</p>
                      {biz.tier === "sponsored" && (
                        <span className="text-[9px] font-extrabold bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30 uppercase">
                          Sponsorlu
                        </span>
                      )}
                      {biz.tier === "premium" && (
                        <span className="text-[9px] font-extrabold bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/30 uppercase">
                          Premium
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{biz.address}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs">
                      <span className="text-amber-400 font-bold">⭐ {biz.rating} ({biz.reviewCount})</span>
                      <span className="text-muted-foreground">{biz.workingHours}</span>
                    </div>
                  </div>
                </div>

                <a
                  href={makeDirectionsUrl(position || { lat: biz.lat, lng: biz.lng }, { lat: biz.lat, lng: biz.lng })}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="bg-primary/15 text-primary hover:bg-primary hover:text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all flex items-center gap-1 flex-shrink-0"
                >
                  Yol Tarifi
                </a>
              </div>
            </Card>
          ))
        ) : (
          filteredSOS.length === 0 && (
            <Card className="bg-card-gradient border-border p-8 flex flex-col items-center justify-center text-center rounded-xl">
              <AlertCircle className="w-10 h-10 text-muted-foreground/40 mb-2" />
              <p className="text-sm font-bold text-foreground">Bu kategoride henüz kayıt bulunmuyor.</p>
            </Card>
          )
        )}
      </div>

      {/* Detail Modal when clicked */}
      {selectedPlace && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
          <Card className="w-full max-w-md bg-card-gradient border-border p-5 rounded-2xl shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display font-bold text-white uppercase text-base tracking-wide">
                {"name" in selectedPlace ? selectedPlace.name : "SOS Yardım Talebi"}
              </h3>
              <button onClick={() => setSelectedPlace(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-muted-foreground">
                {"address" in selectedPlace ? selectedPlace.address : `Acil Yardım Konumu: ${selectedPlace.latitude.toFixed(4)}, ${selectedPlace.longitude.toFixed(4)}`}
              </p>

              {"phone" in selectedPlace && (
                <div className="pt-2">
                  <a
                    href={`tel:${selectedPlace.phone}`}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    <Phone className="w-4 h-4" /> Telefon Et: {selectedPlace.phone}
                  </a>
                </div>
              )}

              {!("name" in selectedPlace) &&
                !selectedPlace.id.startsWith("sos-") &&
                selectedPlace.requesterId !== user?.uid &&
                !selectedPlace.acceptedBy && (
                  <button
                    type="button"
                    disabled={acceptingSOSId === selectedPlace.id}
                    onClick={() => void handleAcceptSOS(selectedPlace)}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all mt-2"
                  >
                    {acceptingSOSId === selectedPlace.id ? "Sunucu onayı bekleniyor..." : "🆘 Yardım Çağrısını Üstlen"}
                  </button>
                )}

              <a
                href={makeDirectionsUrl(
                  position || { lat: "lat" in selectedPlace ? selectedPlace.lat : selectedPlace.latitude, lng: "lng" in selectedPlace ? selectedPlace.lng : selectedPlace.longitude },
                  { lat: "lat" in selectedPlace ? selectedPlace.lat : selectedPlace.latitude, lng: "lng" in selectedPlace ? selectedPlace.lng : selectedPlace.longitude }
                )}
                target="_blank"
                rel="noreferrer"
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all mt-2"
              >
                <ExternalLink className="w-4 h-4" /> Navigasyonu Başlat (Google Maps)
              </a>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
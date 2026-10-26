import { useState, useEffect, useRef } from "react";
import { Shield, Wrench, Fuel, Bike, Phone, X, Check, Award, Zap, Truck, HelpCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useMessages } from "@/contexts/MessageContext";
import Header from "@/components/Header";
import EmergencyWarning from "@/components/EmergencyWarning";
import { sosService, SOSHelpCategory, CATEGORY_LABELS, STATUS_LABELS, SOSStatus } from "@/services/sosService";
import { createSOSRequest, updateSOSRequest, subscribeActiveSOSRequests } from "../../../firebase";

export default function SOSPage() {
  const [sosActive, setSosActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SOSHelpCategory | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [sosId, setSosId] = useState<string | null>(null); // Firebase document ID, when persisted
  const [localSosId, setLocalSosId] = useState<string | null>(null);
  const [status, setStatus] = useState<SOSStatus>("bekleniyor");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [finishing, setFinishing] = useState(false);
  const finishingRef = useRef(false);
  const [nearbyServices, setNearbyServices] = useState<Array<{ key: string; label: string; searchUrl: string; directionsUrl: string }>>([]);

  const { user } = useAuth();
  const { createHelpRequest } = useMessages();

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (sosActive) {
      timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [sosActive]);

  // Keep the requester-facing status in sync when another rider accepts the SOS.
  // The subscription returns public active SOS fields only, never private GPS details.
  useEffect(() => {
    if (!sosId) return;
    let active = true;
    const unsubscribe = subscribeActiveSOSRequests(
      (requests: Array<{ id: string; acceptedBy?: string | null }>) => {
        if (!active) return;
        const current = requests.find((request: { id: string; acceptedBy?: string | null }) => request.id === sosId);
        if (!current) return;
        setStatus(current.acceptedBy ? "yanit_geliyor" : "bekleniyor");
      },
      (error: unknown) => {
        if (active) console.warn("Could not refresh active SOS status", error);
      },
    );
    return () => {
      active = false;
      unsubscribe();
    };
  }, [sosId]);

  const handleSOS = async (catOverride?: SOSHelpCategory) => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    const category = catOverride || selectedCategory || "diger";
    setSelectedCategory(category);
    setSubmitting(true);

    if (!navigator.geolocation) {
      toast.error("Konum erişimi tarayıcınız tarafından desteklenmiyor.");
      setSubmitting(false);
      submittingRef.current = false;
      return;
    }

    toast.loading("Konumunuz alınıyor...");

    try {
      navigator.geolocation.getCurrentPosition(
      async (pos) => {
        toast.dismiss();
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition({ lat, lng });

        // Generate nearby search links
        const services = [
          { key: "usta", label: "Motosiklet Ustaları", query: "motosiklet usta tamirci" },
          { key: "cekici", label: "Oto & Moto Çekiciler", query: "çekici oto kurtarma" },
          { key: "lastikci", label: "7/24 Lastikçiler", query: "lastikçi oto lastik" },
          { key: "benzinlik", label: "Benzin İstasyonları", query: "benzinlik akaryakıt" },
        ].map((item) => ({
          key: item.key,
          label: item.label,
          searchUrl: `https://www.google.com/maps/search/${encodeURIComponent(item.query)}/@${lat},${lng},14z`,
          directionsUrl: `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${encodeURIComponent(item.query)}`,
        }));

        setNearbyServices(services);

        // Save local SOS state
        const localReq = sosService.createRequest({
          requesterId: user?.uid || "anon-id",
          requesterEmail: user?.email || "anonim@motoguard.tr",
          requesterName: user?.displayName || user?.email?.split("@")[0] || "Motorcu Kardeş",
          category,
          latitude: lat,
          longitude: lng,
        });

        setLocalSosId(localReq.id);
        setSosId(null);
        setStatus("bekleniyor");
        let firebaseSaved = false;

        // Save to Firebase if online & user logged in
        if (user?.uid) {
          try {
            const res = await createSOSRequest({
              requesterId: user.uid,
              requesterEmail: user.email,
              helpType: category,
              latitude: lat,
              longitude: lng,
            });
            if (res?.id) {
              setSosId(res.id);
              firebaseSaved = true;
            } else if (res?.error === "active_duplicate") {
              // Keep the local UI consistent with the server-side duplicate guard.
              sosService.updateStatus(localReq.id, "iptal_edildi");
              setLocalSosId(null);
              setSosId(null);
              setSubmitting(false);
              submittingRef.current = false;
              toast.error("Zaten aktif bir SOS çağrınız var. Yeni çağrı açmadan önce mevcut çağrınızı kontrol edin.");
              return;
            } else {
              console.warn("SOS was not persisted to Firebase", res?.error || "Firebase unavailable");
            }
          } catch (e) {
            console.error("Firebase SOS save fallback to local mode", e);
          }

          // Do not create a parallel legacy chat request when the authoritative SOS
          // write failed; that could make a local-only SOS look like a shared request.
          if (firebaseSaved) {
            // The authoritative SOS is already saved. A legacy chat-sync failure
            // must not block the active SOS UI or create an unhandled rejection.
            try {
              void Promise.resolve(createHelpRequest({
                title: `Acil Yardım - ${CATEGORY_LABELS[category].label}`,
                description: "Acil yardım talebi. Kesin konum yalnızca yetkili katılımcılarla paylaşılır.",
                ownerId: user.uid,
              })).catch((error) => {
                console.warn("Legacy SOS chat sync failed; authoritative SOS remains saved", error);
              });
            } catch (error) {
              console.warn("Legacy SOS chat sync could not be started; authoritative SOS remains saved", error);
            }
          }
        }

        setSosActive(true);
        setSubmitting(false);
        submittingRef.current = false;
        toast.success(
          firebaseSaved
            ? "SOS talebiniz kaydedildi. Yakındaki motorculara otomatik bildirim gönderildiği henüz doğrulanamıyor."
            : "SOS talebiniz bu oturumda yerel olarak oluşturuldu; sunucuya kaydedildiği doğrulanamadı."
        );
      },
      (err) => {
        toast.dismiss();
        console.error("GPS error", err);
        const message = err.code === 1
          ? "Konum izni reddedildi. Tarayıcı veya cihaz ayarlarından konum iznini açın."
          : err.code === 2
            ? "Cihaz konumu belirleyemedi. GPS'i açıp daha iyi sinyal olan bir yerde yeniden deneyin."
            : err.code === 3
              ? "Konum isteği zaman aşımına uğradı. GPS bağlantısını kontrol edip yeniden deneyin."
              : "Konum alınamadı. GPS iznini ve cihaz ayarlarını kontrol edin.";
        toast.error(message);
        setSubmitting(false);
        submittingRef.current = false;
      },
      { enableHighAccuracy: true, timeout: 10000 }
      );
    } catch (error) {
      toast.dismiss();
      console.error("GPS request could not be started", error);
      toast.error("Konum isteği başlatılamadı. Konum iznini ve tarayıcı ayarlarını kontrol edin.");
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const handleCancel = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setFinishing(true);
    if (sosId) {
      let remoteUpdated = false;
      try {
        remoteUpdated = (await updateSOSRequest(sosId, { status: "cancelled" })) === true;
      } catch (error) {
        console.error("Firebase SOS cancellation failed", error);
      }
      if (!remoteUpdated) {
        toast.error("Sunucu çağrısı iptal edilemedi. Çağrı aktif tutuldu; bağlantınızı kontrol edip yeniden deneyin.");
        finishingRef.current = false;
        setFinishing(false);
        return;
      }
    }

    if (localSosId) sosService.updateStatus(localSosId, "iptal_edildi");
    setSosActive(false);
    setSosId(null);
    setLocalSosId(null);
    setElapsed(0);
    setSelectedCategory(null);
    finishingRef.current = false;
    setFinishing(false);
    toast.info(sosId ? "Yardım çağrısı sunucuda iptal edildi." : "Yerel yardım çağrısı iptal edildi; sunucu kaydı doğrulanmadı.");
  };

  const handleResolve = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    setFinishing(true);
    if (sosId) {
      let remoteUpdated = false;
      try {
        remoteUpdated = (await updateSOSRequest(sosId, { status: "resolved" })) === true;
      } catch (error) {
        console.error("Firebase SOS completion failed", error);
      }
      if (!remoteUpdated) {
        toast.error("Sunucu çağrısı tamamlandı olarak işaretlenemedi. Çağrı aktif tutuldu; bağlantınızı kontrol edip yeniden deneyin.");
        finishingRef.current = false;
        setFinishing(false);
        return;
      }
    }

    if (localSosId) sosService.updateStatus(localSosId, "tamamlandi");
    setSosActive(false);
    setSosId(null);
    setLocalSosId(null);
    setElapsed(0);
    setSelectedCategory(null);
    finishingRef.current = false;
    setFinishing(false);
    toast.success(sosId
      ? "Yardım talebiniz sunucuda tamamlandı olarak işaretlendi. Puan ve rozet güncellemesi henüz doğrulanmadı."
      : "Yerel yardım talebiniz tamamlandı; sunucu kaydı doğrulanmadı.");
  };

  if (sosActive) {
    const catInfo = selectedCategory ? CATEGORY_LABELS[selectedCategory] : CATEGORY_LABELS.diger;
    const statusInfo = STATUS_LABELS[status];

    return (
      <div className="min-h-screen bg-asphalt-light pb-8 page-surface-light">
        <Header />
        <div className="px-4 pt-4 max-w-lg mx-auto flex flex-col items-center">
          {/* Status Indicator */}
          <div className="relative w-32 h-32 flex items-center justify-center my-4">
            <div className="absolute inset-0 sos-pulse rounded-full bg-primary/20" />
            <div className="absolute inset-3 rounded-full bg-primary/30 animate-ping" />
            <div className="relative w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-orange-600 flex flex-col items-center justify-center shadow-xl shadow-primary/40">
              <Shield className="w-10 h-10 text-white" />
              <span className="text-[10px] font-bold text-white uppercase tracking-wider mt-0.5">SOS</span>
            </div>
          </div>

          <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border text-xs font-bold uppercase tracking-wider mb-2 ${statusInfo.color}`}>
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            {statusInfo.label}
          </div>

          <h1 className="font-display text-2xl font-extrabold text-foreground uppercase tracking-wide text-center">
            Yardım Çağrınız Aktif
          </h1>
          {!sosId && (
            <p role="status" className="w-full mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
              Bu çağrı yalnızca bu oturumda kayıtlı. Sunucuya kaydedildiği ve diğer sürücülere ulaştığı doğrulanmadı. Acil tehlikede 112’yi arayın.
            </p>
          )}

          <p className="text-muted-foreground mt-1 text-xs font-mono bg-card px-3 py-1 rounded-full border border-border">
            Süre: {String(Math.floor(elapsed / 60)).padStart(2, "0")}:{String(elapsed % 60).padStart(2, "0")}
          </p>

          {/* Call Details Card */}
          <Card className="w-full mt-4 bg-card-gradient border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-primary uppercase tracking-wider block">YOL YARDIM TÜRÜ</span>
                <p className="text-base font-bold text-white">{catInfo.label} ({catInfo.desc})</p>
              </div>
            </div>
          </Card>

          {/* Emergency Disclaimer */}
          <div className="w-full mt-3">
            <EmergencyWarning />
          </div>

          {/* GPS Map View */}
          <Card className="w-full mt-3 bg-card-gradient border-border p-3 overflow-hidden">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Konumunuz & Yakındaki Hizmetler</p>
            {position ? (
              <div className="space-y-3">
                <div className="w-full h-44 rounded-xl overflow-hidden border border-border">
                  <iframe
                    title="Konum Haritası"
                    className="w-full h-full border-0"
                    src={`https://www.google.com/maps?q=${position.lat},${position.lng}&z=15&output=embed`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {nearbyServices.map((s) => (
                    <a
                      key={s.key}
                      href={s.directionsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="p-2.5 rounded-xl bg-card border border-border hover:border-primary/50 flex flex-col justify-between transition-all"
                    >
                      <span className="text-xs font-bold text-white truncate">{s.label}</span>
                      <span className="text-[10px] text-primary font-semibold hover:underline mt-1">
                        Yol Tarifi Al →
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Konum alınıyor...</p>
            )}
          </Card>

          {/* Action Buttons */}
          <div className="w-full mt-6 flex gap-3">
            <Button
              onClick={handleResolve}
              disabled={finishing}
              className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-green-600/30"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Yardım Geldi / Tamamlandı
            </Button>
            <Button
              onClick={handleCancel}
              disabled={finishing}
              variant="outline"
              className="flex-1 h-12 border-destructive text-destructive hover:bg-destructive/10 font-bold text-xs uppercase tracking-wider rounded-xl"
            >
              <X className="w-4 h-4 mr-1.5" />
              Çağrıyı İptal Et
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-asphalt-light pb-8 page-surface-light">
      <Header />

      <div className="px-4 pt-4 max-w-lg mx-auto flex flex-col items-center">
        <div className="text-center max-w-sm">
          <h1 className="font-display text-3xl font-extrabold text-foreground uppercase tracking-wider">
            Acil Yardım
          </h1>
          <p className="text-muted-foreground mt-1.5 text-xs sm:text-sm leading-relaxed">
            Konumunu alıp SOS kaydı oluşturmayı deneriz. Diğer sürücülere bildirim iletimi henüz doğrulanmış değildir.
          </p>
        </div>

        {/* Mandatory 112 Disclaimer Notice */}
        <div className="w-full mt-4">
          <EmergencyWarning />
        </div>

        {/* Big SOS Button */}
        <button
          onClick={() => handleSOS()}
          disabled={submitting}
          className="relative mt-8 w-44 h-44 rounded-full bg-gradient-to-tr from-primary via-orange-600 to-amber-600 flex flex-col items-center justify-center shadow-2xl shadow-primary/50 active:scale-95 transition-all group disabled:opacity-50 cursor-pointer border-4 border-white/20"
        >
          <div className="absolute inset-0 sos-pulse rounded-full bg-primary/30" />
          <Shield className="w-14 h-14 text-white mb-1 group-hover:scale-110 transition-transform" />
          <span className="font-display text-2xl font-extrabold text-white uppercase tracking-widest leading-none">
            {submitting ? "..." : "ACİL YARDIM"}
          </span>
          <span className="text-[10px] font-bold text-white/80 uppercase tracking-wide mt-1">
            DOKUN & ÇAĞIR
          </span>
        </button>

        {/* Help Categories (7 options) */}
        <div className="w-full mt-8">
          <h2 className="font-display text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
            Özel Durum Seç (7 Kategori)
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            <CategoryCard icon={Bike} title="Lastik" desc="Patlak / İnik" disabled={submitting} onClick={() => handleSOS("lastik")} />
            <CategoryCard icon={Zap} title="Akü" desc="Takviye Lazım" disabled={submitting} onClick={() => handleSOS("aku")} />
            <CategoryCard icon={Fuel} title="Yakıt" desc="Benzin Bitti" disabled={submitting} onClick={() => handleSOS("yakit")} />
            <CategoryCard icon={Wrench} title="Arıza" desc="Mekanik Arıza" disabled={submitting} onClick={() => handleSOS("ariza")} />
            <CategoryCard icon={Phone} title="Kaza" desc="Maddi Hasarlı" disabled={submitting} onClick={() => handleSOS("kaza")} />
            <CategoryCard icon={Truck} title="Çekici" desc="Çekici Desteği" disabled={submitting} onClick={() => handleSOS("cekici")} />
            <CategoryCard icon={HelpCircle} title="Diğer" desc="Farklı yardım ihtiyacı" disabled={submitting} onClick={() => handleSOS("diger")} />
          </div>
        </div>

        {/* Koruyucu Kardeş System Card */}
        <Card className="w-full mt-6 bg-card-gradient border-border p-4 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/15 text-amber-500 flex items-center justify-center flex-shrink-0">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wide">
                Koruyucu Kardeş Rozet Sistemi
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
                Puan ve rozetlerin sunucu tarafında güvenilir biçimde hesaplanması henüz etkinleştirilmedi.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function CategoryCard({
  icon: Icon,
  title,
  desc,
  onClick,
  disabled = false,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bg-card-gradient border border-border/80 hover:border-primary/50 rounded-xl p-3.5 flex flex-col items-start gap-1.5 active:scale-95 transition-all text-left group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Icon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
      <span className="font-bold text-white text-xs uppercase tracking-wide">{title}</span>
      <span className="text-[10px] text-muted-foreground leading-tight">{desc}</span>
    </button>
  );
}
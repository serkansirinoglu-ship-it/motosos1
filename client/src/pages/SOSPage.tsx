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
import { getCurrentAuthUid, createSOSRequest, updateSOSRequest, getMyActiveSOSRequest, subscribeActiveSOSRequests } from "../../../firebase";
import { isSameSOSAuthScope } from "@/services/sosInputValidation";
import { buildNearbyServiceLinks } from "@/services/nearbyServices";
import { getElapsedSOSSeconds } from "@/services/sosTiming";

export default function SOSPage() {
  const [sosActive, setSosActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<SOSHelpCategory | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [sosId, setSosId] = useState<string | null>(null); // Firebase document ID, when persisted
  const [sosOwnerUid, setSosOwnerUid] = useState<string | null>(null);
  const [localSosId, setLocalSosId] = useState<string | null>(null);
  const [status, setStatus] = useState<SOSStatus>("bekleniyor");
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [finishing, setFinishing] = useState(false);
  const finishingRef = useRef(false);
  // Invalidates in-flight close operations when the authenticated SOS scope changes.
  const finishOperationRef = useRef(0);
  const [nearbyServices, setNearbyServices] = useState<Array<{ key: string; label: string; searchUrl: string; directionsUrl: string }>>([]);

  const { user, authReady } = useAuth();
  const currentUserUidRef = useRef<string | null>(user?.uid ?? null);
  currentUserUidRef.current = user?.uid ?? null;
  const sosActiveRef = useRef(sosActive);
  sosActiveRef.current = sosActive;
  const sosIdRef = useRef(sosId);
  sosIdRef.current = sosId;
  const [restoreRetryToken, setRestoreRetryToken] = useState(0);
  const [restoreLookupFailed, setRestoreLookupFailed] = useState(false);
  const { createHelpRequest } = useMessages();
  const isSOSOwnerScopeCurrent = () =>
    isSameSOSAuthScope(sosOwnerUid, getCurrentAuthUid()) &&
    isSameSOSAuthScope(sosOwnerUid, currentUserUidRef.current);

  // Restore an authenticated rider's active remote SOS after a page refresh.
  // Only public parent fields are read; exact coordinates/contact details remain private.
  useEffect(() => {
    const uid = user?.uid;
    if (!authReady || !uid) {
      setRestoreLookupFailed(false);
      return;
    }
    let cancelled = false;

    void getMyActiveSOSRequest(uid).then((request) => {
      if (
        cancelled ||
        currentUserUidRef.current !== uid ||
        getCurrentAuthUid() !== uid ||
        sosActiveRef.current ||
        submittingRef.current ||
        sosIdRef.current
      ) return;
      setRestoreLookupFailed(false);
      if (!request) return;

      const latitude = request.latitude;
      const longitude = request.longitude;
      setSosOwnerUid(uid);
      setSosId(request.id);
      setLocalSosId(null);
      setSelectedCategory(
        request.helpType && request.helpType in CATEGORY_LABELS
          ? request.helpType as SOSHelpCategory
          : "diger"
      );
      setStatus(request.acceptedBy ? "yanit_geliyor" : "bekleniyor");
      const hasValidPosition =
        typeof latitude === "number" && Number.isFinite(latitude) &&
        latitude >= -90 && latitude <= 90 &&
        typeof longitude === "number" && Number.isFinite(longitude) &&
        longitude >= -180 && longitude <= 180;
      setPosition(hasValidPosition ? { lat: latitude, lng: longitude } : null);
      setNearbyServices(hasValidPosition ? buildNearbyServiceLinks(latitude, longitude) : []);
      setElapsed(getElapsedSOSSeconds(request.createdAt));
      setSosActive(true);
      toast.info("Aktif SOS çağrınız geri yüklendi. Haritada gösterilen konum yaklaşık konum olabilir.");
    }).catch((error) => {
      console.warn("Could not restore active SOS", error);
      if (!cancelled && currentUserUidRef.current === uid && getCurrentAuthUid() === uid) {
        setRestoreLookupFailed(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [authReady, user?.uid, restoreRetryToken]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (sosActive) {
      timer = setInterval(() => setElapsed((e) => e + 1), 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [sosActive]);

  // Never keep a previous account's SOS visible or manageable after auth changes.
  // The remote request is not cancelled; its owner can manage it after signing back in.
  useEffect(() => {
    const hasSOSContext = Boolean(sosActive || sosId || localSosId);
    if (!hasSOSContext || isSameSOSAuthScope(sosOwnerUid, user?.uid)) return;

    // Release the UI lock for the next account and prevent an old promise from
    // unlocking or otherwise mutating a newer account's close operation.
    finishOperationRef.current += 1;
    finishingRef.current = false;
    setFinishing(false);

    if (localSosId) sosService.removeRequest(localSosId);
    setSosActive(false);
    setSosId(null);
    setSosOwnerUid(null);
    setLocalSosId(null);
    setPosition(null);
    setNearbyServices([]);
    setElapsed(0);
    setSelectedCategory(null);
    setStatus("bekleniyor");
    toast.info("Oturum değiştiği için önceki SOS bu ekrandan kaldırıldı. Sunucuya kaydedilmiş çağrı varsa sahibi olan hesapla yeniden giriş yaparak yönetin.");
  }, [user?.uid, sosOwnerUid, sosActive, sosId, localSosId]);

  // Keep the requester-facing status in sync when another rider accepts the SOS.
  // The subscription returns public active SOS fields only, never private GPS details.
  useEffect(() => {
    if (!sosId) return;
    let active = true;
    const unsubscribe = subscribeActiveSOSRequests(
      (requests: Array<{ id: string; acceptedBy?: string | null }>, metadata?: { fromCache?: boolean }) => {
        if (!active) return;
        const current = requests.find((request: { id: string; acceptedBy?: string | null }) => request.id === sosId);
        if (!current) {
          // Do not clear state from a cache-only snapshot: a restored SOS may not
          // yet be present in this device's cache. Wait for the server snapshot.
          if (metadata?.fromCache !== false || !sosActiveRef.current || sosIdRef.current !== sosId) return;
          // This query contains active SOS records only. A server-confirmed snapshot
          // omitting our known ID means it is no longer active.
          if (localSosId) sosService.removeRequest(localSosId);
          setSosActive(false);
          setSosId(null);
          setSosOwnerUid(null);
          setLocalSosId(null);
          setPosition(null);
          setNearbyServices([]);
          setElapsed(0);
          setSelectedCategory(null);
          setStatus("bekleniyor");
          toast.info("Sunucu aktif çağrılar listesinde bu SOS artık görünmüyor. Ekrandaki aktif durum kapatıldı; ayrıntılı son durum doğrulanmadı.");
          return;
        }
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
    const initiatingUid = user?.uid ?? null;
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
        // Geolocation may resolve after sign-out or account switching. Do not
        // create even a local SOS under the identity that initiated the request.
        if (
          !isSameSOSAuthScope(initiatingUid, getCurrentAuthUid()) ||
          !isSameSOSAuthScope(initiatingUid, currentUserUidRef.current)
        ) {
          setSubmitting(false);
          submittingRef.current = false;
          toast.error("Oturumunuz değiştiği için SOS oluşturulmadı. Yeni oturumda yeniden deneyin.");
          return;
        }
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setPosition({ lat, lng });

        // Reuse the same validated links when creating and restoring an SOS.
        setNearbyServices(buildNearbyServiceLinks(lat, lng));

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
        setSosOwnerUid(initiatingUid);
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
            const scopeStillCurrent =
              isSameSOSAuthScope(initiatingUid, getCurrentAuthUid()) &&
              isSameSOSAuthScope(initiatingUid, currentUserUidRef.current);
            if (!scopeStillCurrent && res?.error !== "active_duplicate") {
              sosService.updateStatus(localReq.id, "iptal_edildi");
              setLocalSosId(null);
              setPosition(null);
              setNearbyServices([]);
              setSubmitting(false);
              submittingRef.current = false;
              if (res?.id) {
                // The server confirmed creation before the account switch. Do not
                // attach that SOS to the newly authenticated user's visible UI.
                setSosId(null);
                setSosOwnerUid(null);
                setSosActive(false);
                setSelectedCategory(null);
                setElapsed(0);
                toast.error("SOS sunucuya kaydedildi ancak oturum değişti. Çağrıyı yönetmek için ilk hesaba yeniden giriş yapın. Acil tehlikede 112’yi arayın.");
              } else {
                setSosId(null);
                toast.error("Oturum değiştiği için SOS sonucu doğrulanamadı. İlk hesabınızla aktif çağrınızı kontrol edin; acil tehlikede 112’yi arayın.");
              }
              return;
            }
            if (res?.id) {
              setSosId(res.id);
              firebaseSaved = true;
            } else if (res?.error === "auth_changed") {
              // The service rejected the write before committing because the
              // authenticated identity changed. Remove the local placeholder too.
              sosService.updateStatus(localReq.id, "iptal_edildi");
              setLocalSosId(null);
              setSosOwnerUid(null);
              setSosId(null);
              setPosition(null);
              setNearbyServices([]);
              setSubmitting(false);
              submittingRef.current = false;
              toast.error("Oturumunuz değiştiği için SOS sunucuya kaydedilmedi. Yeni oturumda yeniden deneyin.");
              return;
            } else if (res?.error === "active_duplicate") {
              // Keep the local UI consistent with the server-side duplicate guard.
              sosService.updateStatus(localReq.id, "iptal_edildi");
              setLocalSosId(null);
              setSosOwnerUid(null);
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
    const operationId = ++finishOperationRef.current;
    setFinishing(true);
    if (!isSOSOwnerScopeCurrent()) {
      toast.error("Bu SOS farklı bir oturumda oluşturuldu. İptal etmek için çağrıyı oluşturan hesaba yeniden giriş yapın. Acil tehlikede 112’yi arayın.");
      finishingRef.current = false;
      setFinishing(false);
      return;
    }
    if (sosId) {
      let remoteUpdated = false;
      try {
        remoteUpdated = (await updateSOSRequest(sosId, { status: "cancelled" }, sosOwnerUid)) === true;
      } catch (error) {
        console.error("Firebase SOS cancellation failed", error);
      }
      if (operationId !== finishOperationRef.current) return;
      if (!remoteUpdated) {
        toast.error(
          !isSOSOwnerScopeCurrent()
            ? "Oturum değişti. Çağrının durumu doğrulanamadı; ilk hesabınıza dönerek kontrol edin. Acil tehlikede 112’yi arayın."
            : "Sunucu çağrısı iptal edilemedi. Çağrı aktif tutuldu; bağlantınızı kontrol edip yeniden deneyin."
        );
        finishingRef.current = false;
        setFinishing(false);
        return;
      }
      // The auth scope or active request may have changed while the remote write
      // was pending. Never let an old completion clear a newer session's SOS UI.
      if (!isSOSOwnerScopeCurrent() || sosIdRef.current !== sosId) {
        finishingRef.current = false;
        setFinishing(false);
        toast.error("Oturum veya aktif çağrı değişti. Yeni ekrandaki SOS korunarak eski işlemin sonucu ayrıştırıldı; ilk hesabınızda çağrı durumunu kontrol edin.");
        return;
      }
    }

    if (localSosId) sosService.updateStatus(localSosId, "iptal_edildi");
    setSosActive(false);
    setSosId(null);
    setSosOwnerUid(null);
    setLocalSosId(null);
    setPosition(null);
    setNearbyServices([]);
    setElapsed(0);
    setSelectedCategory(null);
    finishingRef.current = false;
    setFinishing(false);
    toast.info(sosId ? "Yardım çağrısı sunucuda iptal edildi." : "Yerel yardım çağrısı iptal edildi; sunucu kaydı doğrulanmadı.");
  };

  const handleResolve = async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const operationId = ++finishOperationRef.current;
    setFinishing(true);
    if (!isSOSOwnerScopeCurrent()) {
      toast.error("Bu SOS farklı bir oturumda oluşturuldu. Tamamlamak için çağrıyı oluşturan hesaba yeniden giriş yapın. Acil tehlikede 112’yi arayın.");
      finishingRef.current = false;
      setFinishing(false);
      return;
    }
    if (sosId) {
      let remoteUpdated = false;
      try {
        remoteUpdated = (await updateSOSRequest(sosId, { status: "resolved" }, sosOwnerUid)) === true;
      } catch (error) {
        console.error("Firebase SOS completion failed", error);
      }
      if (operationId !== finishOperationRef.current) return;
      if (!remoteUpdated) {
        toast.error(
          !isSOSOwnerScopeCurrent()
            ? "Oturum değişti. Çağrının durumu doğrulanamadı; ilk hesabınıza dönerek kontrol edin. Acil tehlikede 112’yi arayın."
            : "Sunucu çağrısı tamamlandı olarak işaretlenemedi. Çağrı aktif tutuldu; bağlantınızı kontrol edip yeniden deneyin."
        );
        finishingRef.current = false;
        setFinishing(false);
        return;
      }
      // The auth scope or active request may have changed while the remote write
      // was pending. Never let an old completion clear a newer session's SOS UI.
      if (!isSOSOwnerScopeCurrent() || sosIdRef.current !== sosId) {
        finishingRef.current = false;
        setFinishing(false);
        toast.error("Oturum veya aktif çağrı değişti. Yeni ekrandaki SOS korunarak eski işlemin sonucu ayrıştırıldı; ilk hesabınızda çağrı durumunu kontrol edin.");
        return;
      }
    }

    if (localSosId) sosService.updateStatus(localSosId, "tamamlandi");
    setSosActive(false);
    setSosId(null);
    setSosOwnerUid(null);
    setLocalSosId(null);
    setPosition(null);
    setNearbyServices([]);
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
          {!isSOSOwnerScopeCurrent() && (
            <p role="alert" className="w-full mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
              Oturum değişti. Bu çağrıyı yanlış hesapla değiştirmemek için iptal ve tamamlama kilitlendi. Çağrıyı oluşturan hesaba yeniden giriş yapın. Acil tehlikede 112’yi arayın.
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
              disabled={finishing || !isSOSOwnerScopeCurrent()}
              className="flex-1 h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-green-600/30"
            >
              <Check className="w-4 h-4 mr-1.5" />
              Yardım Geldi / Tamamlandı
            </Button>
            <Button
              onClick={handleCancel}
              disabled={finishing || !isSOSOwnerScopeCurrent()}
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

        {restoreLookupFailed && (
          <div role="alert" className="w-full mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3">
            <p className="text-xs leading-relaxed text-amber-200">
              Aktif SOS kaydı kontrol edilemedi. Bağlantınızı kontrol edip yeniden deneyin; çağrının durumu doğrulanana kadar yeni SOS açmayın.
            </p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 w-full"
              onClick={() => setRestoreRetryToken((value) => value + 1)}
            >
              Aktif SOS kaydını yeniden kontrol et
            </Button>
          </div>
        )}

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
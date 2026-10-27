import { useState, useEffect } from "react";
import { ShieldCheck, Users, ShoppingBag, Flag, AlertTriangle, Image as ImageIcon, BarChart3, Wrench, Trash2, CheckCircle, Ban, X, Plus, CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { ReportItem } from "@/services/moderationService";
import { subscribeReportsRealtime, resolveReportRealtime, subscribeBannersRealtime, createBannerRealtime, deleteBannerRealtime } from "../../../firebase";
import { communityService, CommunityPost } from "@/services/communityService";
import { marketplaceService, ListingItem } from "@/services/marketplaceService";
import { businessService, BusinessProfile, BusinessCategory } from "@/services/businessService";
import { sosService, SOSRequestItem } from "@/services/sosService";
import type { AdBanner } from "@/services/adService";
import { subscribeMotoGuardEvents, createMotoGuardEvent, deleteMotoGuardEvent, type MotoGuardEvent } from "@/services/eventsService";
import { toast } from "sonner";

export default function AdminPanel() {
  const { user } = useAuth();
  const [adminAccess, setAdminAccess] = useState<"checking" | "allowed" | "denied">("checking");
  const [activeTab, setActiveTab] = useState<"stats" | "reports" | "users" | "posts" | "listings" | "businesses" | "banners" | "events">("stats");

  // Admin Data state
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [banners, setBanners] = useState<AdBanner[]>([]);
  const [activeSOS, setActiveSOS] = useState<SOSRequestItem[]>([]);
  const [events, setEvents] = useState<MotoGuardEvent[]>([]);
  const [isNewEventOpen, setIsNewEventOpen] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventCity, setEventCity] = useState("");
  const [eventLocation, setEventLocation] = useState("");
  const [eventStartsAt, setEventStartsAt] = useState("");
  const [eventEndsAt, setEventEndsAt] = useState("");
  const [eventImage, setEventImage] = useState("");

  // Banner form state
  const [isNewBannerOpen, setIsNewBannerOpen] = useState(false);
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerSub, setBannerSub] = useState("");
  const [bannerImg, setBannerImg] = useState("");
  const [bannerLink, setBannerLink] = useState("");
  const [sponsorName, setSponsorName] = useState("");
  const [isNewBusinessOpen, setIsNewBusinessOpen] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [businessCategory, setBusinessCategory] = useState<BusinessCategory>("usta");
  const [businessCity, setBusinessCity] = useState("");
  const [businessAddress, setBusinessAddress] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessHours, setBusinessHours] = useState("09:00-18:00");
  const [businessLat, setBusinessLat] = useState("");
  const [businessLng, setBusinessLng] = useState("");
  const [businessPhoto, setBusinessPhoto] = useState("");
  const [businessDescription, setBusinessDescription] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function verifyAdminClaim() {
      if (!user?.uid || typeof user.getIdTokenResult !== "function") {
        setAdminAccess("denied");
        return;
      }
      setAdminAccess("checking");
      try {
        const token = await user.getIdTokenResult(true);
        if (!cancelled) setAdminAccess(token?.claims?.admin === true ? "allowed" : "denied");
      } catch (error) {
        console.warn("Admin claim verification failed", error);
        if (!cancelled) setAdminAccess("denied");
      }
    }
    void verifyAdminClaim();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (adminAccess !== "allowed") return;
    let cancelled = false;
    let unsubscribeReports: (() => void) | undefined;
    let unsubscribePosts: (() => void) | undefined;
    let unsubscribeListings: (() => void) | undefined;
    let unsubscribeBanners: (() => void) | undefined;
    let unsubscribeBusinesses: (() => void) | undefined;
    let unsubscribeEvents: (() => void) | undefined;
    void subscribeReportsRealtime(
      (items: ReportItem[]) => { if (!cancelled) setReports(items); },
      () => { if (!cancelled) toast.error("Şikâyetler sunucudan alınamadı. Firebase bağlantısını ve yönetici yetkisini kontrol edin."); },
    ).then((unsubscribe) => {
      if (cancelled) unsubscribe();
      else unsubscribeReports = unsubscribe;
    });
    try {
      unsubscribePosts = communityService.subscribeRemotePosts(
        (items) => { if (!cancelled) setPosts(items); },
        () => { if (!cancelled) toast.error("Topluluk gönderileri Firestore üzerinden alınamadı. Bağlantı ve yönetici yetkisini kontrol edin."); },
        () => !cancelled,
      );
    } catch {
      toast.error("Topluluk gönderileri sunucuya bağlanamadı.");
    }
    try {
      unsubscribeListings = marketplaceService.subscribeRemoteListings(
        (items) => { if (!cancelled) setListings(items); },
        () => { if (!cancelled) toast.error("Pazar ilanları Firestore üzerinden alınamadı. Bağlantı ve yönetici yetkisini kontrol edin."); },
        () => !cancelled,
      );
    } catch {
      toast.error("Pazar ilanları sunucuya bağlanamadı.");
    }
    try {
      unsubscribeBanners = subscribeBannersRealtime(
        (items: Record<string, unknown>[]) => {
          if (cancelled) return;
          setBanners(items.map((item: Record<string, unknown>) => ({
            id: String(item.id || ""),
            title: String(item.title || ""),
            subtitle: typeof item.subtitle === "string" ? item.subtitle : undefined,
            sponsorName: typeof item.sponsorName === "string" ? item.sponsorName : undefined,
            image: typeof item.image === "string" ? item.image : undefined,
            link: typeof item.link === "string" ? item.link : undefined,
            active: item.active === true,
            type: "banner" as const,
          })));
        },
        () => { if (!cancelled) toast.error("Reklamlar Firestore üzerinden alınamadı. Bağlantı ve yönetici yetkisini kontrol edin."); },
      );
    } catch {
      toast.error("Reklamlar sunucuya bağlanamadı.");
    }
    try {
      unsubscribeEvents = subscribeMotoGuardEvents(
        (items) => { if (!cancelled) setEvents(items); },
        () => { if (!cancelled) toast.error("Etkinlikler Firestore üzerinden alınamadı."); },
      );
    } catch {
      if (!cancelled) toast.error("Etkinlikler sunucuya bağlanamadı.");
    }
    unsubscribeBusinesses = businessService.subscribe(
      () => { if (!cancelled) setBusinesses(businessService.getBusinesses()); },
      () => { if (!cancelled) toast.error("İşletmeler Firestore üzerinden alınamadı."); },
    );
    setActiveSOS(sosService.getActiveRequests());
    return () => {
      cancelled = true;
      unsubscribeReports?.();
      unsubscribePosts?.();
      unsubscribeListings?.();
      unsubscribeBanners?.();
      unsubscribeBusinesses?.();
      unsubscribeEvents?.();
    };
  }, [adminAccess]);

  const handleResolveReport = async (id: string, action: "resolved" | "dismissed") => {
    const saved = await resolveReportRealtime(id, action);
    if (!saved) {
      toast.error("Şikâyet sunucuda güncellenemedi; yönetici yetkisini ve bağlantıyı kontrol edin.");
      return;
    }
    toast.success(action === "resolved" ? "Şikâyet sunucuda çözüldü olarak işaretlendi." : "Şikâyet sunucuda reddedildi olarak işaretlendi.");
  };

  const handleDeletePost = async (id: string) => {
    try {
      await communityService.deleteRemotePostAsAdmin(id);
      toast.success("Gönderi Firestore üzerinden silindi.");
    } catch {
      toast.error("Gönderi sunucudan silinemedi. Yönetici yetkisini ve Firebase bağlantısını kontrol edin.");
    }
  };

  const handleDeleteListing = async (id: string) => {
    try {
      await marketplaceService.deleteRemoteListingAsAdmin(id);
      toast.success("İlan Firestore üzerinden silindi.");
    } catch {
      toast.error("İlan sunucudan silinemedi. Yönetici yetkisini ve Firebase bağlantısını kontrol edin.");
    }
  };

  const handleToggleTier = async (bizId: string, currentTier: BusinessProfile["tier"]) => {
    const nextTier: BusinessProfile["tier"] = currentTier === "sponsored" ? "standard" : "sponsored";
    if (!(await businessService.updateTier(bizId, nextTier))) {
      toast.error("İşletme sponsor durumu sunucuda güncellenemedi.");
      return;
    }
    toast.success("İşletme sunucuda güncellendi: " + nextTier);
  };

  const handleCreateBusiness = async () => {
    const lat = Number(businessLat); const lng = Number(businessLng);
    if (!businessName.trim() || !businessCity.trim() || !businessAddress.trim() || !businessPhone.trim() || !businessHours.trim() || businessLat.trim() === "" || businessLng.trim() === "" || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      toast.error("İşletme adı, şehir, adres, telefon, çalışma saatleri ve geçerli koordinatlar zorunludur."); return;
    }
    const created = await businessService.createBusiness({ name: businessName.trim(), category: businessCategory, city: businessCity.trim(), address: businessAddress.trim(), phone: businessPhone.trim(), workingHours: businessHours.trim(), lat, lng, photo: businessPhoto.trim() || undefined, description: businessDescription.trim() || undefined, tier: "standard", verified: false, publicVisible: true });
    if (!created) { toast.error("İşletme Firestore'a kaydedilemedi. Yönetici yetkisini ve Firebase bağlantısını kontrol edin."); return; }
    toast.success("İşletme kalıcı olarak Firestore'a kaydedildi.");
    setBusinessName(""); setBusinessCity(""); setBusinessAddress(""); setBusinessPhone(""); setBusinessHours("09:00-18:00"); setBusinessLat(""); setBusinessLng(""); setBusinessPhoto(""); setBusinessDescription(""); setBusinessCategory("usta"); setIsNewBusinessOpen(false);
  };

  const handleCreateEvent = async () => {
    if (!eventTitle.trim() || !eventCity.trim() || !eventLocation.trim() || !eventStartsAt || !eventEndsAt) { toast.error("Etkinlik başlığı, şehir, konum ve tarih aralığı zorunludur."); return; }
    try {
      const id = await createMotoGuardEvent({ title: eventTitle.trim(), description: eventDescription.trim(), city: eventCity.trim(), location: eventLocation.trim(), startsAt: new Date(eventStartsAt).toISOString(), endsAt: new Date(eventEndsAt).toISOString(), image: eventImage.trim() || undefined });
      if (!id) { toast.error("Etkinlik sunucuya kaydedilemedi. Yönetici yetkisini, tarihleri ve Firebase bağlantısını kontrol edin."); return; }
      toast.success("Etkinlik Firestore'a kaydedildi.");
      setEventTitle(""); setEventDescription(""); setEventCity(""); setEventLocation(""); setEventStartsAt(""); setEventEndsAt(""); setEventImage(""); setIsNewEventOpen(false);
    } catch (error) {
      console.error("Event creation failed", error);
      toast.error("Etkinlik sunucuya kaydedilemedi. Alanları ve Firebase bağlantısını kontrol edin.");
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try { if (!(await deleteMotoGuardEvent(eventId))) { toast.error("Etkinlik silinemedi; yönetici yetkisini kontrol edin."); return; } toast.success("Etkinlik sunucudan silindi."); }
    catch (error) { console.error("Event deletion failed", error); toast.error("Etkinlik sunucudan silinemedi."); }
  };
  const handleCreateBanner = async () => {
    if (!bannerTitle.trim()) {
      toast.error("Lütfen reklam başlığı girin.");
      return;
    }
    const created = await createBannerRealtime({
      title: bannerTitle.trim(),
      subtitle: bannerSub.trim() || undefined,
      image: bannerImg.trim() || undefined,
      link: bannerLink.trim() || undefined,
      sponsorName: sponsorName.trim() || undefined,
      active: true,
    });
    if (!created) {
      toast.error("Reklam sunucuya kaydedilemedi. Yönetici yetkisini ve Firebase bağlantısını kontrol edin.");
      return;
    }
    toast.success("Reklam Firestore'a kaydedildi.");
    setBannerTitle("");
    setBannerSub("");
    setBannerImg("");
    setBannerLink("");
    setSponsorName("");
    setIsNewBannerOpen(false);
  };

  const handleRemoveBanner = async (id: string) => {
    const deleted = await deleteBannerRealtime(id);
    if (!deleted) {
      toast.error("Reklam sunucudan silinemedi. Yönetici yetkisini ve Firebase bağlantısını kontrol edin.");
      return;
    }
    toast.success("Reklam Firestore üzerinden silindi.");
  };

  if (adminAccess === "checking") {
    return (
      <div className="min-h-screen bg-asphalt-light pb-8 page-surface-light">
        <Header />
        <div className="px-4 pt-12 max-w-lg mx-auto">
          <Card className="bg-card-gradient border-border p-6 text-center">
            <ShieldCheck className="w-10 h-10 text-primary mx-auto mb-3" />
            <p className="font-bold text-white">Yönetici yetkisi doğrulanıyor…</p>
          </Card>
        </div>
      </div>
    );
  }

  if (adminAccess !== "allowed") {
    return (
      <div className="min-h-screen bg-asphalt-light pb-8 page-surface-light">
        <Header />
        <div className="px-4 pt-12 max-w-lg mx-auto">
          <Card className="bg-card-gradient border-border p-6 text-center space-y-3">
            <ShieldCheck className="w-10 h-10 text-destructive mx-auto" />
            <p className="font-bold text-white">Yönetici erişimi reddedildi</p>
            <p className="text-xs text-muted-foreground">Bu alan yalnızca Firebase kimlik belirtecinde admin=true yetkisi bulunan hesaplara açıktır.</p>
            <a href="/" className="inline-flex justify-center rounded-xl bg-primary px-4 py-2 text-xs font-bold text-white">Ana sayfaya dön</a>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-asphalt-light pb-8 page-surface-light">
      <Header />

      <div className="px-4 pt-3 max-w-lg mx-auto">
        <Card className="bg-amber-500/10 border-amber-500/30 p-3 rounded-xl">
          <p className="text-[11px] text-amber-200 leading-relaxed">
            Gönderiler, ilanlar, işletmeler ve reklamlar Firestore üzerinden yönetilir. İşletme yazma işlemleri yalnızca yönetici yetkisiyle yapılır.
          </p>
        </Card>
      </div>

      <div className="px-4 pt-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/20 text-primary flex items-center justify-center font-bold">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-extrabold text-white uppercase tracking-wider">
              MotoGuard Admin Kontrol Paneli
            </h1>
            <p className="text-xs text-muted-foreground">Moderasyon, şikayetler, içerik ve sponsor yönetimi</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {[
            { id: "stats", label: "📊 İstatistikler" },
            { id: "reports", label: `🚩 Şikayetler (${reports.filter((r) => r.status === "pending").length})` },
            { id: "posts", label: "📢 Gönderiler" },
            { id: "listings", label: "🛒 İlanlar" },
            { id: "businesses", label: "🔧 İşletmeler" },
            { id: "events", label: `🗓️ Etkinlikler (${events.length})` },
            { id: "banners", label: "📢 Reklam/Sponsor" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
                activeTab === tab.id
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                  : "bg-card-gradient border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Stats Tab */}
        {activeTab === "stats" && (
          <div className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-2.5">
              <AdminStatCard label="Aktif Yardım Çağrıları" value={String(activeSOS.length)} color="text-red-400" />
              <AdminStatCard label="Bekleyen Şikayetler" value={String(reports.filter((r) => r.status === "pending").length)} color="text-amber-400" />
              <AdminStatCard label="Toplam Topluluk Postu" value={String(posts.length)} color="text-blue-400" />
              <AdminStatCard label="Aktif Pazar İlanları" value={String(listings.length)} color="text-green-400" />
            </div>

            <Card className="bg-card-gradient border-border p-4 rounded-xl space-y-2">
              <h3 className="font-display font-bold text-white text-xs uppercase">Sistem Durumu</h3>
              <p className="text-xs text-muted-foreground">
                Gönderi, ilan ve işletme verileri Firestore'dan gerçek zamanlı gelir.
              </p>
            </Card>
          </div>
        )}

        {/* Reports Tab */}
        {activeTab === "reports" && (
          <div className="mt-4 space-y-3">
            {reports.length > 0 ? (
              reports.map((r) => (
                <Card key={r.id} className="bg-card-gradient border-border p-4 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-red-400 uppercase">Hedef: {r.targetType}</span>
                    <span className="text-[10px] text-muted-foreground">{r.createdAt}</span>
                  </div>
                  <p className="text-xs font-bold text-white">Neden: {r.reason}</p>
                  {r.details && <p className="text-xs text-muted-foreground bg-card p-2 rounded-lg">{r.details}</p>}
                  <p className="text-[10px] text-muted-foreground">Raporlayan: {r.reportedBy}</p>
                  {r.status === "pending" ? (
                    <div className="flex gap-2 pt-2 border-t border-border">
                      <button
                        onClick={() => handleResolveReport(r.id, "resolved")}
                        className="flex-1 bg-green-600 text-white font-bold text-xs py-2 rounded-xl"
                      >
                        Şikâyeti Çözüldü İşaretle
                      </button>
                      <button
                        onClick={() => handleResolveReport(r.id, "dismissed")}
                        className="flex-1 border border-border text-muted-foreground text-xs py-2 rounded-xl"
                      >
                        Reddet
                      </button>
                    </div>
                  ) : (
                    <p className="border-t border-border pt-2 text-xs text-muted-foreground">
                      Durum: {r.status === "resolved" ? "Çözüldü" : "Reddedildi"}
                    </p>
                  )}
                </Card>
              ))
            ) : (
              <Card className="bg-card-gradient border-border p-8 text-center rounded-xl">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-foreground">Sunucuda bekleyen şikâyet bulunmuyor.</p>
                <p className="text-xs text-muted-foreground">Yeni şikâyetler Firestore üzerinden gerçek zamanlı alınır. Liste boşsa henüz bekleyen kayıt yoktur.</p>
              </Card>
            )}
          </div>
        )}

        {/* Posts Moderation */}
        {activeTab === "posts" && (
          <div className="mt-4 space-y-3">
            {posts.map((p) => (
              <Card key={p.id} className="bg-card-gradient border-border p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">{p.authorName} ({p.city})</p>
                  <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{p.content}</p>
                </div>
                <button
                  onClick={() => handleDeletePost(p.id)}
                  className="bg-destructive/15 text-destructive p-2 rounded-xl hover:bg-destructive hover:text-white transition-all"
                  title="Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Card>
            ))}
          </div>
        )}

        {/* Listings Moderation */}
        {activeTab === "listings" && (
          <div className="mt-4 space-y-3">
            {listings.map((l) => (
              <Card key={l.id} className="bg-card-gradient border-border p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">{l.title}</p>
                  <p className="text-xs text-primary font-bold">{l.price} TL • {l.sellerName}</p>
                </div>
                <button
                  onClick={() => handleDeleteListing(l.id)}
                  className="bg-destructive/15 text-destructive p-2 rounded-xl hover:bg-destructive hover:text-white transition-all"
                  title="Sil"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Card>
            ))}
          </div>
        )}

        {/* Event Management */}
        {activeTab === "events" && (
          <div className="mt-4 space-y-3">
            <button onClick={() => setIsNewEventOpen(true)} className="w-full bg-primary text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5"><CalendarDays className="w-4 h-4" /> Yeni Etkinlik Yayınla</button>
            {events.length === 0 && <Card className="bg-card-gradient border-border p-5 rounded-xl text-center"><p className="text-xs text-muted-foreground">Henüz etkinlik yok. Yönetici panelinden yayınlayabilirsiniz.</p></Card>}
            {events.map((event) => <Card key={event.id} className="bg-card-gradient border-border p-4 rounded-xl flex items-start justify-between gap-3"><div><p className="font-bold text-white text-xs">{event.title}</p><p className="text-xs text-muted-foreground">{event.city} · {event.location}</p><p className="text-[10px] text-muted-foreground mt-1">{event.startsAt}</p></div><button onClick={() => handleDeleteEvent(event.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-xl" title="Etkinliği sil"><Trash2 className="w-4 h-4" /></button></Card>)}
          </div>
        )}

        {/* Business Management */}
        {activeTab === "businesses" && (
          <div className="mt-4 space-y-3">
            <button onClick={() => setIsNewBusinessOpen(true)} className="w-full bg-primary text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5">
              <Plus className="w-4 h-4" /> Yeni İşletme Kaydı Ekle
            </button>
            {businesses.length === 0 && <Card className="bg-card-gradient border-border p-5 rounded-xl text-center"><p className="text-xs text-muted-foreground">Firestore'da görünür işletme kaydı yok. Gerçek işletme bilgilerini ekleyerek rehberi doldurun.</p></Card>}
            {businesses.map((b) => (
              <Card key={b.id} className="bg-card-gradient border-border p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">{b.name} ({b.city})</p>
                  <span className="text-[10px] font-bold text-amber-400">Tier: {b.tier}</span>
                </div>
                <button
                  onClick={() => handleToggleTier(b.id, b.tier)}
                  className="bg-primary/20 text-primary border border-primary/30 text-xs font-bold px-3 py-1.5 rounded-xl hover:bg-primary hover:text-white transition-all"
                >
                  {b.tier === "sponsored" ? "Standart Yap" : "Sponsor Yap"}
                </button>
              </Card>
            ))}
          </div>
        )}

        {/* Banners & Sponsorships */}
        {activeTab === "banners" && (
          <div className="mt-4 space-y-3">
            <button
              onClick={() => setIsNewBannerOpen(true)}
              className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-1.5 active:scale-95 transition-all shadow-md shadow-primary/30"
            >
              <Plus className="w-4 h-4" /> Yeni Sponsorlu Reklam Ekle
            </button>

            {banners.map((b) => (
              <Card key={b.id} className="bg-card-gradient border-border p-4 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-white text-xs">{b.title}</p>
                  <p className="text-xs text-muted-foreground">{b.sponsorName}</p>
                </div>
                <button
                  onClick={() => handleRemoveBanner(b.id)}
                  className="p-2 text-destructive hover:bg-destructive/10 rounded-xl"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* New Event Modal */}
      {isNewEventOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-card-gradient border-border p-5 rounded-2xl shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3"><h3 className="font-display font-bold text-white uppercase text-base">Etkinlik Yayınla</h3><button onClick={() => setIsNewEventOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-5 h-5" /></button></div>
            <input placeholder="Etkinlik başlığı *" value={eventTitle} onChange={(e) => setEventTitle(e.target.value)} className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground" />
            <textarea placeholder="Açıklama" value={eventDescription} onChange={(e) => setEventDescription(e.target.value)} className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground" rows={3} />
            <input placeholder="Şehir *" value={eventCity} onChange={(e) => setEventCity(e.target.value)} className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground" />
            <input placeholder="Konum / buluşma noktası *" value={eventLocation} onChange={(e) => setEventLocation(e.target.value)} className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground" />
            <label className="block text-xs text-muted-foreground">Başlangıç *<input type="datetime-local" value={eventStartsAt} onChange={(e) => setEventStartsAt(e.target.value)} className="mt-1 w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground" /></label>
            <label className="block text-xs text-muted-foreground">Bitiş *<input type="datetime-local" value={eventEndsAt} onChange={(e) => setEventEndsAt(e.target.value)} className="mt-1 w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground" /></label>
            <input placeholder="Görsel URL (isteğe bağlı)" value={eventImage} onChange={(e) => setEventImage(e.target.value)} className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground" />
            <div className="flex gap-2 pt-2"><button onClick={() => setIsNewEventOpen(false)} className="flex-1 py-2.5 rounded-xl border border-border text-xs text-muted-foreground">İptal</button><button onClick={handleCreateEvent} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-xs">Sunucuya Kaydet</button></div>
          </Card>
        </div>
      )}

      {/* New Business Modal */}
      {isNewBusinessOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md">
          <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto bg-card-gradient border-border p-5 rounded-2xl shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3"><h3 className="font-display font-bold text-white uppercase text-base">Firestore'a İşletme Ekle</h3><button onClick={() => setIsNewBusinessOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground"><X className="w-5 h-5" /></button></div>
            <input placeholder="İşletme adı *" value={businessName} onChange={(e) => setBusinessName(e.target.value)} className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground" />
            <select value={businessCategory} onChange={(e) => setBusinessCategory(e.target.value as BusinessCategory)} className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground"><option value="usta">Usta / Servis</option><option value="lastikci">Lastikçi</option><option value="cekici">Çekici</option><option value="benzinlik">Benzinlik</option><option value="magaza">Mağaza</option><option value="servis">Servis</option></select>
            <input placeholder="Şehir *" value={businessCity} onChange={(e) => setBusinessCity(e.target.value)} className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground" />
            <input placeholder="Açık adres *" value={businessAddress} onChange={(e) => setBusinessAddress(e.target.value)} className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground" />
            <input placeholder="Telefon *" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground" />
            <input placeholder="Çalışma saatleri *" value={businessHours} onChange={(e) => setBusinessHours(e.target.value)} className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground" />
            <div className="grid grid-cols-2 gap-2"><input type="number" step="any" placeholder="Enlem *" value={businessLat} onChange={(e) => setBusinessLat(e.target.value)} className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground" /><input type="number" step="any" placeholder="Boylam *" value={businessLng} onChange={(e) => setBusinessLng(e.target.value)} className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground" /></div>
            <input placeholder="Fotoğraf URL (isteğe bağlı)" value={businessPhoto} onChange={(e) => setBusinessPhoto(e.target.value)} className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground" />
            <textarea placeholder="Açıklama (isteğe bağlı)" value={businessDescription} onChange={(e) => setBusinessDescription(e.target.value)} className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground" rows={3} />
            <p className="text-[10px] text-muted-foreground">Yeni kayıtlar doğrulanmamış olarak başlar. Yalnızca gerçek ve kontrol edilmiş işletme bilgileri girin.</p>
            <div className="flex gap-2 pt-2"><button onClick={() => setIsNewBusinessOpen(false)} className="flex-1 py-2.5 rounded-xl border border-border text-xs text-muted-foreground">İptal</button><button onClick={handleCreateBusiness} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-xs">Sunucuya Kaydet</button></div>
          </Card>
        </div>
      )}

      {/* New Banner Modal */}
      {isNewBannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
          <Card className="w-full max-w-md bg-card-gradient border-border p-5 rounded-2xl shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display font-bold text-white uppercase text-base">Sunucuya Reklam Ekle</h3>
              <button onClick={() => setIsNewBannerOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <input
              placeholder="Banner Başlığı"
              value={bannerTitle}
              onChange={(e) => setBannerTitle(e.target.value)}
              className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground"
            />
            <input
              placeholder="Alt Açıklama"
              value={bannerSub}
              onChange={(e) => setBannerSub(e.target.value)}
              className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground"
            />
            <input
              placeholder="Sponsor Marka Adı"
              value={sponsorName}
              onChange={(e) => setSponsorName(e.target.value)}
              className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground"
            />
            <input
              placeholder="Görsel URL"
              value={bannerImg}
              onChange={(e) => setBannerImg(e.target.value)}
              className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground"
            />

            <div className="flex gap-2 pt-2">
              <button onClick={() => setIsNewBannerOpen(false)} className="flex-1 py-2.5 rounded-xl border border-border text-xs text-muted-foreground">
                İptal
              </button>
              <button onClick={handleCreateBanner} className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold text-xs">
                Sunucuya Kaydet
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function AdminStatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Card className="bg-card-gradient border-border p-3.5 rounded-xl">
      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className={`font-display text-2xl font-extrabold mt-1 ${color}`}>{value}</p>
    </Card>
  );
}

import { useState, useEffect } from "react";
import { ShieldCheck, Users, ShoppingBag, Flag, AlertTriangle, Image as ImageIcon, BarChart3, Wrench, Trash2, CheckCircle, Ban, X, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import { moderationService, ReportItem } from "@/services/moderationService";
import { communityService, CommunityPost } from "@/services/communityService";
import { marketplaceService, ListingItem } from "@/services/marketplaceService";
import { businessService, BusinessProfile } from "@/services/businessService";
import { sosService, SOSRequestItem } from "@/services/sosService";
import adService, { AdBanner } from "@/services/adService";
import { toast } from "sonner";

export default function AdminPanel() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"stats" | "reports" | "users" | "posts" | "listings" | "businesses" | "banners">("stats");

  // Admin Data state
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [banners, setBanners] = useState<AdBanner[]>([]);
  const [activeSOS, setActiveSOS] = useState<SOSRequestItem[]>([]);

  // Banner form state
  const [isNewBannerOpen, setIsNewBannerOpen] = useState(false);
  const [bannerTitle, setBannerTitle] = useState("");
  const [bannerSub, setBannerSub] = useState("");
  const [bannerImg, setBannerImg] = useState("");
  const [bannerLink, setBannerLink] = useState("");
  const [sponsorName, setSponsorName] = useState("");

  useEffect(() => {
    setReports(moderationService.getReports());
    setPosts(communityService.getPosts());
    setListings(marketplaceService.getListings());
    setBusinesses(businessService.getBusinesses());
    setBanners(adService.getBanners());
    setActiveSOS(sosService.getActiveRequests());
  }, []);

  const handleResolveReport = (id: string, action: "resolved" | "dismissed") => {
    moderationService.resolveReport(id, action);
    toast.success(`Şikayet ${action === "resolved" ? "çözüldü" : "reddedildi"} olarak işaretlendi.`);
    setReports(moderationService.getReports());
  };

  const handleDeletePost = (id: string) => {
    communityService.deletePost(id);
    toast.info("Gönderi admin tarafından silindi.");
    setPosts(communityService.getPosts());
  };

  const handleDeleteListing = (id: string) => {
    marketplaceService.deleteListing(id);
    toast.info("İlan admin tarafından silindi.");
    setListings(marketplaceService.getListings());
  };

  const handleToggleTier = (bizId: string, currentTier: BusinessProfile["tier"]) => {
    const nextTier: BusinessProfile["tier"] = currentTier === "sponsored" ? "standard" : "sponsored";
    businessService.updateTier(bizId, nextTier);
    toast.success(`İşletme tier'ı '${nextTier}' olarak güncellendi.`);
    setBusinesses(businessService.getBusinesses());
  };

  const handleCreateBanner = () => {
    if (!bannerTitle.trim()) {
      toast.error("Lütfen reklam başlığı girin.");
      return;
    }
    adService.registerBanner({
      title: bannerTitle.trim(),
      subtitle: bannerSub.trim() || undefined,
      image: bannerImg.trim() || undefined,
      link: bannerLink.trim() || undefined,
      sponsorName: sponsorName.trim() || "Sponsor",
      active: true,
      type: "banner",
    });
    toast.success("Sponsorlu reklam banner'ı oluşturuldu!");
    setBannerTitle("");
    setBannerSub("");
    setBannerImg("");
    setBannerLink("");
    setSponsorName("");
    setIsNewBannerOpen(false);
    setBanners(adService.getBanners());
  };

  const handleRemoveBanner = (id: string) => {
    adService.removeBanner(id);
    toast.info("Banner kaldırıldı.");
    setBanners(adService.getBanners());
  };

  return (
    <div className="min-h-screen bg-asphalt pb-8">
      <Header />

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
                MotoGuard moderasyon ve veri adapte servisleri aktif durumda. Tüm içerikler anlık kontrol edilebilir.
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
                  <div className="flex gap-2 pt-2 border-t border-border">
                    <button
                      onClick={() => handleResolveReport(r.id, "resolved")}
                      className="flex-1 bg-green-600 text-white font-bold text-xs py-2 rounded-xl"
                    >
                      İçeriği Kaldır / Çöz
                    </button>
                    <button
                      onClick={() => handleResolveReport(r.id, "dismissed")}
                      className="flex-1 border border-border text-muted-foreground text-xs py-2 rounded-xl"
                    >
                      Reddet
                    </button>
                  </div>
                </Card>
              ))
            ) : (
              <Card className="bg-card-gradient border-border p-8 text-center rounded-xl">
                <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                <p className="text-sm font-bold text-foreground">Bekleyen şikayet bulunmuyor.</p>
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

        {/* Business Management */}
        {activeTab === "businesses" && (
          <div className="mt-4 space-y-3">
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

      {/* New Banner Modal */}
      {isNewBannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
          <Card className="w-full max-w-md bg-card-gradient border-border p-5 rounded-2xl shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display font-bold text-white uppercase text-base">Sponsorlu Banner Ekle</h3>
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
                Kaydet & Yayınla
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

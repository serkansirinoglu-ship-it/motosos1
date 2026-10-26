import { useState, useEffect } from "react";
import { Search, ShoppingBag, Plus, Tag, ShieldAlert, Phone, MessageSquare, Flag, X, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import TURKEY_PROVINCES from "@/lib/turkeyProvinces";
import { marketplaceService, ListingItem, ListingCategory } from "@/services/marketplaceService";
import { useAuth } from "@/contexts/AuthContext";
import ReportModal from "@/components/ReportModal";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function MarketplacePage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("Tümü");
  const [selectedCity, setSelectedCity] = useState<string>("Tümü");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [listings, setListings] = useState<ListingItem[]>([]);
  const [isNewListingOpen, setIsNewListingOpen] = useState(false);
  const [selectedListing, setSelectedListing] = useState<ListingItem | null>(null);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);

  // New listing state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<ListingCategory>("Kask");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("İstanbul");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState("");
  const [phone, setPhone] = useState("");

  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const categories: string[] = [
    "Tümü",
    "Motosiklet",
    "Kask",
    "Mont",
    "Pantolon",
    "Eldiven",
    "Lastik",
    "Parça",
    "Aksesuar",
    "Diğer",
  ];

  useEffect(() => {
    setListings(marketplaceService.getListings(selectedCategory, searchQuery, selectedCity));
  }, [selectedCategory, searchQuery, selectedCity]);

  const handleCreateListing = () => {
    const numericPrice = Number(price);
    if (!title.trim() || !price || !description.trim()) {
      toast.error("Lütfen başlık, fiyat ve açıklama alanlarını doldurun.");
      return;
    }
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      toast.error("Fiyat sıfırdan büyük geçerli bir sayı olmalıdır.");
      return;
    }
    if (title.trim().length > 120 || description.trim().length > 2000) {
      toast.error("Başlık en fazla 120, açıklama en fazla 2000 karakter olabilir.");
      return;
    }

    marketplaceService.createListing({
      title: title.trim(),
      category,
      price: numericPrice,
      city,
      description: description.trim(),
      image: image.trim() || undefined,
      sellerName: user?.displayName || "Motorcu İlan Sahibi",
      sellerPhone: phone.trim() || undefined,
    });

    toast.success("İlan bu oturumda yerel olarak oluşturuldu; kalıcı olarak yayınlanmadı.");
    setTitle("");
    setPrice("");
    setDescription("");
    setImage("");
    setPhone("");
    setIsNewListingOpen(false);
    setListings(marketplaceService.getListings(selectedCategory, searchQuery, selectedCity));
  };

  return (
    <div className="min-h-screen bg-asphalt pb-8">
      <Header />

      {/* Title & Action */}
      <div className="px-4 pt-4 max-w-lg mx-auto flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-white uppercase tracking-wider">
            İkinci El Pazar
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Motosiklet ve ekipman alım/satım dayanışması</p>
          <p className="text-[11px] text-amber-300 mt-1">Bilgi: İlanlar şu anda yalnızca bu oturumda tutulur; diğer kullanıcılara yayınlanmaz ve sayfa yenilendiğinde kaybolabilir.</p>
        </div>

        <button
          onClick={() => {
            if (!user) {
              (window as any).__openAuthModal?.();
            } else {
              setIsNewListingOpen(true);
            }
          }}
          className="bg-primary hover:bg-primary/90 text-white text-xs font-bold px-3.5 py-2 rounded-xl active:scale-95 transition-all shadow-md shadow-primary/30 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" /> İlan Ver
        </button>
      </div>

      {/* Safety Warning Banner */}
      <div className="px-4 mt-3 max-w-lg mx-auto">
        <Card className="bg-amber-500/10 border-amber-500/30 p-3 rounded-xl flex items-start gap-2.5">
          <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-200/90 leading-snug">
            <strong>Güvenli Alışveriş Uyarısı:</strong> Görmediğiniz ve kontrol etmediğiniz ürünler için kesinlikle önceden havale/EFT göndermeyin. Elden veya güvenli ödeme yöntemlerini tercih edin.
          </p>
        </Card>
      </div>

      {/* Search & Category Pills */}
      <div className="px-4 mt-3 max-w-lg mx-auto space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Kask, mont, lastik, motosiklet ara..."
            className="bg-card-gradient border-border pl-10 text-xs h-10 rounded-xl"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                selectedCategory === cat
                  ? "bg-primary text-white border-primary shadow-md shadow-primary/20"
                  : "bg-card-gradient border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Listings Grid */}
      <div className="px-4 pt-3 max-w-lg mx-auto">
        {listings.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {listings.map((item) => (
              <Card
                key={item.id}
                onClick={() => setSelectedListing(item)}
                className="bg-card-gradient border-border overflow-hidden active:scale-[0.98] transition-all cursor-pointer group hover:border-primary/40 rounded-xl flex flex-col justify-between"
              >
                <div>
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-card">
                        <ShoppingBag className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                    )}
                    <span className="absolute top-2 right-2 text-[9px] font-extrabold bg-background/90 text-foreground px-2 py-0.5 rounded-full border border-border">
                      {item.category}
                    </span>
                  </div>

                  <div className="p-3">
                    <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                    <p className="font-display text-base font-extrabold text-primary mt-1">
                      {item.price.toLocaleString("tr-TR")} <span className="text-xs">TL</span>
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{item.city} • {item.sellerName}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="bg-card-gradient border-border p-8 flex flex-col items-center justify-center text-center rounded-xl">
            <AlertCircle className="w-10 h-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm font-bold text-foreground">Aramanıza uygun ilan bulunamadı.</p>
            <p className="text-xs text-muted-foreground mt-1">İlk ilanı sen ekleyerek satışa başla!</p>
          </Card>
        )}
      </div>

      {/* New Listing Modal */}
      {isNewListingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
          <Card className="w-full max-w-md bg-card-gradient border-border p-5 rounded-2xl shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="font-display font-bold text-white uppercase text-base tracking-wide">
                İkinci El İlan Ver
              </h3>
              <button onClick={() => setIsNewListingOpen(false)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">İlan Başlığı</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Örn: Motosiklet kaskı" maxLength={120}
                  className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Kategori</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ListingCategory)}
                    className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground"
                  >
                    {categories.filter((c) => c !== "Tümü").map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Fiyat (TL)</label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="Örn: 4500"
                    className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Şehir</label>
                  <select
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground"
                  >
                    {TURKEY_PROVINCES.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">İletişim Tel (Opsiyonel)</label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0532..."
                    className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Ürün Açıklaması</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ürünün durumu, kullanım süresi ve teslimat detayları..."
                  className="w-full bg-card border border-border rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Fotoğraf URL (Opsiyonel)</label>
                <input
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://gorsel-linki.com/urun.jpg"
                  className="w-full bg-card border border-border rounded-xl p-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setIsNewListingOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-xs font-semibold text-muted-foreground"
                >
                  İptal
                </button>
                <button
                  onClick={handleCreateListing}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-white text-xs font-bold active:scale-95 transition-all shadow-md shadow-primary/30"
                >
                  Yayınla
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Listing Detail Modal */}
      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
          <Card className="w-full max-w-md bg-card-gradient border-border p-5 rounded-2xl shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <span className="text-[10px] font-extrabold bg-primary/20 text-primary px-2.5 py-0.5 rounded-full border border-primary/30 uppercase">
                {selectedListing.category}
              </span>
              <button onClick={() => setSelectedListing(null)} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedListing.image && (
              <div className="aspect-video rounded-xl overflow-hidden bg-muted border border-border">
                <img src={selectedListing.image} alt={selectedListing.title} className="w-full h-full object-cover" />
              </div>
            )}

            <div>
              <h2 className="font-bold text-white text-base leading-tight">{selectedListing.title}</h2>
              <p className="font-display text-2xl font-extrabold text-primary mt-1">
                {selectedListing.price.toLocaleString("tr-TR")} <span className="text-sm">TL</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">{selectedListing.city} • İlan Sahibi: {selectedListing.sellerName}</p>
            </div>

            <div className="bg-card p-3 rounded-xl border border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Açıklama</p>
              <p className="text-xs text-foreground leading-relaxed whitespace-pre-line">{selectedListing.description}</p>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setSelectedListing(null);
                  setLocation(`/chat/seller-${selectedListing.id}`);
                }}
                className="w-full bg-primary hover:bg-primary/90 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all shadow-md shadow-primary/30"
              >
                <MessageSquare className="w-4 h-4" /> Satıcıya Mesaj Gönder
              </button>

              {selectedListing.sellerPhone && (
                <a
                  href={`tel:${selectedListing.sellerPhone}`}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Phone className="w-4 h-4" /> Ara: {selectedListing.sellerPhone}
                </a>
              )}

              <button
                onClick={() => setReportTargetId(selectedListing.id)}
                className="w-full border border-destructive/40 text-destructive hover:bg-destructive/10 font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center gap-1.5"
              >
                <Flag className="w-3.5 h-3.5" /> İlanı Şikayet Et
              </button>
            </div>
          </Card>
        </div>
      )}

      {/* Report Modal */}
      {reportTargetId && (
        <ReportModal
          isOpen={Boolean(reportTargetId)}
          onClose={() => setReportTargetId(null)}
          targetType="listing"
          targetId={reportTargetId}
          reporterEmail={user?.email || undefined}
        />
      )}
    </div>
  );
}
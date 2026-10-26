import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Shield,
  MapPin,
  Users,
  ShoppingBag,
  ChevronRight,
  Bike,
  Fuel,
  Wrench,
  Truck,
  AlertTriangle,
  Award,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import Header from "@/components/Header";
import BannersRow from "@/components/BannersRow";
import Leaderboard from "@/components/Leaderboard";
import { sosService, SOSRequestItem } from "@/services/sosService";
import { marketplaceService, ListingItem } from "@/services/marketplaceService";
import EmergencyWarning from "@/components/EmergencyWarning";

export default function Home() {
  const [activeSOSList, setActiveSOSList] = useState<SOSRequestItem[]>([]);
  const [recentListings, setRecentListings] = useState<ListingItem[]>([]);

  useEffect(() => {
    setActiveSOSList(sosService.getActiveRequests());
    setRecentListings(marketplaceService.getListings().slice(0, 4));
  }, []);

  return (
    <div className="min-h-screen bg-asphalt pb-8">
      {/* Header */}
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden border-b border-border/50">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80"
            alt="Motosiklet yol"
            className="w-full h-full object-cover opacity-25"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/80 to-background" />
        </div>

        <div className="relative px-4 pt-8 pb-6 max-w-lg mx-auto">
          <div className="inline-flex items-center gap-1.5 bg-primary/15 border border-primary/30 px-3 py-1 rounded-full mb-3">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
              Türkiye Moto Dayanışması
            </span>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white uppercase leading-tight tracking-wide">
            YOLDA KALDIN?
            <br />
            <span className="text-primary text-glow-orange">TEK TUŞLA</span>
            <br />
            KARDEŞLERİNİ ÇAĞIR.
          </h1>

          <p className="text-muted-foreground mt-3 text-xs sm:text-sm max-w-sm leading-relaxed">
            Türkiye'nin motosiklet dayanışma platformu. Acil yardım, yol yardım, harita, topluluk ve pazar yeri tek yerde.
          </p>

          <div className="flex gap-3 mt-6">
            <Link href="/sos">
              <button className="flex-1 sm:flex-initial bg-gradient-to-r from-primary to-orange-600 hover:from-orange-600 hover:to-primary text-white font-extrabold text-sm px-6 py-3.5 rounded-xl active:scale-95 transition-all shadow-lg shadow-primary/30 flex items-center justify-center gap-2">
                <Shield className="w-5 h-5 animate-pulse" />
                🆘 Acil Yardım
              </button>
            </Link>

            <Link href="/harita">
              <button className="flex-1 sm:flex-initial bg-card-gradient border border-border/80 hover:border-primary/50 text-foreground font-bold text-sm px-6 py-3.5 rounded-xl active:scale-95 transition-all flex items-center justify-center gap-2">
                <MapPin className="w-5 h-5 text-primary" />
                📍 Harita
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* 112 Yasal Uyarı Banner */}
      <section className="px-4 mt-4 max-w-lg mx-auto">
        <EmergencyWarning />
      </section>

      {/* Aktif Yardım Talepleri Widget (Eğer varsa) */}
      {activeSOSList.length > 0 && (
        <section className="px-4 mt-6 max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
              <h2 className="font-display text-xs font-bold text-red-400 uppercase tracking-wider">
                CANLI YARDIM ÇAĞRILARI
              </h2>
            </div>
            <Link href="/yardim-talepleri">
              <span className="text-xs text-primary font-semibold hover:underline">Tümünü Gör</span>
            </Link>
          </div>

          <div className="space-y-2">
            {activeSOSList.map((sos) => (
              <Card key={sos.id} className="bg-gradient-to-r from-card to-red-950/20 border-red-500/40 p-3.5 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold">
                    🆘
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white uppercase">{sos.category} Talebi</p>
                    <p className="text-[11px] text-muted-foreground">{sos.requesterName || "Anonim Sürücü"} • {sos.createdAt}</p>
                  </div>
                </div>
                <Link href={`/chat/${sos.id}`}>
                  <button className="bg-red-600 hover:bg-red-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg active:scale-95 transition-transform">
                    Destek Ol
                  </button>
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Hızlı Erişim Kartları (Quick Access) */}
      <section className="px-4 mt-6 max-w-lg mx-auto">
        <h2 className="font-display text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Hızlı Erişim Yol Yardım
        </h2>
        <div className="grid grid-cols-4 gap-2.5">
          <QuickAccess path="/usta" icon={Wrench} label="Usta" color="text-blue-400" bg="bg-blue-500/10" />
          <QuickAccess path="/cekici" icon={Truck} label="Çekici" color="text-amber-400" bg="bg-amber-500/10" />
          <QuickAccess path="/benzinlik" icon={Fuel} label="Benzinlik" color="text-red-400" bg="bg-red-500/10" />
          <QuickAccess path="/lastikci" icon={Bike} label="Lastikçi" color="text-green-400" bg="bg-green-500/10" />
        </div>
      </section>

      {/* Banner / Sponsorlu Alan */}
      <section className="px-4 mt-6 max-w-lg mx-auto">
        <BannersRow />
      </section>

      {/* Liderlik Tablosu & Koruyucu Kardeşler */}
      <section className="px-4 mt-6 max-w-lg mx-auto">
        <Leaderboard />
      </section>

      {/* İkinci El Pazar Önizleme */}
      <section className="px-4 mt-6 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            <h2 className="font-display text-xs font-bold text-muted-foreground uppercase tracking-wider">
              İkinci El Pazar
            </h2>
          </div>
          <Link href="/ikinci-el">
            <span className="text-xs text-primary font-semibold flex items-center hover:underline">
              Tümü <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {recentListings.map((item) => (
            <Link key={item.id} href="/ikinci-el">
              <Card className="bg-card-gradient border-border overflow-hidden active:scale-[0.98] transition-transform group cursor-pointer">
                <div className="aspect-square bg-muted relative">
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-card">
                      <Bike className="w-10 h-10 text-muted-foreground/40" />
                    </div>
                  )}
                  <span className="absolute top-2 right-2 text-[9px] font-bold bg-background/90 text-foreground px-2 py-0.5 rounded-full border border-border">
                    {item.category}
                  </span>
                </div>
                <div className="p-3">
                  <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                  <p className="font-display text-base font-extrabold text-primary mt-1">
                    {item.price.toLocaleString("tr-TR")} <span className="text-xs">TL</span>
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.city}</p>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>

    </div>
  );
}

function QuickAccess({
  icon: Icon,
  label,
  color,
  bg,
  path,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  bg: string;
  path: string;
}) {
  return (
    <Link href={path}>
      <div className="flex flex-col items-center gap-2 bg-card-gradient border border-border/80 rounded-xl py-3.5 px-2 active:scale-95 transition-transform hover:border-primary/40 cursor-pointer">
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${color}`} />
        </div>
        <span className="text-xs font-bold text-foreground">{label}</span>
      </div>
    </Link>
  );
}

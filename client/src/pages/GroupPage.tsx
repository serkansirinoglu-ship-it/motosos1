import { useRoute } from "wouter";
import { useMembership } from "@/contexts/MembershipContext";

export default function GroupPage() {
  const [, params] = useRoute("/group/:city");
  const city = params?.city ? decodeURIComponent(params.city) : null;
  const { isMember, joinCity } = useMembership();

  if (!city) return <div className="min-h-screen bg-asphalt-light p-4 text-white page-surface-light">Geçersiz grup.</div>;

  return (
    <div className="min-h-screen bg-asphalt-light p-4 page-surface-light">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-display text-2xl text-white">{city} Grubu</h1>
        {!isMember(city) && <button onClick={() => joinCity(city)} className="px-3 py-1 rounded bg-primary text-white">Katıl</button>}
      </div>

      <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4" aria-live="polite">
        <h2 className="text-sm font-bold text-foreground">Şehir grubu mesajlaşması şu an kullanılamıyor</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Mevcut Firestore güvenlik kurallarında şehir grupları için ayrı bir mesajlaşma alanı bulunmuyor.
          Güvenli sunucu kaydı ve üyelik erişim kontrolleri hazır olmadan mesaj gönderimi açılmayacak.
        </p>
      </section>
    </div>
  );
}

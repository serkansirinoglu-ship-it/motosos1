import { useRoute } from "wouter";
import { useMembership } from "@/contexts/MembershipContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function GroupPage() {
  const [, params] = useRoute("/group/:city");
  const city = params?.city ? decodeURIComponent(params.city) : null;
  const { isMember, joinCity, leaveCity } = useMembership();
  const { user, authReady } = useAuth();
  const member = city ? isMember(city) : false;

  function handleJoin() {
    if (!authReady) return;
    if (!user) {
      (window as any).__openAuthModal?.();
      toast.error("Şehir grubuna katılmak için giriş yapın.");
      return;
    }
    if (!city) return;
    joinCity(city);
    toast.success("Şehir grubu katılımı bu cihazda kaydedildi.");
  }

  function handleLeave() {
    if (!city || !user) return;
    leaveCity(city);
    toast.success("Bu cihazdaki şehir grubu katılım kaydı kaldırıldı.");
  }

  if (!city) return <div className="min-h-screen bg-asphalt-light p-4 text-white page-surface-light">Geçersiz grup.</div>;

  return (
    <div className="min-h-screen bg-asphalt-light p-4 page-surface-light">
      <div className="flex items-center justify-between mb-4 gap-3">
        <h1 className="font-display text-2xl text-white">{city} Grubu</h1>
        {member ? (
          <button onClick={handleLeave} className="px-3 py-1 rounded border border-border text-muted-foreground">Katılımı bırak</button>
        ) : (
          <button onClick={handleJoin} disabled={!authReady} className="px-3 py-1 rounded bg-primary text-white disabled:opacity-50">Katıl</button>
        )}
      </div>

      <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4" aria-live="polite">
        <h2 className="text-sm font-bold text-foreground">Şehir grubu mesajlaşması şu an kullanılamıyor</h2>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Mevcut Firestore güvenlik kurallarında şehir grupları için ayrı bir mesajlaşma alanı bulunmuyor.
          Güvenli sunucu kaydı ve üyelik erişim kontrolleri hazır olmadan mesaj gönderimi açılmayacak.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          Katılım bilgisi yalnızca bu cihazda tutulur; bu işlem sunucu üyeliği oluşturmaz.
        </p>
      </section>
    </div>
  );
}

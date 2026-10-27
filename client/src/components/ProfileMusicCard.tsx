import { useEffect, useState } from "react";
import { Disc3, ExternalLink, Music2, Save, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { parseProfileMusicUrl, type ProfileMusicEmbed } from "@/services/profileMusic";

const storageKey = (userId: string) => "motoguard:profile-music:v1:" + userId;

function readSavedLink(userId: string): string {
  try { return window.localStorage.getItem(storageKey(userId)) || ""; } catch { return ""; }
}

function saveLink(userId: string, value: string): boolean {
  try {
    if (value) window.localStorage.setItem(storageKey(userId), value);
    else window.localStorage.removeItem(storageKey(userId));
    return true;
  } catch { return false; }
}

export default function ProfileMusicCard({ userId }: { userId: string | null }) {
  const [draft, setDraft] = useState("");
  const [savedLink, setSavedLink] = useState("");
  const [embed, setEmbed] = useState<ProfileMusicEmbed | null>(null);

  useEffect(() => {
    if (!userId || typeof window === "undefined") { setDraft(""); setSavedLink(""); setEmbed(null); return; }
    const value = readSavedLink(userId);
    const parsed = parseProfileMusicUrl(value);
    setDraft(value);
    setSavedLink(parsed?.canonicalUrl || "");
    setEmbed(parsed);
  }, [userId]);

  const handleSave = () => {
    if (!userId) { toast.error("Müzik bağlantısı eklemek için oturum açmalısınız."); return; }
    const trimmed = draft.trim();
    const parsed = trimmed ? parseProfileMusicUrl(trimmed) : null;
    if (trimmed && !parsed) { toast.error("Geçerli bir YouTube video veya Spotify parça/albüm/çalma listesi bağlantısı girin."); return; }
    if (!saveLink(userId, parsed?.canonicalUrl || "")) { toast.error("Bu cihazda müzik tercihi kaydedilemedi. Tarayıcı depolama iznini kontrol edin."); return; }
    setDraft(parsed?.canonicalUrl || ""); setSavedLink(parsed?.canonicalUrl || ""); setEmbed(parsed);
    toast.success(parsed ? "Profil müziği bu cihaza kaydedildi." : "Profil müziği kaldırıldı.");
  };

  return (
    <Card className="bg-card-gradient border-border p-4 rounded-xl space-y-3">
      <div className="flex items-center gap-2"><Disc3 className="w-4 h-4 text-primary" /><h3 className="font-display text-xs font-bold text-white uppercase tracking-wider">MotoGuard Profil Müziği</h3></div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">YouTube video veya Spotify parça, albüm ya da çalma listesi bağlantını ekle. Oynatma kullanıcı tarafından başlatılır.</p>
      <div className="flex gap-2">
        <input aria-label="YouTube veya Spotify müzik bağlantısı" type="url" inputMode="url" autoComplete="url" maxLength={2048} placeholder="https://youtu.be/... veya Spotify bağlantısı" value={draft} onChange={(event) => setDraft(event.target.value)} disabled={!userId} className="min-w-0 flex-1 bg-card border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary disabled:opacity-60" />
        <button type="button" onClick={handleSave} disabled={!userId} className="inline-flex items-center justify-center gap-1 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-white disabled:opacity-60"><Save className="h-3.5 w-3.5" />Kaydet</button>
      </div>
      {embed ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-foreground"><Music2 className="h-4 w-4 text-primary" />{embed.provider === "youtube" ? "YouTube oynatıcı" : "Spotify oynatıcı"}</div>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <iframe title={embed.provider === "youtube" ? "Profil müziği YouTube oynatıcısı" : "Profil müziği Spotify oynatıcısı"} src={embed.embedUrl} className="block w-full border-0" height={embed.provider === "youtube" ? 220 : 152} loading="lazy" referrerPolicy="strict-origin-when-cross-origin" allow={embed.provider === "spotify" ? "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" : "encrypted-media; picture-in-picture"} allowFullScreen />
          </div>
          <a href={savedLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-primary underline">Platformda aç <ExternalLink className="h-3 w-3" /></a>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-xl border border-dashed border-border bg-card/60 p-3 text-xs text-muted-foreground"><Music2 className="h-4 w-4 shrink-0" />Henüz profil müziği eklenmedi.</div>
      )}
      <p className="text-[10px] leading-relaxed text-muted-foreground">Şeffaflık: Bu ilk sürüm bağlantıyı yalnızca bu tarayıcıda ve bu kullanıcı için saklar; başka cihazlara veya diğer kullanıcıların profillerine senkronize etmez. Firestore güvenlik kuralları değiştirilmedi.</p>
      {savedLink && <button type="button" onClick={() => { setDraft(""); if (!saveLink(userId!, "")) { toast.error("Müzik tercihi kaldırılamadı."); return; } setSavedLink(""); setEmbed(null); toast.success("Profil müziği kaldırıldı."); }} className="inline-flex items-center gap-1 text-xs text-muted-foreground underline"><Trash2 className="h-3.5 w-3.5" />Müziği kaldır</button>}
    </Card>
  );
}
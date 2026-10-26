import { useState } from "react";
import { Flag, X, CheckCircle2 } from "lucide-react";
import { moderationService } from "@/services/moderationService";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: "post" | "listing" | "user" | "message" | "sos";
  targetId: string;
  reporterEmail?: string;
}

export default function ReportModal({
  isOpen,
  onClose,
  targetType,
  targetId,
  reporterEmail = "anonim@motoguard.tr",
}: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const reasonsMap: Record<string, string[]> = {
    post: ["Kötü Kötü Söylem / Küfür", "Yanıltıcı Bilgi", "Spam / Reklam", "Nefret Söylemi"],
    listing: ["Sahte İlan / Dolandırıcılık", "Hatalı Fiyat", "Yasaklı Ürün", "Spam İlan"],
    user: ["Taciz / Rahatsız Etme", "Sahte Profil", "Kötüye Kullanım"],
    sos: ["Sahte İhbar / Yanlış Konum", "Gereksiz Kullanım"],
    message: ["Küfür / Hakaret", "Spam / Rahatsız Etme"],
  };

  const currentReasons = reasonsMap[targetType] || ["Spam / Kötüye Kullanım", "Diğer"];

  const handleSubmit = async () => {
    if (!reason) {
      toast.error("Lütfen bir şikayet nedeni seçin.");
      return;
    }

    setSubmitting(true);
    moderationService.submitReport({
      targetType,
      targetId,
      reason,
      details,
      reportedBy: reporterEmail,
    });

    toast.info("Şikâyet bu oturumda yerel olarak kaydedildi; moderasyon ekibine gönderilmedi.");
    setSubmitting(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
      <Card className="w-full max-w-md bg-card-gradient border-border p-5 rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Flag className="w-5 h-5 text-destructive" />
            <h2 className="font-display font-bold text-white uppercase text-base tracking-wide">
              Şikayet Et & Bildir
            </h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div role="status" className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-200">
            Şikâyet sistemi henüz sunucuya bağlı değil. Gönderdiğiniz bildirim yalnızca bu oturumda tutulur; moderasyon ekibine iletilmez.
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-2">
              Şikayet Nedeni
            </label>
            <div className="space-y-2">
              {currentReasons.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-medium border transition-all flex items-center justify-between ${
                    reason === r
                      ? "bg-destructive/15 border-destructive text-destructive font-bold"
                      : "bg-card border-border text-foreground hover:border-border/80"
                  }`}
                >
                  <span>{r}</span>
                  {reason === r && <CheckCircle2 className="w-4 h-4 text-destructive" />}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Ek Detay (Opsiyonel)
            </label>
            <textarea
              rows={3}
              maxLength={1000}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Sorunu daha detaylı açıklayabilirsiniz..."
              className="w-full bg-card border border-border rounded-xl p-3 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-border text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              İptal
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-destructive text-white text-xs font-bold active:scale-95 transition-transform disabled:opacity-50"
            >
              {submitting ? "Kaydediliyor..." : "Yerel Olarak Kaydet"}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}

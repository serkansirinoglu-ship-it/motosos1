import { useState } from "react";
import { Link } from "wouter";
import { Award, Bike, CalendarDays, ChevronRight, Compass, MessageCircle, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";

const dailyQuestions = [
  {
    question: "Islak zeminde fren yaparken en güvenli yaklaşım hangisidir?",
    answers: ["Ani ve sert fren yapmak", "Frenleri kontrollü ve kademeli kullanmak", "Viraj içinde hızlanmak"],
    correctIndex: 1,
    explanation: "Islak zeminde tutuş azalır. Hızı önceden düşürmek ve frenleri kontrollü kullanmak güvenliği artırır.",
  },
  {
    question: "Viraja yaklaşırken en güvenli hazırlık hangisidir?",
    answers: ["Hızı virajın içinde sert frenle düşürmek", "Viraja girmeden uygun hıza düşmek", "Görüş alanı kapalıysa hızlanmak"],
    correctIndex: 1,
    explanation: "Viraj öncesinde uygun hıza düşmek ve görüş mesafesine göre sürmek kontrolü artırır.",
  },
  {
    question: "Sürüş sırasında telefon bildirimi geldiğinde ne yapmalısın?",
    answers: ["Ekrana kısa süre bakmak", "Sürerken mesaj yazmak", "Güvenli bir yerde durup kontrol etmek"],
    correctIndex: 2,
    explanation: "Dikkatin yoldan ayrılması riski artırır. Telefonu kontrol etmek için güvenli bir yerde dur.",
  },
  {
    question: "Takip mesafesi neden özellikle önemlidir?",
    answers: ["Öndeki aracın ani frenine tepki verebilmek için", "Daha hızlı sollama yapabilmek için", "Yakıt tüketimini her koşulda azaltmak için"],
    correctIndex: 0,
    explanation: "Yeterli takip mesafesi tehlikeyi fark etmek ve güvenli tepki vermek için zaman kazandırır.",
  },
  {
    question: "Uzun sürüş öncesi en doğru hazırlık hangisidir?",
    answers: ["Lastik ve frenleri kontrol etmek, dinlenmiş olmak", "Sadece yakıt seviyesine bakmak", "Yorgunluğu kahveyle tamamen gidermek"],
    correctIndex: 0,
    explanation: "Lastik, fren ve aydınlatma kontrolleriyle birlikte dinlenmiş olmak güvenli sürüşün temelidir.",
  },
];

export default function HomeEngagementSection() {
  const now = new Date();
  const dayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const dayNumber = Math.floor(new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 86400000);
  const dailyQuestion = dailyQuestions[((dayNumber % dailyQuestions.length) + dailyQuestions.length) % dailyQuestions.length];
  const storageKey = `motoguard_daily_safety_quiz_${dayKey}`;
  const [answer, setAnswer] = useState<number | null>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      const value = saved ? JSON.parse(saved).answer : null;
      return Number.isInteger(value) && value >= 0 && value < dailyQuestion.answers.length ? value : null;
    } catch {
      return null;
    }
  });
  const [showResult, setShowResult] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || "null")?.completed === true;
    } catch {
      return false;
    }
  });

  return (
    <section className="px-4 mt-8 mb-8 max-w-lg mx-auto space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-primary mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-[10px] font-extrabold uppercase tracking-[0.18em]">MotoGuard Dünyası</span>
          </div>
          <h2 className="font-display text-lg font-extrabold text-white">Yol burada devam ediyor</h2>
          <p className="text-xs text-muted-foreground mt-1">Keşfet, paylaş, güvenli sürüşünü geliştir.</p>
        </div>
        <Link href="/topluluk">
          <span className="text-xs font-bold text-primary flex items-center gap-1 whitespace-nowrap">Topluluk <ChevronRight className="w-4 h-4" /></span>
        </Link>
      </div>

      <Card className="relative overflow-hidden rounded-2xl border-primary/25 bg-gradient-to-br from-card via-card to-primary/10 p-4">
        <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
        <div className="relative flex items-start gap-3">
          <div className="w-11 h-11 shrink-0 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary">Günün güvenli sürüş testi</span>
              <span className="text-[9px] rounded-full border border-border px-2 py-0.5 text-muted-foreground">1 soru</span>
            </div>
            <h3 className="text-sm font-bold text-white leading-snug">{dailyQuestion.question}</h3>
            <div className="mt-3 space-y-2">
              {dailyQuestion.answers.map((item, index) => {
                const selected = answer === index;
                const correct = showResult && index === dailyQuestion.correctIndex;
                const incorrect = showResult && selected && index !== dailyQuestion.correctIndex;
                return (
                  <button
                    key={item}
                    type="button"
                    disabled={showResult}
                    onClick={() => setAnswer(index)}
                    className={`w-full text-left rounded-xl border px-3 py-2.5 text-xs transition-colors ${correct ? "border-emerald-500/60 bg-emerald-500/10 text-emerald-200" : incorrect ? "border-red-500/60 bg-red-500/10 text-red-200" : selected ? "border-primary bg-primary/10 text-white" : "border-border bg-background/40 text-muted-foreground hover:border-primary/50"}`}
                  >
                    <span className="mr-2 font-bold">{String.fromCharCode(65 + index)}.</span>{item}
                  </button>
                );
              })}
            </div>
            {!showResult ? (
              <button
                type="button"
                disabled={answer === null}
                onClick={() => {
                  setShowResult(true);
                  try { localStorage.setItem(storageKey, JSON.stringify({ answer, completed: true })); } catch { /* The quiz remains usable when storage is unavailable. */ }
                }}
                className="mt-3 w-full rounded-xl bg-primary px-4 py-2.5 text-xs font-extrabold text-white disabled:opacity-40"
              >
                Cevabı kontrol et
              </button>
            ) : (
              <div className="mt-3 rounded-xl border border-border bg-background/50 p-3">
                <p className="text-xs font-bold text-white">{answer === dailyQuestion.correctIndex ? "Doğru cevap!" : "Bir sonraki sefere daha dikkatli."}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{dailyQuestion.explanation}</p>
                <p className="mt-2 text-[11px] font-semibold text-primary">Yarın yeni bir güvenli sürüş sorusu seni bekliyor.</p>
              </div>
            )}
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/topluluk">
          <Card className="h-full rounded-2xl border-border bg-card-gradient p-4 active:scale-[0.98] transition-transform">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mb-3"><MessageCircle className="w-5 h-5 text-primary" /></div>
            <h3 className="text-sm font-extrabold text-white">Motorcu topluluğu</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Sürüş hikâyelerini paylaş, diğer motorcuları keşfet.</p>
            <span className="mt-3 flex items-center text-xs font-bold text-primary">Paylaşımlara git <ChevronRight className="w-3.5 h-3.5" /></span>
          </Card>
        </Link>
        <Link href="/etkinlikler">
          <Card className="h-full rounded-2xl border-border bg-card-gradient p-4 active:scale-[0.98] transition-transform">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-3"><CalendarDays className="w-5 h-5 text-orange-400" /></div>
            <h3 className="text-sm font-extrabold text-white">Sürüş buluşmaları</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Etkinlik alanını görüntüle ve yeni buluşmaları takip et.</p>
            <span className="mt-3 flex items-center text-xs font-bold text-primary">Etkinlikler <ChevronRight className="w-3.5 h-3.5" /></span>
          </Card>
        </Link>
        <Link href="/harita">
          <Card className="h-full rounded-2xl border-border bg-card-gradient p-4 active:scale-[0.98] transition-transform">
            <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center mb-3"><Compass className="w-5 h-5 text-sky-400" /></div>
            <h3 className="text-sm font-extrabold text-white">Yeni rota keşfet</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Haritayı aç, yolculuğunu planla.</p>
            <span className="mt-3 flex items-center text-xs font-bold text-primary">Haritayı aç <ChevronRight className="w-3.5 h-3.5" /></span>
          </Card>
        </Link>
        <Link href="/profil">
          <Card className="h-full rounded-2xl border-border bg-card-gradient p-4 active:scale-[0.98] transition-transform">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mb-3"><Trophy className="w-5 h-5 text-amber-400" /></div>
            <h3 className="text-sm font-extrabold text-white">Motorcu kimliğin</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Profilini düzenle ve topluluğa kendini tanıt.</p>
            <span className="mt-3 flex items-center text-xs font-bold text-primary">Profilim <ChevronRight className="w-3.5 h-3.5" /></span>
          </Card>
        </Link>
      </div>

      <div className="rounded-2xl border border-border bg-background/40 px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Award className="w-4 h-4 text-primary" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white">Her katkı topluluğu güçlendirir</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Faydalı paylaşım yap, güvenli sürüş bilgisini yay ve diğer motorculara destek ol.</p>
        </div>
        <Bike className="w-5 h-5 text-primary/70 shrink-0" />
      </div>
    </section>
  );
}

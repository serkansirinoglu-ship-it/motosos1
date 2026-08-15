import { useState, useEffect, useRef } from "react";
import { useMessages } from "@/contexts/MessageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useRoute, Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Header from "@/components/Header";
import { Send, CheckCircle2, ChevronLeft, ShieldAlert, User, Clock, AlertCircle } from "lucide-react";

export default function ChatPage() {
  const [match, params] = useRoute("/chat/:id");
  const id = params?.id as string | undefined;
  const { messages, sendMessage, helpRequests, subscribeToMessages, acceptHelp, resolveHelp } = useMessages();
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [localMsgs, setLocalMsgs] = useState<any[]>([]);
  const listRef = useRef<HTMLDivElement | null>(null);

  const chatId = id || "";

  useEffect(() => {
    if (!chatId) return;
    if (subscribeToMessages) {
      const unsub = subscribeToMessages(chatId, (arr: any[]) => setLocalMsgs(arr));
      return () => unsub && unsub();
    }
  }, [chatId, subscribeToMessages]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [localMsgs.length, messages[chatId]?.length]);

  if (!id || !chatId) {
    return (
      <div className="min-h-screen bg-asphalt pb-8">
        <Header />
        <div className="px-4 pt-12 text-center max-w-md mx-auto">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-display font-bold text-white text-lg">Geçersiz Sohbet</h2>
          <p className="text-xs text-muted-foreground mt-1">Aradığınız sohbet odası bulunamadı veya kapatılmış.</p>
          <Link href="/topluluk">
            <Button className="mt-4 bg-primary text-white font-bold text-xs">Topluluğa Dön</Button>
          </Link>
        </div>
      </div>
    );
  }

  const msgs = localMsgs.length ? localMsgs : messages[chatId] || [];
  const req = helpRequests.find((r) => r.id === chatId);
  const userEmail = user?.email || null;

  const handleSend = () => {
    if (!text.trim() || !chatId) return;
    sendMessage(chatId, text.trim(), user?.email || null);
    setText("");
  };

  const handleAccept = () => {
    if (!chatId) return;
    if (!userEmail) {
      (window as any).__openAuthModal?.();
      return;
    }
    acceptHelp(chatId, userEmail);
    toast.success("Yardım talebi kabul edildi. Sürücü ile iletişime geçebilirsiniz.");
  };

  const handleResolveClick = () => {
    if (!chatId) return;
    if (!userEmail) {
      (window as any).__openAuthModal?.();
      return;
    }
    resolveHelp(chatId, userEmail);
    toast.success("Yardım çözüldü olarak işaretlendi! Puan ve rozetiniz güncellendi.");
  };

  return (
    <div className="min-h-screen bg-asphalt pb-8 flex flex-col">
      <Header />

      <div className="px-4 pt-3 max-w-lg mx-auto w-full flex-1 flex flex-col">
        {/* Chat Header */}
        <Card className="bg-card-gradient border-border p-3.5 rounded-xl flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Link href="/topluluk">
              <button className="p-1.5 rounded-lg bg-card border border-border text-muted-foreground hover:text-foreground">
                <ChevronLeft className="w-5 h-5" />
              </button>
            </Link>
            <div>
              <h1 className="font-display font-bold text-white text-sm uppercase tracking-wide">
                {req?.title || "MotoGuard Canlı Sohbet"}
              </h1>
              <p className="text-[11px] text-muted-foreground truncate max-w-[220px]">
                {req?.description || "Motosiklet Dayanışma Hattı"}
              </p>
            </div>
          </div>
        </Card>

        {/* Messages List Area */}
        <Card className="flex-1 bg-card-gradient border-border p-4 rounded-2xl flex flex-col justify-between overflow-hidden shadow-xl min-h-[380px]">
          <div className="flex-1 overflow-y-auto space-y-3 pr-1" ref={listRef}>
            {msgs.length > 0 ? (
              msgs.map((m) => {
                const isMe = m.from === user?.email;
                return (
                  <div
                    key={m.id}
                    className={`flex flex-col max-w-[82%] ${isMe ? "ml-auto items-end" : "items-start"}`}
                  >
                    <span className="text-[10px] text-muted-foreground mb-0.5 px-1">
                      {m.from ? m.from.split("@")[0] : "Anonim Motorcu"}
                    </span>
                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? "bg-primary text-white rounded-br-none shadow-md shadow-primary/20 font-medium"
                          : "bg-card border border-border text-foreground rounded-bl-none"
                      }`}
                    >
                      {m.text}
                    </div>
                    <span className="text-[9px] text-muted-foreground/70 mt-1 px-1">
                      {m.ts ? new Date(m.ts).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) : "Şimdi"}
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <Clock className="w-10 h-10 text-muted-foreground/30 mb-2" />
                <p className="text-xs font-bold text-muted-foreground">Henüz mesaj gönderilmedi.</p>
                <p className="text-[11px] text-muted-foreground/70 mt-0.5">İlk mesajı yazarak yardımlaşmayı başlatın.</p>
              </div>
            )}
          </div>

          {/* Input & Quick Action Bar */}
          <div className="pt-3 border-t border-border/60 space-y-2">
            <div className="flex gap-2">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Mesajınızı yazın..."
                className="flex-1 bg-card border border-border rounded-xl px-3.5 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
              />
              <button
                onClick={handleSend}
                className="bg-primary hover:bg-primary/90 text-white p-2.5 rounded-xl active:scale-95 transition-all shadow-md shadow-primary/30"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {req && (
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleAccept}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold text-xs py-2 rounded-xl active:scale-95 transition-all shadow-md shadow-green-600/20"
                >
                  Yardımı Kabul Et
                </button>
                <button
                  onClick={handleResolveClick}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white font-bold text-xs py-2 rounded-xl active:scale-95 transition-all shadow-md shadow-primary/20"
                >
                  Yardım Tamamlandı
                </button>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
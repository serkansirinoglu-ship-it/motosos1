import { useEffect, useState } from "react";
import { Bell, Check, X, Shield, MessageSquare, AlertCircle, ShoppingBag } from "lucide-react";
import { notificationService, AppNotification } from "@/services/notificationService";
import { Card } from "@/components/ui/card";
import { Link } from "wouter";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationModal({ isOpen, onClose }: NotificationModalProps) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const unsub = notificationService.subscribe(setNotifications);
    return () => unsub();
  }, []);

  if (!isOpen) return null;

  const getIcon = (type: AppNotification["type"]) => {
    switch (type) {
      case "sos":
        return <Shield className="w-4 h-4 text-primary" />;
      case "message":
        return <MessageSquare className="w-4 h-4 text-blue-400" />;
      case "marketplace":
        return <ShoppingBag className="w-4 h-4 text-amber-400" />;
      default:
        return <Bell className="w-4 h-4 text-green-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in">
      <Card className="w-full max-w-md bg-card-gradient border-border p-5 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <h2 className="font-display font-bold text-white uppercase text-base tracking-wide">
              Bildirimler
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => notificationService.markAllAsRead()}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" /> Tümünü Okundu İşaretle
            </button>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {notifications.length > 0 ? (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => notificationService.markAsRead(n.id)}
                className={`p-3 rounded-xl border transition-all ${
                  n.read
                    ? "bg-card/40 border-border/50 text-muted-foreground"
                    : "bg-card border-primary/30 text-foreground shadow-md"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-muted/60 mt-0.5">{getIcon(n.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm truncate">{n.title}</p>
                      <span className="text-[10px] text-muted-foreground">{n.createdAt}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-normal">{n.body}</p>
                    {n.targetUrl && (
                      <Link href={n.targetUrl} onClick={onClose}>
                        <span className="inline-block text-xs font-semibold text-primary hover:underline mt-2">
                          Detaya Git →
                        </span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <AlertCircle className="w-10 h-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">Henüz bildiriminiz bulunmuyor.</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

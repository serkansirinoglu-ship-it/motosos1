import { useEffect, useState } from "react";
import Logo from "./Logo";
import { Bell, User, ShieldAlert } from "lucide-react";
import NotificationModal from "./NotificationModal";
import { notificationService } from "@/services/notificationService";
import { useAuth } from "@/contexts/AuthContext";
import { subscribeOnlineMembers } from "../../../firebase";
import { Link } from "wouter";

interface HeaderProps {
  onAuthOpen?: () => void;
}

export default function Header({ onAuthOpen }: HeaderProps) {
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(notificationService.getUnreadCount());
  const { user } = useAuth();
  const [onlineCount, setOnlineCount] = useState<number | null>(null);

  useEffect(() => {
    setOnlineCount(null);
    if (!user?.uid) return;
    return subscribeOnlineMembers(user.uid, setOnlineCount);
  }, [user?.uid]);

  return (
    <>
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur-xl border-b border-border shadow-sm">
        <div className="px-4 h-15 flex items-center justify-between">
          <Logo size="md" />

          <div className="flex items-center gap-3">
            {/* Verified online member count; hidden until realtime presence is available. */}
            {onlineCount !== null && (
              <div
                className="hidden xs:flex items-center gap-1.5 bg-primary/10 border border-primary/20 px-2.5 py-1 rounded-full"
                aria-label={`${onlineCount} aktif üye`}
                title="Son 2 dakika içinde çevrimiçi olan giriş yapmış üyeler"
              >
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[11px] font-medium text-foreground">{onlineCount} aktif üye</span>
              </div>
            )}

            {/* Notification Bell */}
            <button
              onClick={() => setIsNotifOpen(true)}
              className="relative p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground active:scale-95 transition-all"
              aria-label="Bildirimler"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* User Profile / Auth Button */}
            {user ? (
              <Link href="/profil">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-amber-500/20 border border-primary/40 flex items-center justify-center text-primary font-bold text-xs uppercase cursor-pointer hover:border-primary active:scale-95 transition-all">
                  {user.email?.charAt(0).toUpperCase() || "M"}
                </div>
              </Link>
            ) : (
              <button
                onClick={onAuthOpen || (() => (window as any).__openAuthModal?.())}
                className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-all shadow-md shadow-primary/20"
              >
                <User className="w-4 h-4" />
                Giriş Yap
              </button>
            )}
          </div>
        </div>
      </header>

      <NotificationModal isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
    </>
  );
}

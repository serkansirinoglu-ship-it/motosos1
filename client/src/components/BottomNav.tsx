import { Link, useLocation } from "wouter";
import { Home, MapPin, Users, User, ShieldAlert } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

export default function BottomNav({ onAuthOpen, isAuthenticated }: { onAuthOpen?: () => void; isAuthenticated?: boolean }) {
  const [location] = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Ana Sayfa" },
    { path: "/harita", icon: MapPin, label: "Harita" },
    { path: "/topluluk", icon: Users, label: "Topluluk" },
    { path: "/profil", icon: User, label: "Profil" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border shadow-2xl">
      <div className="flex items-center justify-around h-16 px-2 max-w-md mx-auto relative">
        {/* Sol 2 Sekme */}
        <div className="flex flex-1 justify-around">
          <NavItem item={navItems[0]} active={location === "/"} />
          <NavItem item={navItems[1]} active={location === "/harita"} />
        </div>

        {/* Ortadaki ACİL Butonu */}
        <div className="flex-shrink-0 px-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="/sos">
                <div className="relative group cursor-pointer">
                  <div className="absolute inset-0 sos-pulse rounded-full bg-primary/40" />
                  <div className="relative w-15 h-15 -mt-7 rounded-full bg-gradient-to-tr from-primary via-orange-500 to-amber-500 flex flex-col items-center justify-center shadow-lg shadow-primary/50 border-2 border-white/20 active:scale-95 group-hover:scale-105 transition-all">
                    <ShieldAlert className="w-6 h-6 text-white animate-pulse" />
                    <span className="font-display font-extrabold text-white text-[10px] uppercase tracking-wider leading-none mt-0.5">
                      ACİL
                    </span>
                  </div>
                </div>
              </Link>
            </TooltipTrigger>
            <TooltipContent sideOffset={8} className="bg-primary text-white font-bold text-xs">
              Acil Yardım Çağır
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Sağ 2 Sekme */}
        <div className="flex flex-1 justify-around">
          <NavItem item={navItems[2]} active={location === "/topluluk"} />
          <NavItem
            item={navItems[3]}
            active={location === "/profil"}
            onAuthOpen={onAuthOpen}
            isAuthenticated={isAuthenticated}
          />
        </div>
      </div>
    </nav>
  );
}

function NavItem({
  item,
  active,
  onAuthOpen,
  isAuthenticated,
}: {
  item: { path: string; icon: React.ComponentType<{ className?: string }>; label: string };
  active: boolean;
  onAuthOpen?: () => void;
  isAuthenticated?: boolean;
}) {
  const Icon = item.icon;

  if (item.path === "/profil" && !isAuthenticated && onAuthOpen) {
    return (
      <button
        type="button"
        onClick={onAuthOpen}
        className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all text-muted-foreground hover:text-foreground active:scale-95"
      >
        <Icon className="w-5 h-5" />
        <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
      </button>
    );
  }

  return (
    <Link href={item.path}>
      <div
        className={`flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl transition-all cursor-pointer active:scale-95 ${
          active
            ? "text-primary font-bold bg-primary/10 border border-primary/20"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <Icon className={`w-5 h-5 ${active ? "text-primary animate-pulse" : ""}`} />
        <span className="text-[10px] font-semibold tracking-wide">{item.label}</span>
      </div>
    </Link>
  );
}

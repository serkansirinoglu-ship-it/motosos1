import React from 'react';
import { Megaphone, ShieldCheck } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAdmin } from '@/contexts/AdminContext';

type BannerItem = {
  id: string;
  title?: string;
  subtitle?: string;
  image?: string;
  link?: string;
  sponsorName?: string;
  active?: boolean;
};

export default function BannersRow() {
  const { banners } = useAdmin();
  const active: BannerItem[] = Array.isArray(banners)
    ? banners.filter((banner: BannerItem) => banner?.active && banner?.title)
    : [];

  if (active.length > 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3" aria-label="Reklam ve sponsor alanları">
        {active.map((banner) => {
          const content = (
            <Card className="p-0 overflow-hidden min-h-36 flex items-center justify-center border-border/80 bg-card-gradient">
              {banner.image ? (
                <img src={banner.image} alt={banner.title || 'Sponsorlu içerik'} loading="lazy" className="w-full h-36 object-cover" />
              ) : (
                <div className="w-full min-h-36 flex flex-col items-center justify-center gap-2 bg-gradient-to-r from-primary/10 to-orange-500/10 p-4 text-center">
                  <Megaphone className="w-6 h-6 text-primary" aria-hidden="true" />
                  <span className="text-base font-semibold text-foreground">{banner.title}</span>
                  {banner.subtitle && <span className="text-xs text-muted-foreground">{banner.subtitle}</span>}
                  {banner.sponsorName && <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{banner.sponsorName} · Sponsorlu</span>}
                </div>
              )}
            </Card>
          );

          return banner.link && /^https?:\/\//i.test(banner.link) ? (
            <a key={banner.id} href={banner.link} target="_blank" rel="noopener noreferrer" aria-label={`${banner.title}, yeni sekmede açılır`}>
              {content}
            </a>
          ) : (
            <div key={banner.id}>{content}</div>
          );
        })}
      </div>
    );
  }

  // Keep the home-page ad area visible even before a real sponsor campaign is published.
  // Do not fabricate sponsors, discount claims, or third-party links.
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3" aria-label="Reklam ve sponsor alanları">
      <Card className="min-h-36 p-4 flex flex-col items-center justify-center gap-2 text-center border-dashed border-primary/40 bg-gradient-to-br from-primary/10 to-orange-500/5">
        <Megaphone className="w-6 h-6 text-primary" aria-hidden="true" />
        <p className="text-sm font-bold text-foreground">Reklam alanı</p>
        <p className="text-xs text-muted-foreground">MotoGuard’da yayımlanan reklamlar burada gösterilir.</p>
      </Card>
      <Card className="min-h-36 p-4 flex flex-col items-center justify-center gap-2 text-center border-dashed border-border/80 bg-card-gradient">
        <ShieldCheck className="w-6 h-6 text-primary" aria-hidden="true" />
        <p className="text-sm font-bold text-foreground">Sponsorlu içerik</p>
        <p className="text-xs text-muted-foreground">Yalnızca yönetim panelinden yayımlanan gerçek kampanyalar gösterilir.</p>
      </Card>
    </div>
  );
}

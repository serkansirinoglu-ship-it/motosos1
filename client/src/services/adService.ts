/**
 * AdService — Abstraction layer for monetization and advertising in MotoGuard.
 * Keeps ad loading logic decoupled from core UI components.
 * IMPORTANT: Emergency / SOS screens MUST NEVER contain aggressive ads.
 */

export interface AdBanner {
  id: string;
  title: string;
  subtitle?: string;
  image?: string;
  link?: string;
  sponsorName?: string;
  targetCategory?: string;
  active: boolean;
  type: 'banner' | 'native' | 'sponsored_business';
}

const SAMPLE_BANNERS: AdBanner[] = [
  {
    id: 'ban-1',
    title: 'Motosiklet Sigortanı Kolayca Al',
    subtitle: 'MotoGuard üyelerine özel %15 indirim avantajı!',
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80',
    link: 'https://example.com/sigorta',
    sponsorName: 'Motovip Sigorta',
    active: true,
    type: 'banner',
  },
  {
    id: 'ban-2',
    title: 'Shoei & Alpinestars Bahar Fırsatları',
    subtitle: 'Ekipmanlarda peşin fiyatına 6 taksit.',
    image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80',
    link: 'https://example.com/ekipman',
    sponsorName: 'MotoMağaza Türkiye',
    active: true,
    type: 'native',
  },
];

class AdService {
  private banners: AdBanner[] = [...SAMPLE_BANNERS];

  public getBanners(type?: AdBanner['type']): AdBanner[] {
    if (!type) return this.banners.filter((b) => b.active);
    return this.banners.filter((b) => b.active && b.type === type);
  }

  public registerBanner(banner: Omit<AdBanner, 'id'>): AdBanner {
    const newBanner: AdBanner = {
      ...banner,
      id: `ban-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    };
    this.banners.unshift(newBanner);
    return newBanner;
  }

  public removeBanner(id: string): boolean {
    const initialLen = this.banners.length;
    this.banners = this.banners.filter((b) => b.id !== id);
    return this.banners.length < initialLen;
  }
}

export const adService = new AdService();
export default adService;

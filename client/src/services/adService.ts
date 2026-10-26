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

// No invented users, comments, sponsors, offers, or discount claims are shown as real data.
const SAMPLE_BANNERS: AdBanner[] = [];

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

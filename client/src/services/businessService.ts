/**
 * BusinessService — Manages Business Profiles & Mechanics (Usta, Lastikçi, Çekici, Servis, Mağaza, Benzinlik)
 * Includes sponsorship/tier logic: 'standard' | 'featured' | 'premium' | 'sponsored'
 */

export type BusinessCategory = 'usta' | 'lastikci' | 'cekici' | 'servis' | 'magaza' | 'benzinlik';

export interface BusinessReview {
  id: string;
  userName: string;
  userEmail?: string;
  rating: number; // 1 - 5
  comment: string;
  createdAt: string;
}

export interface BusinessProfile {
  id: string;
  name: string;
  category: BusinessCategory;
  city: string;
  address: string;
  phone: string;
  workingHours: string;
  lat: number;
  lng: number;
  photo?: string;
  rating: number;
  reviewCount: number;
  reviews: BusinessReview[];
  tier: 'standard' | 'featured' | 'premium' | 'sponsored';
  verified: boolean;
  description?: string;
}

// Never seed invented business names, contact numbers, addresses, ratings, or verification badges.
const DEFAULT_BUSINESSES: BusinessProfile[] = [];

class BusinessService {
  private businesses: BusinessProfile[] = [...DEFAULT_BUSINESSES];

  public getBusinesses(category?: BusinessCategory, city?: string): BusinessProfile[] {
    let result = [...this.businesses];
    if (category) {
      result = result.filter((b) => b.category === category);
    }
    if (city) {
      result = result.filter((b) => b.city.toLowerCase() === city.toLowerCase());
    }
    // Sort sponsored & premium first
    const tierPriority = { sponsored: 0, premium: 1, featured: 2, standard: 3 };
    return result.sort((a, b) => tierPriority[a.tier] - tierPriority[b.tier]);
  }

  public getById(id: string): BusinessProfile | undefined {
    return this.businesses.find((b) => b.id === id);
  }

  public addReview(businessId: string, review: Omit<BusinessReview, 'id' | 'createdAt'>): boolean {
    const biz = this.getById(businessId);
    if (!biz) return false;
    const newRev: BusinessReview = {
      ...review,
      id: `rev-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    biz.reviews.unshift(newRev);
    biz.reviewCount = biz.reviews.length;
    const totalRating = biz.reviews.reduce((acc, r) => acc + r.rating, 0);
    biz.rating = Number((totalRating / biz.reviewCount).toFixed(1));
    return true;
  }

  public createBusiness(biz: Omit<BusinessProfile, 'id' | 'rating' | 'reviewCount' | 'reviews'>): BusinessProfile {
    const newBiz: BusinessProfile = {
      ...biz,
      id: `biz-${Date.now()}`,
      rating: 5.0,
      reviewCount: 0,
      reviews: [],
    };
    this.businesses.unshift(newBiz);
    return newBiz;
  }

  public updateTier(id: string, tier: BusinessProfile['tier']): boolean {
    const biz = this.getById(id);
    if (!biz) return false;
    biz.tier = tier;
    return true;
  }
}

export const businessService = new BusinessService();
export default businessService;

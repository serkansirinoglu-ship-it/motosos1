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

const DEFAULT_BUSINESSES: BusinessProfile[] = [
  {
    id: 'biz-1',
    name: 'Ege Moto Usta & Servis',
    category: 'usta',
    city: 'İzmir',
    address: 'Alsancak Mah. 1456 Sk. No: 12, Konak / İzmir',
    phone: '0232 456 78 90',
    workingHours: '08:30 - 19:30 (Pazar Kapalı)',
    lat: 38.432,
    lng: 27.143,
    photo: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=600&q=80',
    rating: 4.9,
    reviewCount: 42,
    reviews: [
      { id: 'r1', userName: 'Ahmet K.', rating: 5, comment: 'Yolda kalmıştım, 15 dakikada geldiler. Harika usta!', createdAt: '2026-07-15' },
    ],
    tier: 'premium',
    verified: true,
    description: 'Japon ve Avrupa motosikletlerinde 15 yıllık tecrübe, orijinal yedek parça desteği.',
  },
  {
    id: 'biz-2',
    name: 'Anadolu Moto Çekici & Yol Yardım',
    category: 'cekici',
    city: 'İstanbul',
    address: 'Karaköy Rıhtım Cad. No: 45, Beyoğlu / İstanbul',
    phone: '0532 999 88 77',
    workingHours: '7/24 Kesintisiz Hizmet',
    lat: 41.025,
    lng: 28.974,
    photo: 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80',
    rating: 4.8,
    reviewCount: 89,
    reviews: [
      { id: 'r2', userName: 'Caner T.', rating: 5, comment: 'Gece saat 2’de Otoyol 7 üzerinde aküm bitti. Hemen geldiler.', createdAt: '2026-08-01' },
    ],
    tier: 'sponsored',
    verified: true,
    description: 'Motosiklete özel sabitleme aparatlı 7/24 hızlı şehir içi ve şehirler arası çekici.',
  },
  {
    id: 'biz-3',
    name: 'Hızlı Lastik & Jant Servisi',
    category: 'lastikci',
    city: 'Ankara',
    address: 'Şaşmaz Oto Sanayi 2. Cadde No: 88, Etimesgut / Ankara',
    phone: '0312 333 44 55',
    workingHours: '08:00 - 20:00',
    lat: 39.935,
    lng: 32.785,
    photo: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=600&q=80',
    rating: 4.7,
    reviewCount: 31,
    reviews: [],
    tier: 'featured',
    verified: true,
    description: 'Michelin, Pirelli, Metzeler motosiklet lastiği satışı ve dinamik balans ayarı.',
  },
  {
    id: 'biz-4',
    name: 'Toros Motosiklet Mağazası & Ekipman',
    category: 'magaza',
    city: 'Antalya',
    address: 'Işıklar Cad. No: 102, Muratpaşa / Antalya',
    phone: '0242 222 11 00',
    workingHours: '09:00 - 20:00',
    lat: 36.885,
    lng: 30.708,
    photo: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80',
    rating: 4.9,
    reviewCount: 65,
    reviews: [],
    tier: 'premium',
    verified: true,
    description: 'Kask, mont, eldiven, interkom ve aksesuar çeşitlerinde geniş stok.',
  },
];

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

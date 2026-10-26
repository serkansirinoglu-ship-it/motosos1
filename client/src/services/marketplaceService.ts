/**
 * MarketplaceService — Handles Motorcycle Marketplace listings, categories,
 * searching, and listing moderation.
 */

export type ListingCategory =
  | 'Motosiklet'
  | 'Kask'
  | 'Mont'
  | 'Pantolon'
  | 'Eldiven'
  | 'Lastik'
  | 'Parça'
  | 'Aksesuar'
  | 'Diğer';

export interface ListingItem {
  id: string;
  title: string;
  category: ListingCategory;
  price: number;
  city: string;
  description: string;
  image?: string;
  sellerName: string;
  sellerPhone?: string;
  createdAt: string;
  featured?: boolean;
}

const INITIAL_LISTINGS: ListingItem[] = [
  {
    id: 'mkt-1',
    title: 'Shoei NXR2 Kask - M Beden (Çiziksiz)',
    category: 'Kask',
    price: 18500,
    city: 'İzmir',
    description: 'Sadece 3 ay hafta sonu sürüldü. Pinlock takılı, taşıma kılıfı ve kutusuyla teslim verilecektir.',
    image: 'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=600&q=80',
    sellerName: 'Kaan Demir',
    sellerPhone: '0533 111 22 33',
    createdAt: '2026-08-10',
    featured: true,
  },
  {
    id: 'mkt-2',
    title: 'Alpinestars Stella Su Geçirmez Mont',
    category: 'Mont',
    price: 9200,
    city: 'İstanbul',
    description: 'CE korumalı, kışlık termal içliği mevcut. L beden, temiz kullanıldı.',
    image: 'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=600&q=80',
    sellerName: 'Deniz Aksu',
    createdAt: '2026-08-11',
    featured: false,
  },
  {
    id: 'mkt-3',
    title: 'Pirelli Diablo Rosso IV Örnek Set (120/70 & 180/55)',
    category: 'Lastik',
    price: 11000,
    city: 'Ankara',
    description: '2025/44. hafta üretimi. Hiç takılmadı, ambalajında.',
    image: 'https://images.unsplash.com/photo-1578844251758-2f71da64c96f?auto=format&fit=crop&w=600&q=80',
    sellerName: 'Murat Kara',
    createdAt: '2026-08-09',
    featured: false,
  },
];

class MarketplaceService {
  private listings: ListingItem[] = [...INITIAL_LISTINGS];

  public getListings(category?: string, query?: string, city?: string): ListingItem[] {
    let list = [...this.listings];
    if (category && category !== 'Tümü') {
      list = list.filter((l) => l.category === category);
    }
    if (city && city !== 'Tümü') {
      list = list.filter((l) => l.city.toLowerCase() === city.toLowerCase());
    }
    if (query && query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (l) => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public getById(id: string): ListingItem | undefined {
    return this.listings.find((l) => l.id === id);
  }

  public createListing(listing: Omit<ListingItem, 'id' | 'createdAt'>): ListingItem {
    const newListing: ListingItem = {
      ...listing,
      id: `mkt-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.listings.unshift(newListing);
    return newListing;
  }

  public deleteListing(id: string): boolean {
    const initLen = this.listings.length;
    this.listings = this.listings.filter((l) => l.id !== id);
    return this.listings.length < initLen;
  }
}

export const marketplaceService = new MarketplaceService();
export default marketplaceService;

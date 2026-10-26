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

class MarketplaceService {
  // Do not present hard-coded sample offers as real marketplace listings.
  // Listings remain session-local until a verified persistent backend is integrated.
  private listings: ListingItem[] = [];

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

  public createListing(listing: Omit<ListingItem, 'id' | 'createdAt'>): ListingItem | null {
    const allowedCategories: ListingCategory[] = [
      'Motosiklet', 'Kask', 'Mont', 'Pantolon', 'Eldiven', 'Lastik', 'Parça', 'Aksesuar', 'Diğer',
    ];
    const title = typeof listing.title === 'string' ? listing.title.trim() : '';
    const description = typeof listing.description === 'string' ? listing.description.trim() : '';
    const city = typeof listing.city === 'string' ? listing.city.trim() : '';
    const sellerName = typeof listing.sellerName === 'string' ? listing.sellerName.trim() : '';
    const image = typeof listing.image === 'string' ? listing.image.trim() : '';
    const sellerPhone = typeof listing.sellerPhone === 'string' ? listing.sellerPhone.trim() : '';

    if (
      !title || title.length > 160 ||
      !description || description.length > 5000 ||
      !city || city.length > 100 ||
      !sellerName || sellerName.length > 80 ||
      !allowedCategories.includes(listing.category) ||
      typeof listing.price !== 'number' || !Number.isFinite(listing.price) || listing.price <= 0 ||
      (image.length > 0 && (image.length > 2048 || !isHttpUrl(image))) ||
      sellerPhone.length > 40
    ) {
      return null;
    }

    const newListing: ListingItem = {
      ...listing,
      title,
      description,
      city,
      sellerName,
      image: image || undefined,
      sellerPhone: sellerPhone || undefined,
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

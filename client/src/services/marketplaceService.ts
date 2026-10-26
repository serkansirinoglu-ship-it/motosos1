import { getApps } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { collection, deleteDoc, doc, getFirestore, onSnapshot, orderBy, query, serverTimestamp, setDoc, type Firestore } from "firebase/firestore";

const marketplaceApp = getApps()[0];
const marketplaceAuth: Auth | null = marketplaceApp ? getAuth(marketplaceApp) : null;
const marketplaceDb: Firestore | null = marketplaceApp ? getFirestore(marketplaceApp) : null;

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
  sellerId?: string;
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

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

class MarketplaceService {
  // Server snapshots are the source of truth; never fabricate marketplace records.
  private listings: ListingItem[] = [];

  public subscribeRemoteListings(
    onListings: (listings: ListingItem[]) => void,
    onError: (error: unknown) => void,
    shouldApply: () => boolean = () => true,
  ): () => void {
    if (!marketplaceDb) throw new Error("Firebase yapılandırılmamış; pazar yeri sunucuya bağlanamadı.");
    const listingsQuery = query(collection(marketplaceDb, "listings"), orderBy("createdAt", "desc"));
    return onSnapshot(listingsQuery, (snapshot) => {
      if (!shouldApply()) return;
      const remoteListings = snapshot.docs.map((item) => {
        const data = item.data();
        const timestamp = data.createdAt;
        const createdAt = timestamp && typeof timestamp.toDate === "function" ? timestamp.toDate().toISOString() : "";
        return {
          id: item.id,
          sellerId: String(data.sellerId || ""),
          title: String(data.title || ""),
          category: data.category as ListingCategory,
          price: typeof data.price === "number" ? data.price : 0,
          city: String(data.city || ""),
          description: String(data.description || ""),
          image: typeof data.image === "string" ? data.image : undefined,
          sellerName: String(data.sellerName || "İlan Sahibi"),
          sellerPhone: typeof data.sellerPhone === "string" ? data.sellerPhone : undefined,
          createdAt,
          featured: data.featured === true,
        } satisfies ListingItem;
      });
      this.listings = remoteListings;
      onListings(remoteListings);
    }, (error) => {
      if (shouldApply()) onError(error);
    });
  }

  public async createRemoteListing(input: Omit<ListingItem, "id" | "createdAt" | "sellerId" | "featured"> & { sellerId: string }): Promise<string> {
    if (!marketplaceDb || !marketplaceAuth?.currentUser?.uid) throw new Error("İlan vermek için Firebase oturumu gerekli.");
    if (marketplaceAuth.currentUser.uid !== input.sellerId) throw new Error("Satıcı kimliği doğrulanamadı.");
    const title = input.title.trim();
    const description = input.description.trim();
    const city = input.city.trim();
    const sellerName = input.sellerName.trim();
    const image = input.image?.trim();
    const sellerPhone = input.sellerPhone?.trim();
    const allowedCategories: ListingCategory[] = ["Motosiklet", "Kask", "Mont", "Pantolon", "Eldiven", "Lastik", "Parça", "Aksesuar", "Diğer"];
    if (!title || title.length > 160 || !description || description.length > 5000 || !city || city.length > 100 || !sellerName || sellerName.length > 80 || !allowedCategories.includes(input.category) || !Number.isFinite(input.price) || input.price <= 0 || (image && (image.length > 2048 || !isHttpUrl(image))) || (sellerPhone && sellerPhone.length > 40)) {
      throw new Error("İlan bilgileri geçersiz. Alanları, fiyatı ve bağlantıları kontrol edin.");
    }
    const listingRef = doc(collection(marketplaceDb, "listings"));
    const payload: Record<string, unknown> = { id: listingRef.id, title, category: input.category, price: input.price, city, description, sellerId: input.sellerId, sellerName, createdAt: serverTimestamp(), featured: false };
    if (image) payload.image = image;
    if (sellerPhone) payload.sellerPhone = sellerPhone;
    await setDoc(listingRef, payload);
    return listingRef.id;
  }

  public async deleteRemoteListing(listingId: string, sellerId: string): Promise<void> {
    if (!marketplaceDb || !marketplaceAuth?.currentUser?.uid) throw new Error("İlan silmek için giriş yapın.");
    if (!listingId || marketplaceAuth.currentUser.uid !== sellerId) throw new Error("Yalnızca kendi ilanınızı silebilirsiniz.");
    await deleteDoc(doc(marketplaceDb, "listings", listingId));
  }

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
      id: `mkt-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    this.listings.unshift(newListing);
    return newListing;
  }

  public clearLocalSession(): void {
    this.listings = [];
  }

  public deleteListing(id: string): boolean {
    const initLen = this.listings.length;
    this.listings = this.listings.filter((l) => l.id !== id);
    return this.listings.length < initLen;
  }
}

export const marketplaceService = new MarketplaceService();
export default marketplaceService;

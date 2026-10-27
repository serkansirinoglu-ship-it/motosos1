/**
 * BusinessService — Firestore-backed public business directory.
 * No fictional businesses or client-only changes are presented as persisted data.
 */
import { subscribeBusinessesRealtime, createBusinessRealtime, updateBusinessRealtime, deleteBusinessRealtime } from "../../../firebase";

export type BusinessCategory = "usta" | "lastikci" | "cekici" | "servis" | "magaza" | "benzinlik";
export type BusinessTier = "standard" | "featured" | "premium" | "sponsored";

export interface BusinessReview {
  id: string;
  userName: string;
  // Do not render or persist reviewer email in public business documents.
  rating: number;
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
  tier: BusinessTier;
  verified: boolean;
  description?: string;
  publicVisible?: boolean;
}

export type NewBusinessProfile = Omit<BusinessProfile, "id" | "rating" | "reviewCount" | "reviews">;

const DEFAULT_BUSINESSES: BusinessProfile[] = [];

class BusinessService {
  private businesses: BusinessProfile[] = [...DEFAULT_BUSINESSES];
  private listeners = new Set<(businesses: BusinessProfile[]) => void>();
  private unsubscribeRemote: (() => void) | null = null;

  public getBusinesses(category?: BusinessCategory, city?: string): BusinessProfile[] {
    let result = [...this.businesses];
    if (category) result = result.filter((business) => business.category === category);
    if (city) result = result.filter((business) => business.city.toLocaleLowerCase("tr-TR") === city.toLocaleLowerCase("tr-TR"));
    const tierPriority: Record<BusinessTier, number> = { sponsored: 0, premium: 1, featured: 2, standard: 3 };
    return result.sort((a, b) => tierPriority[a.tier] - tierPriority[b.tier]);
  }

  public getById(id: string): BusinessProfile | undefined {
    return this.businesses.find((business) => business.id === id);
  }

  public subscribe(listener: (businesses: BusinessProfile[]) => void, onError: (error: unknown) => void = () => {}): () => void {
    this.listeners.add(listener);
    listener([...this.businesses]);
    if (!this.unsubscribeRemote) {
      this.unsubscribeRemote = subscribeBusinessesRealtime((items: Record<string, unknown>[]) => {
        this.businesses = items.map((item) => ({
          id: String(item.id || ""),
          name: String(item.name || ""),
          category: item.category as BusinessCategory,
          city: String(item.city || ""),
          address: String(item.address || ""),
          phone: String(item.phone || ""),
          workingHours: String(item.workingHours || ""),
          lat: Number(item.lat),
          lng: Number(item.lng),
          ...(typeof item.photo === "string" ? { photo: item.photo } : {}),
          rating: typeof item.rating === "number" ? item.rating : 0,
          reviewCount: typeof item.reviewCount === "number" ? item.reviewCount : 0,
          reviews: Array.isArray(item.reviews) ? item.reviews as BusinessReview[] : [],
          tier: item.tier as BusinessTier,
          verified: item.verified === true,
          ...(typeof item.description === "string" ? { description: item.description } : {}),
          publicVisible: item.publicVisible === true,
        }));
        for (const callback of this.listeners) callback([...this.businesses]);
      }, onError);
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0 && this.unsubscribeRemote) {
        this.unsubscribeRemote();
        this.unsubscribeRemote = null;
      }
    };
  }

  public async createBusiness(business: NewBusinessProfile): Promise<BusinessProfile | null> {
    const ref = await createBusinessRealtime(business);
    if (!ref || typeof ref.id !== "string" || !ref.id) return null;
    return {
      ...business,
      id: ref.id,
      rating: 0,
      reviewCount: 0,
      reviews: [],
    };
  }

  public async updateTier(id: string, tier: BusinessTier): Promise<boolean> {
    return Boolean(await updateBusinessRealtime(id, { tier }));
  }

  public async deleteBusiness(id: string): Promise<boolean> {
    return (await deleteBusinessRealtime(id)) === true;
  }
}

export const businessService = new BusinessService();
export default businessService;

import React, { createContext, useContext, useEffect, useState } from "react";
import { subscribeProductsRealtime, createProductRealtime, updateProductRealtime, deleteProductRealtime, subscribeBannersRealtime, createBannerRealtime, updateBannerRealtime, deleteBannerRealtime } from '../../../firebase';

type Product = {
  id: string;
  name: string;
  price: number;
  stock: number;
  image?: string;
  description?: string;
};

type Banner = {
  id: string;
  title: string;
  image?: string;
  link?: string;
  active: boolean;
};

type AdminContextType = {
  products: Product[];
  banners: Banner[];
  addProduct: (p: Omit<Product, "id">) => Promise<Product | null>;
  updateProduct: (id: string, patch: Partial<Product>) => Promise<Product | null>;
  removeProduct: (id: string) => Promise<boolean>;
  addBanner: (b: Omit<Banner, "id">) => Promise<Banner | null>;
  updateBanner: (id: string, patch: Partial<Banner>) => Promise<Banner | null>;
  removeBanner: (id: string) => Promise<boolean>;
};

const AdminContext = createContext<AdminContextType | undefined>(undefined);

const STORAGE_KEY = "motosos_admin_data_v1";

function generateId(prefix = "p") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => {
	try {
	  const raw = localStorage.getItem(STORAGE_KEY);
	  return raw ? JSON.parse(raw).products || [] : [];
	} catch (e) {
	  return [];
	}
  });

  const [banners, setBanners] = useState<Banner[]>(() => {
	try {
	  const raw = localStorage.getItem(STORAGE_KEY);
	  return raw ? JSON.parse(raw).banners || [] : [];
	} catch (e) {
	  return [];
	}
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ products, banners }));
    } catch (error) {
      // Storage can be unavailable in private browsing or quota-exhausted contexts.
      console.warn("Admin cache could not be saved locally", error);
    }
  }, [products, banners]);

  // subscribe to realtime products/banners if Firestore configured
  useEffect(() => {
	let unsubProducts: any = null;
	let unsubBanners: any = null;
	try {
	  unsubProducts = subscribeProductsRealtime((arr: any[]) => {
		// normalize createdAt timestamps if present
		const normalized = arr.map((d) => ({ id: d.id, ...d }));
		setProducts(normalized as Product[]);
	  });
	} catch (e) {
	  // ignore
	}
	try {
	  unsubBanners = subscribeBannersRealtime((arr: any[]) => {
		const normalized = arr.map((d) => ({ id: d.id, ...d }));
		setBanners(normalized as Banner[]);
	  });
	} catch (e) {
	  // ignore
	}

	return () => {
	  if (unsubProducts) unsubProducts();
	  if (unsubBanners) unsubBanners();
	};
  }, []);

  async function addProduct(p: Omit<Product, "id">): Promise<Product | null> {
    try {
      const ref = await createProductRealtime(p);
      if (!ref || typeof ref.id !== "string" || !ref.id) return null;
      const product: Product = { id: ref.id, ...p };
      setProducts((current) => [product, ...current.filter((item) => item.id !== ref.id)]);
      return product;
    } catch (error) {
      console.error("Product creation was not confirmed by the server", error);
      return null;
    }
  }

  async function updateProduct(id: string, patch: Partial<Product>): Promise<Product | null> {
    const current = products.find((item) => item.id === id);
    if (!current) return null;
    try {
      const result = await updateProductRealtime(id, patch);
      if (result === null) return null;
      const updated: Product = { ...current, ...patch, id };
      setProducts((items) => items.map((item) => item.id === id ? updated : item));
      return updated;
    } catch (error) {
      console.error("Product update was not confirmed by the server", error);
      return null;
    }
  }

  async function removeProduct(id: string): Promise<boolean> {
    try {
      const result = await deleteProductRealtime(id);
      if (result === null) return false;
      setProducts((items) => items.filter((item) => item.id !== id));
      return true;
    } catch (error) {
      console.error("Product deletion was not confirmed by the server", error);
      return false;
    }
  }

  async function addBanner(b: Omit<Banner, "id">): Promise<Banner | null> {
    try {
      const ref = await createBannerRealtime(b);
      if (!ref || typeof ref.id !== "string" || !ref.id) return null;
      const banner: Banner = { id: ref.id, ...b };
      setBanners((current) => [banner, ...current.filter((item) => item.id !== ref.id)]);
      return banner;
    } catch (error) {
      console.error("Banner creation was not confirmed by the server", error);
      return null;
    }
  }

  async function updateBanner(id: string, patch: Partial<Banner>): Promise<Banner | null> {
    const current = banners.find((item) => item.id === id);
    if (!current) return null;
    try {
      const result = await updateBannerRealtime(id, patch);
      if (result === null) return null;
      const updated: Banner = { ...current, ...patch, id };
      setBanners((items) => items.map((item) => item.id === id ? updated : item));
      return updated;
    } catch (error) {
      console.error("Banner update was not confirmed by the server", error);
      return null;
    }
  }

  async function removeBanner(id: string): Promise<boolean> {
    try {
      const result = await deleteBannerRealtime(id);
      if (result === null) return false;
      setBanners((items) => items.filter((item) => item.id !== id));
      return true;
    } catch (error) {
      console.error("Banner deletion was not confirmed by the server", error);
      return false;
    }
  }

  const value: AdminContextType = {
	products,
	banners,
	addProduct,
	updateProduct,
	removeProduct,
	addBanner,
	updateBanner,
	removeBanner,
  };

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}

export default AdminContext;

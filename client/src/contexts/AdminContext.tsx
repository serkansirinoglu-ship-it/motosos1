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
  addProduct: (p: Omit<Product, "id">) => Product;
  updateProduct: (id: string, patch: Partial<Product>) => Product | null;
  removeProduct: (id: string) => void;
  addBanner: (b: Omit<Banner, "id">) => Banner;
  updateBanner: (id: string, patch: Partial<Banner>) => Banner | null;
  removeBanner: (id: string) => void;
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
	localStorage.setItem(STORAGE_KEY, JSON.stringify({ products, banners }));
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

  // Optionally auto-seed Firestore when configured and env flag enabled
  useEffect(() => {
	try {
	  if (import.meta.env.VITE_FIREBASE_AUTO_SEED === 'true') {
		// dynamic import to avoid running in non-firebase mode
		import('../../../firebase').then((mod) => {
		  if (mod.createInitialSeed) mod.createInitialSeed();
		}).catch(()=>{});
	  }
	} catch (e) {
	  // ignore
	}
  }, []);

  function addProduct(p: Omit<Product, "id">) {
	try {
	  const res = createProductRealtime(p);
	  // Firestore snapshot will update local state; return a local placeholder
	  const prod: Product = { id: generateId("prod"), ...p };
	  setProducts((s) => [prod, ...s]);
	  return prod;
	} catch (e) {
	  const prod: Product = { id: generateId("prod"), ...p };
	  setProducts((s) => [prod, ...s]);
	  return prod;
	}
  }

  function updateProduct(id: string, patch: Partial<Product>) {
	try {
	  updateProductRealtime(id, patch);
	} catch (e) {
	  // ignore
	}
	let updated: Product | null = null;
	setProducts((s) => s.map((it) => (it.id === id ? (updated = { ...it, ...patch }) : it)));
	return updated;
  }

  function removeProduct(id: string) {
	try {
	  deleteProductRealtime(id);
	} catch (e) {
	  // ignore
	}
	setProducts((s) => s.filter((it) => it.id !== id));
  }

  function addBanner(b: Omit<Banner, "id">) {
	try {
	  createBannerRealtime(b);
	  const ban: Banner = { id: generateId("ban"), ...b };
	  setBanners((s) => [ban, ...s]);
	  return ban;
	} catch (e) {
	  const ban: Banner = { id: generateId("ban"), ...b };
	  setBanners((s) => [ban, ...s]);
	  return ban;
	}
  }

  function updateBanner(id: string, patch: Partial<Banner>) {
	try {
	  updateBannerRealtime(id, patch);
	} catch (e) {
	  // ignore
	}
	let updated: Banner | null = null;
	setBanners((s) => s.map((it) => (it.id === id ? (updated = { ...it, ...patch }) : it)));
	return updated;
  }

  function removeBanner(id: string) {
	try {
	  deleteBannerRealtime(id);
	} catch (e) {
	  // ignore
	}
	setBanners((s) => s.filter((it) => it.id !== id));
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

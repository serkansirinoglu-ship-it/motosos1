import React, { createContext, useContext, useEffect, useState } from "react";
import { signIn, signUp, signOutUser, onAuthStateChangedListener } from '../../../firebase';

type AuthContextType = {
  user: any | null;
  isAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
	const unsub = onAuthStateChangedListener((u: any) => {
	  setUser(u);
	});
	return () => unsub();
  }, []);

  const value: AuthContextType = {
	user,
	isAuthenticated: !!user,
	signIn,
	signUp,
	signOut: signOutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export default AuthContext;

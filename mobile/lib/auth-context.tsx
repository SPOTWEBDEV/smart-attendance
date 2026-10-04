// lib/auth-context.tsx
import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import * as SecureStore from "expo-secure-store";

export type Role = "ADMIN" | "LECTURER" | "STUDENT";
export type User = { id: string; fullName: string; email: string; role: Role; mustChangePassword?: boolean };

type AuthState = {
  user: User | null;
  token: string | null;
  loading: boolean; // true while we check secure storage on app start
  signIn: (token: string, user: User) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (patch: Partial<User>) => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [t, u] = await Promise.all([
          SecureStore.getItemAsync("token"),
          SecureStore.getItemAsync("user"),
        ]);
        if (t && u) {
          setToken(t);
          setUser(JSON.parse(u));
        }
      } catch {
        // ignore, user will just see the login flow
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function signIn(t: string, u: User) {
    await SecureStore.setItemAsync("token", t);
    await SecureStore.setItemAsync("user", JSON.stringify(u));
    setToken(t);
    setUser(u);
  }

  async function signOut() {
    await SecureStore.deleteItemAsync("token");
    await SecureStore.deleteItemAsync("user");
    setToken(null);
    setUser(null);
  }

  async function updateUser(patch: Partial<User>) {
    if (!user) return;
    const next = { ...user, ...patch };
    await SecureStore.setItemAsync("user", JSON.stringify(next));
    setUser(next);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, signIn, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

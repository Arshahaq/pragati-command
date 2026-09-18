import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Role } from "@/lib/pragati/types";
import {
  authEventName,
  getCurrentUser,
  login,
  loginAsDemoAdmin,
  loginAsDemoCitizen,
  loginAsDemoRole,
  logout,
  type AuthUser,
} from "./authService";

interface AuthContextValue {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => AuthUser | null;
  loginAsDemoCitizen: () => AuthUser | null;
  loginAsDemoAdmin: () => AuthUser | null;
  loginAsDemoRole: (role: Role) => AuthUser | null;
  logout: () => void;
  switchRole: (role: Role) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setUser(getCurrentUser());
    sync();
    setReady(true);
    window.addEventListener(authEventName(), sync);
    return () => window.removeEventListener(authEventName(), sync);
  }, []);

  const value: AuthContextValue = {
    user,
    ready,
    login,
    loginAsDemoCitizen,
    loginAsDemoAdmin,
    loginAsDemoRole,
    logout,
    switchRole: (role) => {
      const current = getCurrentUser();
      if (!current) return;
      const next = { ...current, role };
      window.localStorage.setItem("pragati.demo.session", JSON.stringify(next));
      window.dispatchEvent(new Event(authEventName()));
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}

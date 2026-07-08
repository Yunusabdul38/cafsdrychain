import { create } from "zustand";
import type { Role } from "@/lib/types";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  location?: string | null;
  mustChangePassword?: boolean;
  wallet?: { address: string; chain: string } | null;
};

type AuthState = {
  user: AuthUser | null;
  accessToken: string | null;
  /** idle → still bootstrapping; then authenticated | unauthenticated */
  status: "idle" | "authenticated" | "unauthenticated";
  setAuth: (user: AuthUser, accessToken: string) => void;
  setAccessToken: (token: string | null) => void;
  setUser: (user: AuthUser | null) => void;
  clear: () => void;
};

/** Backend roles are uppercase (ADMIN/OPERATOR); the UI uses lowercase. */
export function normalizeUser(user: AuthUser): AuthUser {
  return { ...user, role: String(user.role).toLowerCase() as Role };
}

/**
 * Access token is kept in memory only (never localStorage) to reduce XSS risk.
 * Sessions survive reloads via the httpOnly refresh cookie + /auth/refresh.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  status: "idle",
  setAuth: (user, accessToken) => set({ user, accessToken, status: "authenticated" }),
  setAccessToken: (accessToken) => set({ accessToken }),
  setUser: (user) => set({ user }),
  clear: () => set({ user: null, accessToken: null, status: "unauthenticated" }),
}));

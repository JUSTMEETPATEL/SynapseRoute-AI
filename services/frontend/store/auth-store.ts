import { create } from "zustand";
import type { AuthUser } from "@/lib/types";
import { api, ApiError } from "@/lib/api";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  checkSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  checkSession: async () => {
    try {
      set({ isLoading: true });
      const res = await api.auth.getSession();
      if (res.session?.user) {
        set({ user: res.session.user, isAuthenticated: true, isLoading: false });
      } else {
        set({ user: null, isAuthenticated: false, isLoading: false });
      }
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
    }
  },

  login: async (email, password) => {
    try {
      set({ isLoading: true, error: null });
      const res = await api.auth.signIn(email, password);
      set({ user: res.user, isAuthenticated: true, isLoading: false });
      return true;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? "Invalid email or password"
          : "Something went wrong";
      set({ error: message, isLoading: false });
      return false;
    }
  },

  signup: async (name, email, password) => {
    try {
      set({ isLoading: true, error: null });
      const res = await api.auth.signUp(name, email, password);
      set({ user: res.user, isAuthenticated: true, isLoading: false });
      return true;
    } catch (err) {
      const message =
        err instanceof ApiError
          ? "Account creation failed. Email may already be in use."
          : "Something went wrong";
      set({ error: message, isLoading: false });
      return false;
    }
  },

  logout: async () => {
    try {
      await api.auth.signOut();
    } catch {
      // Ignore errors on signout
    }
    set({ user: null, isAuthenticated: false });
  },

  clearError: () => set({ error: null }),
}));

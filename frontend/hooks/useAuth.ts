import { create } from "zustand";
import { User } from "@/types";

// Ce fichier contient à la fois le hook useAuth et le store de session pour la commodité.
// Il sera complété durant l'Epic d'authentification.

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  setUser: (user) => set({ user, isAuthenticated: !!user }),
}));

export function useAuth() {
  const { user, isAuthenticated, setUser } = useAuthStore();
  
  const hasPermission = (codename: string): boolean => {
    if (!user) return false;
    if (user.role === "SUPER_ADMIN") return true; // SuperAdmin possède toutes les permissions
    return user.permissions.includes(codename);
  };

  return {
    user,
    isAuthenticated,
    setUser,
    hasPermission,
  };
}

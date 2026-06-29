import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  schoolId: string | null;
  setSchoolId: (id: string) => void;
  // Les tokens JWT et le rôle global sont gérés par next-auth / session
  // Ce store sert pour les états UI additionnels liés à l'authentification
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      schoolId: null,
      setSchoolId: (id) => set({ schoolId: id }),
    }),
    {
      name: "auth-storage",
    },
  ),
);

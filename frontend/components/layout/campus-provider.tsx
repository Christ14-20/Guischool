'use client';

/**
 * campus-provider.tsx
 * Contexte global pour le campus actif de l'utilisateur connecté.
 * - Chargé au montage si l'utilisateur a un tenant_id (école)
 * - Persisté en localStorage pour survivre aux rechargements
 * - Exposé via `useCampus()` hook
 */

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getCampuses, type CampusItem } from '@/lib/api/superadmin';

type CampusContextValue = {
  campus: CampusItem | null;
  setCampus: (campus: CampusItem | null) => void;
  availableCampuses: CampusItem[];
  isMultiCampus: boolean;
  isLoading: boolean;
};

const CampusContext = createContext<CampusContextValue>({
  campus: null,
  setCampus: () => {},
  availableCampuses: [],
  isMultiCampus: false,
  isLoading: false,
});

const STORAGE_KEY = 'eduguinee_active_campus_id';

export function CampusProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const token = (session as any)?.accessToken as string | undefined;
  const tenantId = (session as any)?.user?.tenant_id as string | undefined;

  const [availableCampuses, setAvailableCampuses] = useState<CampusItem[]>([]);
  const [campus, setCampusState] = useState<CampusItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const setCampus = useCallback((c: CampusItem | null) => {
    setCampusState(c);
    if (c) {
      localStorage.setItem(STORAGE_KEY, c.id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    if (!token || !tenantId) return;

    const load = async () => {
      setIsLoading(true);
      try {
        const campuses = await getCampuses(token, tenantId);
        setAvailableCampuses(campuses);

        // Restaurer depuis localStorage ou prendre le campus principal
        const storedId = localStorage.getItem(STORAGE_KEY);
        const restored = campuses.find((c) => c.id === storedId);
        const main = campuses.find((c) => c.is_main) ?? campuses[0] ?? null;
        setCampusState(restored ?? main);
      } catch {
        // Silently fail — campus selection is optional
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [token, tenantId]);

  return (
    <CampusContext.Provider
      value={{
        campus,
        setCampus,
        availableCampuses,
        isMultiCampus: availableCampuses.length > 1,
        isLoading,
      }}
    >
      {children}
    </CampusContext.Provider>
  );
}

export function useCampus() {
  return useContext(CampusContext);
}

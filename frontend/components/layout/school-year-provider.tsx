"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { getSchoolYears } from "@/lib/api/pedagogy";

type SchoolYearContextType = {
  schoolYear: string;
  setSchoolYear: (year: string) => void;
  availableYears: string[];
};

const CURRENT_YEAR = new Date().getFullYear();
const DEFAULT_AVAILABLE_YEARS = [
  `${CURRENT_YEAR - 1}-${CURRENT_YEAR}`,
  `${CURRENT_YEAR}-${CURRENT_YEAR + 1}`,
  `${CURRENT_YEAR + 1}-${CURRENT_YEAR + 2}`,
];

const SchoolYearContext = createContext<SchoolYearContextType | null>(null);

export function SchoolYearProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session } = useSession();
  const token = session?.accessToken ?? "";

  const [schoolYear, setSchoolYear] = useState(() => {
    if (typeof window !== "undefined") {
      return window.localStorage.getItem("active-school-year") || "";
    }
    return "";
  });
  const [availableYears, setAvailableYears] = useState<string[]>(
    DEFAULT_AVAILABLE_YEARS,
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let mounted = true;

    getSchoolYears(token)
      .then((res) => {
        if (!mounted) return;

        const labels = res.results.map((item) => item.label).filter(Boolean);

        if (labels.length === 0) {
          setAvailableYears(DEFAULT_AVAILABLE_YEARS);
          return;
        }

        const currentLabel = res.results.find((item) => item.is_current)?.label;
        const saved = window.localStorage.getItem("active-school-year");

        setAvailableYears(labels);
        setSchoolYear((prev) => {
          if (saved && labels.includes(saved)) return saved;
          if (prev && labels.includes(prev)) return prev;
          if (currentLabel) return currentLabel;
          return labels[0];
        });
      })
      .catch(() => {
        // Role sans tenant (ex: superadmin) ou indisponibilité API: fallback local.
        if (mounted) {
          setAvailableYears(DEFAULT_AVAILABLE_YEARS);
          setSchoolYear((prev) => prev || DEFAULT_AVAILABLE_YEARS[1]);
        }
      });

    return () => {
      mounted = false;
    };
  }, [token]);

  useEffect(() => {
    if (!schoolYear) return;
    window.localStorage.setItem("active-school-year", schoolYear);
  }, [schoolYear]);

  const value = useMemo(
    () => ({
      schoolYear,
      setSchoolYear,
      availableYears,
    }),
    [schoolYear, availableYears],
  );

  return (
    <SchoolYearContext.Provider value={value}>
      {children}
    </SchoolYearContext.Provider>
  );
}

export function useSchoolYear() {
  const context = useContext(SchoolYearContext);
  if (!context) {
    throw new Error("useSchoolYear must be used inside SchoolYearProvider.");
  }
  return context;
}

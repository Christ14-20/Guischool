'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';

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

export function SchoolYearProvider({ children }: { children: React.ReactNode }) {
  const [schoolYear, setSchoolYear] = useState(DEFAULT_AVAILABLE_YEARS[1]);

  useEffect(() => {
    const saved = window.localStorage.getItem('active-school-year');
    if (saved) {
      setSchoolYear(saved);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem('active-school-year', schoolYear);
  }, [schoolYear]);

  const value = useMemo(
    () => ({
      schoolYear,
      setSchoolYear,
      availableYears: DEFAULT_AVAILABLE_YEARS,
    }),
    [schoolYear]
  );

  return <SchoolYearContext.Provider value={value}>{children}</SchoolYearContext.Provider>;
}

export function useSchoolYear() {
  const context = useContext(SchoolYearContext);
  if (!context) {
    throw new Error('useSchoolYear must be used inside SchoolYearProvider.');
  }
  return context;
}

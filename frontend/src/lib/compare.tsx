import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export const MAX_COMPARE = 4;
const STORAGE_KEY = "admission-ps:compare";

interface CompareValue {
  slugs: string[];
  has: (slug: string) => boolean;
  toggle: (slug: string) => "added" | "removed" | "full";
  remove: (slug: string) => void;
  clear: () => void;
}

const CompareContext = createContext<CompareValue | null>(null);

function readStored(): string[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string").slice(0, MAX_COMPARE) : [];
  } catch {
    return [];
  }
}

export function CompareProvider({ children }: { children: ReactNode }) {
  const [slugs, setSlugs] = useState<string[]>(readStored);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(slugs));
    } catch {
      /* storage can be unavailable (private mode); comparison still works for this visit */
    }
  }, [slugs]);

  const toggle = useCallback(
    (slug: string): "added" | "removed" | "full" => {
      if (slugs.includes(slug)) {
        setSlugs((prev) => prev.filter((s) => s !== slug));
        return "removed";
      }
      if (slugs.length >= MAX_COMPARE) return "full";
      setSlugs((prev) => [...prev, slug]);
      return "added";
    },
    [slugs],
  );

  const value = useMemo<CompareValue>(
    () => ({
      slugs,
      has: (slug) => slugs.includes(slug),
      toggle,
      remove: (slug) => setSlugs((prev) => prev.filter((s) => s !== slug)),
      clear: () => setSlugs([]),
    }),
    [slugs, toggle],
  );

  return <CompareContext.Provider value={value}>{children}</CompareContext.Provider>;
}

export function useCompare(): CompareValue {
  const ctx = useContext(CompareContext);
  if (!ctx) throw new Error("useCompare must be used inside CompareProvider");
  return ctx;
}

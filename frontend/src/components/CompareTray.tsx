import { Link, useLocation } from "react-router-dom";
import { MAX_COMPARE, useCompare } from "../lib/compare";

/** Floating bar that appears once at least one college is selected. */
export function CompareTray() {
  const { slugs, clear } = useCompare();
  const { pathname } = useLocation();

  if (slugs.length === 0 || pathname === "/compare") return null;

  return (
    <div
      role="region"
      aria-label="Colleges selected for comparison"
      className="fixed inset-x-0 bottom-4 z-30 mx-auto flex w-[calc(100%-2rem)] max-w-xl items-center justify-between gap-3 rounded-2xl bg-ink-900 px-4 py-3 text-white shadow-xl"
    >
      <p className="text-sm">
        <span className="tabular font-bold">{slugs.length}</span> of {MAX_COMPARE} selected for comparison
      </p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={clear} className="rounded-lg px-3 py-2 text-sm font-medium text-ink-200 hover:bg-white/10">
          Clear
        </button>
        <Link to="/compare" className="btn bg-marigold-400 text-ink-900 hover:bg-marigold-400/90">
          Compare now
        </Link>
      </div>
    </div>
  );
}

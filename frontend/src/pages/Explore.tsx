import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CollegeCard } from "../components/CollegeCard";
import { FilterIcon, SearchIcon } from "../components/Icons";
import { Pagination } from "../components/Pagination";
import { CardSkeleton, EmptyState, ErrorState } from "../components/States";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";
import type { CollegeQuery, FacetValue } from "../lib/types";

const PAGE_SIZE = 12;

export default function Explore() {
  const [params, setParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const q = params.get("q") ?? "";
  const [draft, setDraft] = useState(q);

  const query: CollegeQuery = useMemo(
    () => ({
      q: q || undefined,
      state: params.get("state") || undefined,
      institution_type: params.get("institution_type") || undefined,
      ownership: params.get("ownership") || undefined,
      exam: params.get("exam") || undefined,
      verified_only: params.get("verified_only") === "1",
      sort: (params.get("sort") as CollegeQuery["sort"]) || "name",
      page: Number(params.get("page")) || 1,
      page_size: PAGE_SIZE,
    }),
    [params, q],
  );

  const facets = useApi((signal) => api.facets(signal), "facets");
  const results = useApi((signal) => api.colleges(query, signal), JSON.stringify(query));

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([key, value]) => {
      if (value) next.set(key, value);
      else next.delete(key);
    });
    if (!("page" in changes)) next.delete("page");
    setParams(next, { replace: true });
  }

  // Debounce typing so every keystroke doesn't hit the API.
  useEffect(() => {
    if (draft === q) return;
    const timer = window.setTimeout(() => update({ q: draft.trim() || null }), 300);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // Keep the input in sync when the URL changes elsewhere (back button, quick links).
  useEffect(() => setDraft(q), [q]);

  const activeFilters = ["state", "institution_type", "ownership", "exam", "verified_only"].filter((k) => params.get(k));

  const filterPanel = (
    <div className="space-y-5">
      <Select label="Institution type" value={params.get("institution_type")} options={facets.data?.institution_types} onChange={(v) => update({ institution_type: v })} />
      <Select label="Ownership" value={params.get("ownership")} options={facets.data?.ownerships} onChange={(v) => update({ ownership: v })} />
      <Select label="State or UT" value={params.get("state")} options={facets.data?.states} onChange={(v) => update({ state: v })} />
      <Select label="Entrance exam" value={params.get("exam")} options={facets.data?.exams} onChange={(v) => update({ exam: v })} />
      <label className="flex items-start gap-2.5 text-sm">
        <input
          type="checkbox"
          className="mt-0.5 size-4 accent-peacock-600"
          checked={params.get("verified_only") === "1"}
          onChange={(e) => update({ verified_only: e.target.checked ? "1" : null })}
        />
        <span>
          Only records checked against official sources
          <span className="block text-ink-500">Most records are not verified yet.</span>
        </span>
      </label>
      {activeFilters.length > 0 && (
        <button
          type="button"
          className="btn btn-quiet w-full"
          onClick={() => setParams(q ? new URLSearchParams({ q }) : new URLSearchParams(), { replace: true })}
        >
          Clear filters
        </button>
      )}
    </div>
  );

  const total = results.data?.total ?? 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-bold">Explore colleges</h1>
      <p className="mt-2 max-w-2xl text-ink-700">
        Search the directory by name, city or state, then narrow it with filters.
      </p>

      <div className="mt-6 flex gap-3">
        <div className="relative flex-1">
          <label htmlFor="college-search" className="sr-only">
            Search colleges
          </label>
          <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
          <input
            id="college-search"
            type="search"
            value={draft}
            maxLength={100}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Search by college name, city or state"
            className="field py-3 pl-10"
          />
        </div>
        <button
          type="button"
          className="btn btn-quiet lg:hidden"
          aria-expanded={filtersOpen}
          aria-controls="filters"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <FilterIcon width={16} height={16} />
          Filters{activeFilters.length > 0 && ` (${activeFilters.length})`}
        </button>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside id="filters" aria-label="Filters" className={`${filtersOpen ? "block" : "hidden"} lg:block`}>
          <div className="rounded-2xl border border-ink-100 bg-white p-5 lg:sticky lg:top-24">{filterPanel}</div>
        </aside>

        <section aria-label="Search results">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-ink-700" aria-live="polite">
              {results.loading && !results.data ? "Loading colleges…" : <><span className="tabular font-semibold">{total}</span> {total === 1 ? "college" : "colleges"} found</>}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <span className="text-ink-500">Sort by</span>
              <select
                className="field w-auto py-1.5"
                value={params.get("sort") ?? "name"}
                onChange={(e) => update({ sort: e.target.value === "name" ? null : e.target.value })}
              >
                <option value="name">Name</option>
                <option value="state">State</option>
                <option value="newest">Recently updated</option>
              </select>
            </label>
          </div>

          {results.error && <ErrorState message={results.error} onRetry={results.reload} />}

          {!results.error && results.loading && !results.data && (
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3" aria-busy="true">
              {Array.from({ length: 6 }, (_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          )}

          {!results.error && results.data && results.data.items.length === 0 && (
            <EmptyState title="No colleges match these filters">
              Try a shorter search or remove a filter. The directory is still growing, so a college you are looking for
              may not be listed yet.
            </EmptyState>
          )}

          {results.data && results.data.items.length > 0 && (
            <div className={`grid gap-5 md:grid-cols-2 xl:grid-cols-3 ${results.loading ? "opacity-60" : ""}`}>
              {results.data.items.map((college) => (
                <CollegeCard key={college.id} college={college} />
              ))}
            </div>
          )}

          {results.data && (
            <Pagination
              page={results.data.page}
              pageSize={results.data.page_size}
              total={results.data.total}
              onChange={(page) => {
                update({ page: page > 1 ? String(page) : null });
                window.scrollTo({ top: 0 });
              }}
            />
          )}
        </section>
      </div>
    </div>
  );
}

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options?: FacetValue[];
  onChange: (value: string | null) => void;
}) {
  const id = `filter-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <select id={id} className="field" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)} disabled={!options}>
        <option value="">All</option>
        {options?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.value} ({o.count})
          </option>
        ))}
      </select>
    </div>
  );
}

import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CoverageChart } from "../components/CoverageChart";
import { SearchIcon } from "../components/Icons";
import { ErrorState, Skeleton } from "../components/States";
import { VerificationStamp } from "../components/VerificationStamp";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";

const QUICK_LINKS = [
  { label: "IITs", to: "/explore?institution_type=IIT" },
  { label: "NITs", to: "/explore?institution_type=NIT" },
  { label: "IIITs", to: "/explore?institution_type=IIIT" },
  { label: "Central universities", to: "/explore?institution_type=Central%20University" },
  { label: "Private universities", to: "/explore?ownership=Private" },
];

export default function Home() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const coverage = useApi((signal) => api.coverage(signal), "coverage");

  function onSearch(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    navigate(q ? `/explore?q=${encodeURIComponent(q)}` : "/explore");
  }

  const missing = coverage.data?.rows.filter((r) => r.status === "missing") ?? [];
  const allUnverified = coverage.data ? coverage.data.verified_colleges === 0 : false;

  return (
    <>
      <section className="border-b border-ink-100 bg-white">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:py-24">
          <div>
            <h1 className="text-5xl font-bold leading-[1.05] sm:text-6xl">
              Find colleges you can actually get into.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-ink-700">
              Search institutions across India, see their admission routes and entrance exams, and know which details
              have been checked against official sources and which have not.
            </p>

            <form onSubmit={onSearch} role="search" className="mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <label htmlFor="hero-search" className="sr-only">
                  Search by college name, city or state
                </label>
                <SearchIcon className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-300" />
                <input
                  id="hero-search"
                  type="search"
                  value={query}
                  maxLength={100}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Try “NIT Trichy”, “Pune” or “BITS”"
                  className="field py-3 pl-10"
                />
              </div>
              <button type="submit" className="btn btn-primary py-3">
                Search colleges
              </button>
            </form>

            <p className="mt-6 text-sm font-medium text-ink-500">Or start with</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {QUICK_LINKS.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="btn btn-quiet px-3.5 py-1.5 text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <aside
            aria-labelledby="status-heading"
            className="relative self-start rounded-3xl border border-ink-200 bg-paper p-6 shadow-[0_20px_50px_-30px_rgba(21,32,50,0.45)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="status-heading" className="text-xl font-semibold">
                  Directory status
                </h2>
                <p className="mt-1 text-sm text-ink-500">What the database holds right now</p>
              </div>
              {coverage.data && <VerificationStamp status={allUnverified ? "unverified" : "verified"} />}
            </div>

            {coverage.loading && !coverage.data && (
              <div className="mt-6 space-y-4" aria-busy="true">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            )}
            {coverage.error && !coverage.data && (
              <div className="mt-6">
                <ErrorState message={coverage.error} onRetry={coverage.reload} />
              </div>
            )}
            {coverage.data && (
              <>
                <dl className="mt-6 divide-y divide-ink-200 border-y border-ink-200">
                  <Row label="Colleges listed" value={coverage.data.total_colleges} />
                  <Row label="Checked against official sources" value={coverage.data.verified_colleges} />
                  <Row label="States and union territories" value={coverage.data.states_covered} />
                  <Row label="Institution types with no data yet" value={missing.length} />
                </dl>
                <p className="mt-4 text-sm leading-6 text-ink-700">{coverage.data.note}</p>
              </>
            )}
          </aside>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <h2 className="text-3xl font-bold">Where the data stands</h2>
            <p className="mt-4 max-w-md leading-7 text-ink-700">
              A college directory is only useful if you know what to trust. Every record carries a source and a
              verification stamp. Gaps are listed here instead of being filled with guesses.
            </p>
            {missing.length > 0 && (
              <div className="mt-6">
                <h3 className="text-base font-semibold">No records yet for</h3>
                <p className="mt-2 text-sm leading-6 text-ink-700">{missing.map((m) => m.institution_type).join(", ")}</p>
              </div>
            )}
          </div>
          <div className="rounded-3xl border border-ink-100 bg-white p-6">
            {coverage.loading && !coverage.data && <Skeleton className="h-64" />}
            {coverage.data && <CoverageChart rows={coverage.data.rows} />}
            {coverage.error && !coverage.data && <ErrorState message={coverage.error} onRetry={coverage.reload} />}
          </div>
        </div>
      </section>

      <section className="border-y border-ink-100 bg-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-3">
          <Principle title="Eligibility is not a chance">
            Meeting the minimum marks only means you may apply. Admission chances come from past cutoffs and are shown
            separately, and only when real data exists.
          </Principle>
          <Principle title="No invented numbers">
            Fees, cutoffs and percentages appear only when they come from a recorded source. Otherwise you will see
            &ldquo;Not verified yet&rdquo; or &ldquo;Insufficient data&rdquo;.
          </Principle>
          <Principle title="Sources you can open">
            Each college links to its official website and, where one exists, the admission portal, so you can confirm
            everything yourself.
          </Principle>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="rounded-3xl bg-peacock-700 px-8 py-12 text-white sm:px-14">
          <h2 className="max-w-xl text-3xl font-bold">Shortlist up to four colleges and compare them side by side.</h2>
          <p className="mt-3 max-w-xl text-peacock-100">
            Use the Compare button on any college card, then open the comparison to see location, routes, exams and
            official links together.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/explore" className="btn bg-marigold-400 text-ink-900 hover:bg-marigold-400/90">
              Explore colleges
            </Link>
            <Link to="/compare" className="btn border border-white/30 text-white hover:bg-white/10">
              Open comparison
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-sm text-ink-700">{label}</dt>
      <dd className="tabular font-display text-3xl font-bold">{value}</dd>
    </div>
  );
}

function Principle({ title, children }: { title: string; children: string }) {
  return (
    <div>
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 leading-7 text-ink-700">{children}</p>
    </div>
  );
}

import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ExternalIcon } from "../components/Icons";
import { EmptyState, ErrorState, Skeleton } from "../components/States";
import { VerificationStamp } from "../components/VerificationStamp";
import { api } from "../lib/api";
import { useCompare } from "../lib/compare";
import { hostOf } from "../lib/format";
import type { CollegeDetail } from "../lib/types";

const NOT_ADDED = <span className="text-ink-500">Not added yet</span>;

export default function Compare() {
  const { slugs, remove, clear } = useCompare();
  const [colleges, setColleges] = useState<CollegeDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (slugs.length === 0) {
      setColleges([]);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    Promise.allSettled(slugs.map((slug) => api.college(slug, controller.signal)))
      .then((settled) => {
        const ok = settled.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
        setColleges(ok);
        // A 404 means the saved college no longer exists; drop it quietly. Anything else is a real error.
        const failed = settled.filter((r) => r.status === "rejected") as PromiseRejectedResult[];
        const realFailure = failed.find((r) => (r.reason as { status?: number }).status !== 404 && (r.reason as Error).name !== "AbortError");
        if (realFailure) setError((realFailure.reason as Error).message);
      })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [slugs, attempt]);

  if (slugs.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="text-4xl font-bold">Compare colleges</h1>
        <div className="mt-8">
          <EmptyState title="No colleges selected yet">
            Pick up to four colleges with the Compare button on Explore Colleges and they will appear here side by side.
          </EmptyState>
        </div>
        <Link to="/explore" className="btn btn-primary mt-6">
          Explore colleges
        </Link>
      </div>
    );
  }

  const rows: { label: string; render: (c: CollegeDetail) => ReactNode }[] = [
    { label: "Location", render: (c) => `${c.city}, ${c.state}` },
    { label: "Institution type", render: (c) => c.institution_type },
    { label: "Ownership", render: (c) => c.ownership },
    { label: "Courses", render: (c) => (c.courses.length ? c.courses.map((x) => x.name).join(", ") : <span className="text-ink-500">Not imported yet</span>) },
    { label: "Fees", render: () => <span className="text-ink-500">Not verified yet</span> },
    { label: "Eligibility", render: (c) => (c.courses.some((x) => x.eligibility_notes) ? c.courses.map((x) => x.eligibility_notes).filter(Boolean).join(" ") : <span className="text-ink-500">Not imported yet</span>) },
    { label: "Entrance exams", render: (c) => (c.entrance_exams.length ? c.entrance_exams.join(", ") : NOT_ADDED) },
    { label: "Admission routes", render: (c) => (c.admission_routes.length ? c.admission_routes.join(", ") : NOT_ADDED) },
    { label: "Historical cutoffs", render: () => <span className="text-ink-500">Not available yet</span> },
    {
      label: "Official links",
      render: (c) => (
        <div className="space-y-1">
          {c.website ? (
            <a href={c.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-peacock-700 hover:underline">
              {hostOf(c.website)} <ExternalIcon width={13} height={13} />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : (
            NOT_ADDED
          )}
          {c.admission_url && (
            <div>
              <a href={c.admission_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-peacock-700 hover:underline">
                Admission portal <ExternalIcon width={13} height={13} />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            </div>
          )}
        </div>
      ),
    },
    { label: "Verification", render: (c) => <VerificationStamp status={c.verification_status} verifiedOn={c.last_verified_on} /> },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold">Compare colleges</h1>
          <p className="mt-2 text-ink-700">Comparing {slugs.length} of 4 possible colleges.</p>
        </div>
        <div className="flex gap-3">
          <Link to="/explore" className="btn btn-quiet">
            Add more colleges
          </Link>
          <button type="button" className="btn btn-quiet" onClick={clear}>
            Clear all
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-6">
          <ErrorState message={error} onRetry={() => setAttempt((n) => n + 1)} />
        </div>
      )}

      {loading && colleges.length === 0 ? (
        <div className="mt-8 space-y-3" aria-busy="true">
          <Skeleton className="h-16" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-2xl border border-ink-100 bg-white">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <caption className="sr-only">Side-by-side comparison of selected colleges</caption>
            <thead>
              <tr className="border-b border-ink-100">
                <th scope="col" className="w-40 p-4 font-medium text-ink-500">
                  &nbsp;
                </th>
                {colleges.map((c) => (
                  <th key={c.slug} scope="col" className="min-w-52 p-4 align-top">
                    <Link to={`/colleges/${c.slug}`} className="font-display text-base font-semibold hover:text-peacock-700">
                      {c.name}
                    </Link>
                    <button type="button" onClick={() => remove(c.slug)} className="mt-2 block text-xs font-semibold text-gulmohar-700 hover:underline">
                      Remove<span className="sr-only"> {c.name}</span>
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-ink-100 last:border-0">
                  <th scope="row" className="p-4 align-top font-medium text-ink-500">
                    {row.label}
                  </th>
                  {colleges.map((c) => (
                    <td key={c.slug} className="p-4 align-top">
                      {row.render(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

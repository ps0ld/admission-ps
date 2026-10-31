import { type FormEvent, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ExternalIcon, PinIcon } from "../components/Icons";
import { CardSkeleton, EmptyState, ErrorState } from "../components/States";
import { VerificationStamp } from "../components/VerificationStamp";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";
import { hostOf } from "../lib/format";
import type {
  EligibilityStatus,
  FinderRequest,
  FinderResponse,
  FinderResult,
  Qualification,
  Stream,
} from "../lib/types";

const QUALIFICATIONS: { value: Qualification; label: string }[] = [
  { value: "10th", label: "10th pass" },
  { value: "12th", label: "12th pass" },
  { value: "diploma", label: "Diploma" },
];
const STREAMS: Stream[] = ["PCM", "PCB", "Commerce", "Arts", "Other"];

const STATUS_META: Record<EligibilityStatus, { label: string; className: string }> = {
  eligible: { label: "Eligible", className: "bg-peacock-50 text-peacock-700" },
  not_eligible: { label: "Not eligible", className: "bg-gulmohar-50 text-gulmohar-700" },
  insufficient_data: { label: "Insufficient data", className: "bg-ink-100 text-ink-700" },
};

const DISCLAIMER = "This shows eligibility, not admission probability. Admission is never guaranteed.";

function meta(status: EligibilityStatus) {
  return STATUS_META[status] ?? STATUS_META.insufficient_data;
}

/** Reads a percentage field. Pushes a message to `problems` and returns undefined when it is not usable. */
function readPct(label: string, text: string, problems: string[]): number | undefined {
  const t = text.trim();
  if (!t) {
    problems.push(`Enter your ${label}.`);
    return undefined;
  }
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0 || n > 100) {
    problems.push(`Your ${label} must be a number from 0 to 100.`);
    return undefined;
  }
  return n;
}

export default function Predictor() {
  const [qualification, setQualification] = useState<Qualification>("12th");
  const [p10, setP10] = useState("");
  const [p12, setP12] = useState("");
  const [diplomaPct, setDiplomaPct] = useState("");
  const [stream, setStream] = useState<Stream | "">("");
  const [branch, setBranch] = useState("");
  const [course, setCourse] = useState("");
  const [state, setState] = useState("");

  const [problems, setProblems] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<FinderResponse | null>(null);
  const [filter, setFilter] = useState<"all" | EligibilityStatus>("all");

  const facets = useApi((signal) => api.facets(signal), "facets");
  const controller = useRef<AbortController | null>(null);
  const resultsRef = useRef<HTMLElement | null>(null);

  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (data) resultsRef.current?.scrollIntoView?.({ behavior: "smooth", block: "start" });
  }, [data]);

  async function submit(event?: FormEvent) {
    event?.preventDefault();

    const found: string[] = [];
    const body: FinderRequest = { qualification };
    if (qualification === "10th") {
      body.percentage_10 = readPct("10th percentage", p10, found);
    } else if (qualification === "12th") {
      body.percentage_10 = readPct("10th percentage", p10, found);
      body.percentage_12 = readPct("12th percentage", p12, found);
      if (stream) body.stream = stream;
      else found.push("Choose your 12th stream.");
    } else {
      body.diploma_percentage = readPct("diploma percentage", diplomaPct, found);
      if (branch.trim()) body.diploma_branch = branch.trim();
    }
    if (course.trim()) body.preferred_course = course.trim();
    if (state) body.state = state;

    setProblems(found);
    if (found.length > 0) return;

    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setLoading(true);
    setError(null);
    try {
      const result = await api.recommend(body, current.signal);
      setData(result);
      setFilter("all");
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError((err as Error).message);
    } finally {
      if (controller.current === current) setLoading(false);
    }
  }

  const counts = { eligible: 0, not_eligible: 0, insufficient_data: 0 } as Record<EligibilityStatus, number>;
  data?.results.forEach((r) => {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
  });
  const visible = data ? data.results.filter((r) => filter === "all" || r.status === filter) : [];
  const allInsufficient = !!data && data.results.length > 0 && counts.insufficient_data === data.results.length;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <h1 className="text-4xl font-bold">Admission Predictor</h1>
      <p className="mt-2 max-w-2xl text-ink-700">
        Tell us your marks and we will check them against each college's published eligibility rules.
      </p>
      <p className="mt-3 max-w-2xl rounded-xl border border-ink-200 bg-white px-4 py-3 text-sm font-medium text-ink-900">
        {DISCLAIMER}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[360px_1fr]">
        <aside aria-label="Your details">
          <form noValidate onSubmit={submit} className="space-y-5 rounded-2xl border border-ink-100 bg-white p-5 lg:sticky lg:top-24">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Your highest qualification</legend>
              <div className="grid grid-cols-3 gap-2">
                {QUALIFICATIONS.map((q) => (
                  <label
                    key={q.value}
                    className={`cursor-pointer rounded-xl border px-3 py-2 text-center text-sm font-medium transition-colors ${
                      qualification === q.value
                        ? "border-peacock-600 bg-peacock-50 text-peacock-700"
                        : "border-ink-200 text-ink-700 hover:border-ink-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="qualification"
                      className="sr-only"
                      value={q.value}
                      checked={qualification === q.value}
                      onChange={() => {
                        setQualification(q.value);
                        setProblems([]);
                      }}
                    />
                    <span>{q.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {(qualification === "10th" || qualification === "12th") && (
              <PercentField id="pct-10" label="10th percentage (%)" value={p10} onChange={setP10} />
            )}

            {qualification === "12th" && (
              <>
                <PercentField id="pct-12" label="12th percentage (%)" value={p12} onChange={setP12} />
                <div>
                  <label htmlFor="stream" className="mb-1.5 block text-sm font-semibold">
                    12th stream
                  </label>
                  <select id="stream" className="field" value={stream} onChange={(e) => setStream(e.target.value as Stream | "")}>
                    <option value="">Choose a stream</option>
                    {STREAMS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {qualification === "diploma" && (
              <>
                <PercentField id="pct-diploma" label="Diploma percentage (%)" value={diplomaPct} onChange={setDiplomaPct} />
                <div>
                  <label htmlFor="branch" className="mb-1.5 block text-sm font-semibold">
                    Diploma branch <span className="font-normal text-ink-500">(optional)</span>
                  </label>
                  <input
                    id="branch"
                    className="field"
                    value={branch}
                    maxLength={80}
                    onChange={(e) => setBranch(e.target.value)}
                    placeholder="e.g. Computer Engineering"
                  />
                  <p className="mt-1 text-xs text-ink-500">Not used for matching yet. Branch-wise rules come with verified course data.</p>
                </div>
              </>
            )}

            <div>
              <label htmlFor="course" className="mb-1.5 block text-sm font-semibold">
                Preferred course <span className="font-normal text-ink-500">(optional)</span>
              </label>
              <input
                id="course"
                className="field"
                value={course}
                maxLength={80}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. B.Tech, B.Com"
              />
            </div>

            <div>
              <label htmlFor="state" className="mb-1.5 block text-sm font-semibold">
                State or UT <span className="font-normal text-ink-500">(optional)</span>
              </label>
              <select id="state" className="field" value={state} onChange={(e) => setState(e.target.value)} disabled={!facets.data}>
                <option value="">All states</option>
                {facets.data?.states.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.value}
                  </option>
                ))}
              </select>
            </div>

            {problems.length > 0 && (
              <div role="alert" className="rounded-xl border border-gulmohar-500/30 bg-gulmohar-50 p-3 text-sm text-gulmohar-700">
                <ul className="list-disc space-y-1 pl-5">
                  {problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
            )}

            <button type="submit" className="btn btn-primary w-full disabled:opacity-60" disabled={loading}>
              {loading ? "Checking…" : "Find colleges"}
            </button>
          </form>
        </aside>

        <section ref={resultsRef} aria-label="Results" className="scroll-mt-24">
          {!data && !loading && !error && (
            <EmptyState title="Your results will appear here">
              Fill in your marks and press Find colleges. We only use the numbers you enter and nothing is saved.
            </EmptyState>
          )}

          {error && <ErrorState message={error} onRetry={() => submit()} />}

          {loading && (
            <div className="grid gap-5 md:grid-cols-2" aria-busy="true">
              {Array.from({ length: 4 }, (_, i) => (
                <CardSkeleton key={i} />
              ))}
            </div>
          )}

          {data && !loading && !error && (
            <>
              <p className="text-sm text-ink-700" aria-live="polite">
                <span className="tabular font-semibold">{data.count}</span> {data.count === 1 ? "college" : "colleges"} checked
                {data.count > data.results.length && <> (showing the top {data.results.length})</>}
              </p>

              {allInsufficient && (
                <div className="mt-4 rounded-2xl border border-ink-200 bg-ink-100 p-4 text-sm text-ink-700">
                  <p className="font-semibold text-ink-900">We cannot check eligibility for these colleges yet.</p>
                  <p className="mt-1">
                    Verified course rules have not been added for them, so every result says Insufficient data. This is
                    missing data, not a rejection. Please check the official website of each college.{" "}
                    <Link to="/explore" className="font-semibold text-peacock-700 hover:underline">
                      Explore colleges
                    </Link>
                  </p>
                </div>
              )}

              {data.results.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Filter by eligibility">
                  <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" count={data.results.length} />
                  {(Object.keys(STATUS_META) as EligibilityStatus[]).map((s) => (
                    <FilterChip
                      key={s}
                      active={filter === s}
                      onClick={() => setFilter(s)}
                      label={STATUS_META[s].label}
                      count={counts[s]}
                    />
                  ))}
                </div>
              )}

              {data.results.length === 0 && (
                <div className="mt-4">
                  <EmptyState title="No colleges found">
                    No colleges match the state you chose. Try All states or a different state.
                  </EmptyState>
                </div>
              )}

              {data.results.length > 0 && visible.length === 0 && (
                <div className="mt-4">
                  <EmptyState title="Nothing in this group">Choose another filter above to see the other colleges.</EmptyState>
                </div>
              )}

              {visible.length > 0 && (
                <div className="mt-5 grid gap-5 md:grid-cols-2">
                  {visible.map((r) => (
                    <ResultCard key={r.slug} result={r} />
                  ))}
                </div>
              )}

              <p className="mt-6 text-sm text-ink-500">{DISCLAIMER}</p>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function PercentField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        className="field tabular"
        type="number"
        inputMode="decimal"
        min={0}
        max={100}
        step="any"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0 to 100"
      />
    </div>
  );
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "border-peacock-600 bg-peacock-50 text-peacock-700" : "border-ink-200 text-ink-700 hover:border-ink-300"
      }`}
    >
      {label} <span className="tabular font-semibold">{count}</span>
    </button>
  );
}

function StatusBadge({ status }: { status: EligibilityStatus }) {
  const m = meta(status);
  return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${m.className}`}>{m.label}</span>;
}

function ResultCard({ result: r }: { result: FinderResult }) {
  return (
    <article className="flex h-full flex-col rounded-2xl border border-ink-100 bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold leading-snug">
            <Link to={`/colleges/${r.slug}`} className="hover:text-peacock-700">
              {r.name}
            </Link>
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-500">
            <PinIcon width={15} height={15} />
            {r.city}, {r.state}
          </p>
        </div>
        <VerificationStamp status={r.verification_status} className="shrink-0" />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <StatusBadge status={r.status} />
        <span className="rounded-full bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-700">{r.ownership}</span>
      </div>

      <p className="mt-3 text-sm text-ink-700">{r.reason}</p>

      {r.courses.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold">Courses checked</h4>
          <ul className="mt-2 space-y-2">
            {r.courses.map((c) => (
              <li key={`${c.course}-${c.level}`} className="rounded-xl bg-ink-100/60 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">
                    {c.course} <span className="font-normal text-ink-500">({c.level})</span>
                  </span>
                  <StatusBadge status={c.status} />
                </div>
                <p className="mt-1 text-ink-700">{c.reason}</p>
                {c.admission_route && <p className="mt-1 text-ink-500">Admission route: {c.admission_route}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-5 text-sm">
        {r.website ? (
          <a
            href={r.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-peacock-700 hover:underline"
          >
            {hostOf(r.website)}
            <ExternalIcon width={14} height={14} />
            <span className="sr-only">(opens official website in a new tab)</span>
          </a>
        ) : (
          <span className="text-ink-500">Website not added yet</span>
        )}
        {r.admission_url && (
          <a
            href={r.admission_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-peacock-700 hover:underline"
          >
            Admission portal
            <ExternalIcon width={14} height={14} />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        )}
      </div>
    </article>
  );
}

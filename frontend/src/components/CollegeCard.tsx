import { Link } from "react-router-dom";
import { MAX_COMPARE, useCompare } from "../lib/compare";
import { hostOf } from "../lib/format";
import type { CollegeSummary } from "../lib/types";
import { CheckIcon, ExternalIcon, PinIcon, PlusIcon } from "./Icons";
import { VerificationStamp } from "./VerificationStamp";

function Chip({ children, tone = "plain" }: { children: string; tone?: "plain" | "teal" }) {
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
        tone === "teal" ? "bg-peacock-50 text-peacock-700" : "bg-ink-100 text-ink-700"
      }`}
    >
      {children}
    </span>
  );
}

export function CollegeCard({ college }: { college: CollegeSummary }) {
  const { has, toggle, slugs } = useCompare();
  const selected = has(college.slug);
  const full = !selected && slugs.length >= MAX_COMPARE;

  return (
    <article className="flex h-full flex-col rounded-2xl border border-ink-100 bg-white p-5 transition-shadow hover:shadow-[0_8px_30px_-12px_rgba(21,32,50,0.25)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-lg font-semibold leading-snug">
            <Link to={`/colleges/${college.slug}`} className="hover:text-peacock-700">
              {college.name}
            </Link>
          </h3>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm text-ink-500">
            <PinIcon width={15} height={15} />
            {college.city}, {college.state}
          </p>
        </div>
        <VerificationStamp status={college.verification_status} verifiedOn={college.last_verified_on} className="shrink-0" />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Chip tone="teal">{college.institution_type}</Chip>
        <Chip>{college.ownership}</Chip>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-ink-500">Admission route</dt>
          <dd className="font-medium">
            {college.admission_routes.length ? college.admission_routes.join(", ") : <span className="font-normal text-ink-500">Not added yet</span>}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-ink-500">Entrance exams</dt>
          <dd className="font-medium">
            {college.entrance_exams.length ? college.entrance_exams.join(", ") : <span className="font-normal text-ink-500">Not added yet</span>}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-ink-500">Fees</dt>
          <dd className="text-ink-500">Not verified yet</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-28 shrink-0 text-ink-500">Admission chance</dt>
          <dd className="text-ink-500">Insufficient data</dd>
        </div>
      </dl>

      <div className="mt-auto pt-5">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {college.website ? (
            <a
              href={college.website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-peacock-700 hover:underline"
            >
              {hostOf(college.website)}
              <ExternalIcon width={14} height={14} />
              <span className="sr-only">(opens official website in a new tab)</span>
            </a>
          ) : (
            <span className="text-ink-500">Website not added yet</span>
          )}
          {college.admission_url && (
            <a
              href={college.admission_url}
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

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link to={`/colleges/${college.slug}`} className="btn btn-quiet">
            View details
          </Link>
          <button
            type="button"
            aria-pressed={selected}
            disabled={full}
            title={full ? `You can compare up to ${MAX_COMPARE} colleges` : undefined}
            onClick={() => toggle(college.slug)}
            className={`btn ${selected ? "btn-primary" : "btn-quiet"} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {selected ? <CheckIcon width={16} height={16} /> : <PlusIcon width={16} height={16} />}
            {selected ? "Added" : "Compare"}
          </button>
        </div>
      </div>
    </article>
  );
}

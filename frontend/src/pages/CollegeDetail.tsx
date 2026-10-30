import { Link, useParams } from "react-router-dom";
import { CheckIcon, ExternalIcon, PinIcon, PlusIcon } from "../components/Icons";
import { ErrorState, Skeleton } from "../components/States";
import { VerificationStamp } from "../components/VerificationStamp";
import { useApi } from "../hooks/useApi";
import { api } from "../lib/api";
import { MAX_COMPARE, useCompare } from "../lib/compare";
import { formatDate, hostOf } from "../lib/format";

export default function CollegeDetail() {
  const { slug = "" } = useParams();
  const { data: college, error, loading, reload } = useApi((signal) => api.college(slug, signal), slug);
  const { has, toggle, slugs } = useCompare();

  if (loading && !college) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 px-4 py-12 sm:px-6" aria-busy="true">
        <Skeleton className="h-10 w-2/3" />
        <Skeleton className="h-5 w-1/3" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (error || !college) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <ErrorState message={error ?? "We could not find that college."} onRetry={reload} />
        <Link to="/explore" className="btn btn-quiet mt-6">
          Back to Explore Colleges
        </Link>
      </div>
    );
  }

  const selected = has(college.slug);
  const full = !selected && slugs.length >= MAX_COMPARE;
  const verifiedOn = formatDate(college.last_verified_on);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <Link to="/explore" className="text-sm font-semibold text-peacock-700 hover:underline">
        Back to Explore Colleges
      </Link>

      <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold leading-tight">{college.name}</h1>
          <p className="mt-2 flex items-center gap-1.5 text-ink-700">
            <PinIcon width={16} height={16} />
            {college.city}, {college.state}
          </p>
        </div>
        <VerificationStamp status={college.verification_status} verifiedOn={college.last_verified_on} />
      </header>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          aria-pressed={selected}
          disabled={full}
          onClick={() => toggle(college.slug)}
          title={full ? `You can compare up to ${MAX_COMPARE} colleges` : undefined}
          className={`btn ${selected ? "btn-primary" : "btn-quiet"} disabled:cursor-not-allowed disabled:opacity-50`}
        >
          {selected ? <CheckIcon width={16} height={16} /> : <PlusIcon width={16} height={16} />}
          {selected ? "Added to comparison" : "Add to comparison"}
        </button>
        {college.website && (
          <a href={college.website} target="_blank" rel="noopener noreferrer" className="btn btn-quiet">
            Official website ({hostOf(college.website)})
            <ExternalIcon width={14} height={14} />
          </a>
        )}
        {college.admission_url && (
          <a href={college.admission_url} target="_blank" rel="noopener noreferrer" className="btn btn-quiet">
            Admission portal
            <ExternalIcon width={14} height={14} />
          </a>
        )}
      </div>

      <section aria-labelledby="facts" className="mt-10 rounded-2xl border border-ink-100 bg-white p-6">
        <h2 id="facts" className="text-xl font-semibold">
          Key facts
        </h2>
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <Fact label="Institution type" value={college.institution_type} />
          <Fact label="Ownership" value={college.ownership} />
          <Fact label="Entrance exams" value={college.entrance_exams.join(", ")} />
          <Fact label="Admission routes" value={college.admission_routes.join(", ")} />
          <Fact label="Established" value={college.established_year?.toString()} />
          <Fact label="Fees" value={undefined} missing="Not verified yet" />
        </dl>
      </section>

      <section aria-labelledby="courses" className="mt-6 rounded-2xl border border-ink-100 bg-white p-6">
        <h2 id="courses" className="text-xl font-semibold">
          Courses and eligibility
        </h2>
        {college.courses.length === 0 ? (
          <p className="mt-3 text-ink-700">
            Course lists and eligibility rules have not been imported for this college yet. Check the official admission
            pages for current details.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-ink-100">
            {college.courses.map((course) => (
              <li key={course.id} className="py-3">
                <p className="font-semibold">{course.name}</p>
                <p className="text-sm text-ink-500">
                  {course.level}
                  {course.duration_years ? `, ${course.duration_years} years` : ""}
                  {course.min_percentage ? `, minimum ${course.min_percentage}%` : ""}
                </p>
                {course.eligibility_notes && <p className="mt-1 text-sm text-ink-700">{course.eligibility_notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="source" className="mt-6 rounded-2xl border border-ink-100 bg-white p-6">
        <h2 id="source" className="text-xl font-semibold">
          Data source
        </h2>
        <dl className="mt-4 space-y-3 text-sm">
          <Fact label="Source" value={college.data_source?.name} missing="No source recorded" />
          <Fact label="Verification" value={college.verification_status === "verified" ? `Verified${verifiedOn ? ` on ${verifiedOn}` : ""}` : "Not yet verified"} />
        </dl>
        {college.verification_status !== "verified" && (
          <p className="mt-4 rounded-xl bg-gulmohar-50 p-4 text-sm leading-6 text-ink-700">
            This record comes from a starter list and has not been checked against the institution&apos;s official
            sources. Treat the details as a starting point and confirm them on the official website.
          </p>
        )}
      </section>
    </div>
  );
}

function Fact({ label, value, missing = "Not added yet" }: { label: string; value?: string | null; missing?: string }) {
  return (
    <div>
      <dt className="text-sm text-ink-500">{label}</dt>
      <dd className="mt-0.5 font-medium">{value ? value : <span className="font-normal text-ink-500">{missing}</span>}</dd>
    </div>
  );
}

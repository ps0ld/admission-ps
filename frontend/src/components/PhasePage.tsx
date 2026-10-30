import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  title: string;
  summary: string;
  planned: string[];
  children?: ReactNode;
}

/** Honest holding page for features that are not built yet. Shows what is planned and what to use meanwhile. */
export function PhasePage({ title, summary, planned, children }: Props) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
      <span className="inline-block rounded-md border-2 border-gulmohar-500 px-2 py-0.5 text-xs font-bold text-gulmohar-700">
        Not available yet
      </span>
      <h1 className="mt-4 text-4xl font-bold">{title}</h1>
      <p className="mt-3 max-w-2xl text-lg leading-8 text-ink-700">{summary}</p>

      <h2 className="mt-10 text-xl font-semibold">What it will do</h2>
      <ul className="mt-3 list-disc space-y-2 pl-5 text-ink-700">
        {planned.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>

      {children}

      <div className="mt-10">
        <Link to="/explore" className="btn btn-primary">
          Explore colleges meanwhile
        </Link>
      </div>
    </div>
  );
}

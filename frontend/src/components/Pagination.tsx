interface Props {
  page: number;
  pageSize: number;
  total: number;
  onChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onChange }: Props) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-4">
      <button type="button" className="btn btn-quiet disabled:opacity-40" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Previous
      </button>
      <p className="tabular text-sm text-ink-500" aria-live="polite">
        Page {page} of {pages}
      </p>
      <button type="button" className="btn btn-quiet disabled:opacity-40" disabled={page >= pages} onClick={() => onChange(page + 1)}>
        Next
      </button>
    </nav>
  );
}

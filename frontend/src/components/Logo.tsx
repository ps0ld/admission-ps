export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="10" fill="#0A6E78" />
      <path
        d="M11 30 L20 9 L29 30"
        fill="none"
        stroke="#fff"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 24.5 L19 28 L26 19.5"
        fill="none"
        stroke="#F5B52E"
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="inline-flex items-center gap-2.5">
      <LogoMark />
      <span className="font-display text-xl font-bold tracking-tight text-ink-900">
        Admission <span className="text-peacock-600">PS</span>
      </span>
    </span>
  );
}

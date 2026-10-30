import { formatDate } from "../lib/format";

interface Props {
  status: "verified" | "unverified";
  verifiedOn?: string | null;
  className?: string;
}

/**
 * The visual signature of Admission PS: every record wears its verification state
 * like an office stamp, so nobody mistakes an unchecked record for a confirmed one.
 */
export function VerificationStamp({ status, verifiedOn, className = "" }: Props) {
  const verified = status === "verified";
  const date = formatDate(verifiedOn);
  const label = verified ? (date ? `Verified ${date}` : "Verified") : "Not yet verified";

  return (
    <span
      className={`stamp inline-block select-none rounded-md border-2 px-2 py-0.5 text-xs font-bold leading-5 ${
        verified
          ? "border-peacock-600 text-peacock-700 outline outline-1 outline-offset-2 outline-peacock-600/40"
          : "border-gulmohar-500 text-gulmohar-700 outline outline-1 outline-offset-2 outline-gulmohar-500/40"
      } ${className}`}
      title={
        verified
          ? "Checked against an official source"
          : "Imported from a starter list. Confirm details on the official website."
      }
    >
      {label}
    </span>
  );
}

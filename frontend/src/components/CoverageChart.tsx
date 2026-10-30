import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { CoverageRow } from "../lib/types";

/** Records per institution type, split into verified and not-yet-verified. */
export function CoverageChart({ rows }: { rows: CoverageRow[] }) {
  const data = rows
    .filter((r) => r.count > 0)
    .map((r) => ({ name: r.institution_type, Verified: r.verified, "Not yet verified": r.count - r.verified }));

  if (data.length === 0) return null;

  return (
    <figure>
      <div style={{ height: Math.max(220, data.length * 38) }} role="img" aria-label="Colleges in the directory by institution type">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
            <CartesianGrid horizontal={false} stroke="#e9edf3" />
            <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: "#55637a" }} />
            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12, fill: "#2b3a52" }} />
            <Tooltip cursor={{ fill: "#f4f8f8" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Verified" stackId="a" fill="#0a6e78" radius={[0, 0, 0, 0]} />
            <Bar dataKey="Not yet verified" stackId="a" fill="#f5b52e" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

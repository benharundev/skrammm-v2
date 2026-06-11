import type { StandingRow } from "@modules/match";

interface StandingsSectionProps {
  standings: Record<string, StandingRow[]>;
}

function GroupTable({ group, rows }: { group: string; rows: StandingRow[] }) {
  return (
    <div className="border-2 border-border rounded-sm overflow-hidden">
      <div
        className="px-4 py-2"
        style={{ background: "var(--pitch-green-mid, #0d3b2e)" }}
      >
        <p
          className="text-fair-play-gold"
          style={{ fontFamily: "var(--font-lexend)", fontSize: "13px", fontWeight: 800, letterSpacing: "0.05em" }}
        >
          {group}
        </p>
      </div>
      <table className="w-full">
        <thead>
          <tr className="bg-muted/50">
            {["#", "Team", "P", "W", "L", "PTS"].map((h) => (
              <th
                key={h}
                className="px-2 py-1.5 text-muted-foreground text-center last:text-right first:text-left"
                style={{
                  fontFamily: "var(--font-inter)",
                  fontSize: "10px",
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr
              key={r.teamId}
              className="border-t border-border"
              style={r.pos <= 2 ? { borderLeft: "3px solid var(--fair-play-gold)" } : undefined}
            >
              <td className="px-2 py-2 text-center w-6">
                <span
                  className="text-muted-foreground"
                  style={{ fontFamily: "var(--font-inter)", fontSize: "12px", fontWeight: 500 }}
                >
                  {r.pos}
                </span>
              </td>
              <td className="px-2 py-2">
                <span
                  className="text-foreground"
                  style={{ fontFamily: "var(--font-inter)", fontSize: "13px", fontWeight: 600 }}
                >
                  {r.teamName}
                </span>
              </td>
              {[r.p, r.w, r.l].map((v, i) => (
                <td
                  key={i}
                  className="px-2 py-2 text-center text-muted-foreground"
                  style={{ fontFamily: "var(--font-inter)", fontSize: "12px" }}
                >
                  {v}
                </td>
              ))}
              <td className="px-2 py-2 text-right">
                <span
                  className="text-foreground"
                  style={{ fontFamily: "var(--font-lexend)", fontSize: "14px", fontWeight: 800 }}
                >
                  {r.pts}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StandingsSection({ standings }: StandingsSectionProps) {
  const groups = Object.keys(standings).sort();
  if (groups.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2
        className="text-foreground"
        style={{ fontFamily: "var(--font-lexend)", fontSize: "16px", fontWeight: 800 }}
      >
        Standings
      </h2>
      {groups.map((g) => (
        <GroupTable key={g} group={g} rows={standings[g]!} />
      ))}
    </section>
  );
}

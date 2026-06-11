import type { PublicMatch } from "@modules/match";

interface DrawSectionProps {
  matches: PublicMatch[];
}

export function DrawSection({ matches }: DrawSectionProps) {
  const roundOrder: string[] = [];
  const roundMap: Record<string, PublicMatch[]> = {};

  for (const match of matches) {
    const round = match.round ?? "Match";
    if (!roundMap[round]) {
      roundOrder.push(round);
      roundMap[round] = [];
    }
    roundMap[round]!.push(match);
  }

  if (roundOrder.length === 0) return null;

  return (
    <section className="flex flex-col gap-4">
      <h2
        className="text-foreground"
        style={{ fontFamily: "var(--font-lexend)", fontSize: "16px", fontWeight: 800 }}
      >
        Draw
      </h2>
      {roundOrder.map((round) => (
        <div key={round} className="border-2 border-border rounded-sm overflow-hidden">
          <div
            className="px-4 py-2"
            style={{ background: "var(--pitch-green-mid, #0d3b2e)" }}
          >
            <p
              className="text-fair-play-gold uppercase tracking-wider"
              style={{ fontFamily: "var(--font-lexend)", fontSize: "12px", fontWeight: 800 }}
            >
              {round}
            </p>
          </div>
          <div className="divide-y divide-border">
            {roundMap[round]!.map((match) => {
              const isLive = match.status === "live";
              const isDone = match.status === "completed" || match.status === "locked";

              return (
                <div key={match.id} className="flex items-center px-4 py-3 gap-3 bg-card">
                  <div className="flex-1 text-right">
                    <p
                      className="text-foreground"
                      style={{ fontFamily: "var(--font-inter)", fontSize: "13px", fontWeight: 700 }}
                    >
                      {match.homeTeam.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isDone || isLive ? (
                      <>
                        <span
                          style={{
                            fontFamily: "var(--font-lexend)",
                            fontSize: "20px",
                            fontWeight: 900,
                            color: isLive ? "var(--fair-play-gold)" : "var(--foreground)",
                          }}
                        >
                          {match.homeScore}
                        </span>
                        <span className="text-muted-foreground text-sm">–</span>
                        <span
                          style={{
                            fontFamily: "var(--font-lexend)",
                            fontSize: "20px",
                            fontWeight: 900,
                            color: isLive ? "var(--fair-play-gold)" : "var(--foreground)",
                          }}
                        >
                          {match.awayScore}
                        </span>
                      </>
                    ) : (
                      <span
                        className="text-muted-foreground"
                        style={{ fontFamily: "var(--font-inter)", fontSize: "12px" }}
                      >
                        vs
                      </span>
                    )}
                  </div>
                  <div className="flex-1 text-left">
                    <p
                      className="text-foreground"
                      style={{ fontFamily: "var(--font-inter)", fontSize: "13px", fontWeight: 700 }}
                    >
                      {match.awayTeam.name}
                    </p>
                  </div>
                  {isLive && (
                    <span
                      className="flex-shrink-0 px-2 py-0.5 rounded-sm"
                      style={{
                        background: "var(--red-card)",
                        color: "#fff",
                        fontFamily: "var(--font-inter)",
                        fontSize: "9px",
                        fontWeight: 800,
                      }}
                    >
                      LIVE
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}

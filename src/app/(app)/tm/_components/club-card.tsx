// Structural subset — only the fields ClubCard actually reads.
// The real Prisma type (from getPastMatchesForTeam) satisfies this.
export interface PastMatch {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
}

interface ClubCardProps {
  name: string;
  origin: string | null;
  playerCount: number;
  activeTournamentCount: number;
  pastMatches: PastMatch[];
  teamId: string;
}

const MAX_FORM = 7;

export function ClubCard({
  name,
  origin,
  playerCount,
  activeTournamentCount,
  pastMatches,
  teamId,
}: ClubCardProps) {
  const recent = pastMatches.slice(0, MAX_FORM).toReversed();
  const padCount = MAX_FORM - recent.length;

  return (
    <div className="rounded-sm border-2 border-border bg-card shadow-brutalist">
      {/* Accent bar — matches PlayerCard */}
      <div className="h-[1.5px] w-full bg-accent" />

      <div className="p-4 space-y-3">
        {/* Club name + origin */}
        <div>
          <h1 className="font-[family-name:var(--font-lexend)] text-2xl font-extrabold tracking-tight text-foreground">
            {name}
          </h1>
          {origin !== null && (
            <p className="text-sm text-muted-foreground">{origin}</p>
          )}
          <p className="mt-1 text-sm text-muted-foreground">
            {playerCount} players · {activeTournamentCount} tournament{activeTournamentCount !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Form strip */}
        <div className="space-y-1.5">
          <h2 className="font-[family-name:var(--font-lexend)] text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Form
          </h2>
          <div className="flex gap-1.5">
            {recent.map((m) => {
              const isHome = m.homeTeamId === teamId;
              const won = isHome
                ? m.homeScore > m.awayScore
                : m.awayScore > m.homeScore;
              const draw = m.homeScore === m.awayScore;
              return (
                <span
                  key={m.id}
                  className={`rounded-sm w-8 h-8 flex items-center justify-center text-xs font-black ${
                    won
                      ? "bg-pitch-green text-white"
                      : draw
                        ? "bg-muted text-muted-foreground"
                        : "bg-red-card text-white"
                  }`}
                >
                  {won ? "W" : draw ? "D" : "L"}
                </span>
              );
            })}
            {Array.from({ length: padCount }).map((_, i) => (
              <span
                key={i}
                className="rounded-sm w-8 h-8 flex items-center justify-center text-xs font-black bg-muted text-muted-foreground opacity-40"
              >
                ?
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import type { getPastMatchesForTeam } from "@modules/match";

type PastMatch = Awaited<ReturnType<typeof getPastMatchesForTeam>>[number];

const MAX_FORM_RESULTS = 7;

interface FormStripProps {
  matches: PastMatch[];
  teamId: string;
}

export function FormStrip({ matches, teamId }: FormStripProps) {
  const recent = matches.slice(0, MAX_FORM_RESULTS).toReversed();
  const padCount = MAX_FORM_RESULTS - recent.length;

  return (
    <div className="space-y-2">
      <h2 className="font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">Form</h2>
      <div className="flex gap-1.5">
        {recent.map((m) => {
          const isHome = m.homeTeamId === teamId;
          const won = isHome ? m.homeScore > m.awayScore : m.awayScore > m.homeScore;
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
  );
}

import type { PublicMatch } from "@modules/match";

interface NextUpBannerProps {
  match: PublicMatch;
}

export function NextUpBanner({ match }: NextUpBannerProps) {
  const kickoff = new Date(match.scheduledAt).toLocaleTimeString("en-MY", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return (
    <div
      className="border-2 rounded-sm px-4 py-3"
      style={{
        borderColor: "var(--fair-play-gold)",
        background: "var(--pitch-green-mid, #0d3b2e)",
      }}
    >
      <p
        className="text-fair-play-gold uppercase tracking-wider mb-1"
        style={{ fontFamily: "var(--font-inter)", fontSize: "10px", fontWeight: 800 }}
      >
        ⏱ Next up
        {match.pitch ? ` · ${match.pitch}` : ""}
        {` · ${kickoff}`}
      </p>
      <p
        className="text-white"
        style={{ fontFamily: "var(--font-lexend)", fontSize: "15px", fontWeight: 800 }}
      >
        {match.homeTeam.name}
        <span className="text-white/40 font-normal mx-2">vs</span>
        {match.awayTeam.name}
      </p>
    </div>
  );
}

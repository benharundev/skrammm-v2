interface ChampionBannerProps {
  teamName: string;
}

export function ChampionBanner({ teamName }: ChampionBannerProps) {
  return (
    <div
      className="border-2 border-pitch-green rounded-sm px-4 py-4 text-center"
      style={{
        background: "var(--fair-play-gold)",
        boxShadow: "4px 4px 0 var(--pitch-green)",
      }}
    >
      <p
        style={{
          fontFamily: "var(--font-inter)",
          fontSize: "11px",
          fontWeight: 800,
          color: "var(--pitch-green)",
          textTransform: "uppercase" as const,
          letterSpacing: "0.1em",
          marginBottom: 4,
        }}
      >
        🏆 Tournament Champions
      </p>
      <p
        style={{
          fontFamily: "var(--font-lexend)",
          fontSize: "22px",
          fontWeight: 900,
          color: "var(--pitch-green)",
          lineHeight: 1.1,
        }}
      >
        {teamName}
      </p>
    </div>
  );
}

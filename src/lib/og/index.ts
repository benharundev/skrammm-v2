import { getPublicUrl, storageKeys } from "@lib/storage";

// ---------------------------------------------------------------------------
// Performance card — player stats (existing)
// ---------------------------------------------------------------------------

export interface PerformanceCardOptions {
  playerId: string;
  tournamentId?: string;
  playerName: string;
  teamName: string;
  stats: Record<string, number | string | null>;
  statsHash: string;
  cardTitle?: string;
  statItems?: { label: string; value: string | number }[];
}

export async function generatePerformanceCard(opts: PerformanceCardOptions): Promise<Buffer> {
  const { default: satori } = await import("satori");
  const { Resvg } = await import("@resvg/resvg-js");

  const jerseyNum = String(opts.stats["jerseyNumber"] ?? "—");
  const matches   = String(opts.stats["matchesPlayed"] ?? 0);
  const tries     = String(opts.stats["tries"] ?? 0);
  const reliability = String(opts.stats["reliability"] ?? 100);
  const idCode    = String(opts.stats["playerIdCode"] ?? "");

  // Optional title badge above the player name
  const titleBadge = opts.cardTitle
    ? [
        {
          type: "div",
          props: {
            style: { display: "flex", marginBottom: 8, padding: "4px 12px", backgroundColor: "#ffba20", borderRadius: 4 },
            children: [
              { type: "span", props: { style: { fontSize: 18, fontWeight: 900, color: "#0d3b2e" }, children: opts.cardTitle } },
            ],
          },
        },
      ]
    : [];

  // Default stat columns (backwards compatible) vs. provided statItems
  const defaultStatItems: { label: string; value: string | number }[] = [
    { label: "MATCHES", value: matches },
    { label: "TRIES", value: tries },
    { label: "RELIABILITY", value: reliability },
  ];
  const resolvedStatItems = opts.statItems ?? defaultStatItems;

  const statColumns = resolvedStatItems.map((item, i) => ({
    type: "div",
    props: {
      style: {
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 16,
        ...(i < resolvedStatItems.length - 1
          ? { borderRight: "1px solid rgba(255,255,255,0.1)" }
          : {}),
      },
      children: [
        { type: "div", props: { style: { color: "#ffba20", fontSize: 110, fontWeight: 900, lineHeight: 1 }, children: String(item.value) } },
        { type: "div", props: { style: { color: "rgba(255,255,255,0.35)", fontSize: 26, letterSpacing: "0.12em", fontWeight: 700 }, children: item.label.toUpperCase() } },
      ],
    },
  }));

  const card = {
    type: "div",
    props: {
      style: { display: "flex", flexDirection: "column", width: 1080, height: 1920, background: "#00241a", fontFamily: "sans-serif" },
      children: [
        // Gold top bar
        { type: "div", props: { style: { height: 16, background: "#ffba20", width: "100%" }, children: [] } },
        // Brand header
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "60px 80px 0" },
            children: [
              { type: "div", props: { style: { color: "#ffba20", fontSize: 40, fontWeight: 900, letterSpacing: "0.25em" }, children: "SKRAMMM" } },
              { type: "div", props: { style: { color: "rgba(255,255,255,0.3)", fontSize: 28, letterSpacing: "0.1em" }, children: "PLAYER CARD" } },
            ],
          },
        },
        // Jersey + Name block
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", alignItems: "center", padding: "80px 80px 60px", gap: 28 },
            children: [
              ...titleBadge,
              {
                type: "div",
                props: {
                  style: { display: "flex", alignItems: "center", justifyContent: "center", width: 220, height: 220, background: "#ffba20", color: "#00241a", fontSize: 120, fontWeight: 900 },
                  children: jerseyNum,
                },
              },
              { type: "div", props: { style: { color: "#ffffff", fontSize: 88, fontWeight: 900, lineHeight: 1.05, textAlign: "center" }, children: opts.playerName } },
              { type: "div", props: { style: { color: "rgba(255,255,255,0.5)", fontSize: 44, fontWeight: 700 }, children: opts.teamName } },
              { type: "div", props: { style: { color: "rgba(255,186,32,0.6)", fontSize: 28, letterSpacing: "0.15em", fontFamily: "monospace" }, children: `#${idCode}` } },
            ],
          },
        },
        // Divider
        { type: "div", props: { style: { height: 2, background: "rgba(255,255,255,0.08)", margin: "0 80px" }, children: [] } },
        // Stats grid (3 cols)
        {
          type: "div",
          props: {
            style: { display: "flex", flex: 1, padding: "80px 80px" },
            children: statColumns,
          },
        },
        // Footer
        {
          type: "div",
          props: {
            style: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "40px 80px", borderTop: "3px solid #ffba20" },
            children: [
              { type: "div", props: { style: { color: "#ffba20", fontSize: 32, fontWeight: 900, letterSpacing: "0.05em" }, children: "SKRAMMM" } },
              { type: "div", props: { style: { color: "rgba(255,255,255,0.3)", fontSize: 28 }, children: "skrammm.com" } },
            ],
          },
        },
      ],
    },
  };

  const svg = await satori(card as Parameters<typeof satori>[0], { width: 1080, height: 1920, fonts: [] });
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1080 } });
  return Buffer.from(resvg.render().asPng());
}

export function getCardUrl(
  playerId: string,
  tournamentId: string,
  statsHash: string
): string {
  return getPublicUrl(storageKeys.performanceCard(playerId, tournamentId, statsHash));
}

// ---------------------------------------------------------------------------
// Match story card — Score Hero design (Option C)
// 1080×1920 px, generated on-demand (not cached)
// ---------------------------------------------------------------------------

export interface MatchStoryCardEvent {
  eventType: string;
  playerName: string | null;
  minute: number;
  teamId: string;
}

export interface MatchStoryCardOptions {
  tournamentName: string;
  tournamentCode: string;
  homeTeam: string;
  homeTeamId: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  status: "live" | "completed" | "scheduled";
  minute?: number;
  pitch?: string | null;
  groupLabel?: string | null;
  events: MatchStoryCardEvent[];
}

function eventLabel(type: string): string {
  const map: Record<string, string> = {
    try: "TRY",
    conversion: "CONV",
    penalty: "PEN",
    drop_goal: "DG",
    yellow_card: "YC",
    red_card: "RC",
    sub_in: "SUB",
    sub_out: "SUB",
  };
  return map[type] ?? type.toUpperCase().slice(0, 4);
}

function eventBadgeColor(type: string): string {
  if (type === "yellow_card") return "#f5c400";
  if (type === "red_card") return "#ba1a1a";
  return "#ffba20";
}

export async function generateMatchStoryCard(
  opts: MatchStoryCardOptions
): Promise<Buffer> {
  const { default: satori } = await import("satori");
  const { Resvg } = await import("@resvg/resvg-js");

  const scoreColor = opts.status === "completed" ? "#ffffff" : "#ffba20";

  const statusLabel =
    opts.status === "live"
      ? `LIVE ${opts.minute != null ? `${opts.minute}′` : ""}`.trim()
      : opts.status === "completed"
      ? "FULL TIME"
      : "UPCOMING";

  const statusBg =
    opts.status === "live" ? "#ba1a1a" : opts.status === "completed" ? "#1a3a2e" : "#4f5f77";

  const metaLine =
    opts.status === "scheduled"
      ? [opts.pitch].filter(Boolean).join(" · ")
      : [`${opts.minute != null ? `${opts.minute}′` : ""}`, opts.pitch]
          .filter(Boolean)
          .join(" · ");

  const visibleEvents = opts.events.slice(0, 5);

  const pillChildren: object[] = [
    {
      type: "div",
      props: {
        style: {
          display: "flex",
          background: statusBg,
          color: "#fff",
          fontSize: 28,
          fontWeight: 800,
          padding: "8px 24px",
          letterSpacing: "0.08em",
          border: opts.status === "completed" ? "2px solid rgba(255,255,255,0.2)" : "none",
        },
        children: statusLabel,
      },
    },
  ];

  if (opts.groupLabel) {
    pillChildren.push({
      type: "div",
      props: {
        style: {
          display: "flex",
          background: "rgba(255,255,255,0.1)",
          color: "rgba(255,255,255,0.6)",
          fontSize: 28,
          fontWeight: 700,
          padding: "8px 24px",
        },
        children: opts.groupLabel,
      },
    });
  }

  const eventRows = visibleEvents.map((ev) => ({
    type: "div",
    props: {
      style: { display: "flex", alignItems: "center", gap: 20 },
      children: [
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              background: eventBadgeColor(ev.eventType),
              color: "#000",
              fontSize: 22,
              fontWeight: 800,
              padding: "6px 16px",
              letterSpacing: "0.05em",
            },
            children: eventLabel(ev.eventType),
          },
        },
        {
          type: "div",
          props: {
            style: { color: "rgba(255,255,255,0.65)", fontSize: 30, flex: 1 },
            children:
              ev.playerName ??
              (ev.teamId === opts.homeTeamId ? opts.homeTeam : opts.awayTeam),
          },
        },
        {
          type: "div",
          props: {
            style: {
              color: "rgba(255,255,255,0.3)",
              fontSize: 28,
              fontFamily: "monospace",
            },
            children: `${ev.minute}′`,
          },
        },
      ],
    },
  }));

  const noEventsPlaceholder =
    visibleEvents.length === 0
      ? [
          {
            type: "div",
            props: {
              style: { color: "rgba(255,255,255,0.2)", fontSize: 28, fontStyle: "italic" },
              children: "No events yet",
            },
          },
        ]
      : [];

  const card = {
    type: "div",
    props: {
      style: {
        display: "flex",
        flexDirection: "column",
        width: 1080,
        height: 1920,
        background: "#00241a",
        fontFamily: "sans-serif",
      },
      children: [
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", padding: "80px 80px 40px", gap: 16 },
            children: [
              { type: "div", props: { style: { display: "flex", gap: 12 }, children: pillChildren } },
              {
                type: "div",
                props: {
                  style: { color: "#ffba20", fontSize: 32, fontWeight: 900, letterSpacing: "0.2em", marginTop: 8 },
                  children: "SKRAMMM",
                },
              },
              {
                type: "div",
                props: {
                  style: { color: "#ffffff", fontSize: 56, fontWeight: 900, lineHeight: 1.1, marginTop: 4 },
                  children: opts.tournamentName,
                },
              },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              flex: 1,
              padding: "0 80px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    color: scoreColor,
                    fontSize: 200,
                    fontWeight: 900,
                    lineHeight: 1,
                    fontFamily: "monospace",
                  },
                  children: `${opts.homeScore} – ${opts.awayScore}`,
                },
              },
              {
                type: "div",
                props: {
                  style: { color: "rgba(255,255,255,0.4)", fontSize: 36, marginTop: 20 },
                  children: metaLine,
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                    marginTop: 36,
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          color: "rgba(255,255,255,0.75)",
                          fontSize: 44,
                          fontWeight: 900,
                          maxWidth: "44%",
                        },
                        children: opts.homeTeam,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          color: "rgba(255,255,255,0.75)",
                          fontSize: 44,
                          fontWeight: 900,
                          maxWidth: "44%",
                          textAlign: "right",
                        },
                        children: opts.awayTeam,
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              padding: "40px 80px",
              borderTop: "1px solid rgba(255,255,255,0.1)",
              gap: 16,
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    color: "rgba(255,255,255,0.3)",
                    fontSize: 24,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    marginBottom: 8,
                  },
                  children: "MATCH EVENTS",
                },
              },
              ...eventRows,
              ...noEventsPlaceholder,
            ],
          },
        },
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "40px 80px",
              borderTop: "3px solid #ffba20",
            },
            children: [
              {
                type: "div",
                props: {
                  style: { color: "#ffba20", fontSize: 32, fontWeight: 900, letterSpacing: "0.05em" },
                  children: "SKRAMMM",
                },
              },
              {
                type: "div",
                props: {
                  style: { color: "rgba(255,255,255,0.3)", fontSize: 28 },
                  children: `skrammm.com/${opts.tournamentCode}`,
                },
              },
            ],
          },
        },
      ],
    },
  };

  const svg = await satori(card as Parameters<typeof satori>[0], { width: 1080, height: 1920, fonts: [] });
  const resvg = new Resvg(svg, { fitTo: { mode: "width", value: 1080 } });
  return Buffer.from(resvg.render().asPng());
}

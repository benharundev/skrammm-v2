"use client";

import { useRef } from "react";

export interface PitchPin {
  pitchX: number;
  pitchY: number;
  eventType: string;
  team: "home" | "away";
}

interface PitchSvgProps {
  activeAction: { eventType: string; team: "home" | "away" } | null;
  activeActionLabel: string;
  pins: PitchPin[];
  onPitchClick: (coords: { pitchX: number; pitchY: number }) => void;
  showHeatmap?: boolean;
}

function pinColor(eventType: string, team: "home" | "away"): string {
  const scoring = ["try", "conversion", "penalty", "drop_goal"];
  const discipline = ["yellow_card", "red_card"];
  const defensive = ["tackles_made", "tackles_missed"];
  if (scoring.includes(eventType)) return "#FFD700";
  if (discipline.includes(eventType)) return eventType === "red_card" ? "#ef4444" : "#fbbf24";
  if (defensive.includes(eventType)) return "#f87171";
  return team === "home" ? "#6fcf6f" : "#60a5fa";
}

// Heat blobs use the same category colours as the pins so density reads
// consistently. Kept fully opaque here — opacity comes from the wrapping <g>.
function heatColor(eventType: string, team: "home" | "away"): string {
  return pinColor(eventType, team);
}

export function PitchSvg({ activeAction, activeActionLabel, pins, onPitchClick, showHeatmap = false }: PitchSvgProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  function handleClick(e: React.MouseEvent<SVGSVGElement>) {
    if (!activeAction) return;
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const pitchX = ((e.clientX - rect.left) / rect.width) * 100;
    const pitchY = ((e.clientY - rect.top) / rect.height) * 100;
    onPitchClick({ pitchX, pitchY });
  }

  const isActive = activeAction !== null;

  return (
    <div className="relative select-none">
      {isActive && (
        <div className="absolute top-2 left-2 z-10 flex items-center gap-1.5 bg-fair-play-gold text-pitch-green px-2 py-1 rounded-sm text-[10px] font-black">
          {activeActionLabel} — click pitch
        </div>
      )}
      <svg
        ref={svgRef}
        viewBox="0 0 140 70"
        xmlns="http://www.w3.org/2000/svg"
        onClick={handleClick}
        className={`w-full rounded-sm transition-all ${
          isActive
            ? "cursor-crosshair ring-2 ring-fair-play-gold"
            : "cursor-default"
        }`}
        style={{ background: "#2d5a27" }}
      >
        <defs>
          <filter id="heatblur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" />
          </filter>
        </defs>

        {/* Outer boundary */}
        <rect x="2" y="2" width="136" height="66" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="0.5" />

        {/* Try lines */}
        <line x1="9" y1="2" x2="9" y2="68" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />
        <line x1="131" y1="2" x2="131" y2="68" stroke="rgba(255,255,255,0.6)" strokeWidth="0.5" />

        {/* 22m lines */}
        <line x1="31" y1="2" x2="31" y2="68" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />
        <line x1="109" y1="2" x2="109" y2="68" stroke="rgba(255,255,255,0.35)" strokeWidth="0.4" />

        {/* Halfway */}
        <line x1="70" y1="2" x2="70" y2="68" stroke="rgba(255,255,255,0.5)" strokeWidth="0.5" />

        {/* 10m lines */}
        <line x1="50" y1="2" x2="50" y2="68" stroke="rgba(255,255,255,0.2)" strokeWidth="0.3" strokeDasharray="1 1" />
        <line x1="90" y1="2" x2="90" y2="68" stroke="rgba(255,255,255,0.2)" strokeWidth="0.3" strokeDasharray="1 1" />

        {/* Zone labels */}
        <text x="20" y="36" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="3.5" fontFamily="monospace">OWN 22</text>
        <text x="50" y="36" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="3" fontFamily="monospace">OWN</text>
        <text x="70" y="36" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="2.8" fontFamily="monospace">HW</text>
        <text x="90" y="36" textAnchor="middle" fill="rgba(255,255,255,0.2)" fontSize="3" fontFamily="monospace">OPP</text>
        <text x="120" y="36" textAnchor="middle" fill="rgba(255,255,255,0.25)" fontSize="3.5" fontFamily="monospace">OPP 22</text>

        {/* HOME / AWAY labels */}
        <text x="5" y="66" fill="rgba(255,255,255,0.3)" fontSize="3" fontFamily="monospace">HOME</text>
        <text x="118" y="66" fill="rgba(255,255,255,0.3)" fontSize="3" fontFamily="monospace">AWAY</text>

        {/* Heatmap layer — sits above pitch lines, below precise pins.
            Overlapping low-opacity blurred blobs build density intensity. */}
        {showHeatmap && pins.length > 0 && (
          <g filter="url(#heatblur)" opacity="0.6" aria-hidden="true">
            {pins.map((pin, i) => {
              const cx = (pin.pitchX / 100) * 140;
              const cy = (pin.pitchY / 100) * 70;
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r="14"
                  fill={heatColor(pin.eventType, pin.team)}
                  opacity="0.12"
                />
              );
            })}
          </g>
        )}

        {/* Existing pins */}
        {pins.map((pin, i) => {
          const cx = (pin.pitchX / 100) * 140;
          const cy = (pin.pitchY / 100) * 70;
          const color = pinColor(pin.eventType, pin.team);
          return (
            <g key={i}>
              <circle cx={cx} cy={cy} r="2.5" fill={color} stroke="white" strokeWidth="0.5" opacity="0.9" />
            </g>
          );
        })}

        {/* Ghost cursor when active */}
        {isActive && (
          <circle cx="70" cy="35" r="3" fill="rgba(255,215,0,0.15)" stroke="rgba(255,215,0,0.5)" strokeWidth="0.5" strokeDasharray="1 1" />
        )}
      </svg>
    </div>
  );
}

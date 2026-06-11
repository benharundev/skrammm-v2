"use client";

import { useState } from "react";
import { QrScanner } from "../_components/qr-scanner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle2, XCircle, UserCheck } from "lucide-react";
import { toast } from "sonner";

interface MatchOption { id: string; label: string; scheduledAt: string; tournamentName: string; }
interface SquadPlayer { id: string; fullName: string; jerseyNumber: number | null; playerIdCode: string; }
interface ScanResult { playerName: string; ok: boolean; message: string; isOverride: boolean; }

export function AttendanceClient({
  teamId,
  matches,
  squad,
}: {
  teamId: string;
  matches: MatchOption[];
  squad: SquadPlayer[];
}) {
  const [selectedMatchId, setSelectedMatchId] = useState<string>(matches[0]?.id ?? "");
  const [scanning, setScanning] = useState(false);
  const [results, setResults] = useState<ScanResult[]>([]);
  const [overridePlayerId, setOverridePlayerId] = useState("");
  const [overrideLoading, setOverrideLoading] = useState(false);

  async function handleScan(token: string) {
    if (!selectedMatchId) { toast.error("Select a match first"); return; }
    setScanning(false);
    try {
      const res = await fetch("/api/tm/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, matchId: selectedMatchId, teamId }),
      });
      const data = (await res.json()) as { playerName?: string; error?: string };
      if (res.ok && data.playerName) {
        const name = data.playerName;
        setResults((r) => [{ playerName: name, ok: true, message: "Checked in", isOverride: false }, ...r]);
        toast.success(`${name} checked in`);
      } else {
        toast.error(data.error ?? "Scan failed");
        setResults((r) => [{ playerName: "Unknown", ok: false, message: data.error ?? "Failed", isOverride: false }, ...r]);
      }
    } catch { toast.error("Network error"); }
  }

  async function handleManualOverride() {
    if (!selectedMatchId || !overridePlayerId) { toast.error("Select match and player"); return; }
    setOverrideLoading(true);
    const player = squad.find((p) => p.id === overridePlayerId);
    try {
      const res = await fetch("/api/tm/attendance/override", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: overridePlayerId, matchId: selectedMatchId, teamId }),
      });
      if (res.ok) {
        setResults((r) => [{ playerName: player?.fullName ?? "Player", ok: true, message: "Manual override logged", isOverride: true }, ...r]);
        toast.success("Manual override recorded");
        setOverridePlayerId("");
      } else {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? "Override failed");
      }
    } catch { toast.error("Network error"); }
    finally { setOverrideLoading(false); }
  }

  return (
    <div className="max-w-2xl space-y-6 p-4 md:p-8">
      <header className="space-y-1">
        <h1 className="font-[family-name:var(--font-lexend)] text-2xl font-extrabold tracking-tight text-foreground">Attendance</h1>
        <p className="text-sm text-muted-foreground">Scan player QR codes for match day</p>
      </header>

      <section className="space-y-1.5">
        <label className="text-sm font-medium text-foreground" htmlFor="match-select">Match</label>
        {matches.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming matches.</p>
        ) : (
          <select
            id="match-select"
            value={selectedMatchId}
            onChange={(e) => setSelectedMatchId(e.target.value)}
            className="flex h-11 w-full rounded-sm border-2 border-border bg-card px-3 py-1 text-sm shadow-brutalist-sm focus:border-fair-play-gold focus:outline-none focus:ring-0"
          >
            {matches.map((m) => (
              <option key={m.id} value={m.id}>{m.label} — {m.tournamentName}</option>
            ))}
          </select>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">QR Scanner</h2>
          <Button
            size="sm"
            onClick={() => setScanning((s) => !s)}
            disabled={!selectedMatchId}
            className={scanning ? "bg-destructive text-white shadow-brutalist-sm" : "bg-primary text-primary-foreground shadow-brutalist-sm"}
          >
            <Camera className="mr-1.5 h-4 w-4" />
            {scanning ? "Stop" : "Scan"}
          </Button>
        </div>
        <QrScanner onScan={handleScan} active={scanning} />
      </section>

      <section className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
        <div className="flex items-center gap-3 border-b border-border p-3">
          <UserCheck className="h-4 w-4 text-muted-foreground" />
          <h2 className="font-[family-name:var(--font-lexend)] text-sm font-bold text-foreground">Manual Override</h2>
        </div>
        <div className="flex gap-2 p-3">
          <select
            value={overridePlayerId}
            onChange={(e) => setOverridePlayerId(e.target.value)}
            className="flex h-11 w-full flex-1 rounded-sm border-2 border-border bg-card px-3 py-1 text-sm shadow-brutalist-sm focus:border-fair-play-gold focus:outline-none focus:ring-0"
          >
            <option value="">Select player…</option>
            {squad.map((p) => (
              <option key={p.id} value={p.id}>{p.fullName}{p.jerseyNumber !== null ? ` (#${p.jerseyNumber})` : ""}</option>
            ))}
          </select>
          <Button
            onClick={handleManualOverride}
            disabled={!overridePlayerId || !selectedMatchId || overrideLoading}
            size="sm"
            className="shrink-0 bg-accent text-primary shadow-brutalist-sm"
          >
            Override
          </Button>
        </div>
      </section>

      {results.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-[family-name:var(--font-lexend)] text-sm font-bold uppercase tracking-widest text-muted-foreground">Log ({results.length})</h2>
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-3 rounded-sm border-2 border-border bg-card p-3 shadow-brutalist-sm">
              {r.ok ? <CheckCircle2 className="h-5 w-5 shrink-0 text-primary" /> : <XCircle className="h-5 w-5 shrink-0 text-destructive" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{r.playerName}</p>
                <p className="text-xs text-muted-foreground">{r.message}</p>
              </div>
              {r.isOverride && <Badge className="bg-accent/20 text-foreground text-[10px]">Override</Badge>}
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

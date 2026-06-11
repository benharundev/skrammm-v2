"use client";

import { useState } from "react";
import { Check, ChevronRight, Plus, Trash2, Rocket, Clock, MapPin, Users } from "lucide-react";
import { RUGBY_POSITIONS } from "@lib/constants/rugby-positions";

type Step = 1 | 2 | 3;

const STEPS = [
  { n: 1 as Step, label: "Team Details" },
  { n: 2 as Step, label: "Squad" },
  { n: 3 as Step, label: "Review & Submit" },
];

interface Player {
  id: string;
  number: string;
  name: string;
  position: string;
}

function StepIndicator({ current }: { current: Step }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex items-center min-w-max">
        {STEPS.map((s, i) => (
          <div key={s.n} className="flex items-center">
            <div className="flex items-center gap-2 px-3 py-2">
              <span className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${s.n < current ? "bg-pitch-green border-pitch-green text-white" : s.n === current ? "bg-fair-play-gold border-pitch-green text-pitch-green" : "border-border text-muted-foreground bg-card"}`}
                style={{ fontFamily: "var(--font-inter)", fontSize: "12px", fontWeight: 700 }}>
                {s.n < current ? <Check size={14} /> : s.n}
              </span>
              <span className={s.n === current ? "text-foreground" : s.n < current ? "text-pitch-green" : "text-muted-foreground"}
                style={{ fontFamily: "var(--font-inter)", fontSize: "13px", fontWeight: s.n === current ? 700 : 500 }}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && <div className={`h-px w-6 flex-shrink-0 ${s.n < current ? "bg-pitch-green" : "bg-border"}`} />}
          </div>
        ))}
      </div>
    </div>
  );
}

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-foreground uppercase tracking-wider"
        style={{ fontFamily: "var(--font-inter)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.05em" }}>
        {label}
      </label>
      {children}
      {hint && <p className="text-muted-foreground" style={{ fontFamily: "var(--font-inter)", fontSize: "12px" }}>{hint}</p>}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="h-12 px-4 border-2 border-navy bg-background text-foreground placeholder:text-muted-foreground rounded-sm outline-none focus:border-fair-play-gold transition-colors"
      style={{ fontFamily: "var(--font-inter)", fontSize: "15px" }} />
  );
}

interface JoinPageProps {
  params: Promise<{ tournamentCode: string }>;
}

export default function JoinPage({ params: _params }: JoinPageProps) {
  const tournamentCode = "klsevens25";

  const [step, setStep] = useState<Step>(1);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: "", shortName: "", origin: "", manager: "", email: "" });
  const [players, setPlayers] = useState<Player[]>([
    { id: "1", number: "1", name: "", position: "" },
    { id: "2", number: "2", name: "", position: "" },
    { id: "3", number: "3", name: "", position: "" },
  ]);

  const set = (k: keyof typeof form) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const next = () => setStep(s => Math.min(s + 1, 3) as Step);
  const back = () => setStep(s => Math.max(s - 1, 1) as Step);

  function updatePlayer(id: string, field: keyof Player, value: string) {
    setPlayers(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  }

  function addPlayer() {
    const nextNum = (players.length + 1).toString();
    setPlayers(prev => [...prev, { id: Date.now().toString(), number: nextNum, name: "", position: "" }]);
  }

  function removePlayer(id: string) {
    if (players.length <= 1) return;
    setPlayers(prev => prev.filter(p => p.id !== id));
  }

  const canStep1 = !!(form.name.trim() && form.manager.trim() && form.email.trim());
  const filledPlayers = players.filter(p => p.name.trim());
  const canStep2 = filledPlayers.length >= 7;

  if (submitted) {
    return (
      <div className="min-h-screen bg-pitch-green flex items-center justify-center px-6">
        <div className="w-full max-w-sm flex flex-col items-center text-center gap-8">
          <p className="text-fair-play-gold uppercase tracking-[0.3em]"
            style={{ fontFamily: "var(--font-lexend)", fontSize: "13px", fontWeight: 700 }}>SKRAMMM</p>
          <div className="w-24 h-24 bg-card border-4 border-fair-play-gold rounded-xl flex items-center justify-center"
            style={{ boxShadow: "6px 6px 0 var(--fair-play-gold-dark)" }}>
            <Clock size={48} className="text-fair-play-gold" strokeWidth={2.5} />
          </div>
          <div className="flex flex-col gap-3">
            <h1 className="text-white" style={{ fontFamily: "var(--font-lexend)", fontSize: "34px", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              APPLICATION<br />SUBMITTED
            </h1>
            <p className="text-white/60" style={{ fontFamily: "var(--font-inter)", fontSize: "15px", lineHeight: 1.6 }}>
              <strong className="text-white">{form.name}</strong> is now pending approval. The organizer will review your squad and notify you at <strong className="text-fair-play-gold">{form.email}</strong>.
            </p>
          </div>
          <div className="w-full bg-pitch-green-mid border-2 border-navy rounded-sm p-4 text-left">
            <p className="text-white/60 uppercase tracking-wider mb-2" style={{ fontFamily: "var(--font-inter)", fontSize: "10px", fontWeight: 700 }}>What happens next</p>
            {["Organizer reviews your squad roster", "You receive an email confirmation", "Once approved, your team appears in the groups & standings"].map((t, i) => (
              <div key={i} className="flex items-start gap-2.5 py-1.5 border-t border-navy/40 first:border-t-0">
                <span className="w-5 h-5 bg-fair-play-gold text-pitch-green rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ fontFamily: "var(--font-inter)", fontSize: "10px", fontWeight: 700 }}>{i + 1}</span>
                <span className="text-white/70" style={{ fontFamily: "var(--font-inter)", fontSize: "13px" }}>{t}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-pitch-green border-b-2 border-navy">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-white" style={{ fontFamily: "var(--font-lexend)", fontSize: "20px", fontWeight: 800 }}>Skrammm</span>
          <div className="text-right">
            <p className="text-white/40 uppercase tracking-wider" style={{ fontFamily: "var(--font-inter)", fontSize: "10px", fontWeight: 700 }}>Joining tournament</p>
            <p className="text-fair-play-gold" style={{ fontFamily: "var(--font-lexend)", fontSize: "13px", fontWeight: 700 }}>{tournamentCode}</p>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 flex flex-col gap-5">
        <div className="bg-pitch-green border-2 border-navy rounded-sm px-5 py-4 flex flex-wrap items-center gap-4"
          style={{ boxShadow: "4px 4px 0 var(--navy)" }}>
          <div className="flex-1 min-w-0">
            <p className="text-white" style={{ fontFamily: "var(--font-lexend)", fontSize: "20px", fontWeight: 800 }}>KL Sevens Challenge 2025</p>
            <p className="text-white/60 mt-0.5" style={{ fontFamily: "var(--font-inter)", fontSize: "13px" }}>Elimination Format · 24 teams</p>
          </div>
          <div className="flex flex-col gap-1.5 flex-shrink-0">
            <span className="flex items-center gap-1.5 text-white/70" style={{ fontFamily: "var(--font-inter)", fontSize: "12px" }}>
              <MapPin size={12} /> Stadium Titiwangsa, KL
            </span>
            <span className="flex items-center gap-1.5 text-white/70" style={{ fontFamily: "var(--font-inter)", fontSize: "12px" }}>
              <Clock size={12} /> 28–29 June 2025
            </span>
          </div>
        </div>

        <div className="bg-card border-2 border-border rounded-sm px-5 py-4 shadow-brutalist-navy">
          <StepIndicator current={step} />
        </div>

        <div className="bg-card border-2 border-border rounded-sm shadow-brutalist-navy">
          {step === 1 && (
            <div className="p-6 flex flex-col gap-5">
              <div>
                <h2 className="text-foreground" style={{ fontFamily: "var(--font-lexend)", fontSize: "20px", fontWeight: 800 }}>Team Details</h2>
                <p className="text-muted-foreground mt-1" style={{ fontFamily: "var(--font-inter)", fontSize: "14px" }}>
                  Basic information about your team and manager contact.
                </p>
              </div>
              <FieldGroup label="Team Name">
                <Input placeholder="e.g. Selangor Tigers" value={form.name} onChange={set("name")} />
              </FieldGroup>
              <FieldGroup label="Short Name / Code" hint="3–5 uppercase characters used in score displays.">
                <Input placeholder="e.g. SEL" value={form.shortName} onChange={v => set("shortName")(v.toUpperCase().slice(0, 5))} />
              </FieldGroup>
              <FieldGroup label="Origin / City">
                <Input placeholder="e.g. Shah Alam, Selangor" value={form.origin} onChange={set("origin")} />
              </FieldGroup>
              <FieldGroup label="Team Manager Name">
                <Input placeholder="Full name" value={form.manager} onChange={set("manager")} />
              </FieldGroup>
              <FieldGroup label="Manager Email" hint="Approval notifications will be sent here.">
                <Input type="email" placeholder="manager@club.com" value={form.email} onChange={set("email")} />
              </FieldGroup>
            </div>
          )}

          {step === 2 && (
            <div className="p-6 flex flex-col gap-5">
              <div>
                <h2 className="text-foreground" style={{ fontFamily: "var(--font-lexend)", fontSize: "20px", fontWeight: 800 }}>Player Squad</h2>
                <p className="text-muted-foreground mt-1" style={{ fontFamily: "var(--font-inter)", fontSize: "14px" }}>
                  Register your players. Minimum 7, maximum 15. Jersey numbers must be unique.
                </p>
              </div>

              <div className="flex flex-col gap-0 border-2 border-border rounded-sm overflow-hidden">
                <div className="grid grid-cols-[48px_1fr_1fr] bg-pitch-green border-b-2 border-navy">
                  {["#", "Name", "Position"].map(h => (
                    <div key={h} className="px-3 py-2.5 text-white/70 uppercase tracking-wider"
                      style={{ fontFamily: "var(--font-inter)", fontSize: "10px", fontWeight: 700 }}>{h}</div>
                  ))}
                </div>
                {players.map((player, i) => (
                  <div key={player.id} className={`grid grid-cols-[48px_1fr_1fr] items-center border-b last:border-b-0 border-border ${i % 2 === 0 ? "bg-card" : "bg-background"}`}>
                    <input type="number" min={1} max={99} value={player.number}
                      onChange={e => updatePlayer(player.id, "number", e.target.value)}
                      className="px-3 py-3 text-center bg-transparent text-foreground outline-none focus:bg-fair-play-gold/10 w-full"
                      style={{ fontFamily: "var(--font-lexend)", fontSize: "14px", fontWeight: 800 }} />
                    <input type="text" value={player.name} placeholder="Player name"
                      onChange={e => updatePlayer(player.id, "name", e.target.value)}
                      className="px-3 py-3 bg-transparent text-foreground placeholder:text-muted-foreground outline-none focus:bg-fair-play-gold/10 border-l border-border"
                      style={{ fontFamily: "var(--font-inter)", fontSize: "13px" }} />
                    <div className="flex items-center border-l border-border">
                      <select value={player.position} onChange={e => updatePlayer(player.id, "position", e.target.value)}
                        className="flex-1 px-3 py-3 bg-transparent text-foreground outline-none focus:bg-fair-play-gold/10"
                        style={{ fontFamily: "var(--font-inter)", fontSize: "13px" }}>
                        <option value="">Position…</option>
                        {RUGBY_POSITIONS.map(pos => <option key={pos} value={pos}>{pos}</option>)}
                      </select>
                      <button onClick={() => removePlayer(player.id)} disabled={players.length <= 1}
                        className="px-3 py-3 text-muted-foreground hover:text-red-card transition-colors disabled:opacity-30">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {players.length < 15 && (
                <button onClick={addPlayer}
                  className="flex items-center justify-center gap-2 border-2 border-dashed border-navy text-navy h-11 rounded-sm hover:bg-navy/5 transition-colors"
                  style={{ fontFamily: "var(--font-inter)", fontSize: "13px", fontWeight: 700 }}>
                  <Plus size={15} /> Add Player
                </button>
              )}

              <div className="flex items-center justify-between bg-muted border border-border rounded-sm px-4 py-3">
                <span className="flex items-center gap-2 text-muted-foreground" style={{ fontFamily: "var(--font-inter)", fontSize: "13px" }}>
                  <Users size={14} /> {filledPlayers.length} player{filledPlayers.length !== 1 ? "s" : ""} registered
                </span>
                <span className={`px-2 py-0.5 rounded-sm text-xs font-bold ${filledPlayers.length >= 7 ? "bg-pitch-green-container text-pitch-green" : "bg-fair-play-gold/20 text-fair-play-gold-dark"}`}
                  style={{ fontFamily: "var(--font-inter)" }}>
                  {filledPlayers.length >= 7 ? "✓ Minimum met" : `Need ${7 - filledPlayers.length} more`}
                </span>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="p-6 flex flex-col gap-5">
              <div>
                <h2 className="text-foreground" style={{ fontFamily: "var(--font-lexend)", fontSize: "20px", fontWeight: 800 }}>Review & Submit</h2>
                <p className="text-muted-foreground mt-1" style={{ fontFamily: "var(--font-inter)", fontSize: "14px" }}>
                  Check everything looks right before submitting your application.
                </p>
              </div>

              <div className="bg-muted border-2 border-border rounded-sm divide-y divide-border">
                {([
                  ["Team Name", form.name || "—"],
                  ["Short Name", form.shortName || "—"],
                  ["Origin", form.origin || "—"],
                  ["Manager", form.manager || "—"],
                  ["Email", form.email || "—"],
                  ["Players", `${filledPlayers.length} registered`],
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="px-4 py-3 flex justify-between gap-4">
                    <span className="text-muted-foreground flex-shrink-0" style={{ fontFamily: "var(--font-inter)", fontSize: "13px" }}>{k}</span>
                    <span className="text-foreground text-right" style={{ fontFamily: "var(--font-inter)", fontSize: "13px", fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
              </div>

              <div className="bg-pitch-green-container/20 border border-pitch-green/30 rounded-sm p-4">
                <p className="text-pitch-green" style={{ fontFamily: "var(--font-inter)", fontSize: "13px", lineHeight: 1.6 }}>
                  Your team will appear as <strong>Pending</strong> on the organizer dashboard. You will be notified at <strong>{form.email}</strong> once the organizer reviews and approves your application.
                </p>
              </div>

              <button
                onClick={() => setSubmitted(true)}
                className="w-full min-h-[56px] bg-fair-play-gold text-pitch-green border-2 border-pitch-green rounded-sm font-bold flex items-center justify-center gap-2 active:translate-x-[3px] active:translate-y-[3px] transition-transform"
                style={{ fontFamily: "var(--font-inter)", fontWeight: 800, fontSize: "16px", boxShadow: "4px 4px 0 var(--pitch-green)" }}>
                <Rocket size={18} /> Submit Application
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between">
          <button onClick={back} disabled={step === 1}
            className="border-2 border-border text-foreground px-6 h-11 rounded-sm disabled:opacity-40 hover:border-navy transition-colors"
            style={{ fontFamily: "var(--font-inter)", fontSize: "14px", fontWeight: 700 }}>
            ← Back
          </button>
          {step < 3 && (
            <button
              onClick={next}
              disabled={step === 1 ? !canStep1 : !canStep2}
              className="flex items-center gap-2 bg-pitch-green text-white border-2 border-pitch-green px-6 h-11 rounded-sm disabled:opacity-40 disabled:cursor-not-allowed active:translate-x-[2px] active:translate-y-[2px] transition-all"
              style={{ fontFamily: "var(--font-inter)", fontSize: "14px", fontWeight: 700, boxShadow: "3px 3px 0 var(--navy)" }}>
              Continue <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

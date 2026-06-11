"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import {
  ChevronRight, ChevronLeft, Rocket, Copy, Check,
  Users, Calendar, MapPin, Hash, Trophy, Shuffle,
  Share2, ArrowRight,
} from "lucide-react";
import { launchTournamentAction } from "./actions";

type Step = 1 | 2 | 3 | 4;
type FormatType = "Festival" | "Tiered" | "Elimination";

interface WizardData {
  name: string;
  startDate: string;
  endDate: string;
  venue: string;
  code: string;
  teamCount: number | null;
  customCount: string;
}

const QUICK_COUNTS = [8, 10, 12, 16, 20, 24, 32];

function deriveFormat(count: number): { type: FormatType; label: string; desc: string; groups: number; matchesEstimate: number } {
  if (count <= 10) return { type: "Festival", label: "Festival Pool Play", desc: "All teams in one or two pools. Great for social tournaments.", groups: count <= 6 ? 1 : 2, matchesEstimate: Math.floor(count * (count - 1) / 2 / (count <= 6 ? 1 : 2)) };
  if (count <= 20) return { type: "Tiered", label: "Tiered Group Stage", desc: "Multiple pools with knockout rounds from top finishers.", groups: Math.ceil(count / 4), matchesEstimate: count * 2 };
  return { type: "Elimination", label: "Full Elimination", desc: "Group stage + quarter, semi, and grand finals.", groups: Math.ceil(count / 4), matchesEstimate: count * 3 };
}

const FORMAT_COLORS: Record<FormatType, { bg: string; border: string; text: string }> = {
  Festival:    { bg: "bg-fair-play-gold/15",  border: "border-fair-play-gold",  text: "text-fair-play-gold-dark" },
  Tiered:      { bg: "bg-navy/10",             border: "border-navy",            text: "text-navy" },
  Elimination: { bg: "bg-pitch-green/10",      border: "border-pitch-green",     text: "text-pitch-green" },
};

function StepIndicator({ step }: { step: Step }) {
  const steps = [
    { n: 1 as Step, label: "General Info" },
    { n: 2 as Step, label: "Team Count" },
    { n: 3 as Step, label: "Format" },
    { n: 4 as Step, label: "Review" },
  ];
  return (
    <div className="flex items-center gap-0">
      {steps.map(({ n, label }, i) => {
        const done = step > n;
        const active = step === n;
        return (
          <div key={n} className="flex items-center gap-0">
            <div className={`flex items-center gap-2 px-4 py-2.5 border-2 ${i === 0 ? "rounded-l-sm" : ""} ${i === steps.length - 1 ? "rounded-r-sm" : ""} ${active ? "bg-pitch-green border-pitch-green text-white" : done ? "bg-pitch-green/10 border-pitch-green/30 text-pitch-green" : "bg-card border-border text-muted-foreground"}`}>
              <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 text-[11px] font-black ${active ? "border-white bg-white text-pitch-green" : done ? "border-pitch-green bg-pitch-green text-white" : "border-muted-foreground/40"}`}>
                {done ? <Check size={10} /> : n}
              </span>
              <span className="hidden sm:block text-[13px] font-bold">{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-px h-10 ${done || active ? "bg-pitch-green/30" : "bg-border"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function FieldGroup({ label, icon: Icon, children }: { label: string; icon: React.ComponentType<{ size: number; className?: string }>; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="flex items-center gap-1.5 text-muted-foreground text-[11px] font-bold uppercase tracking-[0.05em]">
        <Icon size={11} className="text-muted-foreground" />{label}
      </label>
      {children}
    </div>
  );
}

function Input({ value, onChange, placeholder, type = "text", readOnly = false }: {
  value: string; onChange?: (v: string) => void; placeholder?: string; type?: string; readOnly?: boolean;
}) {
  return (
    <input value={value} onChange={e => onChange?.(e.target.value)} placeholder={placeholder}
      type={type} readOnly={readOnly}
      className={`h-11 px-4 border-2 border-border rounded-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-fair-play-gold transition-colors text-sm ${readOnly ? "bg-muted/30 cursor-not-allowed" : "bg-card"}`} />
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button onClick={copy}
      className={`flex items-center gap-1.5 border-2 px-3 h-10 rounded-sm transition-all active:translate-x-[2px] active:translate-y-[2px] text-xs font-bold ${copied ? "border-pitch-green text-pitch-green bg-pitch-green/10" : "border-border text-muted-foreground hover:border-navy hover:text-foreground"}`}>
      {copied ? <Check size={13} /> : <Copy size={13} />}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function SetupWizardPage() {
  const [step, setStep] = useState<Step>(1);
  const [launched] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [data, setData] = useState<WizardData>({
    name: "", startDate: "", endDate: "", venue: "", code: "",
    teamCount: null, customCount: "",
  });

  const set = <K extends keyof WizardData>(key: K, val: WizardData[K]) =>
    setData(prev => ({ ...prev, [key]: val }));

  const effectiveCount = data.teamCount ?? (parseInt(data.customCount) || 0);
  const format = effectiveCount >= 4 ? deriveFormat(effectiveCount) : null;

  const joinUrl = `https://skrammm.com/${data.code || "your-code"}/join`;

  const step1Valid = data.name.trim() && data.startDate && data.endDate && data.venue.trim() && data.code.trim();
  const step2Valid = effectiveCount >= 4;
  const step3Valid = !!format;
  const step4Valid = step1Valid && step2Valid && step3Valid;

  const canNext = step === 1 ? !!step1Valid : step === 2 ? step2Valid : step === 3 ? step3Valid : false;

  const generateCode = () => {
    const slug = data.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 8);
    const year = new Date().getFullYear().toString().slice(2);
    set("code", slug ? `${slug}${year}` : `tourney${year}`);
  };

  if (launched) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="sticky top-0 z-10 bg-background border-b-2 border-border px-6 h-14 flex items-center flex-shrink-0">
          <h1 className="font-lexend text-lg font-bold">Tournament Launched</h1>
        </div>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-2xl mx-auto w-full">
          <div className="bg-pitch-green border-2 border-navy rounded-sm px-6 py-8 flex flex-col items-center gap-3 text-center shadow-brutalist-navy-lg">
            <Rocket size={44} className="text-fair-play-gold" />
            <p className="text-white font-lexend text-2xl font-extrabold">Tournament is Live!</p>
            <p className="text-white/70 text-sm">{data.name}</p>
          </div>

          <div className="bg-card border-2 border-border rounded-sm overflow-hidden shadow-brutalist-navy">
            <div className="bg-pitch-green px-5 py-4 border-b-2 border-navy">
              <p className="text-white font-lexend text-[15px] font-bold">Invite Teams</p>
            </div>
            <div className="p-5 flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-[0.05em]">Tournament Code</p>
                <div className="flex items-center gap-3">
                  <span className="flex-1 bg-muted border-2 border-border rounded-sm px-4 py-3 text-center font-lexend text-[28px] font-black tracking-[0.12em]">
                    {data.code}
                  </span>
                  <CopyButton text={data.code} />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-muted-foreground text-[11px] font-bold uppercase tracking-[0.05em]">Join URL</p>
                <div className="flex items-center gap-2">
                  <span className="flex-1 bg-muted border-2 border-border rounded-sm px-4 h-10 flex items-center truncate text-[13px]">
                    {joinUrl}
                  </span>
                  <CopyButton text={joinUrl} />
                  <button className="flex items-center gap-1.5 border-2 border-navy text-navy px-3 h-10 rounded-sm hover:bg-navy hover:text-white transition-colors text-xs font-bold">
                    <Share2 size={13} /> Share
                  </button>
                </div>
              </div>
              <div className="border-t-2 border-border pt-4 flex flex-col gap-3">
                <p className="text-foreground text-[13px] font-bold">How it works</p>
                {[
                  "Share the code or link with team managers",
                  "They fill in team details + roster on the join page",
                  "You approve or reject from the Teams → Pending tab",
                  "Once approved, they appear in your group draw",
                ].map((step, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <span className="bg-pitch-green text-white w-6 h-6 rounded-sm flex items-center justify-center flex-shrink-0 font-lexend text-xs font-extrabold">
                      {i + 1}
                    </span>
                    <p className="text-muted-foreground text-[13px]">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <Link href="/organizer"
            className="flex items-center justify-center gap-2 bg-pitch-green text-white border-2 border-pitch-green h-12 rounded-sm text-sm font-bold shadow-brutalist-navy">
            Go to Dashboard <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 bg-background border-b-2 border-border px-6 h-14 flex items-center justify-between flex-shrink-0">
        <h1 className="font-lexend text-lg font-bold">New Tournament</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-2xl mx-auto w-full">
        <StepIndicator step={step} />

        {step === 1 && (
          <div className="bg-card border-2 border-border rounded-sm p-6 flex flex-col gap-5 shadow-brutalist-navy">
            <p className="text-foreground font-lexend text-base font-bold">General Information</p>
            <FieldGroup label="Tournament Name" icon={Trophy}>
              <Input value={data.name} onChange={v => set("name", v)} placeholder="e.g. KL Sevens Challenge 2025" />
            </FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <FieldGroup label="Start Date" icon={Calendar}>
                <Input type="date" value={data.startDate} onChange={v => set("startDate", v)} />
              </FieldGroup>
              <FieldGroup label="End Date" icon={Calendar}>
                <Input type="date" value={data.endDate} onChange={v => set("endDate", v)} />
              </FieldGroup>
            </div>
            <FieldGroup label="Venue" icon={MapPin}>
              <Input value={data.venue} onChange={v => set("venue", v)} placeholder="e.g. Stadium Titiwangsa, KL" />
            </FieldGroup>
            <FieldGroup label="Tournament Code" icon={Hash}>
              <div className="flex items-center gap-2">
                <Input value={data.code} onChange={v => set("code", v.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20))} placeholder="e.g. klsevens25" />
                <button onClick={generateCode} disabled={!data.name.trim()}
                  className="flex items-center gap-1.5 border-2 border-border text-muted-foreground px-3 h-11 rounded-sm hover:border-navy hover:text-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 text-xs font-bold">
                  <Shuffle size={13} /> Auto
                </button>
              </div>
              {data.code && (
                <p className="text-muted-foreground text-[11px]">
                  Join URL: skrammm.com/<strong>{data.code}</strong>/join
                </p>
              )}
            </FieldGroup>
          </div>
        )}

        {step === 2 && (
          <div className="bg-card border-2 border-border rounded-sm p-6 flex flex-col gap-5 shadow-brutalist-navy">
            <p className="text-foreground font-lexend text-base font-bold">How many teams?</p>
            <div className="grid grid-cols-4 gap-2">
              {QUICK_COUNTS.map(n => (
                <button key={n} onClick={() => { set("teamCount", n); set("customCount", ""); }}
                  className={`h-16 border-2 rounded-sm flex flex-col items-center justify-center gap-1 transition-all active:translate-x-[2px] active:translate-y-[2px] ${data.teamCount === n && !data.customCount ? "bg-pitch-green text-white border-pitch-green" : "bg-card border-border text-foreground hover:border-pitch-green"}`}
                  style={{ boxShadow: data.teamCount === n && !data.customCount ? "3px 3px 0 var(--navy)" : "none" }}>
                  <span className="font-lexend text-xl font-black">{n}</span>
                  <span className="text-[10px] opacity-70">teams</span>
                </button>
              ))}
              <div className={`h-16 border-2 rounded-sm flex flex-col items-center justify-center gap-1 col-span-1 transition-all ${data.customCount ? "border-pitch-green" : "border-border"}`}>
                <input type="number" min={4} max={128} value={data.customCount}
                  onChange={e => { set("customCount", e.target.value); set("teamCount", null); }}
                  placeholder="Custom"
                  className="w-full h-full text-center bg-transparent outline-none font-lexend text-lg font-extrabold" />
              </div>
            </div>
            {format && (
              <div className={`border-2 rounded-sm p-4 flex flex-col gap-2 ${FORMAT_COLORS[format.type].bg} ${FORMAT_COLORS[format.type].border}`}>
                <div className="flex items-center justify-between">
                  <p className={`${FORMAT_COLORS[format.type].text} font-lexend text-[15px] font-extrabold`}>{format.label}</p>
                  <span className={`px-2 py-0.5 rounded-sm border text-[11px] font-bold ${FORMAT_COLORS[format.type].border} ${FORMAT_COLORS[format.type].text} ${FORMAT_COLORS[format.type].bg}`}>
                    {format.type}
                  </span>
                </div>
                <p className="text-muted-foreground text-[13px]">{format.desc}</p>
                <div className="flex items-center gap-4 pt-1">
                  <span className="text-foreground text-xs">
                    <strong>{format.groups}</strong> groups · <strong>~{format.matchesEstimate}</strong> matches
                  </span>
                  <span className="text-foreground text-xs">
                    <strong>{effectiveCount}</strong> teams
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 3 && format && (
          <div className="bg-card border-2 border-border rounded-sm p-6 flex flex-col gap-4 shadow-brutalist-navy">
            <p className="text-foreground font-lexend text-base font-bold">Format & Rules</p>
            <p className="text-muted-foreground text-[13px]">
              Based on {effectiveCount} teams, <strong>{format.label}</strong> is recommended. Fine-tune details after launch in Settings.
            </p>
            <div className={`border-2 rounded-sm p-5 flex flex-col gap-3 shadow-brutalist-navy-sm ${FORMAT_COLORS[format.type].bg} ${FORMAT_COLORS[format.type].border}`}>
              <div className="flex items-center justify-between">
                <p className={`${FORMAT_COLORS[format.type].text} font-lexend text-lg font-extrabold`}>{format.label}</p>
                <Check size={20} className={FORMAT_COLORS[format.type].text} />
              </div>
              <p className="text-muted-foreground text-sm">{format.desc}</p>
              <div className="grid grid-cols-3 gap-3 pt-1">
                {[
                  { label: "Groups",    value: format.groups },
                  { label: "Teams",     value: effectiveCount },
                  { label: "~Matches",  value: format.matchesEstimate },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-background/60 border border-border rounded-sm px-3 py-2 text-center">
                    <p className="text-foreground font-lexend text-xl font-black">{value}</p>
                    <p className="text-muted-foreground text-[11px]">{label}</p>
                  </div>
                ))}
              </div>
            </div>
            {([
              { type: "Festival" as const,    label: "Festival Pool Play",   desc: "All teams in one or two pools." },
              { type: "Tiered" as const,      label: "Tiered Group Stage",   desc: "Multiple pools with knockout rounds." },
              { type: "Elimination" as const, label: "Full Elimination",     desc: "Group stage + full finals bracket." },
            ] as { type: FormatType; label: string; desc: string }[]).filter(f => f.type !== format.type).map(alt => (
              <div key={alt.type} className="border-2 border-border rounded-sm p-4 flex items-center justify-between opacity-50 select-none">
                <div>
                  <p className="text-foreground text-sm font-bold">{alt.label}</p>
                  <p className="text-muted-foreground text-xs">{alt.desc}</p>
                </div>
                <span className="text-muted-foreground text-[11px]">Not recommended</span>
              </div>
            ))}
          </div>
        )}

        {step === 4 && (
          <div className="bg-card border-2 border-border rounded-sm overflow-hidden shadow-brutalist-navy">
            <div className="bg-pitch-green px-5 py-4 border-b-2 border-navy">
              <p className="text-white font-lexend text-[15px] font-bold">Review & Launch</p>
            </div>
            <div className="divide-y divide-border">
              {[
                { icon: Trophy,   label: "Name",        value: data.name },
                { icon: Calendar, label: "Dates",       value: `${data.startDate} → ${data.endDate}` },
                { icon: MapPin,   label: "Venue",       value: data.venue },
                { icon: Hash,     label: "Code",        value: data.code },
                { icon: Users,    label: "Teams",       value: `${effectiveCount} teams` },
                { icon: Shuffle,  label: "Format",      value: format?.label ?? "—" },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-center gap-4 px-5 py-3.5">
                  <div className="w-8 h-8 border-2 border-border rounded-sm flex items-center justify-center flex-shrink-0 bg-muted/30">
                    <Icon size={14} className="text-pitch-green" />
                  </div>
                  <p className="text-muted-foreground w-24 flex-shrink-0 text-xs font-bold uppercase tracking-[0.04em]">{label}</p>
                  <p className="text-foreground text-sm font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          {step > 1 ? (
            <button onClick={() => setStep(s => (s - 1) as Step)}
              className="flex items-center gap-1.5 border-2 border-border text-foreground px-4 h-11 rounded-sm hover:border-navy transition-colors text-sm font-bold">
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <Link href="/organizer"
              className="flex items-center gap-1.5 border-2 border-border text-muted-foreground px-4 h-11 rounded-sm hover:border-navy transition-colors text-sm font-bold">
              <ChevronLeft size={16} /> Cancel
            </Link>
          )}

          {step < 4 ? (
            <button onClick={() => setStep(s => (s + 1) as Step)} disabled={!canNext}
              className="flex items-center gap-1.5 bg-pitch-green text-white border-2 border-pitch-green px-6 h-11 rounded-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-pitch-green/90 transition-colors text-sm font-bold shadow-brutalist-navy">
              Continue <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={() => {
                if (!step4Valid) return;
                startTransition(async () => {
                  const fd = new FormData();
                  fd.set("name", data.name);
                  fd.set("code", data.code);
                  fd.set("startsAt", data.startDate);
                  fd.set("endsAt", data.endDate);
                  fd.set("teamCount", String(effectiveCount));
                  const result = await launchTournamentAction(fd);
                  if (result?.error) {
                    setServerError(result.error);
                  }
                });
              }}
              disabled={!step4Valid || isPending}
              className="flex items-center gap-2 bg-fair-play-gold text-pitch-green border-2 border-fair-play-gold px-6 h-11 rounded-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-fair-play-gold/90 transition-colors font-lexend text-[15px] font-extrabold shadow-brutalist-navy"
            >
              <Rocket size={16} /> {isPending ? "Launching..." : "Launch Tournament"}
            </button>
          )}
          {serverError && (
            <p className="text-sm text-destructive font-medium mt-2 w-full text-right">{serverError}</p>
          )}
        </div>
      </div>
    </div>
  );
}

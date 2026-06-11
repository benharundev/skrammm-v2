"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronDown, ChevronUp, Plus, Trash2, GripVertical,
  Save, RotateCcw, Check, PlusSquare, ChevronRight,
  ExternalLink, Mail, Building, Phone, Globe,
  UserMinus, Trophy, Calendar, Copy,
} from "lucide-react";
import { v7 as uuidv7 } from "uuid";
import { SIDEBAR_WIDTH_CLASS } from "../_lib/constants";
import { FieldGroup } from "../_components/settings/field-group";
import { TextInput } from "../_components/settings/text-input";
import { Toggle } from "../_components/settings/toggle";
interface OrgUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff" | "viewer";
  joinedAt: string;
  status: "active" | "pending";
}

interface Section { id: string; label: string }

const TOURNAMENT_SECTIONS: Section[] = [
  { id: "info",       label: "Tournament Info" },
  { id: "format",     label: "Format & Rules" },
  { id: "pitches",    label: "Pitches" },
  { id: "visibility", label: "Visibility" },
];

const ACCOUNT_SECTIONS: Section[] = [
  { id: "history", label: "Tournament History" },
  { id: "profile", label: "Organizer Profile" },
  { id: "billing", label: "Billing" },
  { id: "users",   label: "Manage Users" },
  { id: "privacy", label: "Privacy Policy" },
  { id: "terms",   label: "Terms & Conditions" },
];

const TIE_BREAKS = [
  "Points",
  "Head-to-head result",
  "Points difference",
  "Points scored",
  "Most tries scored",
  "Fewest points conceded",
  "Coin toss",
];


export default function SettingsPage() {
  const [open, setOpen] = useState<string>("info");
  const [saved, setSaved] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl,  setCopiedUrl]  = useState(false);

  // Tournament Settings state
  const [info, setInfo] = useState({ name: "Piala Agong 2026", startDate: "2026-05-09", endDate: "2026-06-28", venue: "", code: "pialagong26" });
  const [format, setFormat] = useState({ halfDuration: 7, fullDuration: 14, bonusTryCount: 4, bonusDefeat: true });
  const [tieBreaks, setTieBreaks] = useState(TIE_BREAKS.slice(0, 4));
  const [pitches, setPitches] = useState([
    "Padang B, UPM Serdang",
    "Padang Astaka, Petaling Jaya",
    "Stadium Ragbi Johor, Mount Austin",
    "Padang B, Universiti Malaya",
    "PULAPOL, Kuala Lumpur",
    "Stadium Ragbi Tengku Muhammad Ismail, Kuala Terengganu",
    "Stadium TUDM, Subang",
    "Georgian Green, Seremban",
    "Padang C, UUM Sintok",
    "Padang Alamanda, Putrajaya",
    "Stadium Pasir Gudang",
    "Padang A, UPM Serdang",
  ]);
  const [newPitch, setNewPitch] = useState("");
  const [visibility, setVisibility] = useState({ spectatorPage: true, resultsPublic: true, joinLinkActive: true, liveScores: true });

  // Profile state
  const [profile, setProfile] = useState({ orgName: "KL Sevens FC", orgType: "Club", address: "No. 5, Jalan Titiwangsa, 53200 Kuala Lumpur", phone: "+6012-345 6789", website: "klsevens.com", logoUrl: "" });
  const [profileSaved, setProfileSaved] = useState(false);

  // Users state
  const [users, setUsers] = useState<OrgUser[]>([
    { id: "seed-org-1", name: "Dev Organizer", email: "organizer@skrammm.dev", role: "admin", joinedAt: "2026-01-01", status: "active" },
  ]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"staff" | "viewer">("staff");

  function toggleSection(id: string) {
    setOpen(prev => (prev === id ? "" : id));
  }

  function moveTieBreak(i: number, dir: -1 | 1) {
    const next = [...tieBreaks];
    const swap = i + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[i], next[swap]] = [next[swap]!, next[i]!];
    setTieBreaks(next);
  }

  function addPitch() {
    const trimmed = newPitch.trim();
    if (!trimmed || pitches.includes(trimmed)) return;
    setPitches(p => [...p, trimmed]);
    setNewPitch("");
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleProfileSave() {
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2500);
  }

  function handleInvite() {
    if (!inviteEmail.trim()) return;
    const newUser: OrgUser = {
      id: uuidv7(),
      name: "Pending Invite",
      email: inviteEmail.trim(),
      role: inviteRole,
      joinedAt: new Date().toISOString().slice(0, 10),
      status: "pending",
    };
    setUsers(u => [...u, newUser]);
    setInviteEmail("");
  }

  function removeUser(id: string) {
    setUsers(u => u.filter(user => user.id !== id));
  }

  const ROLE_COLORS: Record<OrgUser["role"], string> = {
    admin:  "bg-pitch-green/10 text-pitch-green border border-pitch-green/30",
    staff:  "bg-navy/10 text-navy border border-navy/30",
    viewer: "bg-muted text-muted-foreground border border-border",
  };

  const SectionHeader = ({ id, label }: Section) => (
    <button
      onClick={() => toggleSection(id)}
      className={`w-full flex items-center justify-between px-5 py-4 transition-colors ${open === id ? "bg-pitch-green text-white" : "bg-card text-foreground hover:bg-muted"}`}
    >
      <span className="font-lexend text-[15px] font-bold">{label}</span>
      {open === id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
    </button>
  );

  const renderSection = (section: Section) => {
    if (open !== section.id) return null;

    if (section.id === "info") return (
      <div className="p-6 flex flex-col gap-5 border-t-2 border-border">
        <FieldGroup label="Tournament Name">
          <TextInput value={info.name} onChange={v => setInfo(f => ({ ...f, name: v }))} />
        </FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="Start Date">
            <input type="date" value={info.startDate} onChange={e => setInfo(f => ({ ...f, startDate: e.target.value }))}
              className="h-11 px-4 border-2 border-navy bg-background text-foreground text-sm rounded-sm outline-none focus:border-fair-play-gold" />
          </FieldGroup>
          <FieldGroup label="End Date">
            <input type="date" value={info.endDate} onChange={e => setInfo(f => ({ ...f, endDate: e.target.value }))}
              className="h-11 px-4 border-2 border-navy bg-background text-foreground text-sm rounded-sm outline-none focus:border-fair-play-gold" />
          </FieldGroup>
        </div>
        <FieldGroup label="Venue">
          <TextInput value={info.venue} onChange={v => setInfo(f => ({ ...f, venue: v }))} />
        </FieldGroup>
        <FieldGroup label="Tournament Code" hint="Cannot be changed after launch.">
          <TextInput value={info.code} readOnly />
        </FieldGroup>
      </div>
    );

    if (section.id === "format") return (
      <div className="p-6 flex flex-col gap-5 border-t-2 border-border">
        <div className="grid grid-cols-2 gap-4">
          <FieldGroup label="Half Duration (mins)">
            <input type="number" min={5} max={20} value={format.halfDuration}
              onChange={e => setFormat(f => ({ ...f, halfDuration: Number(e.target.value) }))}
              className="h-11 px-4 border-2 border-navy bg-background text-foreground font-lexend text-xl font-extrabold rounded-sm outline-none focus:border-fair-play-gold" />
          </FieldGroup>
          <FieldGroup label="Bonus Try Threshold">
            <input type="number" min={1} max={10} value={format.bonusTryCount}
              onChange={e => setFormat(f => ({ ...f, bonusTryCount: Number(e.target.value) }))}
              className="h-11 px-4 border-2 border-navy bg-background text-foreground font-lexend text-xl font-extrabold rounded-sm outline-none focus:border-fair-play-gold" />
          </FieldGroup>
        </div>
        <div className="border-t border-border pt-4">
          <Toggle checked={format.bonusDefeat} onChange={v => setFormat(f => ({ ...f, bonusDefeat: v }))} label="Award bonus point for losing by ≤7 points" />
        </div>
        <FieldGroup label="Tie-break Order" hint="Applied in sequence when teams are level on points.">
          <div className="flex flex-col gap-1.5 border-2 border-border rounded-sm overflow-hidden">
            {tieBreaks.map((rule, i) => (
              <div key={rule} className="flex items-center gap-3 px-4 py-3 bg-card border-b last:border-b-0 border-border hover:bg-muted/40">
                <GripVertical size={14} className="text-muted-foreground/40 flex-shrink-0" />
                <span className="flex-1 text-foreground text-[13px] font-medium">{rule}</span>
                <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center flex-shrink-0 text-[11px] font-bold">{i + 1}</span>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => moveTieBreak(i, -1)} disabled={i === 0}
                    className="w-6 h-6 border border-border rounded-sm flex items-center justify-center text-muted-foreground hover:border-navy disabled:opacity-30">
                    <ChevronUp size={11} />
                  </button>
                  <button onClick={() => moveTieBreak(i, 1)} disabled={i === tieBreaks.length - 1}
                    className="w-6 h-6 border border-border rounded-sm flex items-center justify-center text-muted-foreground hover:border-navy disabled:opacity-30">
                    <ChevronDown size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </FieldGroup>
      </div>
    );

    if (section.id === "pitches") return (
      <div className="p-6 flex flex-col gap-4 border-t-2 border-border">
        <div className="flex flex-col gap-2">
          {pitches.map((pitch, i) => (
            <div key={pitch} className="flex items-center gap-3 bg-muted border border-border rounded-sm px-4 py-3">
              <GripVertical size={14} className="text-muted-foreground/40 flex-shrink-0" />
              <span className="flex-1 text-foreground text-sm font-medium">{pitch}</span>
              <button onClick={() => setPitches(p => p.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-red-card transition-colors">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="text" value={newPitch} onChange={e => setNewPitch(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") addPitch(); }}
            placeholder="e.g. Pitch 7"
            className="flex-1 h-11 px-4 border-2 border-navy bg-background text-foreground text-sm placeholder:text-muted-foreground rounded-sm outline-none focus:border-fair-play-gold" />
          <button onClick={addPitch}
            className="flex items-center gap-2 bg-pitch-green text-white border-2 border-pitch-green h-11 px-4 rounded-sm text-[13px] font-bold shadow-brutalist-navy-sm">
            <Plus size={15} /> Add
          </button>
        </div>
      </div>
    );

    if (section.id === "visibility") return (
      <div className="p-6 flex flex-col gap-1 border-t-2 border-border divide-y divide-border">
        <Toggle checked={visibility.spectatorPage} onChange={v => setVisibility(f => ({ ...f, spectatorPage: v }))} label="Spectator page is publicly accessible" />
        <Toggle checked={visibility.resultsPublic} onChange={v => setVisibility(f => ({ ...f, resultsPublic: v }))} label="Show results on spectator page before score lock" />
        <Toggle checked={visibility.joinLinkActive} onChange={v => setVisibility(f => ({ ...f, joinLinkActive: v }))} label="Join link is active (teams can apply)" />
        <Toggle checked={visibility.liveScores} onChange={v => setVisibility(f => ({ ...f, liveScores: v }))} label="Broadcast live scores via SSE" />
      </div>
    );

    if (section.id === "history") return (
      <div className="p-5 flex flex-col gap-4 border-t-2 border-border">
        <div className="border-2 border-pitch-green/30 bg-pitch-green/5 rounded-sm p-4 flex flex-col gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="bg-pitch-green text-white px-2 py-0.5 rounded-sm text-[10px] font-black uppercase">Active</span>
            <p className="font-lexend font-extrabold text-sm text-foreground">{info.name}</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Calendar size={10} />{info.startDate} – {info.endDate}</span>
            {info.venue && <span>{info.venue}</span>}
            <span className="font-bold font-mono">{info.code}</span>
          </div>
        </div>
      </div>
    );

    if (section.id === "profile") return (
      <div className="p-6 flex flex-col gap-5 border-t-2 border-border">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldGroup label="Organisation Name">
            <div className="flex items-center gap-2 border-2 border-border rounded-sm bg-card px-3 h-11 focus-within:border-fair-play-gold transition-colors">
              <Building size={14} className="text-muted-foreground flex-shrink-0" />
              <input value={profile.orgName} onChange={e => setProfile(p => ({ ...p, orgName: e.target.value }))}
                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground" />
            </div>
          </FieldGroup>
          <FieldGroup label="Type">
            <select value={profile.orgType} onChange={e => setProfile(p => ({ ...p, orgType: e.target.value }))}
              className="flex h-11 w-full rounded-sm border-2 border-border bg-card px-3 py-1 text-sm shadow-brutalist-sm focus:border-fair-play-gold focus:outline-none focus:ring-0">
              {["Club", "Academy", "Association", "Company", "School", "Other"].map(t => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </FieldGroup>
        </div>
        <FieldGroup label="Address">
          <textarea value={profile.address} onChange={e => setProfile(p => ({ ...p, address: e.target.value }))} rows={2}
            className="px-4 py-3 border-2 border-border bg-card text-foreground text-sm rounded-sm outline-none focus:border-fair-play-gold resize-none" />
        </FieldGroup>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldGroup label="Phone">
            <div className="flex items-center gap-2 border-2 border-border rounded-sm bg-card px-3 h-11 focus-within:border-fair-play-gold transition-colors">
              <Phone size={14} className="text-muted-foreground flex-shrink-0" />
              <input value={profile.phone} onChange={e => setProfile(p => ({ ...p, phone: e.target.value }))}
                className="flex-1 bg-transparent outline-none text-sm text-foreground" />
            </div>
          </FieldGroup>
          <FieldGroup label="Website">
            <div className="flex items-center gap-2 border-2 border-border rounded-sm bg-card px-3 h-11 focus-within:border-fair-play-gold transition-colors">
              <Globe size={14} className="text-muted-foreground flex-shrink-0" />
              <input value={profile.website} onChange={e => setProfile(p => ({ ...p, website: e.target.value }))}
                className="flex-1 bg-transparent outline-none text-sm text-foreground" />
            </div>
          </FieldGroup>
        </div>
        <FieldGroup label="Logo URL">
          <TextInput value={profile.logoUrl} onChange={v => setProfile(p => ({ ...p, logoUrl: v }))} placeholder="https://..." />
        </FieldGroup>
        <button onClick={handleProfileSave}
          className={`self-start flex items-center gap-1.5 border-2 px-4 h-10 rounded-sm transition-all text-[13px] font-bold ${profileSaved ? "bg-pitch-green/10 text-pitch-green border-pitch-green" : "bg-pitch-green text-white border-pitch-green"}`}
          style={{ boxShadow: profileSaved ? "none" : "3px 3px 0 var(--navy)" }}>
          {profileSaved ? <><Check size={13} /> Saved!</> : <><Save size={13} /> Save Profile</>}
        </button>
      </div>
    );

    if (section.id === "billing") return (
      <div className="p-6 flex flex-col gap-5 border-t-2 border-border">
        <div className="border-2 border-pitch-green/40 bg-pitch-green/5 rounded-sm px-5 py-4 flex items-center justify-between gap-3">
          <div>
            <p className="font-lexend font-extrabold text-sm">Free Plan</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Up to 2 tournaments per year · 32 teams max per tournament</p>
          </div>
          <span className="bg-pitch-green text-white px-3 py-1 rounded-sm text-[11px] font-black flex-shrink-0">ACTIVE</span>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Tournaments used</p>
            <p className="text-[11px] font-bold text-foreground">1 / 2</p>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div className="h-full bg-pitch-green rounded-full w-1/2 transition-all" />
          </div>
        </div>
        <button className="self-start flex items-center gap-2 border-2 border-fair-play-gold text-fair-play-gold-dark px-4 h-10 rounded-sm hover:bg-fair-play-gold/10 transition-colors text-[13px] font-bold"
          style={{ boxShadow: "3px 3px 0 var(--navy)" }}>
          <Trophy size={14} /> Upgrade to Pro — unlimited tournaments
        </button>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Billing History</p>
          <p className="text-[13px] text-muted-foreground italic">No billing history — you are on the Free plan.</p>
        </div>
      </div>
    );

    if (section.id === "users") return (
      <div className="p-5 flex flex-col gap-5 border-t-2 border-border">
        {/* Users table */}
        <div className="border-2 border-border rounded-sm overflow-hidden">
          <div className="hidden sm:grid grid-cols-[1fr_1fr_auto_auto_auto] gap-3 px-4 py-2 bg-muted border-b border-border text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <span>Name</span><span>Email</span><span>Role</span><span>Status</span><span />
          </div>
          {users.map(u => (
            <div key={u.id} className="flex sm:grid sm:grid-cols-[1fr_1fr_auto_auto_auto] items-center gap-3 px-4 py-3 border-b last:border-b-0 border-border flex-wrap">
              <p className="text-[13px] font-semibold text-foreground min-w-0 truncate">{u.name}</p>
              <p className="text-[12px] text-muted-foreground min-w-0 truncate">{u.email}</p>
              <span className={`px-2 py-0.5 rounded-sm text-[11px] font-bold flex-shrink-0 ${ROLE_COLORS[u.role]}`}>
                {u.role}
              </span>
              <span className={`px-2 py-0.5 rounded-sm text-[11px] font-bold flex-shrink-0 ${u.status === "pending" ? "bg-fair-play-gold/15 text-fair-play-gold-dark border border-fair-play-gold/30" : "bg-muted text-muted-foreground border border-border"}`}>
                {u.status}
              </span>
              {u.role !== "admin" ? (
                <button onClick={() => removeUser(u.id)}
                  className="text-muted-foreground hover:text-red-card transition-colors flex-shrink-0">
                  <UserMinus size={14} />
                </button>
              ) : (
                <span className="w-[14px] flex-shrink-0" />
              )}
            </div>
          ))}
        </div>

        {/* Invite form */}
        <div className="flex flex-col gap-3">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Invite User</p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2 border-2 border-border rounded-sm bg-card px-3 h-11 flex-1 min-w-[180px] focus-within:border-fair-play-gold transition-colors">
              <Mail size={14} className="text-muted-foreground flex-shrink-0" />
              <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") handleInvite(); }}
                placeholder="email@example.com"
                className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground" />
            </div>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value as "staff" | "viewer")}
              className="flex h-11 w-48 rounded-sm border-2 border-border bg-card px-3 py-1 text-sm shadow-brutalist-sm focus:border-fair-play-gold focus:outline-none focus:ring-0">
              <option value="staff">Staff</option>
              <option value="viewer">Viewer</option>
            </select>
            <button onClick={handleInvite} disabled={!inviteEmail.trim()}
              className="flex items-center gap-1.5 bg-pitch-green text-white border-2 border-pitch-green px-4 h-11 rounded-sm hover:bg-pitch-green/90 transition-colors text-[13px] font-bold disabled:opacity-40 disabled:cursor-not-allowed shadow-brutalist-navy-sm">
              <Mail size={13} /> Send Invite
            </button>
          </div>
        </div>
      </div>
    );

    if (section.id === "privacy") return (
      <div className="p-6 flex flex-col gap-3 border-t-2 border-border">
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          We collect and process data to operate tournament management services on your behalf.
          Personal data (names, emails, contact details) is stored securely on servers within
          Malaysia and is never sold to third parties. You may request data deletion at any time
          by contacting <span className="text-pitch-green font-semibold">support@skrammm.com</span>.
        </p>
        <p className="text-[11px] text-muted-foreground">Last updated: 1 January 2025</p>
        <a href="#" className="self-start flex items-center gap-1.5 text-pitch-green text-[13px] font-bold hover:underline">
          <ExternalLink size={12} /> View full Privacy Policy
        </a>
      </div>
    );

    if (section.id === "terms") return (
      <div className="p-6 flex flex-col gap-3 border-t-2 border-border">
        <p className="text-[13px] text-muted-foreground leading-relaxed">
          By using Skrammm you agree to our Terms of Service. Organisers are responsible for ensuring
          participant data is handled in accordance with the Personal Data Protection Act 2010 (PDPA).
          Skrammm reserves the right to suspend accounts found in violation of platform policies,
          including fraudulent tournament entries or misuse of player data.
        </p>
        <p className="text-[11px] text-muted-foreground">Last updated: 1 January 2025</p>
        <a href="#" className="self-start flex items-center gap-1.5 text-pitch-green text-[13px] font-bold hover:underline">
          <ExternalLink size={12} /> View full Terms &amp; Conditions
        </a>
      </div>
    );

    return null;
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="sticky top-0 z-10 bg-background border-b-2 border-border px-6 h-14 flex items-center justify-between flex-shrink-0">
        <h1 className="text-foreground text-lg font-bold">Settings</h1>
        <span className="text-muted-foreground text-[13px]">{info.name}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 pb-28">
        <div className="max-w-2xl mx-auto flex flex-col gap-4">

          {/* New Tournament CTA */}
          <Link href="/organizer/settings/setup"
            className="flex items-center gap-3 border-2 border-pitch-green bg-pitch-green/5 rounded-sm px-5 py-4 hover:bg-pitch-green/10 transition-colors shadow-brutalist-navy">
            <PlusSquare size={18} className="text-pitch-green flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-lexend font-extrabold text-sm text-pitch-green">Create New Tournament</p>
              <p className="text-[11px] text-muted-foreground">Set up groups, format, and invite teams</p>
            </div>
            <ChevronRight size={16} className="text-muted-foreground flex-shrink-0" />
          </Link>

          {/* Join Code Card */}
          {(() => {
            const joinUrl = `https://skrammm.com/${info.code}/join`;
            return (
              <div className="bg-card border-2 border-border rounded-sm overflow-hidden shadow-brutalist-navy">
                <div className="bg-pitch-green px-5 py-3.5 border-b-2 border-navy flex items-center justify-between">
                  <p className="text-white font-lexend text-sm font-bold">Join This Tournament</p>
                  <span className="bg-fair-play-gold text-pitch-green px-2 py-0.5 rounded-sm text-[10px] font-black uppercase">
                    {info.code}
                  </span>
                </div>
                <div className="p-5 flex flex-col gap-4">
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Tournament Code</p>
                    <div className="flex items-center gap-2">
                      <span className="flex-1 bg-muted border-2 border-border rounded-sm px-4 py-2.5 text-center font-lexend text-[26px] font-black tracking-[0.12em] text-foreground">
                        {info.code}
                      </span>
                      <button
                        onClick={() => { void navigator.clipboard.writeText(info.code); setCopiedCode(true); setTimeout(() => setCopiedCode(false), 2500); }}
                        className={`flex items-center gap-1.5 border-2 px-4 h-12 rounded-sm transition-all text-[13px] font-bold flex-shrink-0 ${copiedCode ? "border-pitch-green bg-pitch-green/10 text-pitch-green" : "border-border text-muted-foreground hover:border-navy hover:text-foreground"}`}>
                        {copiedCode ? <Check size={14} /> : <Copy size={14} />}
                        {copiedCode ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Join Link</p>
                    <div className="flex items-center gap-2">
                      <span className="flex-1 bg-muted border-2 border-border rounded-sm px-4 h-10 flex items-center min-w-0">
                        <span className="text-foreground text-[13px] truncate">{joinUrl}</span>
                      </span>
                      <button
                        onClick={() => { void navigator.clipboard.writeText(joinUrl); setCopiedUrl(true); setTimeout(() => setCopiedUrl(false), 2500); }}
                        className={`flex items-center gap-1.5 border-2 px-3 h-10 rounded-sm transition-all text-[13px] font-bold flex-shrink-0 ${copiedUrl ? "border-pitch-green bg-pitch-green/10 text-pitch-green" : "border-border text-muted-foreground hover:border-navy hover:text-foreground"}`}>
                        {copiedUrl ? <Check size={13} /> : <Copy size={13} />}
                        {copiedUrl ? "Copied!" : "Copy"}
                      </button>
                      <a href={joinUrl} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 border-2 border-border text-muted-foreground px-3 h-10 rounded-sm hover:border-navy hover:text-foreground transition-colors text-[13px] font-semibold flex-shrink-0">
                        <ExternalLink size={13} /> Open
                      </a>
                    </div>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Share this code or link with team managers so they can register.
                    Toggle the join link on/off under <strong>Visibility</strong>.
                  </p>
                </div>
              </div>
            );
          })()}

          {/* Tournament Settings */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1 pt-2">
            Current Tournament
          </p>
          {TOURNAMENT_SECTIONS.map(section => (
            <div key={section.id} className="bg-card border-2 border-border rounded-sm overflow-hidden shadow-brutalist-navy">
              <SectionHeader {...section} />
              {renderSection(section)}
            </div>
          ))}

          {/* Account & Organisation */}
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 px-1 pt-2">
            Account &amp; Organisation
          </p>
          {ACCOUNT_SECTIONS.map(section => (
            <div key={section.id} className="bg-card border-2 border-border rounded-sm overflow-hidden shadow-brutalist-navy">
              <SectionHeader {...section} />
              {renderSection(section)}
            </div>
          ))}
        </div>
      </div>

      {/* Save footer — only for tournament settings sections */}
      {TOURNAMENT_SECTIONS.some(s => s.id === open) && (
        <div className={`fixed bottom-0 ${SIDEBAR_WIDTH_CLASS} right-0 bg-background border-t-2 border-border px-6 py-4 flex items-center justify-between z-20`}>
          <p className="text-muted-foreground text-[13px]">
            Changes are applied immediately after saving.
          </p>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 border-2 border-border text-muted-foreground px-4 h-10 rounded-sm hover:border-navy transition-colors text-[13px] font-semibold">
              <RotateCcw size={13} /> Discard
            </button>
            <button onClick={handleSave}
              className={`flex items-center gap-1.5 border-2 px-4 h-10 rounded-sm transition-all text-[13px] font-bold ${saved ? "bg-pitch-green/10 text-pitch-green border-pitch-green" : "bg-pitch-green text-white border-pitch-green"}`}
              style={{ boxShadow: saved ? "none" : "3px 3px 0 var(--navy)" }}>
              {saved ? <><Check size={13} /> Saved!</> : <><Save size={13} /> Save Changes</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

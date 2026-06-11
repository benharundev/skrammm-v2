"use client";

import { useState } from "react";
import { Link2, Pencil, Share2, Check, ExternalLink } from "lucide-react";
import { SPECTATOR_ORIGIN } from "@/app/(app)/organizer/_lib/constants";

export function TournamentUrlBanner({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const SPECTATOR_URL = `${SPECTATOR_ORIGIN}/${code}`;
  return (
    <div className="bg-card border-2 border-border rounded-sm shadow-brutalist-navy">
      <div className="px-5 py-3 border-b-2 border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 size={14} className="text-pitch-green flex-shrink-0" />
          <span className="text-foreground font-lexend text-sm font-bold">Tournament URL</span>
        </div>
        <button className="text-muted-foreground hover:text-foreground transition-colors p-1"><Pencil size={13} /></button>
      </div>
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="flex-1 bg-muted border border-border rounded-sm px-4 h-11 flex items-center min-w-0">
          <span className="text-foreground truncate text-sm">{SPECTATOR_URL.replace(/^https?:\/\//, "")}</span>
        </div>
        <button onClick={() => { navigator.clipboard.writeText(SPECTATOR_URL).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 2500); }}
          className="flex items-center gap-2 bg-pitch-green text-white border-2 border-pitch-green h-11 px-5 rounded-sm flex-shrink-0 transition-all active:translate-x-[2px] active:translate-y-[2px] text-[13px] font-bold shadow-brutalist-navy-sm">
          {copied ? <Check size={15} /> : <Share2 size={15} />}
          {copied ? "Copied!" : "Share"}
        </button>
        <a href={SPECTATOR_URL} target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-1.5 border-2 border-border text-muted-foreground h-11 px-4 rounded-sm hover:border-navy hover:text-foreground transition-colors flex-shrink-0 text-[13px] font-semibold">
          <ExternalLink size={13} /> Open
        </a>
      </div>
    </div>
  );
}

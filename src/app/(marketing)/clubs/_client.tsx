"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, type RefObject } from "react";
import type { Route } from "next";

type TrainingSlot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  venue: string | null;
};

type Club = {
  id: string;
  name: string;
  slug: string;
  origin: string | null;
  logoUrl: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  description: string | null;
  trainingSlots: TrainingSlot[];
};

interface ClubDirectoryClientProps {
  clubs: Club[];
}

const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const INITIAL_VISIBLE = 6;
const LOAD_MORE_COUNT = 6;

const ClubMap = dynamic(() => import("./_map"), { ssr: false });

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function getTrainingDaySummary(slots: TrainingSlot[]): string {
  const days = [...new Set(slots.map((s) => s.dayOfWeek))].sort();
  if (days.length === 0) return "No training listed";
  return days.map((d) => DAY_NAMES[d] ?? "").join(", ");
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

type LocationState = "idle" | "requesting" | "granted" | "denied";

export function ClubDirectoryClient({ clubs }: ClubDirectoryClientProps) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locState, setLocState] = useState<LocationState>("idle");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const desktopLoaderRef = useRef<HTMLDivElement>(null);
  const mobileLoaderRef = useRef<HTMLDivElement>(null);

  function requestLocation() {
    if (!navigator.geolocation) { setLocState("denied"); return; }
    setLocState("requesting");
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setLocState("granted"); },
      () => setLocState("denied"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  useEffect(() => { requestLocation(); }, []);
  useEffect(() => { setVisibleCount(INITIAL_VISIBLE); }, [search]);

  const filtered = clubs.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || (c.origin?.toLowerCase().includes(q) ?? false);
  });

  const sorted = [...filtered].sort((a, b) => {
    if (userLat !== null && userLng !== null) {
      const dA = a.lat !== null && a.lng !== null ? haversineKm(userLat, userLng, a.lat, a.lng) : Infinity;
      const dB = b.lat !== null && b.lng !== null ? haversineKm(userLat, userLng, b.lat, b.lng) : Infinity;
      return dA - dB;
    }
    return a.name.localeCompare(b.name);
  });

  const mappableClubs = sorted.filter(
    (c): c is Club & { lat: number; lng: number } => c.lat !== null && c.lng !== null
  );
  const visibleClubs = sorted.slice(0, visibleCount);
  const hasMore = sorted.length > visibleCount;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) setVisibleCount((v) => v + LOAD_MORE_COUNT); },
      { threshold: 0.1 }
    );
    const refs = [desktopLoaderRef.current, mobileLoaderRef.current];
    for (const el of refs) { if (el && hasMore) observer.observe(el); }
    return () => observer.disconnect();
  }, [hasMore]);

  // ── Shared sub-components ─────────────────────────────────────────────────

  const searchInput = (
    <input
      type="text"
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search clubs or area…"
      className="w-full bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/40 text-sm rounded-lg px-3 py-2.5 border border-primary-foreground/20 focus:outline-none focus:border-accent"
    />
  );

  const locationRow =
    locState === "granted" ? (
      <p className="text-xs text-accent font-semibold flex items-center gap-1"><span>📍</span> Sorted by distance from you</p>
    ) : locState === "requesting" ? (
      <p className="text-xs text-primary-foreground/50 flex items-center gap-1"><span className="animate-pulse">📍</span> Getting your location…</p>
    ) : (
      <button onClick={requestLocation} className="text-xs text-primary-foreground/50 hover:text-accent flex items-center gap-1 transition-colors text-left">
        <span>📍</span>
        {locState === "denied" ? "Location blocked · tap to retry" : "Use my location to sort by distance"}
      </button>
    );

  const cards = (
    <>
      {sorted.length === 0 && (
        <p className="text-primary-foreground/40 text-sm text-center py-8">No clubs match your search.</p>
      )}
      {visibleClubs.map((club) => {
        const dist =
          userLat !== null && userLng !== null && club.lat !== null && club.lng !== null
            ? haversineKm(userLat, userLng, club.lat, club.lng)
            : null;
        const active = selectedSlug === club.slug;
        return (
          <div
            key={club.id}
            onClick={() => setSelectedSlug(club.slug)}
            onMouseEnter={() => setSelectedSlug(club.slug)}
            className={`bg-card rounded-xl border-2 p-3 cursor-pointer transition-all ${
              active ? "border-accent shadow-brutalist" : "border-transparent hover:border-accent/40 shadow-sm"
            }`}
          >
            <div className="flex items-start gap-3">
              {club.logoUrl ? (
                <img src={club.logoUrl} alt={club.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0 border-2 border-border" />
              ) : (
                <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-base flex-shrink-0 border-2 border-border">
                  {club.name[0]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-foreground text-sm leading-tight">{club.name}</p>
                  <span className="flex-shrink-0 bg-green-100 text-green-800 text-[10px] font-bold px-1.5 py-0.5 rounded-md">OPEN</span>
                </div>
                {club.origin && <p className="text-muted-foreground text-xs mt-0.5 truncate">{club.origin}</p>}
                {dist !== null && <p className="text-accent text-xs font-semibold mt-0.5">{formatDistance(dist)} away</p>}
                <p className="text-muted-foreground text-xs mt-1">{getTrainingDaySummary(club.trainingSlots)}</p>
              </div>
            </div>
            <div className="mt-2.5 flex justify-end">
              <Link href={`/clubs/${club.slug}` as Route} onClick={(e) => e.stopPropagation()} className="text-xs font-bold text-accent hover:underline">
                View club →
              </Link>
            </div>
          </div>
        );
      })}
    </>
  );

  const loadMoreBtn = (ref: RefObject<HTMLDivElement | null>) =>
    hasMore ? (
      <div ref={ref} className="pt-1">
        <button
          onClick={() => setVisibleCount((v) => v + LOAD_MORE_COUNT)}
          className="w-full py-2.5 text-xs font-semibold text-primary-foreground/50 hover:text-primary-foreground/80 border border-dashed border-primary-foreground/20 rounded-lg transition-colors"
        >
          Load more · {sorted.length - visibleCount} remaining
        </button>
      </div>
    ) : null;

  // ── Layout ────────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="flex-1 min-h-0 flex flex-col md:flex-row">

        {/* ── Desktop left panel ─────────────────────────────────────────── */}
        <div className="hidden md:flex flex-col w-[420px] flex-shrink-0 bg-primary border-r border-primary-foreground/10 overflow-y-auto">
          <div className="sticky top-0 bg-primary z-10 px-4 py-3 border-b border-primary-foreground/10 space-y-2">
            {searchInput}
            {locationRow}
          </div>
          <p className="px-4 pt-3 pb-1 text-primary-foreground/40 text-xs font-medium uppercase tracking-widest">
            {sorted.length} club{sorted.length !== 1 ? "s" : ""}
          </p>
          <div className="flex flex-col gap-2 px-4 pb-4">
            {cards}
            {loadMoreBtn(desktopLoaderRef)}
          </div>
        </div>

        {/* ── Map area: card on desktop, full-screen + sheet on mobile ─── */}
        {/*
          Desktop: p-4 creates breathing room; inner div gets rounded corners
                   and shadow to look like a card, matching the Airbnb pattern.
          Mobile:  no padding, map fills edge-to-edge; bottom sheet overlays.
        */}
        <div className="flex-1 relative overflow-hidden">

          {/* Map — absolute fills parent on mobile; md:inset-4 creates card gap on desktop */}
          <div className="absolute inset-0 md:inset-4 md:rounded-2xl md:overflow-hidden md:shadow-[3px_3px_0_rgba(0,36,26,0.35)]">
            <ClubMap
              clubs={mappableClubs}
              selectedSlug={selectedSlug}
              onSelect={setSelectedSlug}
              userLat={userLat}
              userLng={userLng}
            />
          </div>

          {/* ── Mobile bottom sheet (hidden on desktop) ────────────────── */}
          <div
            className={`md:hidden absolute bottom-0 left-0 right-0 z-[1000] bg-primary rounded-t-3xl shadow-[0_-4px_24px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden transition-[max-height] duration-300 ease-in-out ${
              sheetExpanded ? "max-h-[78vh]" : "max-h-[260px]"
            }`}
          >
            {/* Drag handle — tap to toggle */}
            <button
              onClick={() => setSheetExpanded((v) => !v)}
              className="flex flex-col items-center pt-3 pb-2.5 w-full flex-shrink-0 active:bg-primary-foreground/5 transition-colors"
              aria-label={sheetExpanded ? "Show less" : "Expand club list"}
            >
              <div className="w-9 h-1 bg-primary-foreground/20 rounded-full mb-2" />
              <p className="text-sm font-extrabold text-primary-foreground tracking-tight">
                {sorted.length} club{sorted.length !== 1 ? "s" : ""}
                <span className="ml-1 text-primary-foreground/40 font-normal text-xs">{sheetExpanded ? "▾" : "▴"}</span>
              </p>
            </button>

            {/* Search + location */}
            <div className="px-4 pb-3 flex-shrink-0 space-y-2 border-b border-primary-foreground/10">
              {searchInput}
              {locationRow}
            </div>

            {/* Scrollable cards */}
            <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3 flex flex-col gap-2">
              {cards}
              {loadMoreBtn(mobileLoaderRef)}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

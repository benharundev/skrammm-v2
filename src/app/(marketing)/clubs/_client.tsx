"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useState } from "react";
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
  return days.map((d) => DAY_NAMES[d]).join(", ");
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

export function ClubDirectoryClient({ clubs }: ClubDirectoryClientProps) {
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
      },
      () => {
        // Silently fall back to alphabetical order
      }
    );
  }, []);

  const filtered = clubs.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.origin?.toLowerCase().includes(q) ?? false)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    if (userLat !== null && userLng !== null) {
      const dA =
        a.lat !== null && a.lng !== null
          ? haversineKm(userLat, userLng, a.lat, a.lng)
          : Infinity;
      const dB =
        b.lat !== null && b.lng !== null
          ? haversineKm(userLat, userLng, b.lat, b.lng)
          : Infinity;
      return dA - dB;
    }
    return a.name.localeCompare(b.name);
  });

  const mappableClubs = sorted.filter(
    (c): c is Club & { lat: number; lng: number } => c.lat !== null && c.lng !== null
  );

  return (
    <div className="flex flex-1 overflow-hidden h-[calc(100vh-57px)]">
      {/* Mobile map toggle */}
      <div className="md:hidden absolute bottom-4 right-4 z-20">
        <button
          onClick={() => setShowMap((v) => !v)}
          className="bg-accent text-accent-foreground text-sm font-bold px-4 py-2 rounded shadow-brutalist"
        >
          {showMap ? "Show list" : "Show map"}
        </button>
      </div>

      {/* Card list panel */}
      <div
        className={`w-full md:w-[400px] flex-shrink-0 flex flex-col bg-primary border-r border-primary-foreground/10 overflow-y-auto ${showMap ? "hidden md:flex" : "flex"}`}
      >
        {/* Search bar */}
        <div className="p-3 border-b border-primary-foreground/10">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clubs or area…"
            className="w-full bg-primary-foreground/10 text-primary-foreground placeholder:text-primary-foreground/40 text-sm rounded px-3 py-2 border border-primary-foreground/20 focus:outline-none focus:border-accent"
          />
        </div>

        {/* Club count */}
        <div className="px-3 py-2 text-primary-foreground/50 text-xs">
          {sorted.length} club{sorted.length !== 1 ? "s" : ""}
          {userLat !== null ? " · sorted by distance" : ""}
        </div>

        {/* Club cards */}
        <div className="flex flex-col gap-2 p-3">
          {sorted.length === 0 && (
            <p className="text-primary-foreground/40 text-sm text-center py-8">
              No clubs match your search.
            </p>
          )}
          {sorted.map((club) => {
            const distance =
              userLat !== null && userLng !== null && club.lat !== null && club.lng !== null
                ? haversineKm(userLat, userLng, club.lat, club.lng)
                : null;
            const isActive = selectedSlug === club.slug;
            return (
              <div
                key={club.id}
                onClick={() => setSelectedSlug(club.slug)}
                onMouseEnter={() => setSelectedSlug(club.slug)}
                className={`bg-card rounded border-2 p-3 cursor-pointer transition-all ${
                  isActive
                    ? "border-accent shadow-brutalist"
                    : "border-card hover:border-accent/50"
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  {club.logoUrl ? (
                    <img
                      src={club.logoUrl}
                      alt={club.name}
                      className="w-10 h-10 rounded object-contain flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-primary flex items-center justify-center text-primary-foreground font-extrabold text-lg flex-shrink-0">
                      {club.name[0]}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-bold text-foreground text-sm leading-tight truncate">
                        {club.name}
                      </p>
                      <span className="flex-shrink-0 bg-green-100 text-green-800 text-[10px] font-bold px-1.5 py-0.5 rounded">
                        OPEN
                      </span>
                    </div>
                    {club.origin && (
                      <p className="text-muted-foreground text-xs mt-0.5 truncate">{club.origin}</p>
                    )}
                    {distance !== null && (
                      <p className="text-accent text-xs font-semibold mt-0.5">
                        {formatDistance(distance)} away
                      </p>
                    )}
                    <p className="text-muted-foreground text-xs mt-1">
                      {getTrainingDaySummary(club.trainingSlots)}
                    </p>
                  </div>
                </div>

                <div className="mt-2 flex justify-end">
                  <Link
                    href={`/clubs/${club.slug}` as Route}
                    onClick={(e) => e.stopPropagation()}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    View profile →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Map panel */}
      <div className={`flex-1 ${showMap ? "block" : "hidden md:block"}`}>
        <ClubMap
          clubs={mappableClubs}
          selectedSlug={selectedSlug}
          onSelect={setSelectedSlug}
        />
      </div>
    </div>
  );
}

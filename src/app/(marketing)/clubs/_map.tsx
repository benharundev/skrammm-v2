"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { useEffect, useRef, useState } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

type MappableClub = {
  id: string;
  name: string;
  slug: string;
  origin: string | null;
  logoUrl: string | null;
  lat: number;
  lng: number;
};

interface ClubMapProps {
  clubs: MappableClub[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
  userLat?: number | null;
  userLng?: number | null;
}

// Ensures Leaflet re-measures its container on first mount (handles SSR→CSR layout shift)
function InvalidateOnMount() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 50);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

// Guards map layers against React StrictMode's unmount→remount cycle.
// Without this, Leaflet's _panes are cleared on the simulated unmount, then
// TileLayer/Marker try to call getPane() on an already-removed map → TypeError.
function MapLayersGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(true);
    return () => { setReady(false); };
  }, []);
  return ready ? <>{children}</> : null;
}

function createClubIcon(club: MappableClub, isSelected: boolean): L.DivIcon {
  const size = isSelected ? 46 : 38;
  const border = isSelected ? `3px solid #ffba20` : `2px solid #00241a`;
  const shadow = isSelected
    ? "3px 3px 0 rgba(0,36,26,0.5)"
    : "2px 2px 0 rgba(0,36,26,0.3)";

  const inner = club.logoUrl
    ? `<img src="${club.logoUrl.replace(/"/g, "&quot;")}" style="width:100%;height:100%;object-fit:cover;" alt="" />`
    : `<span style="font-size:${Math.round(size / 2.5)}px;font-weight:800;color:#ffba20;line-height:1;">${club.name[0] ?? "?"}</span>`;

  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;border:${border};overflow:hidden;box-shadow:${shadow};background:#00241a;display:flex;align-items:center;justify-content:center;transition:all 0.15s;">${inner}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2 + 4)],
  });
}

const userLocationIcon = L.divIcon({
  className: "",
  html: `<div style="width:38px;height:38px;border-radius:50%;background:#ffba20;border:3px solid #00241a;display:flex;align-items:center;justify-content:center;box-shadow:2px 2px 0 rgba(0,36,26,0.5);font-size:20px;line-height:1;">🏉</div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
  popupAnchor: [0, -23],
});

function PanToUser({
  lat,
  lng,
}: {
  lat: number | null | undefined;
  lng: number | null | undefined;
}) {
  const map = useMap();
  const hasPanned = useRef(false);

  useEffect(() => {
    if (lat == null || lng == null || isNaN(lat) || isNaN(lng) || hasPanned.current) return;
    hasPanned.current = true;
    map.flyTo([lat, lng], 12, { animate: true, duration: 1.5 });
  }, [lat, lng, map]);

  return null;
}

function PanToSelected({
  clubs,
  selectedSlug,
}: {
  clubs: MappableClub[];
  selectedSlug: string | null;
}) {
  const map = useMap();
  const prevSlug = useRef<string | null>(null);

  useEffect(() => {
    if (!selectedSlug || selectedSlug === prevSlug.current) return;
    const club = clubs.find((c) => c.slug === selectedSlug);
    if (club) map.panTo([club.lat, club.lng], { animate: true, duration: 0.5 });
    prevSlug.current = selectedSlug;
  }, [selectedSlug, clubs, map]);

  return null;
}

export default function ClubMap({
  clubs,
  selectedSlug,
  onSelect,
  userLat,
  userLng,
}: ClubMapProps) {
  return (
    <MapContainer
      center={[4.2, 108.9]}
      zoom={6}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <InvalidateOnMount />
      <MapLayersGate>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>"
        />
        <PanToUser lat={userLat} lng={userLng} />
        <PanToSelected clubs={clubs} selectedSlug={selectedSlug} />

        {userLat != null && userLng != null && (
          <Marker position={[userLat, userLng]} icon={userLocationIcon}>
            <Popup>
              <div className="text-sm font-semibold">📍 Your location</div>
            </Popup>
          </Marker>
        )}

        {clubs.map((club) => (
          <Marker
            key={club.id}
            position={[club.lat, club.lng]}
            icon={createClubIcon(club, selectedSlug === club.slug)}
            eventHandlers={{ click: () => onSelect(club.slug) }}
          >
            <Popup>
              <div className="text-sm space-y-0.5">
                <p className="font-bold leading-snug">{club.name}</p>
                {club.origin && (
                  <p className="text-gray-500 text-xs">{club.origin}</p>
                )}
                <a
                  href={`/clubs/${club.slug}`}
                  className="text-blue-600 text-xs hover:underline block pt-0.5"
                >
                  View profile →
                </a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapLayersGate>
    </MapContainer>
  );
}

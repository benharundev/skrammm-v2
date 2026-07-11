"use client";

import "leaflet/dist/leaflet.css";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import { useEffect, useRef } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

// Fix default icon paths broken by webpack
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon.src,
  iconRetinaUrl: markerIcon2x.src,
  shadowUrl: markerShadow.src,
});

type MappableClub = {
  id: string;
  name: string;
  slug: string;
  origin: string | null;
  lat: number;
  lng: number;
};

interface ClubMapProps {
  clubs: MappableClub[];
  selectedSlug: string | null;
  onSelect: (slug: string) => void;
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
    if (club) {
      map.panTo([club.lat, club.lng], { animate: true, duration: 0.5 });
    }
    prevSlug.current = selectedSlug;
  }, [selectedSlug, clubs, map]);

  return null;
}

export default function ClubMap({ clubs, selectedSlug, onSelect }: ClubMapProps) {
  return (
    <MapContainer
      center={[4.2, 108.9]}
      zoom={6}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; <a href='https://www.openstreetmap.org/copyright'>OpenStreetMap</a>"
      />
      <PanToSelected clubs={clubs} selectedSlug={selectedSlug} />
      {clubs.map((club) => (
        <Marker
          key={club.id}
          position={[club.lat, club.lng]}
          eventHandlers={{
            click: () => onSelect(club.slug),
          }}
        >
          <Popup>
            <div className="text-sm">
              <p className="font-bold">{club.name}</p>
              {club.origin && <p className="text-gray-500 text-xs">{club.origin}</p>}
              <a
                href={`/clubs/${club.slug}`}
                className="text-blue-600 text-xs hover:underline"
              >
                View profile →
              </a>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

"use client";

import dynamic from "next/dynamic";

const ClubMiniMap = dynamic(() => import("./_map"), { ssr: false });

export function ClubMiniMapWrapper({ lat, lng, name }: { lat: number; lng: number; name: string }) {
  return <ClubMiniMap lat={lat} lng={lng} name={name} />;
}

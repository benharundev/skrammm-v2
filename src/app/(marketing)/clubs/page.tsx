import { listPublicTeams } from "@modules/team";
import { ClubDirectoryClient } from "./_client";
import type { Route } from "next";
import Link from "next/link";

export const revalidate = 60;

export default async function ClubsPage() {
  const clubs = await listPublicTeams();
  return (
    <div className="flex min-h-screen flex-col bg-primary">
      {/* Header */}
      <header className="border-b border-primary-foreground/10 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-lexend)] font-extrabold tracking-tight text-primary-foreground text-xl">
            Rugby Clubs
          </h1>
          <p className="text-primary-foreground/60 text-xs mt-0.5">Find a club near you</p>
        </div>
        <Link
          href={"/clubs/register" as Route}
          className="bg-accent text-accent-foreground text-sm font-bold px-3 py-1.5 rounded shadow-brutalist hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none transition-all"
        >
          Register your club
        </Link>
      </header>
      <ClubDirectoryClient clubs={clubs} />
    </div>
  );
}

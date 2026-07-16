import Image from "next/image";
import { listPublicTeams } from "@modules/team";
import { ClubDirectoryClient } from "./_client";
import type { Route } from "next";
import Link from "next/link";

// Forces request-time rendering: the Docker build stage has no DATABASE_URL,
// so this page cannot be statically prerendered at build time.
export const dynamic = "force-dynamic";

export default async function ClubsPage() {
  const clubs = await listPublicTeams();
  return (
    <div className="flex h-screen flex-col bg-primary overflow-hidden">
      {/* Header */}
      <header className="border-b border-primary-foreground/10 px-4 py-3 flex items-center justify-between">
        <Link href={"/" as Route}>
          <Image
            src="/logos/logo-h-yellow.png"
            alt="Skrammm"
            width={120}
            height={32}
            priority
            className="h-8 w-auto"
          />
        </Link>
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

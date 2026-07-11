import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

// skrammm.com — Marketing landing page
export default function MarketingHomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-pitch-green px-4">
      <Image
        src="/logos/logo-v-yellow.png"
        alt="Skrammm"
        width={173}
        height={96}
        priority
      />
      <p className="mt-4 text-sm text-pitch-green-container">
        Rugby tournament management platform.
      </p>

      <div className="mt-10 flex flex-col items-center gap-3 w-full max-w-xs">
        <Link
          href={"/clubs" as Route}
          className="w-full rounded-sm border-2 border-fair-play-gold bg-fair-play-gold px-6 py-3 text-center font-[family-name:var(--font-lexend)] text-sm font-extrabold tracking-tight text-pitch-green shadow-[4px_4px_0_#00241a] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none"
        >
          Find a Rugby Club
        </Link>
        <Link
          href={"/clubs/register" as Route}
          className="w-full rounded-sm border-2 border-pitch-green-container px-6 py-3 text-center font-[family-name:var(--font-lexend)] text-sm font-bold tracking-tight text-pitch-green-container transition-colors hover:bg-pitch-green-mid"
        >
          Register Your Club
        </Link>
      </div>
    </main>
  );
}

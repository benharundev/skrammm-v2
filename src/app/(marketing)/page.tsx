import Image from "next/image";

// skrammm.com — Marketing landing page stub
export default function MarketingHomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-pitch-green">
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
    </main>
  );
}

import Image from "next/image";
import { LoginFlow } from "@/components/auth/login-flow";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function OrganizerLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-pitch-green px-4 py-12">
      <div className="mb-8 flex flex-col items-center gap-3">
        <Image
          src="/logos/logo-v-yellow.png"
          alt="Skrammm"
          width={144}
          height={80}
          priority
        />
        <p className="text-sm text-pitch-green-container">
          Organizer Login
        </p>
      </div>

      <Card className="w-full max-w-sm border-2 border-fair-play-gold shadow-brutalist-lg">
        <CardHeader>
          <CardTitle className="font-[family-name:var(--font-lexend)] text-2xl">
            Organizer
          </CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send you a one-time sign-in code.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginFlow
            destination="/organizer"
            authContext="org"
            {...(next ? { next } : {})}
          />
        </CardContent>
      </Card>
    </main>
  );
}

import { RegisterWizard } from "./_client";

export default function RegisterClubPage() {
  return (
    <main className="min-h-screen bg-primary flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <h1 className="font-[family-name:var(--font-lexend)] font-extrabold tracking-tight text-primary-foreground text-2xl mb-6 text-center">
          Register Your Club
        </h1>
        <RegisterWizard />
      </div>
    </main>
  );
}

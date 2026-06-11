import { requireAuth } from "@lib/auth/server";
import { createTeam, CreateTeamSchema } from "@modules/team";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";

async function handleCreateTeam(formData: FormData) {
  "use server";
  const session = await requireAuth();
  const parsed = CreateTeamSchema.safeParse({
    name: formData.get("name") as string,
    origin: (formData.get("origin") as string) || undefined,
    trainingGround: (formData.get("trainingGround") as string) || undefined,
  });
  if (!parsed.success) return;
  await createTeam(session.user.id, parsed.data);
  redirect("/tm");
}

export default function CreateTeamPage() {
  return (
    <div className="max-w-lg space-y-6 p-4 md:p-8">
      <div className="flex items-center gap-3">
        <Link href={"/tm" as Route} className="flex h-8 w-8 items-center justify-center rounded-sm border-2 border-border bg-card shadow-brutalist-sm transition-shadow hover:shadow-brutalist">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="font-[family-name:var(--font-lexend)] text-2xl font-extrabold tracking-tight text-foreground">Create Club</h1>
      </div>
      <section className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
        <form action={handleCreateTeam} className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label htmlFor="name">Club Name <span className="text-destructive">*</span></Label>
            <Input id="name" name="name" required minLength={2} maxLength={100} placeholder="e.g. Lions RFC" className="shadow-brutalist-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="origin">City / State</Label>
            <Input id="origin" name="origin" placeholder="e.g. Kuala Lumpur" className="shadow-brutalist-sm" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="trainingGround">Training Ground</Label>
            <Input id="trainingGround" name="trainingGround" placeholder="e.g. Padang Merbuk" className="shadow-brutalist-sm" />
          </div>
          <Button type="submit" className="w-full bg-primary text-primary-foreground shadow-brutalist-sm">Create Club</Button>
        </form>
      </section>
    </div>
  );
}

import { requireAuth } from "@lib/auth/server";
import { getTeamsByManager } from "@modules/team";
import { ExternalLink, User, Heart, ChevronRight, Shield } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { SignOutButton } from "../_components/sign-out-button";

export default async function SettingsPage() {
  const session = await requireAuth();
  const managedTeams = await getTeamsByManager(session.user.id);
  const isManager = managedTeams.length > 0;

  return (
    <div className="max-w-2xl space-y-8 p-4 md:p-8">
      <header className="space-y-1">
        <h1 className="font-[family-name:var(--font-lexend)] text-2xl font-extrabold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground">
          Account, legal, and sign out
        </p>
      </header>

      {/* Edit Profile */}
      <section className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
        <Link
          href={"/player/profile/edit" as Route}
          className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-primary text-white">
              <User className="h-4 w-4" />
            </div>
            <div>
              <p className="font-[family-name:var(--font-lexend)] font-bold text-foreground">
                Player Profile
              </p>
              <p className="text-xs text-muted-foreground">Name, jersey number, position</p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      </section>

      {/* Medical & Emergency */}
      <section className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
        <Link
          href={"/player/settings/medical" as Route}
          className="flex items-center justify-between p-4 transition-colors hover:bg-muted/50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm bg-destructive text-white">
              <Heart className="h-4 w-4" />
            </div>
            <div>
              <p className="font-[family-name:var(--font-lexend)] font-bold text-foreground">
                Medical &amp; Emergency
              </p>
              <p className="text-xs text-muted-foreground">
                Fitness status, blood type, emergency contact
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        </Link>
      </section>

      {/* Account */}
      <section className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
        <div className="border-b border-border p-4">
          <h2 className="font-[family-name:var(--font-lexend)] font-bold text-foreground">
            Account
          </h2>
        </div>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="text-sm font-medium text-foreground">
              {session.user.email}
            </span>
          </div>
        </div>
      </section>

      {/* Legal */}
      <section className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
        <div className="border-b border-border p-4">
          <h2 className="font-[family-name:var(--font-lexend)] font-bold text-foreground">
            Legal
          </h2>
        </div>
        <div className="divide-y divide-border">
          {[
            { label: "Privacy Policy", href: "/privacy" },
            { label: "Terms & Conditions", href: "/terms" },
          ].map(({ label, href }) => (
            <Link
              key={href}
              href={href as Route}
              className="flex items-center justify-between px-4 py-3 text-sm text-foreground transition-colors hover:bg-muted/50"
            >
              {label}
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          ))}
        </div>
      </section>

      {/* Mode toggle — only shown if the user already has a club */}
      {isManager && (
        <section className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
          <div className="border-b border-border p-4">
            <h2 className="font-[family-name:var(--font-lexend)] font-bold text-foreground">Switch Mode</h2>
            <p className="mt-0.5 text-xs text-muted-foreground">You have a club — manage it from the manager portal</p>
          </div>
          <div className="p-4">
            <Link
              href={"/tm" as Route}
              className="flex items-center gap-3 rounded-sm border-2 border-border bg-background px-4 py-3 text-sm font-semibold text-foreground shadow-brutalist-sm transition-shadow hover:shadow-brutalist"
            >
              <Shield className="h-4 w-4 text-muted-foreground" />
              Switch to Manager Mode
            </Link>
          </div>
        </section>
      )}

      {/* Sign Out */}
      <section className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
        <SignOutButton />
      </section>
    </div>
  );
}

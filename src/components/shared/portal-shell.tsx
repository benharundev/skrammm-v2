"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import { AppSidebar, type Portal } from "@/components/shared/app-sidebar";
import {
  Activity,
  LayoutDashboard,
  Calendar,
  Users,
  Trophy,
  Settings,
  QrCode,
  ClipboardList,
  LogOut,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/auth/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface PortalShellUser {
  name?: string | null;
  email: string;
  image?: string | null | undefined;
}

interface PortalShellProps {
  portal: Portal;
  user: PortalShellUser;
  children: React.ReactNode;
}

const MOBILE_NAV: Record<Portal, { label: string; href: string; icon: LucideIcon }[]> = {
  organizer: [
    { label: "Dash",      href: "/organizer",          icon: LayoutDashboard },
    { label: "Fixtures",  href: "/organizer/schedule", icon: Calendar },
    { label: "Teams",     href: "/organizer/teams",    icon: Users },
    { label: "Standings", href: "/organizer/standings", icon: Trophy },
    { label: "Settings",  href: "/organizer/settings",  icon: Settings },
  ],
  tm: [
    { label: "Home",    href: "/tm",             icon: LayoutDashboard },
    { label: "Squad",   href: "/tm/squad",       icon: Users },
    { label: "Attend",  href: "/tm/attendance",  icon: QrCode },
    { label: "Lineups", href: "/tm/lineups",     icon: ClipboardList },
    { label: "Tourney", href: "/tm/tournaments", icon: Trophy },
  ],
  player: [
    { label: "Home",    href: "/player",         icon: LayoutDashboard },
    { label: "Matches", href: "/player/matches", icon: Activity },
    { label: "Teams",   href: "/player/teams",   icon: Users },
  ],
};


export function PortalShell({ portal, user, children }: PortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const navItems = MOBILE_NAV[portal];

  const displayName = user.name?.trim() || user.email.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  async function handleSignOut() {
    await signOut();
    router.push(portal === "organizer" ? "/login/organizer" : "/login");
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden lg:flex">
        <AppSidebar portal={portal} user={user} />
      </div>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Mobile Header (Avatar + Mode Toggle + Sign Out) */}
        <header className="lg:hidden flex items-center justify-between h-14 px-4 border-b-2 border-border bg-background flex-shrink-0">
          {/* Left: Avatar — links to profile/settings */}
          {portal === "player" ? (
            <Link
              href="/player/profile"
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border shadow-brutalist-sm focus-visible:outline-none overflow-hidden"
            >
              <Avatar className="h-full w-full">
                <AvatarImage src={user.image ?? undefined} alt={displayName} />
                <AvatarFallback className="bg-primary text-white text-[10px] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : portal === "tm" ? (
            <Link
              href="/tm/settings"
              className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border shadow-brutalist-sm focus-visible:outline-none overflow-hidden"
            >
              <Avatar className="h-full w-full">
                <AvatarImage src={user.image ?? undefined} alt={displayName} />
                <AvatarFallback className="bg-primary text-white text-[10px] font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Avatar className="h-8 w-8 border border-border">
              <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground text-[10px] font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
          )}

          <Link href={`/${portal}` as Route}>
            <Image
              src="/logos/logo-wordmark-green.png"
              alt="Skrammm"
              width={86}
              height={24}
            />
          </Link>

          {/* Right: Sign out (organizer only — player signs out via player portal) */}
          {portal === "organizer" ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-red-card h-9 w-9"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          ) : (
            <div className="h-9 w-9" aria-hidden="true" />
          )}
        </header>

        <main className="flex-1 overflow-auto pb-16 lg:pb-0">
          {children}
        </main>

        {/* Mobile Bottom Nav */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-sidebar border-t border-sidebar-border flex items-center justify-around px-1 z-50">
          {navItems.map((item) => {
            const active = item.href === `/${portal}` 
              ? pathname === item.href 
              : pathname.startsWith(item.href);
            const Icon = item.icon;
            
            return (
              <Link
                key={item.href}
                href={item.href as Parameters<typeof Link>[0]["href"]}
                className="flex-1 flex items-center justify-center h-full px-1"
              >
                <div className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full py-1.5 rounded-sm transition-colors",
                  active 
                    ? "bg-sidebar-primary text-sidebar-primary-foreground font-bold" 
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}>
                  <Icon className="h-5 w-5" />
                  <span className="text-[10px] uppercase tracking-tighter">
                    {item.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

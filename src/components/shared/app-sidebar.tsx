"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { Route } from "next";
import {
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  QrCode,
  Settings,
  Trophy,
  User as UserIcon,
  Users,
  type LucideIcon,
} from "lucide-react";
import { signOut } from "@/lib/auth/client";
import { orgSignOut } from "@/lib/auth/org-client";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RoleSwitcher } from "@/components/shared/role-switcher";

export type Portal = "organizer" | "tm" | "player";

interface NavLink {
  label: string;
  href: string;
  icon: LucideIcon;
}

const PORTAL_LABEL: Record<Portal, string> = {
  organizer: "Organizer",
  tm: "Team Manager",
  player: "Player",
};

const PORTAL_NAV: Record<Portal, NavLink[]> = {
  organizer: [
    { label: "Dashboard",  href: "/organizer",          icon: LayoutDashboard },
    { label: "Fixtures",   href: "/organizer/schedule", icon: Calendar },
    { label: "Teams",      href: "/organizer/teams",    icon: Users },
    { label: "Standings",  href: "/organizer/standings",icon: Trophy },
    { label: "Settings",   href: "/organizer/settings", icon: Settings },
  ],
  tm: [
    { label: "Dashboard", href: "/tm", icon: LayoutDashboard },
    { label: "My Squad", href: "/tm/squad", icon: Users },
    { label: "Tournaments", href: "/tm/tournaments", icon: Trophy },
    { label: "Attendance", href: "/tm/attendance", icon: QrCode },
    { label: "Lineups", href: "/tm/lineups", icon: ClipboardList },
    { label: "Settings", href: "/tm/settings", icon: Settings },
  ],
  player: [
    { label: "Home",    href: "/player",         icon: LayoutDashboard },
    { label: "Matches", href: "/player/matches", icon: Activity },
    { label: "Teams",   href: "/player/teams",   icon: Users },
  ],
};

interface AppSidebarUser {
  name?: string | null;
  email: string;
  image?: string | null | undefined;
}

interface AppSidebarProps {
  portal: Portal;
  user: AppSidebarUser;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AppSidebar({ portal, user, onClose, collapsed = false, onToggleCollapse }: AppSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const links = PORTAL_NAV[portal];

  const displayName = user.name?.trim() || user.email.split("@")[0] || "User";
  const initials = displayName.slice(0, 2).toUpperCase();

  function isActive(href: string): boolean {
    if (href === `/${portal}`) return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const context: "organizer" | "player" = portal === "organizer" ? "organizer" : "player";

  async function handleSignOut() {
    if (context === "organizer") {
      await orgSignOut();
      router.push("/login/organizer");
    } else {
      await signOut();
      router.push("/login");
    }
  }

  return (
    <aside
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width]",
        collapsed ? "w-12" : "w-64",
      )}
    >
      {/* Brand + portal badge / role switcher */}
      <div className={cn("py-6", collapsed ? "px-2" : "px-5")}>
        <Link
          href={`/${portal}` as Route}
          className={cn("flex", collapsed ? "justify-center" : "")}
          aria-label="Skrammm home"
        >
          {collapsed ? (
            <Image
              src="/logos/logo-icon-yellow.png"
              alt="Skrammm"
              width={28}
              height={28}
              priority
            />
          ) : (
            <Image
              src="/logos/logo-h-yellow.png"
              alt="Skrammm"
              width={115}
              height={32}
              priority
            />
          )}
        </Link>
        {context === "organizer" ? (
          <span
            className={cn(
              "mt-2 rounded-sm bg-sidebar-accent px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-sidebar-accent-foreground",
              collapsed ? "hidden" : "inline-block",
            )}
          >
            {PORTAL_LABEL[portal]}
          </span>
        ) : (
          <div className={cn("mt-2", collapsed ? "hidden" : "")}>
            <RoleSwitcher current={portal} context={context} />
          </div>
        )}
      </div>

      <Separator className="my-3 bg-sidebar-border" />

      {/* Navigation */}
      <nav className={cn("flex-1 space-y-1 overflow-y-auto", collapsed ? "px-2" : "px-3")} aria-label="Primary">
        {links.map(({ label, href, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href as Parameters<typeof Link>[0]["href"]}
              aria-current={active ? "page" : undefined}
              onClick={() => onClose?.()}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center rounded-sm py-2 text-sm font-medium transition-colors",
                collapsed ? "justify-center px-2" : "gap-3 px-3",
                active
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span className={cn(collapsed && "hidden")}>{label}</span>
            </Link>
          );
        })}
        {portal === "player" && (
          <>
            <Separator className="my-2 bg-sidebar-border" />
            {(
              [
                { label: "My Profile", href: "/player/profile", icon: UserIcon },
                { label: "Settings", href: "/player/settings", icon: Settings },
              ] as const
            ).map(({ label, href, icon: Icon }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href as Parameters<typeof Link>[0]["href"]}
                  aria-current={active ? "page" : undefined}
                  onClick={() => onClose?.()}
                  title={collapsed ? label : undefined}
                  className={cn(
                    "flex items-center rounded-sm py-2 text-sm font-medium transition-colors",
                    collapsed ? "justify-center px-2" : "gap-3 px-3",
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span className={cn(collapsed && "hidden")}>{label}</span>
                </Link>
              );
            })}
          </>
        )}
      </nav>

      <Separator className="my-3 bg-sidebar-border" />

      {/* User + sign out */}
      <div className={cn("pb-3", collapsed ? "px-2" : "px-3")}>
        <div className={cn("flex items-center py-2", collapsed ? "justify-center px-0" : "gap-3 px-2")}>
          <Avatar className="h-9 w-9 shrink-0 border border-sidebar-border" title={collapsed ? displayName : undefined}>
            <AvatarImage src={user.image ?? undefined} alt={displayName} />
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className={cn("min-w-0 flex-1", collapsed && "hidden")}>
            <p className="truncate text-sm font-medium text-sidebar-foreground">
              {displayName}
            </p>
            <p className="truncate text-xs text-sidebar-foreground/60">
              {user.email}
            </p>
          </div>
        </div>
        {portal !== "tm" && (
          <Button
            type="button"
            variant="ghost"
            onClick={handleSignOut}
            title={collapsed ? "Sign out" : undefined}
            className={cn(
              "mt-1 w-full text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed ? "justify-center px-0" : "justify-start gap-3",
            )}
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            <span className={cn(collapsed && "hidden")}>Sign out</span>
          </Button>
        )}
      </div>

      {/* Collapse toggle */}
      {onToggleCollapse && (
        <div className={cn("border-t border-sidebar-border pb-4 pt-2", collapsed ? "px-2" : "px-3")}>
          <Button
            type="button"
            variant="ghost"
            onClick={onToggleCollapse}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn(
              "w-full text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              collapsed ? "justify-center px-0" : "justify-start gap-3",
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </div>
      )}
    </aside>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { ChevronsUpDown, User as UserIcon, Users } from "lucide-react";
import type { Portal } from "@/components/shared/app-sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RoleSwitcherProps {
  current: Portal;
  /** Restricts which portals are visible. Organizer context hides player/tm; player context hides organizer. */
  context: "organizer" | "player";
}

const PLAYER_OPTIONS: { portal: Portal; label: string; icon: typeof UserIcon }[] = [
  { portal: "player", label: "Player", icon: UserIcon },
  { portal: "tm", label: "Team Manager", icon: Users },
];

const PORTAL_LABEL: Record<Portal, string> = {
  organizer: "Organizer",
  tm: "Team Manager",
  player: "Player",
};

export function RoleSwitcher({ current, context }: RoleSwitcherProps) {
  const router = useRouter();

  // Organizer context has no sibling portals to switch to — hide the switcher.
  if (context === "organizer") return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-between gap-2 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <span className="truncate text-sm font-medium">
            {PORTAL_LABEL[current]}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-70" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch portal</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {PLAYER_OPTIONS.map(({ portal, label, icon: Icon }) => (
          <DropdownMenuItem
            key={portal}
            disabled={portal === current}
            onSelect={() =>
              router.push(`/${portal}` as Parameters<typeof router.push>[0])
            }
            className="gap-2"
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

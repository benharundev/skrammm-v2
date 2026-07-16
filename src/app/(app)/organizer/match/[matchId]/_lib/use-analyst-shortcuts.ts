"use client";

import { useEffect } from "react";
import { ANALYST_SHORTCUTS } from "./analyst-shortcuts";

interface UseAnalystShortcutsOptions {
  enabled: boolean;
  activeTeam: "home" | "away";
  onTeamChange: (team: "home" | "away") => void;
  onActionSelect: (eventType: string) => void;
  onCancel: () => void;
}

export function useAnalystShortcuts({
  enabled,
  activeTeam: _activeTeam,
  onTeamChange,
  onActionSelect,
  onCancel,
}: UseAnalystShortcutsOptions) {
  useEffect(() => {
    if (!enabled) return;

    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.key === "Escape") {
        onCancel();
        return;
      }
      if (e.key === "[") {
        onTeamChange("home");
        return;
      }
      if (e.key === "]") {
        onTeamChange("away");
        return;
      }

      const eventType = ANALYST_SHORTCUTS[e.key.toLowerCase()];
      if (eventType) {
        e.preventDefault();
        onActionSelect(eventType);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [enabled, _activeTeam, onTeamChange, onActionSelect, onCancel]);
}

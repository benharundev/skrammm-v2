"use client";

import { useState } from "react";
import type { TrainingSlotInput } from "@modules/team";
import { upsertTrainingSlotsAction } from "./actions";

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface TrainingSlotsEditorProps {
  initialSlots: TrainingSlotInput[];
}

export function TrainingSlotsEditor({ initialSlots }: TrainingSlotsEditorProps) {
  const [slots, setSlots] = useState<TrainingSlotInput[]>(initialSlots);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function addSlot() {
    setSlots((prev) => [...prev, { dayOfWeek: 0, startTime: "19:00", endTime: "21:00", venue: undefined }]);
  }

  function removeSlot(index: number) {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }

  function updateSlot(index: number, field: keyof TrainingSlotInput, value: string | number | undefined) {
    setSlots((prev) =>
      prev.map((slot, i) =>
        i === index ? { ...slot, [field]: value } : slot
      )
    );
  }

  async function handleSave() {
    setIsSaving(true);
    setSaved(false);
    await upsertTrainingSlotsAction(slots);
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <section className="overflow-hidden rounded-sm border-2 border-border bg-card shadow-brutalist">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h2 className="font-[family-name:var(--font-lexend)] font-bold text-foreground">Training Schedule</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">When and where you train</p>
        </div>
        <button
          type="button"
          onClick={addSlot}
          className="rounded-sm border-2 border-border bg-background px-3 py-1 text-sm font-bold shadow-brutalist-sm transition-shadow hover:shadow-none"
        >
          + Add slot
        </button>
      </div>
      <div className="divide-y divide-border">
        {slots.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">No training slots yet. Add one above.</p>
        ) : (
          slots.map((slot, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 p-3">
              <select
                value={slot.dayOfWeek}
                onChange={(e) => updateSlot(i, "dayOfWeek", Number(e.target.value))}
                className="rounded-sm border-2 border-border bg-background px-2 py-1 text-sm shadow-brutalist-sm"
              >
                {DAY_NAMES.map((name, d) => (
                  <option key={d} value={d}>{name}</option>
                ))}
              </select>
              <input
                type="time"
                value={slot.startTime}
                onChange={(e) => updateSlot(i, "startTime", e.target.value)}
                className="rounded-sm border-2 border-border bg-background px-2 py-1 text-sm shadow-brutalist-sm"
              />
              <span className="text-sm text-muted-foreground">–</span>
              <input
                type="time"
                value={slot.endTime}
                onChange={(e) => updateSlot(i, "endTime", e.target.value)}
                className="rounded-sm border-2 border-border bg-background px-2 py-1 text-sm shadow-brutalist-sm"
              />
              <input
                type="text"
                value={slot.venue ?? ""}
                onChange={(e) => updateSlot(i, "venue", e.target.value || undefined)}
                placeholder="Venue (optional)"
                className="min-w-24 flex-1 rounded-sm border-2 border-border bg-background px-2 py-1 text-sm shadow-brutalist-sm"
              />
              <button
                type="button"
                onClick={() => removeSlot(i)}
                className="px-2 text-sm font-bold text-destructive"
              >
                ✕
              </button>
            </div>
          ))
        )}
      </div>
      <div className="border-t border-border p-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="w-full rounded-sm border-2 border-primary bg-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-brutalist-sm disabled:opacity-50"
        >
          {isSaving ? "Saving…" : saved ? "Saved ✓" : "Save Schedule"}
        </button>
      </div>
    </section>
  );
}

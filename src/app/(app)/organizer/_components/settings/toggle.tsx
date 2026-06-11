export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-4 cursor-pointer py-2">
      <span className="text-foreground text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-12 h-6 rounded-full border-2 transition-all flex-shrink-0 ${checked ? "bg-pitch-green border-pitch-green" : "bg-muted border-border"}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? "translate-x-6" : "translate-x-0"}`} />
      </button>
    </label>
  );
}

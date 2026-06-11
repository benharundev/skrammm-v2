export function TextInput({ value, onChange, placeholder, readOnly }: { value: string; onChange?: (v: string) => void; placeholder?: string; readOnly?: boolean }) {
  return (
    <input
      type="text"
      value={value}
      readOnly={readOnly}
      onChange={e => onChange?.(e.target.value)}
      placeholder={placeholder}
      className={`h-11 px-4 border-2 rounded-sm text-foreground text-sm placeholder:text-muted-foreground outline-none transition-colors ${readOnly ? "bg-muted border-border cursor-not-allowed" : "bg-background border-navy focus:border-fair-play-gold"}`}
    />
  );
}

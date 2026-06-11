export function PageHeader({ title, sub, action }: { title: string; sub?: string; action?: React.ReactNode }) {
  return (
    <div className="sticky top-0 z-10 bg-background border-b-2 border-border px-4 sm:px-6 h-14 flex items-center justify-between flex-shrink-0">
      <div className="min-w-0">
        <h1 className="text-foreground leading-none font-lexend text-base sm:text-lg font-bold truncate">{title}</h1>
        {sub && <p className="text-muted-foreground mt-0.5 text-[10px] sm:text-xs truncate">{sub}</p>}
      </div>
      <div className="flex-shrink-0 ml-4">
        {action}
      </div>
    </div>
  );
}

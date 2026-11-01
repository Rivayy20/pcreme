import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "pink" | "warn";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4",
        tone === "pink" && "border-brand-pink/40 bg-brand-pink-soft",
        tone === "warn" && "border-amber-200 bg-amber-50",
        className,
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 font-heading text-2xl font-bold tabular-nums">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

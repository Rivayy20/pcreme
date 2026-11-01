import { cn } from "@/lib/utils";
import { STATUS_BADGE, STATUS_LABEL } from "@/lib/status";
import type { OrderStatus } from "@/lib/types";

export function StatusBadge({ status, className }: { status: OrderStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        STATUS_BADGE[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

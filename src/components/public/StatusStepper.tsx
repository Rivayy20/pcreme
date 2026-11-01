import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, STATUS_URUTAN, indeksStatus } from "@/lib/status";
import type { OrderStatus } from "@/lib/types";

const LABEL_PENDEK: Record<OrderStatus, string> = {
  ...STATUS_LABEL,
  menunggu_bayar: "Bayar",
  menunggu_verifikasi: "Verifikasi",
  siap: "Siap",
};

export function StatusStepper({ status }: { status: OrderStatus }) {
  if (status === "dibatalkan") {
    return (
      <p role="status" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-900">
        Pesanan ini dibatalkan. Kalau ada pertanyaan, hubungi admin ya.
      </p>
    );
  }

  const aktif = indeksStatus(status);

  return (
    <ol className="grid grid-cols-6 gap-1" aria-label="Progres pesanan">
      {STATUS_URUTAN.map((s, i) => {
        const selesai = i < aktif;
        const sekarang = i === aktif;
        return (
          <li
            key={s}
            aria-current={sekarang ? "step" : undefined}
            className="flex flex-col items-center gap-1.5 text-center"
          >
            <span
              className={cn(
                "flex size-7 items-center justify-center rounded-full border-2 text-xs font-bold",
                selesai && "border-primary bg-primary text-primary-foreground",
                sekarang && "border-brand-pink bg-brand-pink text-white ring-4 ring-brand-pink/25",
                !selesai && !sekarang && "border-border bg-card text-muted-foreground",
              )}
            >
              {selesai ? <Check className="size-4" aria-hidden /> : i + 1}
            </span>
            <span
              className={cn(
                "text-[11px] leading-tight",
                sekarang ? "font-semibold text-foreground" : "text-muted-foreground",
              )}
            >
              {LABEL_PENDEK[s]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

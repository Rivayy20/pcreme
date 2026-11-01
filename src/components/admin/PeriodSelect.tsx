"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { PeriodeRingkas } from "@/lib/admin";

/** Pemilih periode berbasis query string `?periode=<id>` (native select agar ringan & aksesibel). */
export function PeriodSelect({ periods, value }: { periods: PeriodeRingkas[]; value?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function ganti(id: string) {
    const next = new URLSearchParams(params.toString());
    next.set("periode", id);
    next.delete("order");
    router.replace(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="no-print flex min-w-0 max-w-full items-center gap-2">
      <label htmlFor="periode" className="text-sm font-medium">
        Periode
      </label>
      <select
        id="periode"
        value={value ?? ""}
        onChange={(e) => ganti(e.target.value)}
        className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-card px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:flex-none md:text-sm"
      >
        {periods.map((p) => (
          <option key={p.id} value={p.id}>
            Minggu {p.minggu} · {p.nama}
            {p.is_active ? " (aktif)" : ""}
          </option>
        ))}
      </select>
    </div>
  );
}

"use client";

import { Check, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PoStatus } from "@/lib/types";
import { linkBagikanWa } from "@/lib/wa";

const noop = () => () => {};

const LABEL: Record<PoStatus | "kosong", { teks: string; kelas: string }> = {
  buka: { teks: "PO buka", kelas: "border-emerald-200 bg-emerald-100 text-emerald-900" },
  belum_buka: { teks: "Belum dibuka", kelas: "border-amber-200 bg-amber-100 text-amber-900" },
  habis: { teks: "Kuota habis", kelas: "border-red-200 bg-red-100 text-red-900" },
  tutup: { teks: "PO tutup", kelas: "border-stone-300 bg-stone-200 text-stone-800" },
  kosong: { teks: "Tidak ada PO aktif", kelas: "border-stone-300 bg-stone-200 text-stone-800" },
};

/** Kartu pintasan ke form pemesanan pelanggan: salin, buka, dan bagikan via WhatsApp. */
export function ShareFormCard({ status, namaPo }: { status: PoStatus | null; namaPo?: string }) {
  // Origin hanya ada di browser: useSyncExternalStore menjaga hidrasi tetap cocok.
  const origin = useSyncExternalStore(noop, () => window.location.origin, () => "");
  const [tersalin, setTersalin] = useState(false);
  const url = origin ? `${origin}/` : "";
  const label = LABEL[status ?? "kosong"];

  async function salin() {
    try {
      await navigator.clipboard.writeText(url);
      setTersalin(true);
      toast.success("Link form disalin");
      setTimeout(() => setTersalin(false), 2000);
    } catch {
      toast.error("Gagal menyalin. Salin manual dari kolom link ya.");
    }
  }

  const pesan = `Halo! Pre-Order P'crème${namaPo ? ` (${namaPo})` : ""} sudah bisa dipesan 🍮\nIsi formulir pemesanan di sini: ${url}`;

  return (
    <section aria-labelledby="share-form" className="rounded-2xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="share-form" className="font-heading text-base font-semibold">
          Link form pemesanan
        </h2>
        <span className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold", label.kelas)}>
          {label.teks}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor="link-form" className="sr-only">
          Link form pemesanan pelanggan
        </label>
        <input
          id="link-form"
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-muted/50 px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 md:text-sm"
        />
        <div className="grid grid-cols-3 gap-2 sm:flex">
          <Button type="button" variant="outline" className="h-11" onClick={salin} disabled={!url}>
            {tersalin ? <Check aria-hidden /> : <Copy aria-hidden />} Salin
          </Button>
          <a
            href={url || "/"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border bg-background px-2.5 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <ExternalLink className="size-4" aria-hidden /> Buka
          </a>
          <a
            href={linkBagikanWa(pesan)}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={!url}
            className={cn(
              "inline-flex h-11 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 text-sm font-semibold text-white outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
              !url && "pointer-events-none opacity-50",
            )}
          >
            <MessageCircle className="size-4" aria-hidden /> Bagikan
          </a>
        </div>
      </div>
      {status !== "buka" && (
        <p className="mt-2 text-xs text-muted-foreground">
          Form baru bisa diisi pelanggan saat status PO &quot;buka&quot;. Atur jadwal di menu Periode.
        </p>
      )}
    </section>
  );
}

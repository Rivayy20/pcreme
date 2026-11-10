import { CheckCircle2, Clock, Ticket, Truck, XCircle } from "lucide-react";
import Link from "next/link";
import { Countdown } from "@/components/public/Countdown";
import { jamWib, tanggalJam, tanggalPanjang, tanggalPendek } from "@/lib/format";
import { statusMetodePengambilan } from "@/lib/order-meta";
import { rutePesanBatch } from "@/lib/routes";
import type { PoInfoAda } from "@/lib/types";
import { cn } from "@/lib/utils";

type StatusTampil = "buka" | "belum_buka" | "habis" | "tutup";

const STATUS_BATCH: Record<
  StatusTampil,
  { label: string; kelas: string; icon: typeof CheckCircle2; tombol: string }
> = {
  buka: {
    label: "Open Order",
    kelas: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: CheckCircle2,
    tombol: "Pesan Batch Ini →",
  },
  belum_buka: {
    label: "Segera Dibuka",
    kelas: "border-amber-200 bg-amber-50 text-amber-900",
    icon: Clock,
    tombol: "Belum Dibuka",
  },
  habis: {
    label: "Kuota Habis",
    kelas: "border-red-200 bg-red-50 text-red-900",
    icon: XCircle,
    tombol: "Kuota Habis",
  },
  tutup: {
    label: "Closed",
    kelas: "border-stone-300 bg-stone-100 text-stone-700",
    icon: XCircle,
    tombol: "Batch Sudah Ditutup",
  },
};

/** "15:00" -> "15.00" agar konsisten dengan format jam WIB di seluruh situs. */
const titikJam = (jam: string) => jam.replace(":", ".");

/**
 * Kartu ringkas informasi batch PO untuk pelanggan.
 * Seluruh nilai berasal dari data batch di database (get_po_info); tidak ada data statis.
 * Informasi teknis lain (harga, maks cup/topping, lokasi ambil, pembayaran)
 * ditampilkan pada tahap checkout yang relevan.
 */
export function PoBatchCard({ po, ctaHref }: { po: PoInfoAda; ctaHref?: string }) {
  const hrefPesan = ctaHref ?? rutePesanBatch(po.id);
  // Kuota habis diprioritaskan walau status belum sempat bergeser di database.
  const status: StatusTampil = po.status === "buka" && po.sisa_kuota <= 0 ? "habis" : po.status;
  const st = STATUS_BATCH[status];
  const StatusIcon = st.icon;
  const bisaPesan = status === "buka";

  const sisa = Math.max(0, po.sisa_kuota);
  const terpesan = Math.max(0, po.kuota - sisa);
  const persen = po.kuota > 0 ? Math.min(100, Math.round((terpesan / po.kuota) * 100)) : 100;

  const { cfg } = statusMetodePengambilan(po);
  const infoJamKirim = cfg.antarAktif
    ? `${titikJam(cfg.jamMulaiAntar)}–${titikJam(cfg.jamSelesaiAntar)} WIB`
    : "Ambil di titik kumpul";

  return (
    <section
      aria-labelledby="po-nama"
      className="mx-auto w-full max-w-2xl min-w-0 overflow-hidden rounded-3xl border bg-card p-5 shadow-xs sm:p-7"
    >
      {/* Header: nomor batch + status */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center rounded-full bg-primary px-3 py-1 font-heading text-xs font-bold text-primary-foreground">
          Minggu {po.minggu}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
            st.kelas,
          )}
        >
          <StatusIcon className="size-3.5 shrink-0" aria-hidden />
          {st.label}
        </span>
      </div>

      {/* Judul batch */}
      <h2
        id="po-nama"
        className="mt-3 wrap-break-word font-heading text-2xl font-bold leading-tight text-foreground sm:text-3xl"
      >
        {po.nama}
      </h2>

      {/* Tiga informasi utama */}
      <dl className="mt-5 divide-y divide-border/70 rounded-2xl border bg-secondary/50 px-4">
        <div className="flex items-start gap-3.5 py-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-primary ring-1 ring-border">
            <Clock className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <dt className="text-xs font-medium text-muted-foreground">Close Order</dt>
            <dd className="mt-0.5 wrap-break-word text-sm font-semibold text-foreground sm:text-base">
              {tanggalPendek(po.tutup_at)}
              <span className="block text-xs font-normal text-muted-foreground sm:text-sm">
                Pukul {jamWib(po.tutup_at)} WIB
                {status === "buka" && (
                  <>
                    {" · sisa "}
                    <span className="text-primary">
                      <Countdown tutupAt={po.tutup_at} serverTime={po.server_time} />
                    </span>
                  </>
                )}
              </span>
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3.5 py-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-primary ring-1 ring-border">
            <Truck className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <dt className="text-xs font-medium text-muted-foreground">Mulai Pengiriman</dt>
            <dd className="mt-0.5 wrap-break-word text-sm font-semibold text-foreground sm:text-base">
              {tanggalPanjang(po.tanggal_ambil)}
              <span className="block text-xs font-normal text-muted-foreground sm:text-sm">
                {infoJamKirim}
              </span>
            </dd>
          </div>
        </div>

        <div className="flex items-start gap-3.5 py-3.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-card text-primary ring-1 ring-border">
            <Ticket className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <dt className="text-xs font-medium text-muted-foreground">Kuota Tersisa</dt>
            <dd className="mt-0.5 text-sm font-semibold tabular-nums text-foreground sm:text-base">
              {sisa} dari {po.kuota} cup
            </dd>
          </div>
        </div>
      </dl>

      {/* Progress kuota (terpesan vs tersisa) */}
      <div className="mt-5 space-y-2">
        <div
          role="progressbar"
          aria-label="Kuota terpesan"
          aria-valuemin={0}
          aria-valuemax={po.kuota}
          aria-valuenow={terpesan}
          className="h-2.5 w-full overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${persen}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 text-xs font-medium tabular-nums">
          <span className="text-foreground">Terpesan: {terpesan} cup</span>
          <span className="text-muted-foreground">Tersisa: {sisa} cup</span>
        </div>
      </div>

      {/* Call to action */}
      <div className="mt-6">
        {bisaPesan ? (
          <Link
            href={hrefPesan}
            className="inline-flex h-12 w-full items-center justify-center rounded-full bg-primary px-6 font-heading text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-95 focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none"
          >
            {st.tombol}
          </Link>
        ) : (
          <>
            <button
              type="button"
              disabled
              className="inline-flex h-12 w-full cursor-not-allowed items-center justify-center rounded-full border bg-muted px-6 font-heading text-sm font-semibold text-muted-foreground"
            >
              {st.tombol}
            </button>
            {status === "belum_buka" && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Dibuka pada {tanggalJam(po.buka_at)}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}

import { AlertCircle, Check, Clock, CreditCard, PackageCheck, Sparkles, Truck, XCircle } from "lucide-react";
import { bersihAlasanTolak, indeksStatus, isPaymentRejected } from "@/lib/status";
import type { Fulfillment, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

interface StepItem {
  key: string;
  judul: string;
  deskripsi: string;
  icon: typeof Check;
}

export function StatusStepper({
  status,
  fulfillment = "ambil",
  catatanAdmin,
  buktiBayarPath,
}: {
  status: OrderStatus;
  fulfillment?: Fulfillment;
  catatanAdmin?: string | null;
  buktiBayarPath?: string | null;
}) {
  const ditolak = isPaymentRejected(status, { catatanAdmin, buktiBayarPath });
  const alasan = bersihAlasanTolak(catatanAdmin);

  if (status === "dibatalkan") {
    return (
      <div
        role="status"
        className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-sm text-red-950"
      >
        <XCircle className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden />
        <div className="space-y-1">
          <p className="font-heading font-semibold text-red-900">Pesanan Dibatalkan</p>
          <p className="text-red-800/90">
            Pesanan ini telah dibatalkan{alasan ? `: "${alasan}"` : "."} Jika ada kendala atau pertanyaan, silakan
            hubungi admin melalui WhatsApp.
          </p>
        </div>
      </div>
    );
  }

  const steps: StepItem[] = [
    {
      key: "dibuat",
      judul: "Pesanan Dibuat",
      deskripsi: "Pesanan tercatat di sistem P'crème",
      icon: Sparkles,
    },
    {
      key: "pembayaran",
      judul: status === "menunggu_verifikasi" ? "Menunggu Verifikasi" : "Menunggu Pembayaran",
      deskripsi:
        status === "menunggu_verifikasi"
          ? "Bukti bayar sedang diperiksa oleh admin"
          : "Silakan lakukan pembayaran & unggah bukti",
      icon: Clock,
    },
    {
      key: "diverifikasi",
      judul: "Pembayaran Diverifikasi",
      deskripsi: "Pembayaran lunas & pesanan dikonfirmasi",
      icon: CreditCard,
    },
    {
      key: "diproses",
      judul: "Pesanan Diproses",
      deskripsi: "Pudding sedang disiapkan secara fresh",
      icon: Sparkles,
    },
    {
      key: "siap",
      judul: fulfillment === "antar" ? "Dalam Pengantaran" : "Siap Diambil",
      deskripsi:
        fulfillment === "antar"
          ? "Pesanan sedang diantar ke lokasi tujuan"
          : "Pesanan siap diambil di titik kumpul",
      icon: Truck,
    },
    {
      key: "selesai",
      judul: "Pesanan Selesai",
      deskripsi: "Terima kasih telah memesan P'crème!",
      icon: PackageCheck,
    },
  ];

  // Pemetaan indeks aktif pada 6 tahapan timeline:
  // status menunggu_bayar / menunggu_verifikasi => step 0 selesai, step 1 aktif
  // status dibayar => step 0,1 selesai, step 2 aktif
  // status diproses => step 0,1,2 selesai, step 3 aktif
  // status siap => step 0,1,2,3 selesai, step 4 aktif
  // status selesai => semua selesai (aktif = 5)
  const rawIdx = indeksStatus(status);
  let activeStep = 1;
  if (status === "menunggu_bayar" || status === "menunggu_verifikasi") activeStep = 1;
  else if (status === "dibayar") activeStep = 2;
  else if (status === "diproses") activeStep = 3;
  else if (status === "siap") activeStep = 4;
  else if (status === "selesai") activeStep = 5;
  else if (rawIdx >= 0) activeStep = rawIdx;

  return (
    <div className="space-y-4">
      {ditolak && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-950"
        >
          <AlertCircle className="mt-0.5 size-5 shrink-0 text-red-600" aria-hidden />
          <div className="space-y-1">
            <p className="font-heading font-semibold text-red-900">Bukti Pembayaran Ditolak</p>
            <p className="text-red-800">
              {alasan
                ? `Alasan: ${alasan}`
                : "Bukti pembayaran belum sesuai. Silakan unggah ulang bukti pembayaran yang valid."}
            </p>
          </div>
        </div>
      )}

      {/* Tampilan Horizontal pada layar besar (md+) dan Vertikal pada layar mobile */}
      <ol className="grid gap-3 md:grid-cols-6 md:gap-2" aria-label="Timeline status pesanan">
        {steps.map((s, i) => {
          const selesai = status === "selesai" ? true : i < activeStep;
          const sekarang = status !== "selesai" && i === activeStep;
          const Icon = s.icon;

          return (
            <li
              key={s.key}
              aria-current={sekarang ? "step" : undefined}
              className={cn(
                "flex items-start gap-3 rounded-2xl border p-3 transition-colors md:flex-col md:items-center md:text-center",
                selesai && "border-primary/25 bg-secondary/70",
                sekarang && "border-brand-pink bg-accent/60 ring-2 ring-brand-pink/25",
                !selesai && !sekarang && "border-border/70 bg-card/60 opacity-75",
              )}
            >
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                  selesai && "border-primary bg-primary text-primary-foreground",
                  sekarang && "border-brand-pink bg-brand-pink text-white shadow-sm",
                  !selesai && !sekarang && "border-border bg-card text-muted-foreground",
                )}
              >
                {selesai ? <Check className="size-4" aria-hidden /> : <Icon className="size-4" aria-hidden />}
              </span>
              <div className="min-w-0 flex-1 space-y-0.5">
                <p
                  className={cn(
                    "text-xs font-semibold leading-snug",
                    sekarang ? "text-foreground" : selesai ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  {i + 1}. {s.judul}
                </p>
                <p className="text-[11px] leading-relaxed text-muted-foreground">{s.deskripsi}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

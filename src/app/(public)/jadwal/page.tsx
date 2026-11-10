import { Search } from "lucide-react";
import Link from "next/link";
import { BackLink } from "@/components/public/BackLink";
import { PoBatchCard } from "@/components/public/PoBatchCard";
import { getPoInfo } from "@/lib/po";

export const metadata = {
  title: "Jadwal Pre-Order",
  description: "Jadwal batch Pre-Order P'crème: deadline pemesanan, jadwal pengiriman, dan sisa kuota.",
};

export const dynamic = "force-dynamic";

export default async function JadwalPoPage() {
  const { data: po, error } = await getPoInfo();
  // Daftar batch yang tersedia untuk pelanggan (get_po_info mengembalikan batch aktif).
  const daftarBatch = po?.ada_po ? [po] : [];

  return (
    <main className="space-y-6 sm:space-y-8">
      {/* Header Halaman */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3">
          <BackLink href="/" label="Kembali ke beranda" />
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Jadwal &amp; Kuota Batch
            </span>
            <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
              Jadwal Pre-Order P&apos;crème
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Deadline pemesanan, jadwal pengiriman, dan sisa kuota batch aktif.
            </p>
          </div>
        </div>

        <Link
          href="/pesanan/cek"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-full border bg-card px-5 text-sm font-semibold text-foreground shadow-2xs hover:bg-secondary"
        >
          <Search className="size-4 text-primary" aria-hidden /> Cek Status Pesanan
        </Link>
      </div>

      {error && (
        <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat jadwal PO: {error}
        </p>
      )}

      {daftarBatch.length === 0 ? (
        <section className="mx-auto w-full max-w-2xl rounded-3xl border border-dashed bg-card p-8 text-center">
          <h2 className="font-heading text-lg font-bold text-foreground">Belum Ada Jadwal Batch PO Aktif</h2>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            Saat ini belum ada batch Pre-Order yang dijadwalkan. Silakan cek kembali halaman ini atau kunjungi Instagram kami untuk pengumuman batch berikutnya.
          </p>
        </section>
      ) : (
        <div className="space-y-5">
          {daftarBatch.map((batch) => (
            <PoBatchCard key={batch.id} po={batch} />
          ))}
        </div>
      )}
    </main>
  );
}

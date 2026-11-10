import { CalendarClock, ShoppingBag } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BackLink } from "@/components/public/BackLink";
import { OrderForm } from "@/components/public/OrderForm";
import { tanggalJam } from "@/lib/format";
import { getPoInfo } from "@/lib/po";
import { RUTE, rutePesanBatch } from "@/lib/routes";
import { linkInstagram } from "@/lib/wa";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Pesan Pre-Order",
  robots: { index: false, follow: false },
};

function KartuStatus({
  judul,
  children,
  instagram,
  batchAktifId,
}: {
  judul: string;
  children: React.ReactNode;
  instagram?: string | null;
  /** Bila batch yang diminta tidak cocok, tawarkan checkout batch aktif yang masih bisa dipesan. */
  batchAktifId?: string;
}) {
  return (
    <section className="mx-auto w-full max-w-2xl rounded-3xl border bg-card p-6 text-center shadow-xs sm:p-8">
      <h2 className="font-heading text-xl font-bold text-foreground">{judul}</h2>
      <div className="mt-2 space-y-3 text-sm text-muted-foreground">{children}</div>
      <div className="mt-5 flex flex-col justify-center gap-3 sm:flex-row sm:flex-wrap">
        {batchAktifId && (
          <Link
            href={rutePesanBatch(batchAktifId)}
            className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
          >
            <ShoppingBag className="size-4" aria-hidden /> Pesan Batch Aktif
          </Link>
        )}
        <Link
          href={RUTE.jadwal}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border bg-secondary px-5 text-sm font-semibold text-foreground hover:bg-secondary/80"
        >
          <CalendarClock className="size-4 text-primary" aria-hidden /> Lihat Jadwal PO
        </Link>
        {instagram && (
          <a
            href={linkInstagram(instagram)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center rounded-full border bg-background px-5 text-sm font-medium text-foreground hover:bg-secondary/50"
          >
            Instagram P&apos;crème
          </a>
        )}
      </div>
    </section>
  );
}

/**
 * Checkout batch tertentu. batchId pada URL TIDAK dipercaya: selalu dicocokkan dengan
 * batch aktif dari database (get_po_info), dan /api/pesanan memvalidasi ulang di backend.
 */
export default async function PesanBatchPage({ params }: PageProps<"/pesan/[batchId]">) {
  const { batchId } = await params;
  const { data: po, error } = await getPoInfo();

  let isi: React.ReactNode;
  if (error !== null || !po) {
    isi = (
      <KartuStatus judul="Data Batch Belum Bisa Dimuat">
        <p>{error ?? "Terjadi kendala saat memuat batch Pre-Order."} Silakan muat ulang halaman beberapa saat lagi.</p>
      </KartuStatus>
    );
  } else if (!po.ada_po) {
    isi = (
      <KartuStatus judul="Belum Ada Batch Pre-Order Aktif 🍮">
        <p>Batch Pre-Order berikutnya sedang kami siapkan. Pantau halaman Jadwal PO agar tidak ketinggalan kuota!</p>
      </KartuStatus>
    );
  } else if (po.id !== batchId) {
    isi = (
      <KartuStatus
        judul="Batch Tidak Ditemukan atau Sudah Tidak Aktif"
        batchAktifId={po.status === "buka" && po.sisa_kuota > 0 ? po.id : undefined}
      >
        <p>Batch yang kamu buka tidak tersedia untuk pemesanan baru. Silakan lihat jadwal batch yang sedang berjalan.</p>
      </KartuStatus>
    );
  } else if (po.status === "belum_buka") {
    isi = (
      <KartuStatus judul={`Batch PO Dibuka pada ${tanggalJam(po.buka_at)}`} instagram={po.instagram}>
        <p>Checkout akan aktif begitu waktu pembukaan PO dimulai. Sampai jumpa!</p>
      </KartuStatus>
    );
  } else if (po.status === "habis" || po.sisa_kuota <= 0) {
    isi = (
      <KartuStatus judul="Kuota Batch PO Ini Sudah Habis 😢" instagram={po.instagram}>
        <p>
          Terima kasih banyak atas antusiasmenya! Seluruh {po.kuota} cup pada batch ini telah dipesan. Nantikan batch berikutnya ya!
        </p>
      </KartuStatus>
    );
  } else if (po.status === "tutup") {
    isi = (
      <KartuStatus judul="Batch Pre-Order Sudah Ditutup" instagram={po.instagram}>
        <p>Pemesanan untuk {po.nama} telah berakhir. Jika kamu sudah memesan, silakan cek status pesananmu.</p>
        <p>
          <Link href={RUTE.cekPesanan} className="font-semibold text-primary underline-offset-4 hover:underline">
            Cek Status Pesanan
          </Link>
        </p>
      </KartuStatus>
    );
  } else {
    isi = <OrderForm key={po.id} po={po} />;
  }

  const batchTerpilih = po?.ada_po && po.id === batchId ? po : null;

  return (
    <main className="space-y-5 sm:space-y-6">
      {/* Header halaman checkout: fokus, tanpa elemen marketing */}
      <div className="flex items-start gap-3">
        <BackLink href={RUTE.jadwal} label="Kembali ke Jadwal PO" />
        <div className="min-w-0">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Checkout Pre-Order</span>
          <h1 className="font-heading text-2xl font-bold leading-tight text-foreground sm:text-3xl">
            Pesan P&apos;crème
          </h1>
          {batchTerpilih && (
            <p className="mt-1 wrap-break-word text-xs text-muted-foreground sm:text-sm">
              <strong className="text-foreground">{batchTerpilih.nama}</strong> · Minggu {batchTerpilih.minggu} · Close
              order {tanggalJam(batchTerpilih.tutup_at)}
            </p>
          )}
        </div>
      </div>

      {isi}
    </main>
  );
}

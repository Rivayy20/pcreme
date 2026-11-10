import {
  ClipboardList,
  CreditCard,
  IceCreamBowl,
  MapPin,
  Search,
  ShoppingBag,
  Sparkles,
  UserCheck,
} from "lucide-react";
import Link from "next/link";
import {
  DAFTAR_FLAVOR_PREVIEW,
  FlavorCard,
  ToppingMiniCard,
} from "@/components/public/FlavorToppingVisuals";
import { PoBatchCard } from "@/components/public/PoBatchCard";
import { PoHeader } from "@/components/public/PoHeader";
import { rupiah } from "@/lib/format";
import { TOPPING_UTAMA } from "@/lib/order-meta";
import { getPoInfo } from "@/lib/po";
import { hrefPesanSekarang } from "@/lib/routes";
import { linkInstagram } from "@/lib/wa";

export const dynamic = "force-dynamic";

const CARA_PESAN = [
  {
    nomor: "01",
    judul: "Pilih Produk",
    deskripsi: "Tentukan jumlah cup pudding P'crème yang ingin kamu pesan pada batch aktif.",
    icon: IceCreamBowl,
  },
  {
    nomor: "02",
    judul: "Atur Rasa & Topping",
    deskripsi: "Konfigurasi rasa (Vanilla, Stroberi, Cokelat, atau Mix) & hingga 2 topping per cup.",
    icon: Sparkles,
  },
  {
    nomor: "03",
    judul: "Pilih Pengambilan",
    deskripsi: "Ambil langsung di titik kumpul PO atau pilih layanan pengantaran ke lokasimu.",
    icon: MapPin,
  },
  {
    nomor: "04",
    judul: "Isi Data Pemesan",
    deskripsi: "Lengkapi nama lengkap, nomor WhatsApp aktif, dan kategori pelanggan.",
    icon: UserCheck,
  },
  {
    nomor: "05",
    judul: "Lakukan Pembayaran",
    deskripsi: "Bayar mudah melalui QRIS resmi P'crème atau Transfer Bank Mandiri & unggah bukti.",
    icon: CreditCard,
  },
  {
    nomor: "06",
    judul: "Pantau Status Pesanan",
    deskripsi: "Gunakan kode pesanan unik untuk melacak verifikasi, produksi, hingga siap diambil.",
    icon: ClipboardList,
  },
];

function EmptyStateCard({
  judul,
  children,
  instagram,
}: {
  judul: string;
  children?: React.ReactNode;
  instagram?: string | null;
}) {
  return (
    <section className="mx-auto max-w-2xl rounded-3xl border bg-card p-6 text-center shadow-xs sm:p-8">
      <h2 className="font-heading text-xl font-bold text-foreground">{judul}</h2>
      {children && <div className="mt-2 space-y-3 text-sm text-muted-foreground">{children}</div>}
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Link
          href="/jadwal"
          className="inline-flex h-11 items-center rounded-full border bg-secondary px-5 text-sm font-semibold text-foreground hover:bg-secondary/80"
        >
          Lihat Jadwal PO
        </Link>
        {instagram && (
          <a
            href={linkInstagram(instagram)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center rounded-full border bg-background px-5 text-sm font-medium text-foreground hover:bg-secondary/50"
          >
            Instagram P&apos;crème
          </a>
        )}
        <Link
          href="/pesanan/cek"
          className="inline-flex h-11 items-center gap-1.5 rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground"
        >
          <Search className="size-4" aria-hidden /> Cek Status Pesanan
        </Link>
      </div>
    </section>
  );
}

export default async function BerandaPage() {
  const { data: po, error } = await getPoInfo();
  const poAda = po?.ada_po ? po : null;
  const hargaTampil = poAda ? poAda.harga : 15000;

  return (
    <main className="space-y-10">
      {/* 1. Hero Section */}
      <PoHeader po={po} />

      {error && (
        <p
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          Info PO belum bisa dimuat: {error}
        </p>
      )}

      {/* 2. Active PO Information */}
      {po && !po.ada_po && (
        <EmptyStateCard judul="Belum Ada Batch Pre-Order Aktif Saat Ini 🍮">
          <p>
            Batch Pre-Order berikutnya sedang kami siapkan. Pantau halaman Jadwal PO atau Instagram kami agar tidak ketinggalan kuota!
          </p>
        </EmptyStateCard>
      )}

      {poAda && <PoBatchCard po={poAda} />}

      {/* 3. Product Preview Section: Minimalist Flavor Cards & Topping Preview */}
      <section aria-labelledby="produk-preview-heading" className="space-y-6">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              Menu &amp; Identitas Rasa
            </span>
            <h2 id="produk-preview-heading" className="font-heading text-2xl font-bold text-foreground">
              Varian Rasa &amp; Topping P&apos;crème
            </h2>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Harga seragam <strong className="text-primary">{rupiah(hargaTampil)} / cup</strong> sudah termasuk pilihan hingga {poAda?.maks_topping ?? 2} topping.
          </p>
        </div>

        {/* 4 Minimalist Flavor Cards (Vanilla, Stroberi, Cokelat, Mix) */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {DAFTAR_FLAVOR_PREVIEW.map((meta) => (
            <FlavorCard
              key={meta.key}
              meta={meta}
              hargaPerCup={hargaTampil}
              maksTopping={poAda?.maks_topping ?? 2}
            />
          ))}
        </div>

        {/* Topping Preview: Minimalist Mini Cards */}
        <div className="space-y-3.5 rounded-3xl border bg-secondary/70 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-heading text-sm font-bold text-foreground sm:text-base">
                4 Pilihan Topping Favorit
              </h3>
              <p className="text-xs text-muted-foreground">
                Bebas pilih hingga <strong>{poAda?.maks_topping ?? 2} topping per cup</strong>. Setiap cup dapat memiliki kombinasi topping yang berbeda.
              </p>
            </div>
            <span className="rounded-full border border-[#DFC8AC] bg-card px-3 py-1 text-xs font-semibold text-primary">
              Maks. {poAda?.maks_topping ?? 2} Topping / Cup
            </span>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {TOPPING_UTAMA.map((t) => (
              <ToppingMiniCard key={t} nama={t} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. How to Order Section */}
      <section aria-labelledby="cara-pesan-heading" className="space-y-5">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Mudah &amp; Terstruktur
          </span>
          <h2 id="cara-pesan-heading" className="font-heading text-2xl font-bold text-foreground">
            Cara Pemesanan Pre-Order
          </h2>
        </div>

        <ol className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {CARA_PESAN.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.nomor}
                className="flex items-start gap-3.5 rounded-3xl border bg-card p-4 shadow-2xs"
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-secondary font-heading text-sm font-bold text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div className="space-y-1">
                  <p className="font-heading text-sm font-bold text-foreground">
                    <span className="text-primary">{item.nomor}.</span> {item.judul}
                  </p>
                  <p className="text-xs leading-relaxed text-muted-foreground">{item.deskripsi}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      {/* 5. CTA Penutup: arahkan ke halaman pemesanan khusus (atau Jadwal PO bila belum ada batch yang bisa dipesan) */}
      <section
        aria-labelledby="cta-pesan-heading"
        className="rounded-3xl border bg-linear-to-br from-secondary via-background to-accent/50 p-6 text-center shadow-xs sm:p-8"
      >
        <h2 id="cta-pesan-heading" className="font-heading text-xl font-bold text-foreground sm:text-2xl">
          Siap memesan P&apos;crème?
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Atur rasa dan topping setiap cup, pilih pengambilan, lalu selesaikan pembayaran dalam beberapa langkah singkat.
        </p>
        <Link
          href={hrefPesanSekarang(po)}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-8 font-heading text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-95 focus-visible:ring-3 focus-visible:ring-ring/60 focus-visible:outline-none sm:w-auto"
        >
          <ShoppingBag className="size-4 shrink-0" aria-hidden /> Pesan Sekarang
        </Link>
      </section>
    </main>
  );
}

import { CalendarRange, CheckCircle2, Clock, Search, ShoppingBag, XCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import logoImg from "@/assets/logo.png";
import produkImg from "@/assets/produk.jpg";
import { rupiah } from "@/lib/format";
import { hrefPesanSekarang } from "@/lib/routes";
import type { PoInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

const STATUS_HERO: Record<
  "buka" | "belum_buka" | "habis" | "tutup" | "kosong",
  { label: string; kelas: string; icon: typeof CheckCircle2 }
> = {
  buka: {
    label: "Batch PO Sedang Dibuka (Open Order)",
    kelas: "border-emerald-200 bg-emerald-100 text-emerald-950",
    icon: CheckCircle2,
  },
  belum_buka: {
    label: "Batch PO Segera Dibuka (Upcoming)",
    kelas: "border-amber-200 bg-amber-100 text-amber-950",
    icon: Clock,
  },
  habis: {
    label: "Kuota Batch PO Habis (Sold Out)",
    kelas: "border-red-200 bg-red-100 text-red-950",
    icon: XCircle,
  },
  tutup: {
    label: "Batch PO Sudah Ditutup (Closed)",
    kelas: "border-stone-300 bg-stone-200 text-stone-800",
    icon: XCircle,
  },
  kosong: {
    label: "Menunggu Jadwal Batch PO Berikutnya",
    kelas: "border-stone-300 bg-stone-200 text-stone-800",
    icon: Clock,
  },
};

export function PoHeader({ po }: { po?: PoInfo | null }) {
  const poAda = po?.ada_po ? po : null;
  const statusKey = poAda ? poAda.status : "kosong";
  const badge = STATUS_HERO[statusKey];
  const BadgeIcon = badge.icon;

  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden rounded-3xl border bg-linear-to-br from-secondary via-background to-accent/60 p-5 shadow-xs sm:p-8 lg:p-10"
    >
      <div className="grid items-center gap-6 lg:grid-cols-12 lg:gap-8">
        {/* Konten Teks Hero */}
        <div className="min-w-0 space-y-4 sm:space-y-5 lg:col-span-7">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#E9DDCE] bg-card/95 py-1 pl-1.5 pr-3 shadow-2xs">
              <span className="relative flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#E9DDCE] bg-[#F5E1BE] sm:size-7">
                <Image
                  src={logoImg}
                  alt="Logo Resmi P'crème"
                  width={28}
                  height={28}
                  className="h-full w-full object-contain"
                />
              </span>
              <span className="font-heading text-xs font-bold text-primary">
                P&apos;crème Official
              </span>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold",
                badge.kelas,
              )}
            >
              <BadgeIcon className="size-3.5 shrink-0" aria-hidden />
              <span>{badge.label}</span>
            </span>
          </div>

          <div className="space-y-2.5 sm:space-y-3">
            <h1
              id="hero-heading"
              className="font-heading text-2xl font-extrabold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl"
            >
              A Little Sweetness in Your Day.
            </h1>
            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Pudding lembut dengan es krim dingin, dibuat fresh untuk menemani hari kamu. Pilih rasa favorit atau{" "}
              <strong className="text-foreground">Mix</strong> beberapa rasa dengan kombinasi topping renyah di setiap cup.
            </p>
          </div>

          {poAda && (
            <div className="grid grid-cols-2 gap-2.5 text-xs sm:flex sm:flex-wrap sm:items-center sm:gap-3 sm:text-sm">
              <div className="min-w-0 rounded-2xl border bg-card px-3.5 py-2 shadow-2xs sm:px-4">
                <span className="block text-[11px] text-muted-foreground sm:inline sm:text-xs">Harga: </span>
                <strong className="font-heading text-sm font-bold text-primary sm:text-base">
                  {rupiah(poAda.harga)}
                </strong>
                <span className="text-[11px] text-muted-foreground sm:text-xs"> / cup</span>
              </div>
              <div className="min-w-0 rounded-2xl border bg-card px-3.5 py-2 shadow-2xs sm:px-4">
                <span className="block text-[11px] text-muted-foreground sm:inline sm:text-xs">Sisa Kuota: </span>
                <strong className="font-heading text-sm font-bold text-foreground sm:text-base">
                  {poAda.sisa_kuota}/{poAda.kuota} cup
                </strong>
              </div>
            </div>
          )}

          {/* Tombol CTA Utama & Sekunder */}
          <div className="grid gap-2.5 pt-1 sm:flex sm:flex-wrap sm:items-center sm:gap-3">
            <Link
              href={hrefPesanSekarang(po)}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 font-heading text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:opacity-95 focus-visible:ring-3 focus-visible:ring-ring/60 sm:w-auto sm:px-7"
            >
              <ShoppingBag className="size-4 shrink-0" aria-hidden /> Pesan Sekarang
            </Link>
            <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:gap-3">
              <Link
                href="/pesanan/cek"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border-2 border-primary/20 bg-card px-4 font-heading text-xs font-semibold text-foreground transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/60 sm:h-12 sm:px-6 sm:text-sm"
              >
                <Search className="size-3.5 shrink-0 text-primary sm:size-4" aria-hidden /> Cek Status
              </Link>
              <Link
                href="/jadwal"
                className="inline-flex h-11 items-center justify-center gap-1.5 rounded-full border bg-card/80 px-4 text-xs font-semibold text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground sm:h-12 sm:px-5"
              >
                <CalendarRange className="size-3.5 shrink-0 sm:size-4" aria-hidden /> Jadwal PO
              </Link>
            </div>
          </div>
        </div>

        {/* Foto Produk Hero (Dioptimalkan ukurannya pada mobile agar tidak mendominasi layar) */}
        <div className="mx-auto min-w-0 w-full lg:col-span-5">
          <div className="relative mx-auto aspect-16/11 max-h-56 w-full overflow-hidden rounded-2xl border-2 border-card bg-secondary shadow-sm sm:aspect-4/3 sm:max-h-72 sm:max-w-md sm:rounded-3xl sm:border-4 lg:aspect-4/5 lg:max-h-none lg:max-w-sm">
            <Image
              src={produkImg}
              alt="Foto Produk P'crème Pudding dengan Es Krim dan Topping Oreo & Choco Crunch"
              fill
              priority
              sizes="(max-width: 768px) 92vw, 380px"
              className="object-cover object-center"
              placeholder="blur"
            />
            <div className="absolute inset-x-2.5 bottom-2.5 rounded-xl border border-white/40 bg-card/92 px-3 py-2 backdrop-blur sm:inset-x-3 sm:bottom-3 sm:rounded-2xl sm:p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-heading text-xs font-bold text-primary">P&apos;crème Signature Cup</p>
                  <p className="truncate text-[11px] text-muted-foreground">Vanilla · Stroberi · Cokelat · Mix</p>
                </div>
                {poAda && (
                  <span className="shrink-0 rounded-full bg-primary px-2.5 py-1 font-heading text-xs font-bold text-primary-foreground">
                    {rupiah(poAda.harga)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

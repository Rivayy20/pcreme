import Link from "next/link";

/** Header beranda: logo teks + ilustrasi puding SVG sederhana (tanpa aset eksternal). */
export function PoHeader() {
  return (
    <header className="relative overflow-hidden rounded-3xl bg-linear-to-br from-brand-pink-soft via-brand-cream to-secondary p-6 pb-7">
      <svg
        aria-hidden
        viewBox="0 0 120 120"
        className="absolute -right-4 -top-2 size-32 opacity-90"
      >
        <ellipse cx="60" cy="104" rx="38" ry="7" fill="oklch(0.88 0.03 70)" />
        <path
          d="M30 52 Q30 98 60 98 Q90 98 90 52 Z"
          fill="oklch(0.78 0.12 70)"
        />
        <path d="M30 52 Q60 62 90 52 L90 44 Q60 34 30 44 Z" fill="oklch(0.4 0.07 50)" />
        <path d="M44 44 Q60 14 76 44 Z" fill="oklch(0.96 0.02 85)" />
        <circle cx="60" cy="20" r="6" fill="oklch(0.62 0.2 18)" />
        <path d="M60 14 Q62 8 67 8" stroke="oklch(0.5 0.12 145)" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      </svg>
      <p className="text-sm font-medium text-primary/80">Pre-Order dessert</p>
      <h1 className="mt-1 font-heading text-4xl font-bold tracking-tight text-primary">P&apos;crème</h1>
      <p className="mt-2 max-w-[14rem] text-sm text-foreground/80">
        Pudding lembut + es krim dingin, dibuat per batch dan siap kamu ambil. 🍮🍓
      </p>
      <Link
        href="/pesanan/cek"
        className="mt-4 inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
      >
        Cek status pesanan
      </Link>
    </header>
  );
}

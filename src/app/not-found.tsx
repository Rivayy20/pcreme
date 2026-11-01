import Link from "next/link";

export const metadata = { title: "Halaman tidak ditemukan", robots: { index: false, follow: false } };

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-5xl" aria-hidden>
        🍓
      </p>
      <h1 className="font-heading text-xl font-semibold">Halaman tidak ditemukan</h1>
      <p className="text-sm text-muted-foreground">Tautan yang kamu buka tidak ada atau sudah dipindahkan.</p>
      <Link
        href="/"
        className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
      >
        Ke beranda
      </Link>
    </main>
  );
}

"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Batas galat global: tampilkan pesan ramah + tombol coba lagi (tanpa membocorkan detail teknis). */
export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <p className="text-5xl" aria-hidden>
        🍮
      </p>
      <h1 className="font-heading text-xl font-semibold">Ups, ada yang tidak beres</h1>
      <p className="text-sm text-muted-foreground">
        Halaman ini gagal dimuat. Coba lagi sebentar ya. Kalau masih bermasalah, hubungi admin P&apos;crème.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button className="h-11 rounded-full px-5" onClick={reset}>
          Coba lagi
        </Button>
        <Link
          href="/"
          className="inline-flex h-11 items-center rounded-full border bg-card px-5 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
        >
          Ke beranda
        </Link>
      </div>
    </main>
  );
}

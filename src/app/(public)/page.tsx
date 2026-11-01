import Link from "next/link";
import { OrderForm } from "@/components/public/OrderForm";
import { PoBanner } from "@/components/public/PoBanner";
import { PoHeader } from "@/components/public/PoHeader";
import { tanggalJam } from "@/lib/format";
import { getPoInfo } from "@/lib/po";
import { linkInstagram } from "@/lib/wa";

export const dynamic = "force-dynamic";

function Pesan({ judul, children }: { judul: string; children?: React.ReactNode }) {
  return (
    <section className="rounded-3xl border bg-card p-5 text-center shadow-sm">
      <h2 className="font-heading text-lg font-semibold">{judul}</h2>
      {children && <div className="mt-2 space-y-3 text-sm text-muted-foreground">{children}</div>}
    </section>
  );
}

function LinkAksi({ instagram }: { instagram?: string | null }) {
  return (
    <div className="flex flex-wrap justify-center gap-2 pt-1">
      {instagram && (
        <a
          href={linkInstagram(instagram)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 items-center rounded-full border bg-background px-5 text-sm font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
        >
          Instagram P&apos;crème
        </a>
      )}
      <Link
        href="/pesanan/cek"
        className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
      >
        Cek status pesanan
      </Link>
    </div>
  );
}

export default async function BerandaPage() {
  const { data: po, error } = await getPoInfo();

  return (
    <main className="space-y-5 pb-4">
      <PoHeader />

      {error && (
        <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Info PO belum bisa dimuat: {error}
        </p>
      )}

      {po && !po.ada_po && (
        <Pesan judul="Belum ada PO aktif 🍮">
          <p>Pantau Instagram kami ya, PO berikutnya segera dibuka.</p>
          <LinkAksi />
        </Pesan>
      )}

      {po?.ada_po && (
        <>
          <PoBanner po={po} />

          {po.status === "belum_buka" && (
            <Pesan judul={`PO dibuka ${tanggalJam(po.buka_at)}`}>
              <p>Form pemesanan akan muncul di sini saat PO dibuka. Sampai jumpa!</p>
              <LinkAksi instagram={po.instagram} />
            </Pesan>
          )}

          {po.status === "habis" && (
            <Pesan judul="Kuota PO ini sudah habis 😢">
              <p>Terima kasih sudah antusias! Pantau Instagram untuk PO berikutnya.</p>
              <LinkAksi instagram={po.instagram} />
            </Pesan>
          )}

          {po.status === "tutup" && (
            <Pesan judul="PO sudah ditutup">
              <p>Pemesanan periode ini sudah selesai. Sampai ketemu di PO berikutnya!</p>
              <LinkAksi instagram={po.instagram} />
            </Pesan>
          )}

          {po.status === "buka" && <OrderForm po={po} />}
        </>
      )}
    </main>
  );
}

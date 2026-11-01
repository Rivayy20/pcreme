import { BackLink } from "@/components/public/BackLink";
import { CekStatusForm } from "@/components/public/CekStatusForm";

export const metadata = { title: "Cek Status Pesanan" };

export default function CekStatusPage() {
  return (
    <main className="space-y-5">
      <div className="flex items-start gap-3">
        <BackLink href="/" label="Kembali ke beranda" />
        <div className="min-w-0">
          <h1 className="font-heading text-2xl font-semibold">Cek status pesanan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Masukkan kode pesanan dan nomor WhatsApp yang dipakai saat memesan.
          </p>
        </div>
      </div>
      <div className="rounded-3xl border bg-card p-5 shadow-sm">
        <CekStatusForm />
      </div>
    </main>
  );
}

import { Search } from "lucide-react";
import { BackLink } from "@/components/public/BackLink";
import { CekStatusForm } from "@/components/public/CekStatusForm";

export const metadata = { title: "Cek Status Pesanan" };

export default function CekStatusPage() {
  return (
    <main className="mx-auto max-w-xl space-y-6">
      <div className="flex items-start gap-3">
        <BackLink href="/" label="Kembali ke beranda" />
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-primary">
            <Search className="size-3.5" aria-hidden /> Lacak Pesanan
          </span>
          <h1 className="font-heading text-2xl font-bold text-foreground sm:text-3xl">
            Cek Status Pesanan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Masukkan kode pesanan unik (mis. PC-0001) dan nomor WhatsApp yang digunakan saat memesan untuk memantau status pembayaran serta produksi pesananmu.
          </p>
        </div>
      </div>

      <div className="rounded-3xl border bg-card p-6 shadow-xs sm:p-7">
        <CekStatusForm />
      </div>
    </main>
  );
}

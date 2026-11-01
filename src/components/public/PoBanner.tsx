import { CalendarDays, Tag } from "lucide-react";
import { Countdown } from "@/components/public/Countdown";
import { rupiah, tanggalPanjang } from "@/lib/format";
import type { PoInfoAda } from "@/lib/types";

export function PoBanner({ po }: { po: PoInfoAda }) {
  const terpakai = Math.max(0, po.kuota - po.sisa_kuota);
  const persen = po.kuota > 0 ? Math.min(100, Math.round((terpakai / po.kuota) * 100)) : 100;

  return (
    <section aria-labelledby="po-nama" className="rounded-3xl border bg-card p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Periode PO · Minggu {po.minggu}
          </p>
          <h2 id="po-nama" className="font-heading text-xl font-semibold">
            {po.nama}
          </h2>
        </div>
        <p className="flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-sm font-semibold text-accent-foreground">
          <Tag className="size-3.5" aria-hidden />
          {rupiah(po.harga)}/cup
        </p>
      </div>

      <div className="mt-4">
        <div className="mb-1.5 flex justify-between text-sm">
          <span>Sisa kuota</span>
          <span className="font-semibold">
            {po.sisa_kuota} dari {po.kuota} cup
          </span>
        </div>
        <div
          role="progressbar"
          aria-label="Kuota terpakai"
          aria-valuemin={0}
          aria-valuemax={po.kuota}
          aria-valuenow={terpakai}
          className="h-2.5 overflow-hidden rounded-full bg-muted"
        >
          <div className="h-full rounded-full bg-brand-pink transition-all" style={{ width: `${persen}%` }} />
        </div>
      </div>

      <dl className="mt-4 grid gap-2 text-sm">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-muted-foreground" aria-hidden />
          <dt className="sr-only">Tanggal pengambilan</dt>
          <dd>
            Diambil <strong>{tanggalPanjang(po.tanggal_ambil)}</strong>
          </dd>
        </div>
        {po.status === "buka" && (
          <div className="flex items-center gap-2">
            <span aria-hidden>⏳</span>
            <dt>Tutup dalam</dt>
            <dd>
              <Countdown tutupAt={po.tutup_at} serverTime={po.server_time} />
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}

import Link from "next/link";
import { PeriodSelect } from "@/components/admin/PeriodSelect";
import { ShareFormCard } from "@/components/admin/ShareFormCard";
import { StatCard } from "@/components/admin/StatCard";
import { StatusBadge } from "@/components/public/StatusBadge";
import { pilihPeriode } from "@/lib/admin";
import { rupiah, tanggalJam } from "@/lib/format";
import { getPoInfo } from "@/lib/po";
import { createClient } from "@/lib/supabase/server";
import type { Order, PoPeriod, RekapPeriode } from "@/lib/types";

export const metadata = { title: "Ringkasan" };

function Galat({ pesan }: { pesan: string }) {
  return (
    <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      {pesan}
    </p>
  );
}

export default async function AdminRingkasanPage({ searchParams }: PageProps<"/admin">) {
  const { periode } = await searchParams;
  const supabase = await createClient();

  const { data: periods, error: errPeriods } = await supabase
    .from("po_periods")
    .select("id, minggu, nama, is_active")
    .order("minggu", { ascending: false })
    .returns<Pick<PoPeriod, "id" | "minggu" | "nama" | "is_active">[]>();

  if (errPeriods) return <Galat pesan={`Gagal memuat periode: ${errPeriods.message}`} />;
  const terpilih = pilihPeriode(periods ?? [], periode);
  if (!terpilih) {
    return (
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold">Ringkasan</h1>
        <p className="text-sm text-muted-foreground">
          Belum ada periode. Buat dulu di menu{" "}
          <Link href="/admin/periode" className="underline">
            Periode
          </Link>
          .
        </p>
      </div>
    );
  }

  const [poInfo, rekapRes, antrianRes] = await Promise.all([
    getPoInfo(),
    supabase.from("v_rekap_periode").select("*").eq("period_id", terpilih.id).maybeSingle<RekapPeriode>(),
    supabase
      .from("orders")
      .select("id, kode, nama, jumlah_cup, total, bukti_uploaded_at, created_at")
      .eq("period_id", terpilih.id)
      .eq("status", "menunggu_verifikasi")
      .order("bukti_uploaded_at", { ascending: true })
      .returns<Pick<Order, "id" | "kode" | "nama" | "jumlah_cup" | "total" | "bukti_uploaded_at" | "created_at">[]>(),
  ]);

  const rekap = rekapRes.data;
  const antrian = antrianRes.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="font-heading text-2xl font-semibold">Ringkasan</h1>
        <PeriodSelect periods={periods ?? []} value={terpilih.id} />
      </div>

      <ShareFormCard
        status={poInfo.data?.ada_po ? poInfo.data.status : null}
        namaPo={poInfo.data?.ada_po ? poInfo.data.nama : undefined}
      />

      {rekapRes.error && <Galat pesan={`Gagal memuat rekap: ${rekapRes.error.message}`} />}

      {rekap && (
        <section aria-label="Statistik periode" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Cup terpesan" value={`${rekap.cup_terpesan} / ${rekap.kuota}`} tone="pink" />
          <StatCard label="Sisa kuota" value={`${rekap.sisa_kuota} cup`} />
          <StatCard label="Omzet terkonfirmasi" value={rupiah(rekap.omzet_terkonfirmasi)} />
          <StatCard label="Potensi belum bayar" value={rupiah(rekap.potensi_belum_bayar)} />
          <StatCard label="Perlu verifikasi" value={String(rekap.perlu_verifikasi)} tone={rekap.perlu_verifikasi > 0 ? "warn" : "default"} />
          <StatCard label="Belum bayar" value={String(rekap.belum_bayar)} />
          <StatCard label="Selesai" value={String(rekap.selesai)} />
          <StatCard label="Dibatalkan" value={String(rekap.dibatalkan)} hint={`${rekap.total_pesanan} total pesanan`} />
        </section>
      )}
      {!rekap && !rekapRes.error && (
        <p className="text-sm text-muted-foreground">Belum ada data rekap untuk periode ini.</p>
      )}

      <section aria-labelledby="sec-tindakan" className="space-y-3">
        <h2 id="sec-tindakan" className="font-heading text-lg font-semibold">
          Perlu tindakan{" "}
          <span className="text-sm font-normal text-muted-foreground">(menunggu verifikasi)</span>
        </h2>
        {antrianRes.error && <Galat pesan={`Gagal memuat antrian: ${antrianRes.error.message}`} />}
        {!antrianRes.error && antrian.length === 0 && (
          <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            Tidak ada bukti bayar yang menunggu. Mantap! 🎉
          </p>
        )}
        <ul className="grid gap-2">
          {antrian.map((o) => (
            <li key={o.id}>
              <Link
                href={`/admin/pesanan?periode=${terpilih.id}&order=${o.id}`}
                className="flex min-h-14 items-center justify-between gap-3 rounded-2xl border bg-card p-3 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/60"
              >
                <span>
                  <span className="block text-sm font-semibold">
                    {o.kode} · {o.nama}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {o.jumlah_cup} cup · {rupiah(o.total)} · bukti {tanggalJam(o.bukti_uploaded_at ?? o.created_at)}
                  </span>
                </span>
                <StatusBadge status="menunggu_verifikasi" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

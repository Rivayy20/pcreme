import { PeriodeManager } from "@/components/admin/PeriodeManager";
import { createClient } from "@/lib/supabase/server";
import type { PickupPoint, PoPeriod, RekapPeriode } from "@/lib/types";

export const metadata = { title: "Manajemen Batch PO" };
export const dynamic = "force-dynamic";

export default async function AdminPeriodePage() {
  const supabase = await createClient();
  // last_seq sengaja tidak diambil: kolom itu tidak boleh disentuh dari aplikasi.
  const [periods, titik, rekap] = await Promise.all([
    supabase
      .from("po_periods")
      .select(
        "id, minggu, nama, harga, kuota, maks_per_order, maks_topping, buka_at, tutup_at, tanggal_ambil, info_pembayaran, wa_admin, instagram, is_active",
      )
      .order("minggu", { ascending: false })
      .returns<PoPeriod[]>(),
    supabase.from("pickup_points").select("*").order("urutan", { ascending: true }).returns<PickupPoint[]>(),
    supabase
      .from("v_rekap_periode")
      .select("period_id, cup_terpesan, total_pesanan")
      .returns<Pick<RekapPeriode, "period_id" | "cup_terpesan" | "total_pesanan">[]>(),
  ]);

  const galat = periods.error ?? titik.error;
  const terpesanMap: Record<string, number> = {};
  for (const r of rekap.data ?? []) {
    terpesanMap[r.period_id] = r.cup_terpesan;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Pengaturan Batch, Kuota, Titik Ambil &amp; Rekening Pembayaran
        </span>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Manajemen Batch PO &amp; Titik Pengambilan
        </h1>
      </div>
      {galat ? (
        <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat data: {galat.message}
        </p>
      ) : (
        <PeriodeManager
          periods={periods.data ?? []}
          titik={titik.data ?? []}
          terpesanMap={terpesanMap}
        />
      )}
    </div>
  );
}

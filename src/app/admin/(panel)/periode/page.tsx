import { PeriodeManager } from "@/components/admin/PeriodeManager";
import { createClient } from "@/lib/supabase/server";
import type { PickupPoint, PoPeriod } from "@/lib/types";

export const metadata = { title: "Periode" };

export default async function AdminPeriodePage() {
  const supabase = await createClient();
  // last_seq sengaja tidak diambil: kolom itu tidak boleh disentuh dari aplikasi.
  const [periods, titik] = await Promise.all([
    supabase
      .from("po_periods")
      .select(
        "id, minggu, nama, harga, kuota, maks_per_order, maks_topping, buka_at, tutup_at, tanggal_ambil, info_pembayaran, wa_admin, instagram, is_active",
      )
      .order("minggu", { ascending: false })
      .returns<PoPeriod[]>(),
    supabase.from("pickup_points").select("*").order("urutan", { ascending: true }).returns<PickupPoint[]>(),
  ]);

  const galat = periods.error ?? titik.error;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="font-heading text-2xl font-semibold">Periode PO &amp; titik ambil</h1>
      {galat ? (
        <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat data: {galat.message}
        </p>
      ) : (
        <PeriodeManager periods={periods.data ?? []} titik={titik.data ?? []} />
      )}
    </div>
  );
}

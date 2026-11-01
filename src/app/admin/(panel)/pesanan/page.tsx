import Link from "next/link";
import { OrdersManager } from "@/components/admin/OrdersManager";
import { PeriodSelect } from "@/components/admin/PeriodSelect";
import { pilihPeriode } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";
import type { PoPeriod } from "@/lib/types";

export const metadata = { title: "Pesanan" };

export default async function AdminPesananPage({ searchParams }: PageProps<"/admin/pesanan">) {
  const { periode, order } = await searchParams;
  const supabase = await createClient();

  const { data: periods, error } = await supabase
    .from("po_periods")
    .select("id, minggu, nama, is_active, tanggal_ambil")
    .order("minggu", { ascending: false })
    .returns<Pick<PoPeriod, "id" | "minggu" | "nama" | "is_active" | "tanggal_ambil">[]>();

  if (error) {
    return (
      <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
        Gagal memuat periode: {error.message}
      </p>
    );
  }

  const terpilih = pilihPeriode(periods ?? [], periode);
  if (!terpilih) {
    return (
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold">Pesanan</h1>
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h1 className="font-heading text-2xl font-semibold">Pesanan</h1>
        <PeriodSelect periods={periods ?? []} value={terpilih.id} />
      </div>
      <OrdersManager
        key={terpilih.id}
        periodId={terpilih.id}
        periodNama={terpilih.nama}
        tanggalAmbil={terpilih.tanggal_ambil}
        orderAwal={typeof order === "string" ? order : undefined}
      />
    </div>
  );
}

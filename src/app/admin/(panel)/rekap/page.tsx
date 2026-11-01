import Link from "next/link";
import { PeriodSelect } from "@/components/admin/PeriodSelect";
import { PrintButton } from "@/components/admin/PrintButton";
import { StatCard } from "@/components/admin/StatCard";
import { pilihPeriode } from "@/lib/admin";
import { tanggalPanjang } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { PoPeriod, RekapPengambilan, RekapRasa, RekapTopping } from "@/lib/types";

export const metadata = { title: "Rekap" };

interface Kolom {
  teks: string;
  /** Kolom angka: rata kanan, lebar tetap. */
  angka?: boolean;
}

/** Kartu berisi satu tabel rekap: judul + deskripsi di kepala kartu, baris total di kaki tabel. */
function KartuTabel({
  judul,
  deskripsi,
  kolom,
  baris,
  total,
  kosong,
  className,
}: {
  judul: string;
  deskripsi: string;
  kolom: Kolom[];
  baris: React.ReactNode[][];
  total?: React.ReactNode[];
  kosong: string;
  className?: string;
}) {
  return (
    <section className={cn("break-inside-avoid overflow-hidden rounded-2xl border bg-card", className)}>
      <header className="border-b px-4 py-3">
        <h2 className="font-heading text-base font-semibold">{judul}</h2>
        <p className="text-xs text-muted-foreground">{deskripsi}</p>
      </header>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">{judul}</caption>
          <thead>
            <tr className="border-b bg-muted/50 text-xs text-muted-foreground print:bg-transparent">
              {kolom.map((k) => (
                <th
                  key={k.teks}
                  scope="col"
                  className={cn("px-4 py-2.5 font-medium", k.angka ? "w-24 text-right" : "text-left")}
                >
                  {k.teks}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y">
            {baris.length === 0 ? (
              <tr>
                <td colSpan={kolom.length} className="px-4 py-8 text-center text-muted-foreground">
                  {kosong}
                </td>
              </tr>
            ) : (
              baris.map((b, i) => (
                <tr key={i}>
                  {b.map((sel, j) => (
                    <td
                      key={j}
                      className={cn("px-4 py-3", kolom[j]?.angka ? "text-right tabular-nums" : "text-left")}
                    >
                      {sel}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
          {total && baris.length > 0 && (
            <tfoot>
              <tr className="border-t-2 bg-muted/50 font-semibold print:bg-transparent">
                {total.map((sel, j) => (
                  <td key={j} className={cn("px-4 py-3", kolom[j]?.angka ? "text-right tabular-nums" : "text-left")}>
                    {sel}
                  </td>
                ))}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </section>
  );
}

const redup = "text-muted-foreground";

function LencanaCara({ cara }: { cara: "ambil" | "antar" }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        cara === "ambil" ? "border-emerald-200 bg-emerald-100 text-emerald-900" : "border-violet-200 bg-violet-100 text-violet-900",
      )}
    >
      {cara === "ambil" ? "Ambil" : "Antar"}
    </span>
  );
}

export default async function AdminRekapPage({ searchParams }: PageProps<"/admin/rekap">) {
  const { periode } = await searchParams;
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
        <h1 className="font-heading text-2xl font-semibold">Rekap</h1>
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

  const [rasaRes, toppingRes, ambilRes] = await Promise.all([
    supabase.from("v_rekap_rasa").select("*").eq("period_id", terpilih.id).order("rasa").returns<RekapRasa[]>(),
    supabase.from("v_rekap_topping").select("*").eq("period_id", terpilih.id).order("topping").returns<RekapTopping[]>(),
    supabase
      .from("v_rekap_pengambilan")
      .select("*")
      .eq("period_id", terpilih.id)
      .order("fulfillment")
      .order("lokasi")
      .returns<RekapPengambilan[]>(),
  ]);

  const galat = [rasaRes.error, toppingRes.error, ambilRes.error].find(Boolean);
  const rasa = rasaRes.data ?? [];
  const topping = toppingRes.data ?? [];
  const ambil = ambilRes.data ?? [];

  const produksi = rasa.reduce((n, r) => n + r.cup_dibayar, 0);
  const semua = rasa.reduce((n, r) => n + r.cup_semua, 0);
  const jumlah = (arr: number[]) => arr.reduce((n, x) => n + x, 0);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-semibold">Rekap produksi &amp; pengambilan</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Minggu {terpilih.minggu} · {terpilih.nama}
            <span className="mx-1.5" aria-hidden>
              •
            </span>
            Diambil {tanggalPanjang(terpilih.tanggal_ambil)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodSelect periods={periods ?? []} value={terpilih.id} />
          <PrintButton />
        </div>
      </div>

      {galat && (
        <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat rekap: {galat.message}
        </p>
      )}

      <section aria-label="Total cup" className="grid grid-cols-2 gap-3 sm:grid-cols-3 print:grid-cols-3">
        <StatCard label="Harus diproduksi" value={`${produksi} cup`} hint="Cup yang sudah dibayar" tone="pink" className="col-span-2 sm:col-span-1" />
        <StatCard label="Total semua pesanan" value={`${semua} cup`} hint="Termasuk yang belum bayar" />
        <StatCard label="Belum dibayar" value={`${Math.max(0, semua - produksi)} cup`} hint="Belum masuk produksi" />
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-2 print:grid-cols-1">
        <KartuTabel
          judul="Produksi per rasa"
          deskripsi="Dasar produksi adalah cup yang sudah dibayar."
          kolom={[{ teks: "Rasa" }, { teks: "Dibayar", angka: true }, { teks: "Semua", angka: true }]}
          baris={rasa.map((r) => [
            <span key="n" className="font-medium">
              {r.rasa}
            </span>,
            <span key="d" className="font-semibold">
              {r.cup_dibayar}
            </span>,
            <span key="s" className={redup}>
              {r.cup_semua}
            </span>,
          ])}
          total={["Total", produksi, semua]}
          kosong="Belum ada pesanan."
        />
        <KartuTabel
          judul="Topping"
          deskripsi="Jumlah porsi topping dari seluruh cup."
          kolom={[{ teks: "Topping" }, { teks: "Dibayar", angka: true }, { teks: "Semua", angka: true }]}
          baris={topping.map((t) => [
            <span key="n" className="font-medium">
              {t.topping}
            </span>,
            <span key="d" className="font-semibold">
              {t.cup_dibayar}
            </span>,
            <span key="s" className={redup}>
              {t.cup_semua}
            </span>,
          ])}
          total={[
            "Total",
            jumlah(topping.map((t) => t.cup_dibayar)),
            jumlah(topping.map((t) => t.cup_semua)),
          ]}
          kosong="Belum ada topping dipesan."
        />
      </div>

      <KartuTabel
        judul="Pengambilan per titik / antar"
        deskripsi="Pesanan dikelompokkan menurut cara dan lokasi pengambilan."
        kolom={[
          { teks: "Cara" },
          { teks: "Lokasi" },
          { teks: "Pesanan", angka: true },
          { teks: "Cup", angka: true },
          { teks: "Selesai", angka: true },
        ]}
        baris={ambil.map((a) => [
          <LencanaCara key="c" cara={a.fulfillment} />,
          <span key="l" className="font-medium">
            {a.lokasi ?? "-"}
          </span>,
          a.jumlah_pesanan,
          <span key="c2" className="font-semibold">
            {a.jumlah_cup}
          </span>,
          <span key="s" className={redup}>
            {a.sudah_selesai}
          </span>,
        ])}
        total={[
          "Total",
          "",
          jumlah(ambil.map((a) => a.jumlah_pesanan)),
          jumlah(ambil.map((a) => a.jumlah_cup)),
          jumlah(ambil.map((a) => a.sudah_selesai)),
        ]}
        kosong="Belum ada data pengambilan."
      />
    </div>
  );
}

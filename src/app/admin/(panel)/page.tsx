import Link from "next/link";
import { PeriodSelect } from "@/components/admin/PeriodSelect";
import { ShareFormCard } from "@/components/admin/ShareFormCard";
import { StatCard } from "@/components/admin/StatCard";
import { OrderProgressBadge, PaymentStatusBadge } from "@/components/public/StatusBadge";
import { pilihPeriode } from "@/lib/admin";
import { rupiah, tanggalJam } from "@/lib/format";
import { parseCatatanPesanan } from "@/lib/order-meta";
import { getPoInfo } from "@/lib/po";
import { createClient } from "@/lib/supabase/server";
import type { Order, PoPeriod, RekapPeriode } from "@/lib/types";

export const metadata = { title: "Ringkasan Dashboard" };

function Galat({ pesan }: { pesan: string }) {
  return (
    <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
      {pesan}
    </p>
  );
}

type OrderRingkas = Pick<
  Order,
  | "id"
  | "kode"
  | "nama"
  | "jumlah_cup"
  | "total"
  | "status"
  | "fulfillment"
  | "catatan"
  | "catatan_admin"
  | "bukti_bayar_path"
  | "bukti_uploaded_at"
  | "created_at"
>;

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
        <h1 className="font-heading text-2xl font-semibold">Dashboard Admin</h1>
        <p className="text-sm text-muted-foreground">
          Belum ada periode PO. Buat terlebih dahulu di menu{" "}
          <Link href="/admin/periode" className="font-semibold text-primary underline">
            Periode
          </Link>
          .
        </p>
      </div>
    );
  }

  const [poInfo, rekapRes, ordersRes] = await Promise.all([
    getPoInfo(),
    supabase.from("v_rekap_periode").select("*").eq("period_id", terpilih.id).maybeSingle<RekapPeriode>(),
    supabase
      .from("orders")
      .select(
        "id, kode, nama, jumlah_cup, total, status, fulfillment, catatan, catatan_admin, bukti_bayar_path, bukti_uploaded_at, created_at",
      )
      .eq("period_id", terpilih.id)
      .order("created_at", { ascending: false })
      .returns<OrderRingkas[]>(),
  ]);

  const rekap = rekapRes.data;
  const semuaOrder = ordersRes.data ?? [];

  // Hitung metrik status secara presisi dari daftar pesanan periode terpilih
  const totalPesanan = rekap?.total_pesanan ?? semuaOrder.length;
  const menungguBayar = semuaOrder.filter((o) => o.status === "menunggu_bayar").length;
  const menungguVerifikasi = semuaOrder.filter((o) => o.status === "menunggu_verifikasi").length;
  const pembayaranBerhasil = semuaOrder.filter((o) =>
    ["dibayar", "diproses", "siap", "selesai"].includes(o.status),
  ).length;
  const sedangDiproses = semuaOrder.filter((o) => o.status === "diproses" || o.status === "siap").length;
  const pesananSelesai = semuaOrder.filter((o) => o.status === "selesai").length;
  const pesananDibatalkan = semuaOrder.filter((o) => o.status === "dibatalkan").length;

  const antrianVerifikasi = [...semuaOrder]
    .filter((o) => o.status === "menunggu_verifikasi")
    .sort((a, b) => (a.bukti_uploaded_at ?? a.created_at).localeCompare(b.bukti_uploaded_at ?? b.created_at));

  const pesananTerbaru = semuaOrder.slice(0, 6);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">
            Overview &amp; Sinkronisasi Data
          </span>
          <h1 className="font-heading text-2xl font-bold text-foreground">
            Dashboard Admin · Minggu {terpilih.minggu} ({terpilih.nama})
          </h1>
        </div>
        <PeriodSelect periods={periods ?? []} value={terpilih.id} />
      </div>

      <ShareFormCard
        status={poInfo.data?.ada_po ? poInfo.data.status : null}
        namaPo={poInfo.data?.ada_po ? poInfo.data.nama : undefined}
      />

      {rekapRes.error && <Galat pesan={`Gagal memuat rekap: ${rekapRes.error.message}`} />}
      {ordersRes.error && <Galat pesan={`Gagal memuat daftar pesanan: ${ordersRes.error.message}`} />}

      {/* Grid Metrik Utama Sesuai Spesifikasi Bagian 7.A */}
      <section aria-label="Statistik periode PO" className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard
          label="Total Cup Terjual"
          value={rekap ? `${rekap.cup_terpesan} / ${rekap.kuota} cup` : "0 cup"}
          hint="Cup dari pesanan aktif"
          tone="pink"
        />
        <StatCard
          label="Sisa Kuota PO"
          value={rekap ? `${rekap.sisa_kuota} cup` : "-"}
          hint={terpilih.is_active ? "Periode sedang aktif" : "Periode nonaktif"}
        />
        <StatCard
          label="Total Pendapatan Terverifikasi"
          value={rupiah(rekap?.omzet_terkonfirmasi ?? 0)}
          hint={`Potensi belum lunas: ${rupiah(rekap?.potensi_belum_bayar ?? 0)}`}
        />
        <StatCard
          label="Total Pesanan"
          value={String(totalPesanan)}
          hint={`${pembayaranBerhasil} pesanan sudah lunas`}
        />

        <StatCard
          label="Menunggu Verifikasi"
          value={String(menungguVerifikasi)}
          hint="Bukti bayar perlu dicek"
          tone={menungguVerifikasi > 0 ? "warn" : "default"}
        />
        <StatCard
          label="Menunggu Pembayaran"
          value={String(menungguBayar)}
          hint="Pesanan baru belum lunas"
        />
        <StatCard
          label="Pembayaran Berhasil"
          value={String(pembayaranBerhasil)}
          hint="Status Paid / Terkonfirmasi"
        />
        <StatCard
          label="Pesanan Diproses / Siap"
          value={String(sedangDiproses)}
          hint="Sedang dibuat / siap ambil"
        />

        <StatCard
          label="Pesanan Selesai"
          value={String(pesananSelesai)}
          hint="Sudah diterima pelanggan"
        />
        <StatCard
          label="Pesanan Dibatalkan"
          value={String(pesananDibatalkan)}
          hint="Kuota telah dikembalikan"
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Antrian Verifikasi Pembayaran */}
        <section aria-labelledby="sec-tindakan" className="min-w-0 space-y-3 rounded-3xl border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="sec-tindakan" className="font-heading text-base font-bold text-foreground">
              Antrian Verifikasi Pembayaran ({antrianVerifikasi.length})
            </h2>
            <Link
              href={`/admin/pesanan?periode=${terpilih.id}`}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Kelola Semua →
            </Link>
          </div>

          {antrianVerifikasi.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Tidak ada bukti pembayaran yang menunggu verifikasi saat ini. 🎉
            </p>
          ) : (
            <ul className="grid gap-2.5">
              {antrianVerifikasi.map((o) => {
                const meta = parseCatatanPesanan(o.catatan);
                return (
                  <li key={o.id} className="min-w-0">
                    <Link
                      href={`/admin/pesanan?periode=${terpilih.id}&order=${o.id}`}
                      className="flex min-h-14 flex-wrap items-center justify-between gap-2 rounded-2xl border bg-background p-3.5 transition-colors outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/60"
                    >
                      <div className="min-w-0">
                        <p className="wrap-break-word text-sm font-bold text-foreground">
                          {o.kode} · {o.nama}
                        </p>
                        <p className="wrap-break-word text-xs text-muted-foreground">
                          {o.jumlah_cup} cup · {rupiah(o.total)} · {meta.labelMetodeBayar} ·{" "}
                          {tanggalJam(o.bukti_uploaded_at ?? o.created_at)}
                        </p>
                      </div>
                      <PaymentStatusBadge status="menunggu_verifikasi" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Pesanan Terbaru */}
        <section aria-labelledby="sec-terbaru" className="min-w-0 space-y-3 rounded-3xl border bg-card p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 id="sec-terbaru" className="font-heading text-base font-bold text-foreground">
              Pesanan Terbaru Masuk
            </h2>
            <Link
              href={`/admin/pesanan?periode=${terpilih.id}`}
              className="text-xs font-semibold text-primary hover:underline"
            >
              Lihat Tabel Pesanan →
            </Link>
          </div>

          {pesananTerbaru.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
              Belum ada pesanan masuk pada periode ini.
            </p>
          ) : (
            <ul className="grid gap-2.5">
              {pesananTerbaru.map((o) => {
                const meta = parseCatatanPesanan(o.catatan);
                return (
                  <li key={o.id} className="min-w-0">
                    <Link
                      href={`/admin/pesanan?periode=${terpilih.id}&order=${o.id}`}
                      className="flex min-h-14 flex-wrap items-center justify-between gap-2 rounded-2xl border bg-background p-3.5 transition-colors outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/60"
                    >
                      <div className="min-w-0">
                        <p className="wrap-break-word text-sm font-bold text-foreground">
                          {o.kode} · {o.nama}
                        </p>
                        <p className="wrap-break-word text-xs text-muted-foreground">
                          {o.jumlah_cup} cup · {rupiah(o.total)} · {meta.labelMetodeBayar} ·{" "}
                          {tanggalJam(o.created_at)}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <PaymentStatusBadge
                          status={o.status}
                          catatanAdmin={o.catatan_admin}
                          buktiBayarPath={o.bukti_bayar_path}
                        />
                        <OrderProgressBadge status={o.status} fulfillment={o.fulfillment} />
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

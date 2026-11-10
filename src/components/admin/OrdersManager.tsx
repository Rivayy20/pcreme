"use client";

import { ArrowUpDown, Calendar, Download, Eye, Loader2, RefreshCw, Search, TimerOff, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KonfirmasiDialog } from "@/components/admin/KonfirmasiDialog";
import { OrderDetailSheet, type SimpanCatatanFn, type UbahStatusFn } from "@/components/admin/OrderDetailSheet";
import { OrderProgressBadge, PaymentStatusBadge } from "@/components/public/StatusBadge";
import { lokasiPesanan } from "@/lib/admin";
import { buatCsvPesanan, unduhCsv } from "@/lib/csv";
import { normalisasiWa, rupiah, tampilWa, tanggalJam } from "@/lib/format";
import { parseCatatanPesanan } from "@/lib/order-meta";
import {
  ORDER_PROGRESS_LABEL_ID,
  PAYMENT_STATUS_LABEL_ID,
  STATUS_LABEL,
  deriveOrderProgressStatus,
  derivePaymentStatus,
  type OrderProgressStatusType,
  type PaymentStatusType,
} from "@/lib/status";
import { createClient } from "@/lib/supabase/client";
import type { OrderDenganRelasi, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const POLLING_MS = 30_000;

const FILTER_PEMBAYARAN: (PaymentStatusType | "semua")[] = [
  "semua",
  "pending_payment",
  "waiting_verification",
  "paid",
  "payment_rejected",
];

const FILTER_PESANAN: (OrderProgressStatusType | "semua")[] = [
  "semua",
  "pending",
  "confirmed",
  "processing",
  "ready_for_pickup",
  "out_for_delivery",
  "completed",
  "cancelled",
];

interface OrdersManagerProps {
  periodId: string;
  periodNama: string;
  tanggalAmbil: string;
  orderAwal?: string;
}

export function OrdersManager({ periodId, periodNama, tanggalAmbil, orderAwal }: OrdersManagerProps) {
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<OrderDenganRelasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Sort State
  const [cari, setCari] = useState("");
  const [filterBayar, setFilterBayar] = useState<PaymentStatusType | "semua">("semua");
  const [filterPesanan, setFilterPesanan] = useState<OrderProgressStatusType | "semua">("semua");
  const [filterTanggal, setFilterTanggal] = useState("");
  const [urutWaktu, setUrutWaktu] = useState<"terbaru" | "terlama">("terbaru");

  const [terpilihId, setTerpilihId] = useState<string | null>(orderAwal ?? null);
  const [dialogKadaluarsa, setDialogKadaluarsa] = useState(false);
  const [sibukKadaluarsa, setSibukKadaluarsa] = useState(false);
  const sedangMuat = useRef(false);

  const muat = useCallback(async () => {
    if (sedangMuat.current) return;
    sedangMuat.current = true;
    const { data, error: err } = await supabase
      .from("orders")
      .select("*, order_items(*), pickup_points(nama,jam)")
      .eq("period_id", periodId)
      .order("created_at", { ascending: false })
      .returns<OrderDenganRelasi[]>();
    sedangMuat.current = false;
    if (err) setError(err.message);
    else {
      setOrders(data ?? []);
      setError(null);
    }
    setLoading(false);
  }, [supabase, periodId]);

  useEffect(() => {
    const id = setTimeout(() => void muat(), 0);
    return () => clearTimeout(id);
  }, [muat]);

  // Realtime + polling 30 detik
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tunda = () => {
      clearTimeout(timer);
      timer = setTimeout(() => void muat(), 500);
    };
    const channel = supabase
      .channel(`orders-${periodId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter: `period_id=eq.${periodId}` }, tunda)
      .subscribe();
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void muat();
    }, POLLING_MS);
    return () => {
      clearTimeout(timer);
      clearInterval(id);
      void supabase.removeChannel(channel);
    };
  }, [supabase, periodId, muat]);

  const hitungBayar = useMemo(() => {
    const m = new Map<PaymentStatusType | "semua", number>([["semua", orders.length]]);
    for (const k of FILTER_PEMBAYARAN) if (k !== "semua") m.set(k, 0);
    for (const o of orders) {
      const ps = derivePaymentStatus(o.status, {
        catatanAdmin: o.catatan_admin,
        buktiBayarPath: o.bukti_bayar_path,
      });
      m.set(ps, (m.get(ps) ?? 0) + 1);
    }
    return m;
  }, [orders]);

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    const digit = q.replace(/\D/g, "");
    const waQ = digit.length >= 3 ? normalisasiWa(digit) : "";

    const filtered = orders.filter((o) => {
      const ps = derivePaymentStatus(o.status, {
        catatanAdmin: o.catatan_admin,
        buktiBayarPath: o.bukti_bayar_path,
      });
      const os = deriveOrderProgressStatus(o.status, o.fulfillment);

      if (filterBayar !== "semua" && ps !== filterBayar) return false;
      if (filterPesanan !== "semua" && os !== filterPesanan) return false;

      if (filterTanggal) {
        // Konversi created_at ke tanggal WIB YYYY-MM-DD
        const wibDate = new Date(new Date(o.created_at).getTime() + 7 * 3600 * 1000)
          .toISOString()
          .slice(0, 10);
        if (wibDate !== filterTanggal) return false;
      }

      if (!q) return true;
      return (
        o.nama.toLowerCase().includes(q) ||
        o.kode.toLowerCase().includes(q) ||
        (waQ !== "" && o.wa.includes(waQ))
      );
    });

    return filtered.sort((a, b) =>
      urutWaktu === "terbaru"
        ? b.created_at.localeCompare(a.created_at)
        : a.created_at.localeCompare(b.created_at),
    );
  }, [orders, cari, filterBayar, filterPesanan, filterTanggal, urutWaktu]);

  const terpilih = orders.find((o) => o.id === terpilihId) ?? null;

  const ubahStatus: UbahStatusFn = useCallback(
    async (order, status, catatanAdmin) => {
      const patch: { status: OrderStatus; catatan_admin?: string | null } = { status };
      if (catatanAdmin !== undefined) patch.catatan_admin = catatanAdmin;
      const { data, error: err } = await supabase
        .from("orders")
        .update(patch)
        .eq("id", order.id)
        .eq("status", order.status)
        .select("id");
      if (err) {
        toast.error(`Gagal mengubah status: ${err.message}`);
        return false;
      }
      if (!data || data.length === 0) {
        toast.error("Status pesanan sudah berubah. Data dimuat ulang.");
        await muat();
        return false;
      }
      toast.success(`${order.kode} → ${STATUS_LABEL[status]}`);
      await muat();
      return true;
    },
    [supabase, muat],
  );

  const simpanCatatan: SimpanCatatanFn = useCallback(
    async (order, catatan) => {
      const { error: err } = await supabase
        .from("orders")
        .update({ catatan_admin: catatan.trim() === "" ? null : catatan.trim() })
        .eq("id", order.id);
      if (err) {
        toast.error(`Gagal menyimpan catatan: ${err.message}`);
        return false;
      }
      toast.success("Catatan disimpan");
      await muat();
      return true;
    },
    [supabase, muat],
  );

  async function batalkanKadaluarsa() {
    setSibukKadaluarsa(true);
    const { data, error: err } = await supabase.rpc("batalkan_pesanan_kadaluarsa", { p_jam: 24 });
    setSibukKadaluarsa(false);
    setDialogKadaluarsa(false);
    if (err) {
      toast.error(err.message);
      return;
    }
    const jumlah = Number(data ?? 0);
    toast.success(jumlah > 0 ? `${jumlah} pesanan belum bayar dibatalkan` : "Tidak ada pesanan yang kadaluarsa");
    await muat();
  }

  function ekspor() {
    if (tampil.length === 0) {
      toast.error("Tidak ada pesanan untuk diekspor.");
      return;
    }
    const tgl = new Date().toISOString().slice(0, 10);
    unduhCsv(`pesanan-${periodNama.replace(/[^\w-]+/g, "_")}-${tgl}.csv`, buatCsvPesanan(tampil));
    toast.success(`${tampil.length} pesanan diekspor ke CSV`);
  }

  const adaFilterAktif =
    cari.trim() !== "" ||
    filterBayar !== "semua" ||
    filterPesanan !== "semua" ||
    filterTanggal !== "";

  return (
    <div className="space-y-4">
      {/* Bar Pencarian, Filter Tanggal, Sortir, & Aksi */}
      <div className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-3">
        <div className="relative min-w-0 flex-1 basis-56">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <label htmlFor="cari" className="sr-only">
            Cari pesanan
          </label>
          <Input
            id="cari"
            type="search"
            placeholder="Cari kode pesanan, nama pelanggan, atau nomor WA…"
            className="h-10 pl-9 text-sm"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
          />
        </div>

        {/* Filter Status Pesanan */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="filter-pesanan" className="sr-only">
            Filter status pesanan
          </label>
          <select
            id="filter-pesanan"
            value={filterPesanan}
            onChange={(e) => setFilterPesanan(e.target.value as OrderProgressStatusType | "semua")}
            className="h-10 rounded-lg border border-input bg-background px-3 text-xs font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="semua">Semua Status Pesanan</option>
            {FILTER_PESANAN.filter((s) => s !== "semua").map((s) => (
              <option key={s} value={s}>
                Status: {ORDER_PROGRESS_LABEL_ID[s]}
              </option>
            ))}
          </select>
        </div>

        {/* Filter Tanggal */}
        <div className="flex items-center gap-1.5">
          <label htmlFor="filter-tanggal" className="sr-only">
            Filter tanggal pemesanan
          </label>
          <div className="relative">
            <Calendar
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="filter-tanggal"
              type="date"
              value={filterTanggal}
              onChange={(e) => setFilterTanggal(e.target.value)}
              className="h-10 w-38 pl-8 text-xs"
            />
          </div>
        </div>

        {/* Sort Waktu */}
        <Button
          type="button"
          variant="outline"
          className="h-10 text-xs"
          onClick={() => setUrutWaktu((u) => (u === "terbaru" ? "terlama" : "terbaru"))}
        >
          <ArrowUpDown className="size-3.5" aria-hidden />
          {urutWaktu === "terbaru" ? "Terbaru" : "Terlama"}
        </Button>

        {adaFilterAktif && (
          <Button
            type="button"
            variant="ghost"
            className="h-10 text-xs text-destructive"
            onClick={() => {
              setCari("");
              setFilterBayar("semua");
              setFilterPesanan("semua");
              setFilterTanggal("");
            }}
          >
            <X className="size-3.5" aria-hidden /> Reset
          </Button>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          <Button type="button" variant="outline" className="h-10 text-xs" onClick={() => void muat()} aria-label="Muat ulang">
            <RefreshCw className="size-3.5" aria-hidden /> <span className="hidden sm:inline">Segarkan</span>
          </Button>
          <Button type="button" variant="outline" className="h-10 text-xs" onClick={ekspor}>
            <Download className="size-3.5" aria-hidden /> CSV
          </Button>
          <Button type="button" variant="outline" className="h-10 text-xs" onClick={() => setDialogKadaluarsa(true)}>
            <TimerOff className="size-3.5" aria-hidden /> <span className="hidden sm:inline">Batal &gt; 24 Jam</span>
            <span className="sm:hidden">&gt; 24j</span>
          </Button>
        </div>
      </div>

      {/* Tab Filter Status Pembayaran */}
      <div
        role="tablist"
        aria-label="Filter status pembayaran"
        className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
      >
        {FILTER_PEMBAYARAN.map((s) => {
          const aktif = filterBayar === s;
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={aktif}
              onClick={() => setFilterBayar(s)}
              className={cn(
                "inline-flex h-10 shrink-0 items-center gap-2 rounded-full border px-4 text-xs font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                aktif ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
            >
              {s === "semua" ? "Semua Pembayaran" : PAYMENT_STATUS_LABEL_ID[s]}
              <span className={cn("rounded-full px-1.5 py-0.5 text-[11px] tabular-nums", aktif ? "bg-white/20" : "bg-muted")}>
                {hitungBayar.get(s) ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat pesanan: {error}
        </p>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Memuat daftar pesanan…
        </div>
      ) : tampil.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {orders.length === 0
            ? "Belum ada pesanan pada batch PO ini."
            : "Tidak ada pesanan yang cocok dengan pencarian atau filter yang dipilih."}
        </p>
      ) : (
        <>
          {/* Tabel Lengkap (Desktop / Laptop) */}
          <div className="hidden overflow-x-auto rounded-2xl border bg-card shadow-2xs md:block">
            <table className="w-full text-xs lg:text-sm">
              <caption className="sr-only">Daftar pesanan batch {periodNama}</caption>
              <thead className="border-b bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-3 font-semibold">Kode</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Pelanggan</th>
                  <th scope="col" className="px-3 py-3 font-semibold">WhatsApp</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Batch</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Cup</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Total</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Metode Bayar</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Status Pembayaran</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Status Pesanan</th>
                  <th scope="col" className="px-3 py-3 font-semibold">Waktu</th>
                  <th scope="col" className="px-3 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tampil.map((o) => {
                  const meta = parseCatatanPesanan(o.catatan, o.order_items);
                  return (
                    <tr key={o.id} className="hover:bg-muted/35">
                      <td className="whitespace-nowrap px-3 py-3 font-heading font-bold text-primary">
                        <button
                          type="button"
                          onClick={() => setTerpilihId(o.id)}
                          className="rounded underline-offset-2 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/60"
                        >
                          {o.kode}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <span className="block font-semibold text-foreground">{o.nama}</span>
                        <span className="block text-[11px] text-muted-foreground">
                          {o.asal} · {lokasiPesanan(o)}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs tabular-nums">
                        {tampilWa(o.wa)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                        {periodNama}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold tabular-nums">
                        {o.jumlah_cup}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-heading font-bold tabular-nums text-foreground">
                        {rupiah(o.total)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs font-medium">
                        {meta.labelMetodeBayar}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <PaymentStatusBadge
                          status={o.status}
                          catatanAdmin={o.catatan_admin}
                          buktiBayarPath={o.bukti_bayar_path}
                        />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <OrderProgressBadge status={o.status} fulfillment={o.fulfillment} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-muted-foreground">
                        {tanggalJam(o.created_at)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8 rounded-full px-3 text-xs font-semibold"
                          onClick={() => setTerpilihId(o.id)}
                        >
                          <Eye className="size-3.5" aria-hidden /> Detail
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Kartu Pesanan (Mobile) */}
          <ul className="grid gap-2.5 md:hidden">
            {tampil.map((o) => {
              const meta = parseCatatanPesanan(o.catatan, o.order_items);
              return (
                <li key={o.id} className="min-w-0">
                  <button
                    type="button"
                    onClick={() => setTerpilihId(o.id)}
                    className="min-w-0 w-full space-y-2 rounded-2xl border bg-card p-4 text-left shadow-2xs outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-heading text-base font-bold text-primary">{o.kode}</span>
                        <span className="mx-1.5 text-muted-foreground">·</span>
                        <span className="wrap-break-word font-semibold text-foreground">{o.nama}</span>
                        <p className="wrap-break-word text-xs text-muted-foreground">
                          {tampilWa(o.wa)} · {o.asal}
                        </p>
                      </div>
                      <span className="shrink-0 font-heading text-sm font-bold text-foreground">
                        {rupiah(o.total)}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <PaymentStatusBadge
                        status={o.status}
                        catatanAdmin={o.catatan_admin}
                        buktiBayarPath={o.bukti_bayar_path}
                      />
                      <OrderProgressBadge status={o.status} fulfillment={o.fulfillment} />
                      <span className="rounded-full border bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground">
                        {o.jumlah_cup} cup · {meta.labelMetodeBayar}
                      </span>
                    </div>

                    <p className="wrap-break-word text-xs text-muted-foreground">{lokasiPesanan(o)}</p>
                    <p className="text-[11px] text-muted-foreground">{tanggalJam(o.created_at)}</p>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p className="text-xs text-muted-foreground" aria-live="polite">
        Menampilkan {tampil.length} dari {orders.length} pesanan pada batch {periodNama}. Tersinkronisasi otomatis.
      </p>

      <OrderDetailSheet
        order={terpilih}
        periodNama={periodNama}
        tanggalAmbil={tanggalAmbil}
        onClose={() => setTerpilihId(null)}
        onUbahStatus={ubahStatus}
        onSimpanCatatan={simpanCatatan}
      />

      <KonfirmasiDialog
        open={dialogKadaluarsa}
        onOpenChange={setDialogKadaluarsa}
        judul="Batalkan pesanan belum bayar lebih dari 24 jam?"
        deskripsi="Semua pesanan berstatus menunggu bayar yang dibuat lebih dari 24 jam lalu akan dibatalkan dan kuotanya dilepas kembali."
        labelAksi="Ya, Batalkan"
        berbahaya
        sibuk={sibukKadaluarsa}
        onKonfirmasi={batalkanKadaluarsa}
      />
    </div>
  );
}

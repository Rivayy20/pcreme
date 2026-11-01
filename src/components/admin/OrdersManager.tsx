"use client";

import { Download, Loader2, RefreshCw, Search, TimerOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KonfirmasiDialog } from "@/components/admin/KonfirmasiDialog";
import { OrderDetailSheet, type SimpanCatatanFn, type UbahStatusFn } from "@/components/admin/OrderDetailSheet";
import { StatusBadge } from "@/components/public/StatusBadge";
import { lokasiPesanan } from "@/lib/admin";
import { buatCsvPesanan, unduhCsv } from "@/lib/csv";
import { normalisasiWa, rupiah, tanggalJam } from "@/lib/format";
import { STATUS_LABEL, STATUS_URUTAN } from "@/lib/status";
import { createClient } from "@/lib/supabase/client";
import type { OrderDenganRelasi, OrderStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEMUA_STATUS: OrderStatus[] = [...STATUS_URUTAN, "dibatalkan"];
const POLLING_MS = 30_000;

interface OrdersManagerProps {
  periodId: string;
  periodNama: string;
  tanggalAmbil: string;
  /** Pesanan yang dibuka otomatis (mis. dari tautan di Ringkasan). */
  orderAwal?: string;
}

export function OrdersManager({ periodId, periodNama, tanggalAmbil, orderAwal }: OrdersManagerProps) {
  const supabase = useMemo(() => createClient(), []);
  const [orders, setOrders] = useState<OrderDenganRelasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "semua">("semua");
  const [cari, setCari] = useState("");
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

  // Realtime (bila diaktifkan di Supabase) + polling 30 detik saat tab terlihat sebagai cadangan.
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

  const hitung = useMemo(() => {
    const m = new Map<OrderStatus | "semua", number>([["semua", orders.length]]);
    for (const s of SEMUA_STATUS) m.set(s, 0);
    for (const o of orders) m.set(o.status, (m.get(o.status) ?? 0) + 1);
    return m;
  }, [orders]);

  const tampil = useMemo(() => {
    const q = cari.trim().toLowerCase();
    const digit = q.replace(/\D/g, "");
    const waQ = digit.length >= 3 ? normalisasiWa(digit) : "";
    return orders.filter((o) => {
      if (filterStatus !== "semua" && o.status !== filterStatus) return false;
      if (!q) return true;
      return (
        o.nama.toLowerCase().includes(q) ||
        o.kode.toLowerCase().includes(q) ||
        (waQ !== "" && o.wa.includes(waQ))
      );
    });
  }, [orders, filterStatus, cari]);

  const terpilih = orders.find((o) => o.id === terpilihId) ?? null;

  const ubahStatus: UbahStatusFn = useCallback(
    async (order, status, catatanAdmin) => {
      const patch: { status: OrderStatus; catatan_admin?: string } = { status };
      if (catatanAdmin !== undefined) patch.catatan_admin = catatanAdmin;
      // Syarat status lama mencegah menimpa perubahan admin lain yang bersamaan.
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
        toast.error("Status pesanan sudah berubah (mungkin oleh admin lain). Data dimuat ulang.");
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
    toast.success(`${tampil.length} pesanan diekspor`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 basis-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <label htmlFor="cari" className="sr-only">
            Cari pesanan
          </label>
          <Input
            id="cari"
            type="search"
            placeholder="Cari nama, kode, atau WA"
            className="h-11 pl-9"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
          />
        </div>
        <Button type="button" variant="outline" className="h-11" onClick={() => void muat()} aria-label="Muat ulang">
          <RefreshCw aria-hidden /> <span className="hidden sm:inline">Muat ulang</span>
        </Button>
        <Button type="button" variant="outline" className="h-11" onClick={ekspor}>
          <Download aria-hidden /> CSV
        </Button>
        <Button type="button" variant="outline" className="h-11" onClick={() => setDialogKadaluarsa(true)}>
          <TimerOff aria-hidden /> <span className="hidden sm:inline">Batalkan belum bayar &gt; 24 jam</span>
          <span className="sm:hidden">&gt; 24 jam</span>
        </Button>
      </div>

      <div role="tablist" aria-label="Filter status" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
        {(["semua", ...SEMUA_STATUS] as const).map((s) => {
          const aktif = filterStatus === s;
          return (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={aktif}
              onClick={() => setFilterStatus(s)}
              className={cn(
                "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                aktif ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-muted",
              )}
            >
              {s === "semua" ? "Semua" : STATUS_LABEL[s]}
              <span className={cn("rounded-full px-1.5 text-xs tabular-nums", aktif ? "bg-white/20" : "bg-muted")}>
                {hitung.get(s) ?? 0}
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
          <Loader2 className="size-4 animate-spin" aria-hidden /> Memuat pesanan…
        </div>
      ) : tampil.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          {orders.length === 0 ? "Belum ada pesanan di periode ini." : "Tidak ada pesanan yang cocok dengan filter."}
        </p>
      ) : (
        <>
          {/* Tabel (md ke atas) */}
          <div className="hidden overflow-x-auto rounded-2xl border bg-card md:block">
            <table className="w-full text-sm">
              <caption className="sr-only">Daftar pesanan periode {periodNama}</caption>
              <thead className="bg-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th scope="col" className="px-3 py-2 font-medium">Kode</th>
                  <th scope="col" className="px-3 py-2 font-medium">Nama</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Cup</th>
                  <th scope="col" className="px-3 py-2 text-right font-medium">Total</th>
                  <th scope="col" className="px-3 py-2 font-medium">Pengambilan</th>
                  <th scope="col" className="px-3 py-2 font-medium">Status</th>
                  <th scope="col" className="px-3 py-2 font-medium">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {tampil.map((o) => (
                  <tr key={o.id} className="hover:bg-muted/40">
                    <td className="whitespace-nowrap px-3 py-2 font-semibold">
                      <button
                        type="button"
                        onClick={() => setTerpilihId(o.id)}
                        className="rounded underline-offset-2 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/60"
                      >
                        {o.kode}
                      </button>
                    </td>
                    <td className="px-3 py-2">{o.nama}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{o.jumlah_cup}</td>
                    <td className="px-3 py-2 text-right tabular-nums">{rupiah(o.total)}</td>
                    <td className="max-w-40 truncate px-3 py-2" title={lokasiPesanan(o)}>
                      {lokasiPesanan(o)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-xs text-muted-foreground">{tanggalJam(o.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Kartu (mobile) */}
          <ul className="grid gap-2 md:hidden">
            {tampil.map((o) => (
              <li key={o.id}>
                <button
                  type="button"
                  onClick={() => setTerpilihId(o.id)}
                  className="w-full space-y-1 rounded-2xl border bg-card p-3 text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
                >
                  <span className="flex items-start justify-between gap-2">
                    <span className="font-semibold">
                      {o.kode} · {o.nama}
                    </span>
                    <StatusBadge status={o.status} />
                  </span>
                  <span className="block text-sm">
                    {o.jumlah_cup} cup · {rupiah(o.total)}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{lokasiPesanan(o)}</span>
                  <span className="block text-xs text-muted-foreground">{tanggalJam(o.created_at)}</span>
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      <p className="text-xs text-muted-foreground" aria-live="polite">
        Menampilkan {tampil.length} dari {orders.length} pesanan. Diperbarui otomatis.
      </p>

      <OrderDetailSheet
        order={terpilih}
        tanggalAmbil={tanggalAmbil}
        onClose={() => setTerpilihId(null)}
        onUbahStatus={ubahStatus}
        onSimpanCatatan={simpanCatatan}
      />

      <KonfirmasiDialog
        open={dialogKadaluarsa}
        onOpenChange={setDialogKadaluarsa}
        judul="Batalkan pesanan belum bayar lebih dari 24 jam?"
        deskripsi="Semua pesanan berstatus menunggu bayar yang dibuat lebih dari 24 jam lalu akan dibatalkan dan kuotanya dilepas. Berlaku untuk semua periode."
        labelAksi="Ya, batalkan"
        berbahaya
        sibuk={sibukKadaluarsa}
        onKonfirmasi={batalkanKadaluarsa}
      />
    </div>
  );
}

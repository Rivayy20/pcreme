"use client";

import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  History,
  ImageOff,
  Loader2,
  Maximize2,
  MessageCircle,
  Package,
  RefreshCw,
  Truck,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { KonfirmasiDialog } from "@/components/admin/KonfirmasiDialog";
import { OrderProgressBadge, PaymentStatusBadge } from "@/components/public/StatusBadge";
import { lokasiPesanan } from "@/lib/admin";
import { rupiah, tampilWa, tanggalJam, tanggalPanjang } from "@/lib/format";
import {
  formatCatatanPenolakan,
  formatCatatanSetujui,
  parseAlamatAntar,
  parseCatatanPesanan,
  parseInfoPenolakan,
} from "@/lib/order-meta";
import {
  STATUS_BERIKUTNYA,
  bersihAlasanTolak,
  bisaDibatalkan,
  isPaymentRejected,
} from "@/lib/status";
import { createClient } from "@/lib/supabase/client";
import { DAFTAR_ALASAN_TOLAK, type OrderDenganRelasi, type OrderStatus } from "@/lib/types";
import { linkWa, templatePesanAdmin } from "@/lib/wa";

export type UbahStatusFn = (
  order: OrderDenganRelasi,
  status: OrderStatus,
  catatanAdmin?: string,
) => Promise<boolean>;
export type SimpanCatatanFn = (order: OrderDenganRelasi, catatan: string) => Promise<boolean>;

interface OrderDetailSheetProps {
  order: OrderDenganRelasi | null;
  periodNama?: string;
  tanggalAmbil: string;
  onClose: () => void;
  onUbahStatus: UbahStatusFn;
  onSimpanCatatan: SimpanCatatanFn;
}

export function OrderDetailSheet({
  order,
  periodNama,
  tanggalAmbil,
  onClose,
  onUbahStatus,
  onSimpanCatatan,
}: OrderDetailSheetProps) {
  return (
    <Sheet open={!!order} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {order && (
          <DetailIsi
            key={order.id}
            order={order}
            periodNama={periodNama}
            tanggalAmbil={tanggalAmbil}
            onUbahStatus={onUbahStatus}
            onSimpanCatatan={onSimpanCatatan}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

function Baris({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 gap-0.5 text-sm min-[380px]:grid-cols-[7.5rem_1fr] min-[380px]:gap-2">
      <dt className="text-xs text-muted-foreground min-[380px]:text-sm">{label}</dt>
      <dd className="min-w-0 wrap-break-word font-medium text-foreground">{children}</dd>
    </div>
  );
}

/** Bukti bayar via signed URL (300 dtk). */
function BuktiBayar({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [besar, setBesar] = useState(false);

  useEffect(() => {
    let batal = false;
    void createClient()
      .storage.from("bukti-bayar")
      .createSignedUrl(path, 300)
      .then(({ data, error: err }) => {
        if (batal) return;
        if (err || !data) setError(err?.message ?? "Gagal membuat tautan bukti.");
        else {
          setUrl(data.signedUrl);
          setError(null);
        }
      });
    return () => {
      batal = true;
    };
  }, [path, tick]);

  const muatUlang = () => {
    setUrl(null);
    setError(null);
    setTick((t) => t + 1);
  };

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
      >
        <ImageOff className="size-4 shrink-0" aria-hidden />
        <span className="flex-1">{error}</span>
        <Button type="button" variant="outline" className="h-9" onClick={muatUlang}>
          Coba lagi
        </Button>
      </div>
    );
  }
  if (!url) {
    return (
      <div
        className="flex h-40 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground"
        role="status"
      >
        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> Memuat bukti pembayaran…
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setBesar(true)}
          className="group relative block w-full overflow-hidden rounded-xl border bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
          aria-label="Perbesar bukti bayar"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL privat */}
          <img
            src={url}
            alt="Bukti bayar pelanggan"
            className="mx-auto max-h-64 object-contain"
            onError={() => setError("Tautan bukti kedaluwarsa atau gagal dimuat.")}
          />
        </button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 w-full rounded-xl text-xs"
          onClick={() => setBesar(true)}
        >
          <Maximize2 className="size-3.5" aria-hidden /> Perbesar Bukti Pembayaran
        </Button>
      </div>
      <Dialog open={besar} onOpenChange={setBesar}>
        <DialogContent className="max-h-[92vh] overflow-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bukti Pembayaran</DialogTitle>
            <DialogDescription>Tautan aman berlaku selama 5 menit.</DialogDescription>
          </DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL privat */}
          <img
            src={url}
            alt="Bukti bayar (diperbesar)"
            className="mx-auto max-h-[75vh] w-auto object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetailIsi({
  order,
  periodNama,
  tanggalAmbil,
  onUbahStatus,
  onSimpanCatatan,
}: Omit<OrderDetailSheetProps, "onClose" | "order"> & { order: OrderDenganRelasi }) {
  const [adminEmail, setAdminEmail] = useState<string>("Admin");
  const [previewBuktiPath, setPreviewBuktiPath] = useState<string | null>(null);
  const [catatanAdminInput, setCatatanAdminInput] = useState(
    bersihAlasanTolak(order.catatan_admin) ?? "",
  );
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"batal" | "tolak" | "bayar-manual" | null>(null);
  const [alasanPilihan, setAlasanPilihan] = useState<string>(DAFTAR_ALASAN_TOLAK[0]);
  const [catatanPenolakanInput, setCatatanPenolakanInput] = useState("");
  const [errorAlasan, setErrorAlasan] = useState<string | undefined>();

  useEffect(() => {
    void createClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data?.user?.email) setAdminEmail(data.user.email);
      });
  }, []);

  const meta = parseCatatanPesanan(order.catatan, order.order_items);
  const detailAntar =
    order.fulfillment === "antar" ? parseAlamatAntar(order.alamat_antar) : null;

  const berikutnya = STATUS_BERIKUTNYA[order.status];
  const lokasi = order.pickup_points
    ? `${order.pickup_points.nama} (${order.pickup_points.jam})`
    : null;
  const pesanWa = templatePesanAdmin(order.status, { order, lokasi, tanggalAmbil });

  const infoTolak = parseInfoPenolakan(order.catatan_admin, {
    alasanPenolakan: order.alasan_penolakan,
    catatanPenolakan: order.catatan_penolakan,
    riwayat: order.riwayat_pembayaran,
    buktiBayarPath: order.bukti_bayar_path,
    buktiUploadedAt: order.bukti_uploaded_at,
  });

  const pernahDitolak = isPaymentRejected(order.status, {
    catatanAdmin: order.catatan_admin,
    buktiBayarPath: order.bukti_bayar_path,
    alasanPenolakan: order.alasan_penolakan,
  });

  // Label tombol aksi status pesanan sesuai metode pengambilan (pickup vs delivery)
  function labelTransisiBerikutnya(st: OrderStatus): string {
    if (st === "dibayar") return "Mulai Proses Produksi (Processing)";
    if (st === "diproses") {
      return order.fulfillment === "antar"
        ? "Tandai Dalam Pengantaran (Out for Delivery)"
        : "Tandai Siap Diambil (Ready for Pickup)";
    }
    if (st === "siap") return "Tandai Pesanan Selesai (Completed)";
    return "Lanjutkan Status";
  }

  async function jalankan(nama: string, fn: () => Promise<boolean>): Promise<boolean> {
    setSibuk(nama);
    const ok = await fn();
    setSibuk(null);
    return ok;
  }

  async function setujuiPembayaran() {
    const { catatanAdmin: catatanBaru } = formatCatatanSetujui({
      adminEmail,
      buktiBayarPath: order.bukti_bayar_path,
      riwayatLama: infoTolak.riwayat,
      catatanInternal: catatanAdminInput,
    });
    const ok = await jalankan("bayar", () => onUbahStatus(order, "dibayar", catatanBaru));
    setDialog(null);
    return ok;
  }

  async function ubah(nama: string, status: OrderStatus) {
    const ok = await jalankan(nama, () => onUbahStatus(order, status));
    setDialog(null);
    return ok;
  }

  async function tolakPembayaran() {
    if (!alasanPilihan) {
      setErrorAlasan("Pilih salah satu alasan penolakan.");
      return;
    }
    if (alasanPilihan === "Alasan lainnya" && !catatanPenolakanInput.trim()) {
      setErrorAlasan("Tuliskan catatan rincian alasan penolakan untuk pelanggan.");
      return;
    }
    const { catatanAdmin: catatanBaru } = formatCatatanPenolakan({
      alasan: alasanPilihan,
      catatanTambahan: catatanPenolakanInput,
      adminEmail,
      buktiBayarPath: order.bukti_bayar_path,
      riwayatLama: infoTolak.riwayat,
    });
    const ok = await jalankan("tolak", () =>
      onUbahStatus(order, "menunggu_bayar", catatanBaru),
    );
    if (ok) {
      setCatatanAdminInput(alasanPilihan);
      setDialog(null);
      setAlasanPilihan(DAFTAR_ALASAN_TOLAK[0]);
      setCatatanPenolakanInput("");
      setErrorAlasan(undefined);
    }
  }

  return (
    <>
      <SheetHeader className="border-b pb-4 pr-12">
        <SheetTitle className="flex flex-wrap items-center gap-2 font-heading text-xl">
          <span>{order.kode}</span>
          <PaymentStatusBadge
            status={order.status}
            catatanAdmin={order.catatan_admin}
            buktiBayarPath={order.bukti_bayar_path}
          />
          <OrderProgressBadge status={order.status} fulfillment={order.fulfillment} />
        </SheetTitle>
        <SheetDescription>
          {order.nama} · Dipesan {tanggalJam(order.created_at)}
          {periodNama ? ` · ${periodNama}` : ""}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-5 px-4 pb-8 pt-4">
        {/* 1. Informasi Pelanggan & Pengambilan */}
        <section aria-label="Informasi pemesan" className="rounded-2xl border bg-secondary/40 p-4">
          <h3 className="mb-3 font-heading text-xs font-bold uppercase tracking-wider text-primary">
            Data Pelanggan &amp; Pengambilan
          </h3>
          <dl className="space-y-2">
            <Baris label="Nama Pelanggan">{order.nama}</Baris>
            <Baris label="WhatsApp">
              <a
                href={linkWa(order.wa)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-primary underline"
              >
                {tampilWa(order.wa)}
              </a>
            </Baris>
            <Baris label="Kategori / Asal">{order.asal}</Baris>
            <Baris label="Metode Ambil">
              {order.fulfillment === "antar" ? "Diantar (Delivery)" : "Ambil di Titik Kumpul (Pickup)"}
            </Baris>
            <Baris label="Lokasi">{lokasiPesanan(order)}</Baris>
            {detailAntar?.patokan && <Baris label="Patokan Lokasi">{detailAntar.patokan}</Baris>}
            {detailAntar?.kontakAntar && (
              <Baris label="Kontak Penerima">{detailAntar.kontakAntar}</Baris>
            )}
            <Baris label="Jadwal Ambil">{tanggalPanjang(tanggalAmbil)}</Baris>
            {meta.catatanPelanggan && (
              <Baris label="Catatan Pembeli">{meta.catatanPelanggan}</Baris>
            )}
          </dl>
        </section>

        {/* 2. Konfigurasi Setiap Cup Secara Lengkap */}
        <section aria-label="Konfigurasi setiap cup" className="space-y-3 rounded-2xl border bg-card p-4">
          <div className="flex items-center justify-between border-b pb-2.5">
            <h3 className="flex items-center gap-1.5 font-heading text-sm font-bold text-foreground">
              <Package className="size-4 text-primary" aria-hidden />
              Konfigurasi Setiap Cup ({order.jumlah_cup} cup)
            </h3>
            <span className="text-xs font-semibold text-muted-foreground">
              {rupiah(order.harga_satuan)} / cup
            </span>
          </div>

          <ul className="divide-y">
            {meta.cups.map((cup) => (
              <li key={cup.nomor} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 font-heading text-xs font-bold text-primary">
                      Cup #{cup.nomor}
                    </span>
                    <span className="font-heading font-bold text-foreground">{cup.labelRasa}</span>
                    {cup.isMix && (
                      <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-semibold text-accent-foreground">
                        Mix
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {cup.topping.length > 0
                      ? `Topping: ${cup.topping.join(" + ")}`
                      : "Tanpa topping"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="font-heading font-bold text-foreground">{cup.qty} cup</span>
                  <span className="block text-xs text-muted-foreground">
                    {rupiah(cup.qty * order.harga_satuan)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between border-t pt-3 text-sm">
            <span className="font-medium text-muted-foreground">
              Total ({order.jumlah_cup} cup × {rupiah(order.harga_satuan)})
            </span>
            <span className="font-heading text-lg font-extrabold text-primary">
              {rupiah(order.total)}
            </span>
          </div>
        </section>

        {/* 3. Informasi & Verifikasi Pembayaran */}
        <section aria-label="Verifikasi pembayaran" className="space-y-3 rounded-2xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="flex items-center gap-1.5 font-heading text-sm font-bold text-foreground">
                <CreditCard className="size-4 text-primary" aria-hidden />
                Pembayaran ({meta.labelMetodeBayar})
              </h3>
              {order.status === "menunggu_verifikasi" &&
                (infoTolak.attemptCount > 1 || infoTolak.riwayat.some((r) => r.tipe === "rejection")) && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-900">
                    <RefreshCw className="size-3 text-amber-700" aria-hidden /> Upload Ulang (Percobaan ke-{infoTolak.attemptCount})
                  </span>
                )}
            </div>
            <PaymentStatusBadge
              status={order.status}
              catatanAdmin={order.catatan_admin}
              buktiBayarPath={order.bukti_bayar_path}
            />
          </div>

          {pernahDitolak && (
            <div className="space-y-1.5 rounded-xl border border-red-200 bg-red-50/90 p-3.5 text-xs text-red-950">
              <div className="flex items-center gap-1.5 font-bold text-red-900">
                <XCircle className="size-4 shrink-0 text-red-600" aria-hidden /> Bukti Pembayaran Pernah Ditolak
              </div>
              <p>
                <strong>Alasan:</strong> {infoTolak.alasan ?? bersihAlasanTolak(order.catatan_admin) ?? "-"}
              </p>
              {infoTolak.catatanTambahan && (
                <p>
                  <strong>Catatan Admin:</strong> {infoTolak.catatanTambahan}
                </p>
              )}
              {infoTolak.waktuDitolak && (
                <p className="pt-0.5 text-[11px] text-muted-foreground">
                  Ditolak pada: {tanggalJam(infoTolak.waktuDitolak)}{" "}
                  {infoTolak.ditolakOleh ? `oleh ${infoTolak.ditolakOleh}` : ""}
                </p>
              )}
            </div>
          )}

          {order.bukti_bayar_path ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Bukti Pembayaran Terkini (Utama):</span>
                {order.bukti_uploaded_at && (
                  <span>Diunggah {tanggalJam(order.bukti_uploaded_at)}</span>
                )}
              </div>
              <BuktiBayar key={order.bukti_bayar_path} path={order.bukti_bayar_path} />
            </div>
          ) : (
            <p className="rounded-xl border border-dashed p-3.5 text-center text-xs text-muted-foreground">
              Pelanggan belum mengunggah bukti pembayaran.
            </p>
          )}

          {/* Tombol Aksi Verifikasi Pembayaran */}
          {order.status === "menunggu_verifikasi" && (
            <div className="flex flex-col gap-2.5 pt-1 min-[480px]:grid min-[480px]:grid-cols-2">
              <Button
                type="button"
                className="group inline-flex h-auto min-h-11 w-full min-w-0 items-center justify-center gap-2 whitespace-normal wrap-break-word rounded-xl bg-emerald-600 px-3.5 py-2.5 text-center font-heading text-xs font-semibold text-white shadow-2xs transition-all hover:bg-emerald-700 focus-visible:ring-3 focus-visible:ring-emerald-500/50 active:scale-[0.99] disabled:opacity-50 sm:text-sm"
                disabled={sibuk !== null}
                onClick={() => void setujuiPembayaran()}
              >
                {sibuk === "bayar" ? (
                  <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <CheckCircle2 className="size-4 shrink-0 text-white" aria-hidden />
                )}
                <span className="min-w-0">Setujui</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="group inline-flex h-auto min-h-11 w-full min-w-0 items-center justify-center gap-2 whitespace-normal wrap-break-word rounded-xl border-red-200 bg-background px-3.5 py-2.5 text-center font-heading text-xs font-semibold text-red-700 shadow-2xs transition-all hover:border-red-300 hover:bg-red-50/80 focus-visible:ring-3 focus-visible:ring-red-500/50 active:scale-[0.99] disabled:opacity-50 sm:text-sm"
                disabled={sibuk !== null}
                onClick={() => {
                  setErrorAlasan(undefined);
                  setDialog("tolak");
                }}
              >
                <XCircle className="size-4 shrink-0 text-red-600" aria-hidden />
                <span className="min-w-0">Tolak</span>
              </Button>
            </div>
          )}

          {order.status === "menunggu_bayar" && (
            <Button
              variant="outline"
              className="h-auto min-h-10 w-full whitespace-normal rounded-xl py-2 text-xs"
              disabled={sibuk !== null}
              onClick={() => setDialog("bayar-manual")}
            >
              Tandai Sudah Dibayar Manual (Tanpa / Cek Mutasi)
            </Button>
          )}

          {/* Riwayat Pembayaran (Payment History Timeline) */}
          {infoTolak.riwayat.length > 0 && (
            <div className="mt-4 border-t pt-3">
              <h4 className="mb-3 flex items-center gap-1.5 font-heading text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <History className="size-3.5 text-primary" aria-hidden />
                Riwayat Pembayaran &amp; Verifikasi ({infoTolak.riwayat.length})
              </h4>
              <ol className="relative ml-2 space-y-3.5 border-l border-border/80 pl-4 text-xs">
                {infoTolak.riwayat.map((hist, idx) => (
                  <li key={hist.id || idx} className="relative space-y-1">
                    <div
                      className={`absolute -left-5.25 mt-0.5 size-2.5 rounded-full ring-2 ring-background ${
                        hist.tipe === "approval"
                          ? "bg-emerald-600"
                          : hist.tipe === "rejection"
                            ? "bg-red-600"
                            : "bg-sky-600"
                      }`}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-1">
                      <span className="font-semibold text-foreground">
                        {hist.tipe === "upload" && "Bukti Pembayaran Diunggah"}
                        {hist.tipe === "rejection" && "Bukti Pembayaran Ditolak"}
                        {hist.tipe === "approval" && "Pembayaran Disetujui (Lunas)"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {tanggalJam(hist.waktu)}
                      </span>
                    </div>
                    {hist.alasan && (
                      <p className="font-medium text-red-700">Alasan: {hist.alasan}</p>
                    )}
                    {hist.catatan && (
                      <p className="text-muted-foreground">Catatan: {hist.catatan}</p>
                    )}
                    {hist.adminEmail && (
                      <p className="text-[10px] text-muted-foreground">Oleh: {hist.adminEmail}</p>
                    )}
                    {hist.buktiPath && hist.buktiPath !== order.bukti_bayar_path && (
                      <button
                        type="button"
                        onClick={() => setPreviewBuktiPath(hist.buktiPath ?? null)}
                        className="text-[11px] font-semibold text-primary underline hover:text-primary/80"
                      >
                        Lihat arsip bukti ini
                      </button>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>

        {/* 4. Manajemen Status Pesanan (Terpisah dari Verifikasi Pembayaran) */}
        <section aria-label="Manajemen status pesanan" className="space-y-3 rounded-2xl border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2.5">
            <h3 className="flex items-center gap-1.5 font-heading text-sm font-bold text-foreground">
              <Truck className="size-4 text-primary" aria-hidden />
              Status Operasional Pesanan
            </h3>
            <OrderProgressBadge status={order.status} fulfillment={order.fulfillment} />
          </div>

          <p className="text-xs text-muted-foreground">
            Alur transisi:{" "}
            {order.fulfillment === "antar"
              ? "Pending → Confirmed → Processing → Out for Delivery → Completed"
              : "Pending → Confirmed → Processing → Ready for Pickup → Completed"}
          </p>

          <div className="grid gap-2">
            {berikutnya && (
              <Button
                className="h-auto min-h-11 whitespace-normal rounded-xl py-2.5 text-center font-heading font-semibold"
                disabled={sibuk !== null}
                onClick={() => void ubah("lanjut", berikutnya)}
              >
                {sibuk === "lanjut" && <Loader2 className="animate-spin" aria-hidden />}{" "}
                {labelTransisiBerikutnya(order.status)}
              </Button>
            )}

            <a
              href={linkWa(order.wa, pesanWa)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-center text-xs font-semibold text-white outline-none hover:bg-emerald-700 focus-visible:ring-3 focus-visible:ring-ring/60 sm:text-sm"
            >
              <MessageCircle className="size-4 shrink-0" aria-hidden /> Kirim Notifikasi WhatsApp ke Pelanggan
            </a>

            {bisaDibatalkan(order.status) && (
              <Button
                variant="destructive"
                className="h-auto min-h-10 whitespace-normal rounded-xl py-2 text-xs"
                disabled={sibuk !== null}
                onClick={() => setDialog("batal")}
              >
                Batalkan Pesanan (Kembalikan Kuota)
              </Button>
            )}
          </div>

          <details className="rounded-xl border bg-muted/50 p-3 text-xs">
            <summary className="cursor-pointer font-medium">Lihat draf pesan WhatsApp</summary>
            <p className="mt-2 whitespace-pre-line text-muted-foreground">{pesanWa}</p>
          </details>
        </section>

        {/* 5. Catatan Internal Admin */}
        <section aria-label="Catatan admin" className="space-y-2 rounded-2xl border bg-card p-4">
          <label htmlFor="catatan-admin" className="font-heading text-sm font-bold text-foreground">
            Catatan Admin
          </label>
          <Textarea
            id="catatan-admin"
            rows={2}
            className="text-sm"
            placeholder="Catatan internal admin untuk pesanan ini…"
            value={catatanAdminInput}
            onChange={(e) => setCatatanAdminInput(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9 rounded-xl text-xs"
            disabled={
              sibuk !== null ||
              catatanAdminInput === (bersihAlasanTolak(order.catatan_admin) ?? "")
            }
            onClick={() =>
              void jalankan("catatan", () => onSimpanCatatan(order, catatanAdminInput))
            }
          >
            {sibuk === "catatan" && <Loader2 className="animate-spin" aria-hidden />} Simpan Catatan
          </Button>
        </section>
      </div>

      {/* Dialog Konfirmasi Batal & Bayar Manual */}
      <KonfirmasiDialog
        open={dialog === "batal"}
        onOpenChange={(o) => !o && setDialog(null)}
        judul={`Batalkan pesanan ${order.kode}?`}
        deskripsi="Pesanan akan dibatalkan dan kuota cup akan dikembalikan ke batch PO."
        labelAksi="Ya, Batalkan Pesanan"
        berbahaya
        sibuk={sibuk === "batal"}
        onKonfirmasi={() => ubah("batal", "dibatalkan")}
      />
      <KonfirmasiDialog
        open={dialog === "bayar-manual"}
        onOpenChange={(o) => !o && setDialog(null)}
        judul="Verifikasi Pembayaran Manual?"
        deskripsi={`Tandai pesanan ${order.kode} sebagai Paid (Lunas) dan Dikonfirmasi. Gunakan ini jika pembayaran sudah dipastikan melalui mutasi rekening/QRIS.`}
        labelAksi="Ya, Setujui Pembayaran"
        sibuk={sibuk === "bayar-manual"}
        onKonfirmasi={() => setujuiPembayaran()}
      />

      {/* Dialog Tolak Bukti Pembayaran */}
      <Dialog
        open={dialog === "tolak"}
        onOpenChange={(o) => !o && sibuk === null && setDialog(null)}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-heading text-lg font-bold text-red-950">
              Tolak Bukti Pembayaran
            </DialogTitle>
            <DialogDescription className="text-xs">
              Pilih alasan penolakan dan berikan catatan. Status pembayaran akan menjadi <strong>Bukti Ditolak</strong>, dan pelanggan dapat mengunggah ulang bukti pembayaran baru tanpa kehilangan pesanan.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* 1. Pilihan 6 Alasan Penolakan */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Pilih Alasan Penolakan <span className="text-destructive">*</span>
              </label>
              <div className="space-y-1.5">
                {DAFTAR_ALASAN_TOLAK.map((alsn) => {
                  const aktif = alasanPilihan === alsn;
                  return (
                    <label
                      key={alsn}
                      className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-xs transition-colors ${
                        aktif
                          ? "border-red-400 bg-red-50/80 font-semibold text-red-950 ring-1 ring-red-400"
                          : "border-border text-foreground hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="alasan-tolak-radio"
                        value={alsn}
                        checked={aktif}
                        onChange={() => {
                          setAlasanPilihan(alsn);
                          if (errorAlasan) setErrorAlasan(undefined);
                        }}
                        className="size-4 accent-red-600"
                      />
                      <span>{alsn}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* 2. Catatan Tambahan Admin */}
            <div className="space-y-1.5">
              <label htmlFor="catatan-tolak" className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Catatan Tambahan untuk Pelanggan{" "}
                {alasanPilihan === "Alasan lainnya" ? (
                  <span className="text-destructive">(Wajib Diisi)</span>
                ) : (
                  "(Opsional)"
                )}
              </label>
              <Textarea
                id="catatan-tolak"
                rows={3}
                placeholder={
                  alasanPilihan === "Nominal pembayaran tidak sesuai"
                    ? "Contoh: Tagihan Rp45.000, nominal transfer yang masuk Rp30.000 (kurang Rp15.000)."
                    : alasanPilihan === "Alasan lainnya"
                      ? "Tuliskan alasan spesifik mengapa bukti pembayaran ini ditolak..."
                      : "Tuliskan catatan detail untuk membantu pelanggan memperbaiki pembayaran..."
                }
                className="text-xs"
                value={catatanPenolakanInput}
                onChange={(e) => {
                  setCatatanPenolakanInput(e.target.value);
                  if (errorAlasan) setErrorAlasan(undefined);
                }}
                aria-invalid={!!errorAlasan}
                aria-describedby={errorAlasan ? "catatan-tolak-error" : undefined}
              />
              {errorAlasan && (
                <p id="catatan-tolak-error" role="alert" className="text-xs font-medium text-destructive">
                  {errorAlasan}
                </p>
              )}
            </div>

            {/* 3. Pratinjau Ringkasan Penolakan Sebelum Konfirmasi */}
            <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-950">
              <p className="flex items-center gap-1 font-bold text-amber-900">
                <AlertCircle className="size-3.5 text-amber-700" aria-hidden /> Pratinjau Tampilan untuk Pelanggan:
              </p>
              <p>
                <strong>Alasan:</strong> {alasanPilihan}
              </p>
              <p>
                <strong>Catatan:</strong>{" "}
                {catatanPenolakanInput.trim() ? catatanPenolakanInput.trim() : "(Tidak ada catatan tambahan)"}
              </p>
              <p className="pt-1 text-[11px] text-muted-foreground">
                Setelah dikonfirmasi, pesanan tetap aktif dan pelanggan dapat langsung mengirim ulang bukti baru di halaman pelacakan pesanan.
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              className="h-10 rounded-xl"
              disabled={sibuk === "tolak"}
              onClick={() => setDialog(null)}
            >
              Batal
            </Button>
            <Button
              variant="destructive"
              className="h-10 rounded-xl bg-red-600 hover:bg-red-700"
              disabled={sibuk === "tolak"}
              onClick={() => void tolakPembayaran()}
            >
              {sibuk === "tolak" && <Loader2 className="animate-spin" aria-hidden />} Konfirmasi Tolak Bukti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Lihat Arsip Bukti Pembayaran dari Riwayat */}
      {previewBuktiPath && (
        <Dialog open={!!previewBuktiPath} onOpenChange={(o) => !o && setPreviewBuktiPath(null)}>
          <DialogContent className="max-h-[92vh] overflow-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Arsip Bukti Pembayaran</DialogTitle>
              <DialogDescription>Bukti pembayaran dari riwayat sebelumnya.</DialogDescription>
            </DialogHeader>
            <BuktiBayar key={previewBuktiPath} path={previewBuktiPath} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

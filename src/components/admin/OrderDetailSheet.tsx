"use client";

import { ImageOff, Loader2, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { KonfirmasiDialog } from "@/components/admin/KonfirmasiDialog";
import { StatusBadge } from "@/components/public/StatusBadge";
import { lokasiPesanan } from "@/lib/admin";
import { rupiah, tampilWa, tanggalJam, tanggalPanjang } from "@/lib/format";
import { AKSI_LABEL, STATUS_BERIKUTNYA, bisaDibatalkan } from "@/lib/status";
import { createClient } from "@/lib/supabase/client";
import type { OrderDenganRelasi, OrderStatus } from "@/lib/types";
import { linkWa, templatePesanAdmin } from "@/lib/wa";

export type UbahStatusFn = (order: OrderDenganRelasi, status: OrderStatus, catatanAdmin?: string) => Promise<boolean>;
export type SimpanCatatanFn = (order: OrderDenganRelasi, catatan: string) => Promise<boolean>;

interface OrderDetailSheetProps {
  order: OrderDenganRelasi | null;
  tanggalAmbil: string;
  onClose: () => void;
  onUbahStatus: UbahStatusFn;
  onSimpanCatatan: SimpanCatatanFn;
}

export function OrderDetailSheet({ order, tanggalAmbil, onClose, onUbahStatus, onSimpanCatatan }: OrderDetailSheetProps) {
  return (
    <Sheet open={!!order} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        {order && (
          <DetailIsi
            key={order.id}
            order={order}
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
    <div className="grid grid-cols-[6.5rem_1fr] gap-2 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

/** Bukti bayar via signed URL (300 dtk). Di-key per path agar state ter-reset. */
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
      <div role="alert" className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
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
      <div className="flex h-40 items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground" role="status">
        <Loader2 className="mr-2 size-4 animate-spin" aria-hidden /> Memuat bukti…
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setBesar(true)}
        className="block w-full overflow-hidden rounded-xl border bg-muted outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
        aria-label="Perbesar bukti bayar"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- signed URL privat, tidak cocok untuk next/image */}
        <img
          src={url}
          alt="Bukti bayar"
          className="mx-auto max-h-64 object-contain"
          onError={() => setError("Tautan bukti kedaluwarsa atau gagal dimuat.")}
        />
      </button>
      <Dialog open={besar} onOpenChange={setBesar}>
        <DialogContent className="max-h-[92vh] overflow-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Bukti bayar</DialogTitle>
            <DialogDescription>Tautan berlaku 5 menit.</DialogDescription>
          </DialogHeader>
          {/* eslint-disable-next-line @next/next/no-img-element -- signed URL privat */}
          <img src={url} alt="Bukti bayar (diperbesar)" className="mx-auto max-h-[75vh] w-auto object-contain" />
        </DialogContent>
      </Dialog>
    </>
  );
}

function DetailIsi({
  order,
  tanggalAmbil,
  onUbahStatus,
  onSimpanCatatan,
}: Omit<OrderDetailSheetProps, "onClose" | "order"> & { order: OrderDenganRelasi }) {
  const [catatan, setCatatan] = useState(order.catatan_admin ?? "");
  const [sibuk, setSibuk] = useState<string | null>(null);
  const [dialog, setDialog] = useState<"batal" | "tolak" | "bayar-manual" | null>(null);
  const [alasanTolak, setAlasanTolak] = useState("");
  const [errorTolak, setErrorTolak] = useState<string | undefined>();

  const berikutnya = STATUS_BERIKUTNYA[order.status];
  const lokasi = order.pickup_points ? `${order.pickup_points.nama} (${order.pickup_points.jam})` : null;
  const pesanWa = templatePesanAdmin(order.status, { order, lokasi, tanggalAmbil });

  async function jalankan(nama: string, fn: () => Promise<boolean>): Promise<boolean> {
    setSibuk(nama);
    const ok = await fn();
    setSibuk(null);
    return ok;
  }

  async function ubah(nama: string, status: OrderStatus) {
    const ok = await jalankan(nama, () => onUbahStatus(order, status));
    setDialog(null);
    return ok;
  }

  async function tolak() {
    const alasan = alasanTolak.trim();
    if (!alasan) {
      setErrorTolak("Tulis alasan penolakan supaya pembeli tahu apa yang perlu diperbaiki.");
      return;
    }
    const ok = await jalankan("tolak", () => onUbahStatus(order, "menunggu_bayar", alasan));
    if (ok) {
      setCatatan(alasan);
      setDialog(null);
      setAlasanTolak("");
    }
  }

  return (
    <>
      <SheetHeader className="pr-12">
        <SheetTitle className="flex flex-wrap items-center gap-2 font-heading text-xl">
          {order.kode} <StatusBadge status={order.status} />
        </SheetTitle>
        <SheetDescription>
          {order.nama} · dipesan {tanggalJam(order.created_at)}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-5 px-4 pb-6">
        <dl className="space-y-2">
          <Baris label="WhatsApp">
            <a
              href={linkWa(order.wa)}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline"
            >
              {tampilWa(order.wa)}
            </a>
          </Baris>
          <Baris label="Asal">{order.asal}</Baris>
          <Baris label="Pengambilan">{lokasiPesanan(order)}</Baris>
          <Baris label="Tanggal ambil">{tanggalPanjang(tanggalAmbil)}</Baris>
          {order.catatan && <Baris label="Catatan pembeli">{order.catatan}</Baris>}
        </dl>

        <section aria-label="Item pesanan" className="rounded-2xl border bg-card p-3">
          <ul className="divide-y">
            {order.order_items.map((it) => (
              <li key={it.id} className="flex justify-between gap-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{it.rasa}</span>
                  {it.topping.length > 0 && (
                    <span className="block text-xs text-muted-foreground">+ {it.topping.join(", ")}</span>
                  )}
                </span>
                <span className="shrink-0 font-semibold">{it.qty} cup</span>
              </li>
            ))}
          </ul>
          <div className="flex justify-between border-t pt-2 text-sm">
            <span>
              Total · {order.jumlah_cup} cup × {rupiah(order.harga_satuan)}
            </span>
            <span className="font-heading font-bold">{rupiah(order.total)}</span>
          </div>
        </section>

        <section aria-label="Bukti bayar" className="space-y-2">
          <h3 className="font-heading text-sm font-semibold">Bukti bayar</h3>
          {order.bukti_bayar_path ? (
            <>
              <BuktiBayar key={order.bukti_bayar_path} path={order.bukti_bayar_path} />
              {order.bukti_uploaded_at && (
                <p className="text-xs text-muted-foreground">Diunggah {tanggalJam(order.bukti_uploaded_at)}</p>
              )}
            </>
          ) : (
            <p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">Belum ada bukti bayar.</p>
          )}
        </section>

        <section aria-label="Catatan admin" className="space-y-2">
          <label htmlFor="catatan-admin" className="font-heading text-sm font-semibold">
            Catatan admin
          </label>
          <Textarea
            id="catatan-admin"
            rows={3}
            className="text-base"
            value={catatan}
            onChange={(e) => setCatatan(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            className="h-11"
            disabled={sibuk !== null || catatan === (order.catatan_admin ?? "")}
            onClick={() => void jalankan("catatan", () => onSimpanCatatan(order, catatan))}
          >
            {sibuk === "catatan" && <Loader2 className="animate-spin" aria-hidden />} Simpan catatan
          </Button>
        </section>

        <section aria-label="Aksi" className="space-y-2 border-t pt-4">
          <h3 className="font-heading text-sm font-semibold">Aksi</h3>
          <div className="grid gap-2">
            {order.status === "menunggu_verifikasi" && (
              <>
                <Button className="h-11" disabled={sibuk !== null} onClick={() => void ubah("bayar", "dibayar")}>
                  {sibuk === "bayar" && <Loader2 className="animate-spin" aria-hidden />} Konfirmasi bayar
                </Button>
                <Button variant="outline" className="h-11" disabled={sibuk !== null} onClick={() => setDialog("tolak")}>
                  Tolak bukti
                </Button>
              </>
            )}
            {order.status === "menunggu_bayar" && (
              <Button variant="outline" className="h-11" disabled={sibuk !== null} onClick={() => setDialog("bayar-manual")}>
                Tandai sudah dibayar (tanpa bukti)
              </Button>
            )}
            {berikutnya && (
              <Button className="h-11" disabled={sibuk !== null} onClick={() => void ubah("lanjut", berikutnya)}>
                {sibuk === "lanjut" && <Loader2 className="animate-spin" aria-hidden />} {AKSI_LABEL[order.status]}
              </Button>
            )}
            <a
              href={linkWa(order.wa, pesanWa)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border bg-emerald-600 text-sm font-semibold text-white outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
            >
              <MessageCircle className="size-4" aria-hidden /> Kirim WhatsApp ({order.status === "dibatalkan" ? "pembatalan" : "sesuai status"})
            </a>
            {bisaDibatalkan(order.status) && (
              <Button variant="destructive" className="h-11" disabled={sibuk !== null} onClick={() => setDialog("batal")}>
                Batalkan pesanan
              </Button>
            )}
          </div>
          <details className="rounded-xl border bg-muted/50 p-3 text-xs">
            <summary className="cursor-pointer font-medium">Lihat teks WhatsApp</summary>
            <p className="mt-2 whitespace-pre-line">{pesanWa}</p>
          </details>
        </section>
      </div>

      <KonfirmasiDialog
        open={dialog === "batal"}
        onOpenChange={(o) => !o && setDialog(null)}
        judul={`Batalkan pesanan ${order.kode}?`}
        deskripsi="Pesanan dibatalkan dan kuotanya dilepas kembali. Ini tidak bisa diurungkan dari dashboard."
        labelAksi="Ya, batalkan"
        berbahaya
        sibuk={sibuk === "batal"}
        onKonfirmasi={() => ubah("batal", "dibatalkan")}
      />
      <KonfirmasiDialog
        open={dialog === "bayar-manual"}
        onOpenChange={(o) => !o && setDialog(null)}
        judul="Tandai sudah dibayar?"
        deskripsi={`Pesanan ${order.kode} belum punya bukti bayar. Pakai ini hanya bila pembayaran sudah kamu pastikan (mis. tunai atau cek mutasi).`}
        labelAksi="Ya, sudah dibayar"
        sibuk={sibuk === "bayar-manual"}
        onKonfirmasi={() => ubah("bayar-manual", "dibayar")}
      />

      <Dialog open={dialog === "tolak"} onOpenChange={(o) => !o && sibuk === null && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak bukti bayar</DialogTitle>
            <DialogDescription>
              Pesanan kembali ke &quot;Menunggu bayar&quot;. Alasan disimpan di catatan admin.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor="alasan-tolak" className="text-sm font-medium">
              Alasan penolakan
            </label>
            <Textarea
              id="alasan-tolak"
              rows={3}
              className="text-base"
              value={alasanTolak}
              onChange={(e) => setAlasanTolak(e.target.value)}
              aria-invalid={!!errorTolak}
              aria-describedby={errorTolak ? "alasan-tolak-error" : undefined}
            />
            {errorTolak && (
              <p id="alasan-tolak-error" role="alert" className="text-xs font-medium text-destructive">
                {errorTolak}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" className="h-11" disabled={sibuk === "tolak"} onClick={() => setDialog(null)}>
              Batal
            </Button>
            <Button className="h-11" disabled={sibuk === "tolak"} onClick={() => void tolak()}>
              {sibuk === "tolak" && <Loader2 className="animate-spin" aria-hidden />} Tolak bukti
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

"use client";

import {
  AlertCircle,
  Building2,
  CalendarDays,
  CreditCard,
  History,
  Info,
  Loader2,
  MapPin,
  Maximize2,
  MessageCircle,
  Package,
  QrCode,
  RefreshCw,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import logoImg from "@/assets/logo.png";
import qrisImg from "@/assets/qris.jpg";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/public/CopyButton";
import { Field, describedBy } from "@/components/public/Field";
import { OrderProgressBadge, PaymentStatusBadge } from "@/components/public/StatusBadge";
import { StatusStepper } from "@/components/public/StatusStepper";
import { UploadBukti } from "@/components/public/UploadBukti";
import { cekStatusPesanan } from "@/lib/api";
import { rupiah, tanggalJam, tanggalPanjang } from "@/lib/format";
import {
  instruksiLangkahPelanggan,
  normalisasiNamaRasa,
  parseAlamatAntar,
  parseInfoPembayaran,
  parseInfoPenolakan,
} from "@/lib/order-meta";
import { waSchema } from "@/lib/schemas";
import { bacaSesiMentah, parseSesi, simpanSesi } from "@/lib/session";
import { butuhPembayaran, isPaymentRejected } from "@/lib/status";
import type { StatusPesanan } from "@/lib/types";
import { linkWa, pesanKeAdmin } from "@/lib/wa";

const INTERVAL_MS = 30_000;
const noop = () => () => {};

export function PesananView({ kode, waAdmin }: { kode: string; waAdmin: string | null }) {
  const hydrated = useSyncExternalStore(noop, () => true, () => false);
  const raw = useSyncExternalStore(noop, bacaSesiMentah, () => "");
  const sesi = useMemo(() => parseSesi(raw, kode), [raw, kode]);
  const orderId = sesi?.order_id;
  const waAwal = sesi?.wa;

  const [wa, setWa] = useState<string | null>(null);
  const [data, setData] = useState<StatusPesanan | null>(null);
  const [loading, setLoading] = useState(false);
  const [sudahCoba, setSudahCoba] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorRefresh, setErrorRefresh] = useState<string | null>(null);
  const [inputWa, setInputWa] = useState<string | null>(null);
  const [errorInput, setErrorInput] = useState<string | undefined>();
  const [zoomQris, setZoomQris] = useState(false);
  const adaData = useRef(false);
  const sudahMulai = useRef(false);

  const muat = useCallback(
    async (nomor: string, opsi: { diam?: boolean } = {}) => {
      if (!opsi.diam) setLoading(true);
      const res = await cekStatusPesanan(kode, nomor);
      if (res.error !== null) {
        if (adaData.current) setErrorRefresh(res.error);
        else setError(res.error);
      } else {
        adaData.current = true;
        setData(res.data);
        setError(null);
        setErrorRefresh(null);
        setWa(nomor);
        const existing = parseSesi(bacaSesiMentah(), kode);
        simpanSesi({
          ...existing,
          kode,
          wa: nomor,
          order_id: existing?.order_id,
        });
      }
      setLoading(false);
      setSudahCoba(true);
    },
    [kode],
  );

  useEffect(() => {
    if (waAwal && !sudahMulai.current) {
      sudahMulai.current = true;
      void muat(waAwal);
    }
  }, [waAwal, muat]);

  useEffect(() => {
    if (!wa || !data) return;
    const tick = () => {
      if (document.visibilityState === "visible") void muat(wa, { diam: true });
    };
    const id = setInterval(tick, INTERVAL_MS);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [wa, data, muat]);

  const nilaiWa = inputWa ?? waAwal ?? "";

  function kirimWa(e: React.FormEvent) {
    e.preventDefault();
    const hasil = waSchema.safeParse(nilaiWa);
    if (!hasil.success) {
      setErrorInput(hasil.error.issues[0]?.message);
      return;
    }
    setErrorInput(undefined);
    setError(null);
    void muat(nilaiWa);
  }

  const memuatAwal = !!waAwal && !sudahCoba;
  if (!hydrated || memuatAwal || (loading && !data)) {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground" role="status">
        <Loader2 className="size-4 animate-spin" aria-hidden /> Memuat detail pesanan…
      </div>
    );
  }

  if (!data) {
    return (
      <form onSubmit={kirimWa} noValidate className="mx-auto max-w-lg space-y-4 rounded-3xl border bg-card p-6 shadow-xs">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Verifikasi Pelanggan</span>
          <h1 className="mt-1 font-heading text-xl font-bold text-foreground">Lihat Pesanan {kode}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Masukkan nomor WhatsApp yang digunakan saat memesan untuk memverifikasi dan membuka detail pesananmu.
          </p>
        </div>
        {error && (
          <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
            {error}
          </p>
        )}
        <Field id="wa" label="Nomor WhatsApp" hint="Contoh: 081234567890" error={errorInput}>
          <Input
            id="wa"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="081234567890"
            className="h-11"
            value={nilaiWa}
            onChange={(e) => setInputWa(e.target.value)}
            aria-invalid={!!errorInput}
            aria-describedby={describedBy("wa", "Contoh: 081234567890", errorInput)}
          />
        </Field>
        <Button type="submit" className="h-11 w-full rounded-full font-heading font-semibold" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" aria-hidden /> : null} Verifikasi &amp; Lihat Pesanan
        </Button>
      </form>
    );
  }

  const perluBayar = butuhPembayaran(data.status);
  const cfgBayar = parseInfoPembayaran(data.info_pembayaran);
  const metodePilihan = sesi?.metode_bayar ?? "qris";
  const idPesananAktif = data.order_id || orderId;

  const infoTolak = parseInfoPenolakan(data.catatan_admin, {
    alasanPenolakan: data.alasan_penolakan,
    catatanPenolakan: data.catatan_penolakan,
    riwayat: data.riwayat_pembayaran,
    buktiBayarPath: data.sudah_kirim_bukti ? "ada" : null,
  });

  const isDitolak = isPaymentRejected(data.status, {
    catatanAdmin: data.catatan_admin,
    sudahKirimBukti: data.sudah_kirim_bukti,
    alasanPenolakan: data.alasan_penolakan,
  });

  const labelMetode =
    sesi?.metode_bayar === "mandiri"
      ? "Transfer Bank Mandiri"
      : sesi?.metode_bayar === "qris"
        ? "QRIS P'crème"
        : cfgBayar.mandiri.aktif
          ? "QRIS / Transfer Bank Mandiri"
          : "QRIS P'crème";

  const cupsTampil =
    sesi?.cups && sesi.cups.length > 0
      ? sesi.cups
      : data.items.map((it, idx) => ({
          nomor: idx + 1,
          labelRasa: normalisasiNamaRasa(it.rasa),
          isMix: it.rasa.toLowerCase().startsWith("mix"),
          rasaMix: [],
          topping: it.topping,
          qty: it.qty,
        }));

  const detailLokasiAntar = data.fulfillment === "antar" ? parseAlamatAntar(data.lokasi) : null;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header Kode Pesanan & Ringkasan Status */}
      <section
        className="rounded-3xl border bg-card p-6 shadow-xs sm:p-7"
        aria-labelledby="kode-pesanan"
      >
        <div className="flex flex-col items-center justify-between gap-4 border-b pb-5 text-center sm:flex-row sm:text-left">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E9DDCE] bg-[#F5E1BE] shadow-2xs">
              <Image
                src={logoImg}
                alt="Logo Resmi P'crème"
                width={56}
                height={56}
                className="h-full w-full object-contain"
              />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Kode Pesanan Unik
              </p>
              <h1 id="kode-pesanan" className="mt-0.5 font-heading text-3xl font-extrabold tracking-wider text-primary sm:text-4xl">
                {data.kode}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Pemesan: <strong className="text-foreground">{data.nama}</strong> · Dibuat {tanggalJam(data.dibuat_pada)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-end">
            <CopyButton text={data.kode} label="Salin Kode" className="h-9 rounded-full text-xs" />
            <button
              type="button"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border bg-secondary/70 px-3.5 text-xs font-semibold text-foreground outline-none hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/60"
              onClick={() => wa && void muat(wa, { diam: true })}
            >
              <RefreshCw className="size-3.5" aria-hidden /> Segarkan Status
            </button>
          </div>
        </div>

        {/* Kartu Pemisahan Status Pembayaran & Status Pesanan */}
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border bg-secondary/50 p-3.5">
            <p className="text-xs font-medium text-muted-foreground">Status Pembayaran</p>
            <div className="mt-1.5">
              <PaymentStatusBadge
                status={data.status}
                sudahKirimBukti={data.sudah_kirim_bukti}
                catatanAdmin={data.catatan_admin}
                alasanPenolakan={data.alasan_penolakan}
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-secondary/50 p-3.5">
            <p className="text-xs font-medium text-muted-foreground">Status Pesanan</p>
            <div className="mt-1.5">
              <OrderProgressBadge
                status={data.status}
                fulfillment={data.fulfillment}
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-secondary/50 p-3.5">
            <p className="text-xs font-medium text-muted-foreground">Metode Pembayaran</p>
            <p className="mt-1.5 flex items-center gap-1.5 font-heading text-sm font-bold text-foreground">
              <CreditCard className="size-4 text-primary" aria-hidden />
              {labelMetode}
            </p>
          </div>
        </div>
      </section>

      {/* Timeline Progres 6 Tahap */}
      <section aria-label="Timeline status pesanan" className="rounded-3xl border bg-card p-5 shadow-xs sm:p-6">
        <div className="mb-4 flex items-center justify-between gap-2">
          <div>
            <h2 className="font-heading text-base font-bold text-foreground">Timeline Pelacakan Pesanan</h2>
            <p className="text-xs text-muted-foreground">Status diperbarui otomatis setiap 30 detik</p>
          </div>
        </div>
        <StatusStepper status={data.status} fulfillment={data.fulfillment} />
        {errorRefresh && (
          <p role="alert" className="mt-2 text-xs font-medium text-destructive">
            Gagal menyegarkan otomatis: {errorRefresh}
          </p>
        )}
      </section>

      {/* Banner / Notifikasi Penolakan Pembayaran (Soft Red / Pink) */}
      {isDitolak && (
        <section
          aria-label="Pemberitahuan penolakan pembayaran"
          className="space-y-4 rounded-3xl border border-rose-300 bg-rose-50/90 p-5 shadow-xs sm:p-6"
        >
          <div className="flex items-start gap-3.5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700">
              <AlertCircle className="size-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1 space-y-2.5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-rose-700">
                  Verifikasi Pembayaran
                </span>
                <h2 className="font-heading text-lg font-bold text-rose-950 sm:text-xl">
                  Pembayaran Belum Dapat Diverifikasi
                </h2>
              </div>

              <div className="space-y-1.5 rounded-2xl border border-rose-200/80 bg-white/90 p-3.5 text-xs text-rose-950 sm:text-sm">
                <p>
                  <span className="font-semibold text-rose-900">Alasan Penolakan: </span>
                  <strong className="text-rose-950">{infoTolak.alasan ?? "Bukti pembayaran belum sesuai"}</strong>
                </p>
                {infoTolak.catatanTambahan && (
                  <p>
                    <span className="font-semibold text-rose-900">Catatan Admin: </span>
                    <span className="text-rose-950">{infoTolak.catatanTambahan}</span>
                  </p>
                )}
                {infoTolak.waktuDitolak && (
                  <p className="pt-0.5 text-[11px] text-rose-800/80">
                    Diverifikasi pada: {tanggalJam(infoTolak.waktuDitolak)}
                  </p>
                )}
              </div>

              <div className="rounded-2xl bg-rose-100/70 p-3.5 text-xs text-rose-950">
                <p className="mb-1 flex items-center gap-1.5 font-bold text-rose-900">
                  <Info className="size-3.5 shrink-0 text-rose-700" aria-hidden /> Panduan Langkah Selanjutnya:
                </p>
                <p className="leading-relaxed">
                  {instruksiLangkahPelanggan(infoTolak.alasan)}
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Instruksi Pembayaran & Upload Bukti (Saat Menunggu Bayar / Menunggu Verifikasi) */}
      {perluBayar && (
        <section aria-labelledby="sec-bayar" className="grid gap-5 lg:grid-cols-12">
          <div className="min-w-0 space-y-4 rounded-3xl border border-amber-200 bg-amber-50/70 p-4 sm:p-5 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="sec-bayar" className="font-heading text-lg font-bold text-amber-950">
                Informasi Pembayaran
              </h2>
              <span className="font-heading text-xl font-extrabold text-primary">
                {rupiah(data.total)}
              </span>
            </div>

            {/* Tampilkan QRIS P'crème */}
            {(metodePilihan === "qris" || !cfgBayar.mandiri.aktif) && (
              <div className="grid items-center gap-4 rounded-2xl border bg-card p-4 sm:grid-cols-[9rem_1fr]">
                <button
                  type="button"
                  onClick={() => setZoomQris(true)}
                  className="mx-auto block w-full max-w-36 overflow-hidden rounded-xl border bg-white p-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
                >
                  <Image
                    src={qrisImg}
                    alt="QRIS P'CREME"
                    className="h-auto w-full rounded-lg object-contain"
                    sizes="150px"
                  />
                  <span className="mt-1 flex items-center justify-center gap-1 text-[11px] font-semibold text-primary">
                    <Maximize2 className="size-3" aria-hidden /> Perbesar
                  </span>
                </button>
                <div className="space-y-2 text-xs">
                  <div className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2.5 py-0.5 font-semibold text-sky-900">
                    <QrCode className="size-3.5" aria-hidden /> QRIS Resmi P&apos;CREME
                  </div>
                  <p className="text-muted-foreground">
                    NMID: <strong>ID1026635613858</strong>
                    <br />
                    Scan kode QRIS dan bayar sebesar <strong className="text-foreground">{rupiah(data.total)}</strong>.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-full text-xs"
                      onClick={() => setZoomQris(true)}
                    >
                      <Maximize2 className="size-3.5" aria-hidden /> Perbesar QRIS
                    </Button>
                    <CopyButton text={String(data.total)} label="Salin Nominal" className="h-8 rounded-full text-xs" />
                  </div>
                </div>
              </div>
            )}

            {/* Tampilkan Rekening Mandiri jika sudah dikonfigurasi Admin */}
            {cfgBayar.mandiri.aktif && (
              <div className="space-y-2 rounded-2xl border bg-card p-4 text-xs">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 font-semibold text-amber-950">
                    <Building2 className="size-3.5" aria-hidden /> Transfer Bank Mandiri
                  </span>
                  <span className="font-semibold text-foreground">a.n. {cfgBayar.mandiri.atasNama}</span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="font-mono text-base font-bold tracking-wider text-foreground">
                    {cfgBayar.mandiri.nomorRekening}
                  </span>
                  <CopyButton
                    text={cfgBayar.mandiri.nomorRekening}
                    label="Salin Rekening"
                    className="h-8 rounded-full text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="min-w-0 lg:col-span-5">
            <UploadBukti
              kode={data.kode}
              wa={wa ?? ""}
              orderId={idPesananAktif}
              waAdmin={data.wa_admin ?? waAdmin}
              sudahKirim={data.sudah_kirim_bukti}
              isReupload={isDitolak}
              onSelesai={() => wa && void muat(wa, { diam: true })}
            />
          </div>
        </section>
      )}

      {/* Detail Pesanan & Jadwal Pengambilan */}
      <div className="grid gap-5 lg:grid-cols-12">
        <section
          aria-labelledby="sec-rincian"
          className="min-w-0 space-y-4 rounded-3xl border bg-card p-4 shadow-xs sm:p-6 lg:col-span-7"
        >
          <div className="flex items-center justify-between border-b pb-3">
            <h2 id="sec-rincian" className="flex items-center gap-2 font-heading text-base font-bold text-foreground">
              <Package className="size-4 shrink-0 text-primary" aria-hidden />
              <span>Detail Konfigurasi Cup ({data.jumlah_cup} cup)</span>
            </h2>
          </div>

          <ul className="divide-y">
            {cupsTampil.map((it, i) => (
              <li key={i} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <span className="inline-block rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                    Cup #{it.nomor}
                  </span>
                  <p className="wrap-break-word font-heading font-bold text-foreground">{it.labelRasa}</p>
                  <p className="wrap-break-word text-xs text-muted-foreground">
                    {it.topping.length > 0 ? `Topping: ${it.topping.join(", ")}` : "Tanpa topping"}
                  </p>
                </div>
                <span className="shrink-0 rounded-xl bg-secondary px-3 py-1 font-heading text-xs font-bold text-foreground">
                  {it.qty} cup
                </span>
              </li>
            ))}
          </ul>

          <div className="flex items-center justify-between gap-2 border-t pt-3">
            <span className="text-sm font-medium text-muted-foreground">
              Total Pembayaran ({data.jumlah_cup} cup)
            </span>
            <span className="font-heading text-xl font-extrabold tabular-nums text-primary">{rupiah(data.total)}</span>
          </div>
        </section>

        <section
          aria-labelledby="sec-jadwal"
          className="min-w-0 space-y-4 rounded-3xl border bg-card p-4 shadow-xs sm:p-6 lg:col-span-5"
        >
          <h2 id="sec-jadwal" className="flex items-center gap-2 border-b pb-3 font-heading text-base font-bold text-foreground">
            <CalendarDays className="size-4 text-primary" aria-hidden />
            Jadwal &amp; Lokasi {data.fulfillment === "antar" ? "Pengantaran" : "Pengambilan"}
          </h2>

          <div className="space-y-3 rounded-2xl bg-secondary/60 p-4 text-sm">
            <div className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {data.fulfillment === "antar" ? "Diantar ke Alamat" : "Ambil di Titik Kumpul"}
                </p>
                {detailLokasiAntar ? (
                  <div className="space-y-1 text-xs sm:text-sm">
                    <p className="font-semibold text-foreground">{detailLokasiAntar.alamat}</p>
                    {detailLokasiAntar.patokan && (
                      <p className="text-muted-foreground">Patokan: {detailLokasiAntar.patokan}</p>
                    )}
                    {detailLokasiAntar.kontakAntar && (
                      <p className="text-muted-foreground">Kontak: {detailLokasiAntar.kontakAntar}</p>
                    )}
                  </div>
                ) : (
                  <p className="font-semibold text-foreground">{data.lokasi ?? "-"}</p>
                )}
              </div>
            </div>

            {data.tanggal_ambil && (
              <div className="flex items-start gap-2.5 border-t pt-3">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tanggal {data.fulfillment === "antar" ? "Pengantaran" : "Pengambilan"}
                  </p>
                  <p className="font-semibold text-foreground">{tanggalPanjang(data.tanggal_ambil)}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2 pt-1">
            {waAdmin && (
              <a
                href={linkWa(waAdmin, pesanKeAdmin(data.kode))}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 w-full items-center justify-center gap-2 rounded-full bg-emerald-600 font-heading text-xs font-semibold text-white shadow-2xs transition-opacity hover:opacity-95 outline-none focus-visible:ring-3 focus-visible:ring-ring/60 sm:text-sm"
              >
                <MessageCircle className="size-4" aria-hidden /> Hubungi Admin via WhatsApp
              </a>
            )}
            <Link
              href="/"
              className="flex h-11 w-full items-center justify-center rounded-full border bg-background font-heading text-xs font-semibold text-foreground transition-colors hover:bg-secondary sm:text-sm"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </section>
      </div>

      {/* Riwayat Pembayaran Pelanggan (Jika ada riwayat) */}
      {infoTolak.riwayat.length > 0 && (
        <section
          aria-label="Riwayat verifikasi pembayaran"
          className="rounded-3xl border bg-card p-5 shadow-xs sm:p-6"
        >
          <div className="mb-4 flex items-center justify-between border-b pb-3">
            <h2 className="flex items-center gap-2 font-heading text-base font-bold text-foreground">
              <History className="size-4 text-primary" aria-hidden />
              Riwayat Status Pembayaran
            </h2>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
              {infoTolak.riwayat.length} aktivitas
            </span>
          </div>

          <ol className="relative ml-2 space-y-4 border-l border-border/80 pl-4 text-xs sm:text-sm">
            {infoTolak.riwayat.map((hist, idx) => (
              <li key={hist.id || idx} className="relative space-y-1">
                <div
                  className={`absolute -left-5.25 mt-1 size-2.5 rounded-full ring-2 ring-background ${
                    hist.tipe === "approval"
                      ? "bg-emerald-600"
                      : hist.tipe === "rejection"
                        ? "bg-rose-600"
                        : "bg-sky-600"
                  }`}
                />
                <div className="flex flex-wrap items-center justify-between gap-1">
                  <span className="font-semibold text-foreground">
                    {hist.tipe === "upload" && "Bukti pembayaran diunggah"}
                    {hist.tipe === "rejection" && "Bukti pembayaran belum dapat diverifikasi"}
                    {hist.tipe === "approval" && "Pembayaran berhasil diverifikasi (Lunas)"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {tanggalJam(hist.waktu)}
                  </span>
                </div>
                {hist.alasan && (
                  <p className="font-medium text-rose-700">Alasan: {hist.alasan}</p>
                )}
                {hist.catatan && (
                  <p className="text-muted-foreground">Catatan: {hist.catatan}</p>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {/* Modal Perbesar QRIS */}
      <Dialog open={zoomQris} onOpenChange={setZoomQris}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>QRIS Resmi P&apos;crème</DialogTitle>
            <DialogDescription>
              NMID: ID1026635613858 · Total: <strong>{rupiah(data.total)}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-2xl border bg-white p-2">
            <Image
              src={qrisImg}
              alt="QRIS P'CREME Diperbesar"
              className="mx-auto h-auto max-h-[70vh] w-full object-contain"
              sizes="(max-width: 640px) 95vw, 420px"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

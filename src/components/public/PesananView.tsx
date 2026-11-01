"use client";

import { Loader2, MapPin, MessageCircle, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyButton } from "@/components/public/CopyButton";
import { Field, describedBy } from "@/components/public/Field";
import { StatusBadge } from "@/components/public/StatusBadge";
import { StatusStepper } from "@/components/public/StatusStepper";
import { UploadBukti } from "@/components/public/UploadBukti";
import { cekStatusPesanan } from "@/lib/api";
import { rupiah, tanggalJam, tanggalPanjang } from "@/lib/format";
import { waSchema } from "@/lib/schemas";
import { bacaSesiMentah, parseSesi, simpanSesi } from "@/lib/session";
import { butuhPembayaran } from "@/lib/status";
import type { StatusPesanan } from "@/lib/types";
import { linkWa, pesanKeAdmin } from "@/lib/wa";

const INTERVAL_MS = 30_000;

/** Ambil nomor rekening/e-wallet pertama dari teks info pembayaran (untuk tombol salin). */
function ekstrakNomor(info: string): string | null {
  const m = info.match(/\d[\d\s.-]{6,}\d/);
  return m ? m[0].replace(/\D/g, "") : null;
}

const noop = () => () => {};

export function PesananView({ kode, waAdmin }: { kode: string; waAdmin: string | null }) {
  // sessionStorage hanya ada di browser: baca lewat useSyncExternalStore agar hidrasi aman.
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
  const adaData = useRef(false);
  const sudahMulai = useRef(false);

  const muat = useCallback(
    async (nomor: string, opsi: { diam?: boolean } = {}) => {
      if (!opsi.diam) setLoading(true);
      const res = await cekStatusPesanan(kode, nomor);
      if (res.error !== null) {
        if (adaData.current) setErrorRefresh(res.error);
        else setError(res.error); // tetap di form WA, tampilkan pesan server apa adanya
      } else {
        adaData.current = true;
        setData(res.data);
        setError(null);
        setErrorRefresh(null);
        setWa(nomor);
        simpanSesi({ kode, wa: nomor, order_id: parseSesi(bacaSesiMentah(), kode)?.order_id });
      }
      setLoading(false);
      setSudahCoba(true);
    },
    [kode],
  );

  // Muat otomatis sekali bila WA sudah ada di sessionStorage.
  useEffect(() => {
    if (waAwal && !sudahMulai.current) {
      sudahMulai.current = true;
      void muat(waAwal);
    }
  }, [waAwal, muat]);

  // Auto-refresh tiap 30 detik saat tab terlihat + saat tab kembali terlihat.
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
        <Loader2 className="size-4 animate-spin" aria-hidden /> Memuat pesanan…
      </div>
    );
  }

  if (!data) {
    return (
      <form onSubmit={kirimWa} noValidate className="space-y-4 rounded-3xl border bg-card p-5 shadow-sm">
        <div>
          <h1 className="font-heading text-xl font-semibold">Pesanan {kode}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Masukkan nomor WhatsApp yang dipakai saat memesan untuk melihat statusnya.
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
            className="h-11"
            value={nilaiWa}
            onChange={(e) => setInputWa(e.target.value)}
            aria-invalid={!!errorInput}
            aria-describedby={describedBy("wa", "Contoh: 081234567890", errorInput)}
          />
        </Field>
        <Button type="submit" className="h-11 w-full rounded-full" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" aria-hidden /> : null} Lihat pesanan
        </Button>
      </form>
    );
  }

  const perluBayar = butuhPembayaran(data.status);
  const nomorRekening = data.info_pembayaran ? ekstrakNomor(data.info_pembayaran) : null;

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border bg-card p-5 text-center shadow-sm" aria-labelledby="kode-pesanan">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Kode pesanan</p>
        <h1 id="kode-pesanan" className="mt-1 font-heading text-4xl font-bold tracking-wider text-primary">
          {data.kode}
        </h1>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          <StatusBadge status={data.status} />
          <CopyButton text={data.kode} label="Salin kode" className="h-9 text-xs" />
        </div>
        <p className="mt-3 text-sm text-muted-foreground">Atas nama {data.nama}</p>
      </section>

      <section aria-label="Progres pesanan" className="rounded-3xl border bg-card p-5">
        <StatusStepper status={data.status} />
        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground" aria-live="polite">
          <span>Diperbarui otomatis tiap 30 detik</span>
          <button
            type="button"
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-3 font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
            onClick={() => wa && void muat(wa, { diam: true })}
          >
            <RefreshCw className="size-3.5" aria-hidden /> Segarkan
          </button>
        </div>
        {errorRefresh && (
          <p role="alert" className="mt-1 text-xs font-medium text-destructive">
            Gagal menyegarkan: {errorRefresh}
          </p>
        )}
      </section>

      {perluBayar && (
        <section aria-labelledby="sec-bayar" className="space-y-4">
          <div className="space-y-3 rounded-3xl border border-amber-200 bg-amber-50 p-5">
            <h2 id="sec-bayar" className="font-heading text-lg font-semibold text-amber-950">
              Pembayaran
            </h2>
            <p className="text-sm text-amber-950">
              Total yang perlu dibayar: <strong>{rupiah(data.total)}</strong>
            </p>
            {data.info_pembayaran ? (
              <p className="whitespace-pre-line rounded-xl bg-white/70 p-3 text-sm">{data.info_pembayaran}</p>
            ) : (
              <p className="text-sm">Info pembayaran belum tersedia. Hubungi admin ya.</p>
            )}
            {data.info_pembayaran && (
              <CopyButton
                text={nomorRekening ?? data.info_pembayaran}
                label={nomorRekening ? "Salin nomor rekening" : "Salin info pembayaran"}
              />
            )}
          </div>
          <UploadBukti
            kode={data.kode}
            wa={wa ?? ""}
            orderId={orderId}
            waAdmin={waAdmin}
            sudahKirim={data.sudah_kirim_bukti}
            onSelesai={() => wa && void muat(wa, { diam: true })}
          />
        </section>
      )}

      <section aria-labelledby="sec-rincian" className="space-y-3 rounded-3xl border bg-card p-5">
        <h2 id="sec-rincian" className="font-heading text-lg font-semibold">
          Rincian pesanan
        </h2>
        <ul className="divide-y">
          {data.items.map((it, i) => (
            <li key={i} className="flex items-start justify-between gap-3 py-2 text-sm">
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
        <div className="flex justify-between border-t pt-3 text-sm">
          <span>
            Total ({data.jumlah_cup} cup)
          </span>
          <span className="font-heading text-lg font-bold">{rupiah(data.total)}</span>
        </div>
        <div className="flex items-start gap-2 rounded-xl bg-muted p-3 text-sm">
          <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <p className="font-medium">
              {data.fulfillment === "antar" ? "Diantar ke" : "Ambil di"} {data.lokasi ?? "-"}
            </p>
            {data.tanggal_ambil && (
              <p className="text-muted-foreground">{tanggalPanjang(data.tanggal_ambil)}</p>
            )}
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Dipesan {tanggalJam(data.dibuat_pada)}</p>
      </section>

      {waAdmin && (
        <a
          href={linkWa(waAdmin, pesanKeAdmin(data.kode))}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-full border bg-card text-sm font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
        >
          <MessageCircle className="size-4" aria-hidden /> Hubungi admin via WhatsApp
        </a>
      )}
    </div>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertTriangle,
  Building2,
  ChevronDown,
  ChevronUp,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  QrCode,
  Truck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { BarisUrut } from "@/components/admin/BarisUrut";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field, describedBy } from "@/components/public/Field";
import { pesanDb, pindah } from "@/lib/admin";
import {
  hitungMinTimePickerWib,
  inputWibKeIso,
  isoKeInputWib,
  rupiah,
  tanggalJam,
  tanggalPanjang,
  validasiKonfigurasiJamAntarAdmin,
} from "@/lib/format";
import { formatInfoPembayaran, parseInfoPembayaran } from "@/lib/order-meta";
import {
  periodeSchema,
  titikAmbilSchema,
  type PeriodeFormValues,
  type TitikAmbilFormValues,
} from "@/lib/schemas";
import { createClient } from "@/lib/supabase/client";
import type { PickupPoint, PoPeriod } from "@/lib/types";

interface PeriodeManagerProps {
  periods: PoPeriod[];
  titik: PickupPoint[];
  terpesanMap?: Record<string, number>;
}

type GalatDb = { message: string; code?: string } | null;

export function PeriodeManager({ periods, titik, terpesanMap = {} }: PeriodeManagerProps) {
  const router = useRouter();
  const supabase = createClient();
  const [sibuk, setSibuk] = useState(false);
  const [formPeriode, setFormPeriode] = useState<{ period: PoPeriod | null } | null>(null);
  const [aktivasi, setAktivasi] = useState<{ period: PoPeriod; lain: PoPeriod[] } | null>(null);
  const [terbuka, setTerbuka] = useState<string | null>(null);

  async function jalankan(fn: () => PromiseLike<{ error: GalatDb }>, sukses?: string): Promise<boolean> {
    setSibuk(true);
    const { error } = await fn();
    setSibuk(false);
    if (error) {
      toast.error(pesanDb(error));
      return false;
    }
    if (sukses) toast.success(sukses);
    router.refresh();
    return true;
  }

  function toggleAktif(period: PoPeriod, aktif: boolean) {
    if (!aktif) {
      void jalankan(
        () => supabase.from("po_periods").update({ is_active: false }).eq("id", period.id),
        "Periode dinonaktifkan",
      );
      return;
    }
    const lain = periods.filter((p) => p.is_active && p.id !== period.id);
    if (lain.length > 0) setAktivasi({ period, lain });
    else
      void jalankan(
        () => supabase.from("po_periods").update({ is_active: true }).eq("id", period.id),
        "Periode diaktifkan",
      );
  }

  async function aktifkan(nonaktifkanLain: boolean) {
    if (!aktivasi) return;
    const { period, lain } = aktivasi;
    const ok = await jalankan(
      async () => {
        if (nonaktifkanLain) {
          const off = await supabase
            .from("po_periods")
            .update({ is_active: false })
            .in(
              "id",
              lain.map((p) => p.id),
            );
          if (off.error) return { error: off.error };
        }
        return supabase.from("po_periods").update({ is_active: true }).eq("id", period.id);
      },
      nonaktifkanLain ? "Periode diaktifkan, yang lain dinonaktifkan" : "Periode diaktifkan",
    );
    if (ok) setAktivasi(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border bg-card p-4">
        <p className="text-xs text-muted-foreground sm:text-sm">
          Perubahan batch PO, kuota, harga, titik ambil, dan rekening Mandiri langsung tersinkronisasi ke halaman pelanggan.
        </p>
        <Button className="h-11 rounded-full px-5" onClick={() => setFormPeriode({ period: null })}>
          <Plus aria-hidden /> Tambah Batch PO
        </Button>
      </div>

      {periods.length === 0 && (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Belum ada periode PO. Tambahkan batch PO pertama.
        </p>
      )}

      <ul className="grid gap-3.5">
        {periods.map((p) => {
          const titikPeriode = titik.filter((t) => t.period_id === p.id);
          const titikAktifCount = titikPeriode.filter((t) => t.is_active).length;
          const buka = terbuka === p.id;
          const terpesan = terpesanMap[p.id] ?? 0;
          const sisa = Math.max(0, p.kuota - terpesan);
          const cfgBayar = parseInfoPembayaran(p.info_pembayaran);
          const opsiPickupTampil = cfgBayar.pickupAktif && titikAktifCount > 0;

          return (
            <li key={p.id} className="space-y-3.5 rounded-3xl border bg-card p-5 shadow-2xs">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary px-3 py-0.5 font-heading text-xs font-bold text-primary-foreground">
                      Minggu {p.minggu}
                    </span>
                    <h2 className="font-heading text-lg font-bold text-foreground">{p.nama}</h2>
                  </div>
                  <p className="text-sm font-medium text-foreground">
                    {rupiah(p.harga)}/cup · Kuota: <strong>{terpesan} terpesan</strong> / {p.kuota} cup (Sisa {sisa} cup) · Maks {p.maks_per_order} cup/transaksi · Maks {p.maks_topping} topping
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Buka: {tanggalJam(p.buka_at)} · Deadline: {tanggalJam(p.tutup_at)} · Pengambilan:{" "}
                    <strong>{tanggalPanjang(p.tanggal_ambil)}</strong>
                  </p>

                  {/* Status Konfigurasi Pembayaran & Metode Pengambilan */}
                  <div className="flex flex-wrap items-center gap-2 pt-1.5 text-xs">
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 font-semibold text-sky-900">
                      <QrCode className="size-3.5" aria-hidden /> QRIS Resmi Aktif
                    </span>
                    {cfgBayar.mandiri.aktif ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-900">
                        <Building2 className="size-3.5" aria-hidden /> Mandiri: {cfgBayar.mandiri.nomorRekening} a.n.{" "}
                        {cfgBayar.mandiri.atasNama}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-medium text-amber-900">
                        <AlertTriangle className="size-3.5" aria-hidden /> Rekening Mandiri belum diisi (klik Ubah untuk melengkapi)
                      </span>
                    )}

                    {opsiPickupTampil ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-900">
                        <MapPin className="size-3.5" aria-hidden /> Pickup Aktif ({titikAktifCount}/{titikPeriode.length} titik)
                      </span>
                    ) : !cfgBayar.pickupAktif ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-stone-300 bg-stone-100 px-2.5 py-0.5 font-medium text-stone-700">
                        <MapPin className="size-3.5" aria-hidden /> Pickup Dinonaktifkan (Disembunyikan di Checkout)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 font-medium text-amber-900">
                        <MapPin className="size-3.5" aria-hidden /> Pickup Disembunyikan (0 titik aktif)
                      </span>
                    )}

                    {cfgBayar.antarAktif ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-200 bg-violet-50 px-2.5 py-0.5 font-semibold text-violet-900">
                        <Truck className="size-3.5" aria-hidden /> Pengantaran Aktif ({cfgBayar.jamMulaiAntar}–{cfgBayar.jamSelesaiAntar} WIB)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-stone-300 bg-stone-100 px-2.5 py-0.5 font-medium text-stone-700">
                        <Truck className="size-3.5" aria-hidden /> Pengantaran Dinonaktifkan
                      </span>
                    )}
                  </div>
                </div>

                <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 rounded-full border bg-secondary/70 px-3.5 text-sm font-semibold">
                  <Switch
                    checked={p.is_active}
                    disabled={sibuk}
                    onCheckedChange={(v) => toggleAktif(p, v)}
                    aria-label={`Aktifkan Minggu ${p.minggu}`}
                  />
                  {p.is_active ? "PO Aktif" : "Nonaktif"}
                </label>
              </div>

              <div className="flex flex-wrap gap-2 border-t pt-3">
                <Button
                  variant="outline"
                  className="h-10 rounded-full px-4 text-xs font-semibold"
                  disabled={sibuk}
                  onClick={() => setFormPeriode({ period: p })}
                >
                  <Pencil className="size-3.5" aria-hidden /> Ubah Batch &amp; Rekening
                </Button>
                <Button
                  variant="outline"
                  className="h-10 rounded-full px-4 text-xs font-semibold"
                  aria-expanded={buka}
                  onClick={() => setTerbuka(buka ? null : p.id)}
                >
                  <MapPin className="size-3.5" aria-hidden /> Titik Pengambilan ({titikAktifCount}/{titikPeriode.length} Aktif)
                  {buka ? <ChevronUp className="size-3.5" aria-hidden /> : <ChevronDown className="size-3.5" aria-hidden />}
                </Button>
              </div>

              {buka && <TitikAmbil period={p} titik={titikPeriode} />}
            </li>
          );
        })}
      </ul>

      <Dialog open={!!formPeriode} onOpenChange={(o) => !o && setFormPeriode(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          {formPeriode && (
            <PeriodeForm
              key={formPeriode.period?.id ?? "baru"}
              period={formPeriode.period}
              cupTerpesan={formPeriode.period ? (terpesanMap[formPeriode.period.id] ?? 0) : 0}
              mingguBerikut={periods.reduce((n, p) => Math.max(n, p.minggu), 0) + 1}
              onBatal={() => setFormPeriode(null)}
              onSimpan={async (nilai) => {
                const ok = await jalankan(
                  () =>
                    formPeriode.period
                      ? supabase.from("po_periods").update(nilai).eq("id", formPeriode.period.id)
                      : supabase.from("po_periods").insert({ ...nilai, is_active: false }),
                  formPeriode.period ? "Batch PO diperbarui" : "Batch PO ditambahkan",
                );
                if (ok) setFormPeriode(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!aktivasi} onOpenChange={(o) => !o && !sibuk && setAktivasi(null)}>
        <DialogContent>
          {aktivasi && (
            <>
              <DialogHeader>
                <DialogTitle>Aktifkan Minggu {aktivasi.period.minggu}?</DialogTitle>
                <DialogDescription>
                  Periode lain masih aktif ({aktivasi.lain.map((p) => `Minggu ${p.minggu}`).join(", ")}). Beranda
                  pelanggan menampilkan satu periode aktif, jadi sebaiknya periode sebelumnya dinonaktifkan.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button className="h-11" disabled={sibuk} onClick={() => void aktifkan(true)}>
                  {sibuk && <Loader2 className="animate-spin" aria-hidden />} Aktifkan &amp; Nonaktifkan yang Lain
                </Button>
                <Button variant="outline" className="h-11" disabled={sibuk} onClick={() => void aktifkan(false)}>
                  Aktifkan Saja
                </Button>
                <Button variant="ghost" className="h-11" disabled={sibuk} onClick={() => setAktivasi(null)}>
                  Batal
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ---------- Form Periode & Pengaturan Pembayaran ----------

type NilaiPeriode = Omit<PoPeriod, "id" | "is_active">;

function PeriodeForm({
  period,
  cupTerpesan,
  mingguBerikut,
  onBatal,
  onSimpan,
}: {
  period: PoPeriod | null;
  cupTerpesan: number;
  mingguBerikut: number;
  onBatal: () => void;
  onSimpan: (nilai: NilaiPeriode) => Promise<void>;
}) {
  const cfgAwal = parseInfoPembayaran(period?.info_pembayaran);

  const [mandiriNomor, setMandiriNomor] = useState(cfgAwal.mandiri.nomorRekening);
  const [mandiriAtasNama, setMandiriAtasNama] = useState(cfgAwal.mandiri.atasNama);
  const [pickupAktif, setPickupAktif] = useState(cfgAwal.pickupAktif);
  const [antarAktif, setAntarAktif] = useState(cfgAwal.antarAktif);
  const [jamMulaiAntar, setJamMulaiAntar] = useState(cfgAwal.jamMulaiAntar);
  const [jamSelesaiAntar, setJamSelesaiAntar] = useState(cfgAwal.jamSelesaiAntar);
  const [infoPengantaran, setInfoPengantaran] = useState(cfgAwal.infoPengantaran);
  const [instruksiTambahan, setInstruksiTambahan] = useState(cfgAwal.instruksiTambahan);
  const [errorKuotaAktif, setErrorKuotaAktif] = useState<string | null>(null);
  const [errorMandiri, setErrorMandiri] = useState<string | null>(null);
  const [errorJamMulai, setErrorJamMulai] = useState<string | null>(null);
  const [errorJamSelesai, setErrorJamSelesai] = useState<string | null>(null);
  const [sibuk, setSibuk] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<PeriodeFormValues>({
    resolver: zodResolver(periodeSchema) as Resolver<PeriodeFormValues>,
    defaultValues: period
      ? {
          minggu: period.minggu,
          nama: period.nama,
          harga: period.harga,
          kuota: period.kuota,
          maks_per_order: period.maks_per_order,
          maks_topping: period.maks_topping,
          buka_at: isoKeInputWib(period.buka_at),
          tutup_at: isoKeInputWib(period.tutup_at),
          tanggal_ambil: period.tanggal_ambil,
          info_pembayaran: period.info_pembayaran ?? "",
          wa_admin: period.wa_admin ?? "",
          instagram: period.instagram ?? "",
        }
      : {
          minggu: mingguBerikut,
          nama: `PO Batch ${mingguBerikut}`,
          harga: 15000,
          kuota: 60,
          maks_per_order: 10,
          maks_topping: 2,
          buka_at: "",
          tutup_at: "",
          tanggal_ambil: "",
          info_pembayaran: "",
          wa_admin: "",
          instagram: "@puddingcreamee",
        },
  });

  async function simpan(v: PeriodeFormValues) {
    setErrorKuotaAktif(null);
    setErrorMandiri(null);
    setErrorJamMulai(null);
    setErrorJamSelesai(null);

    // Validasi Kuota terhadap pesanan aktif yang sudah tercatat
    if (cupTerpesan > 0 && v.kuota < cupTerpesan) {
      const msg = `Kuota (${v.kuota} cup) tidak boleh lebih kecil dari jumlah pesanan aktif yang sudah tercatat (${cupTerpesan} cup).`;
      setErrorKuotaAktif(msg);
      toast.error(msg);
      return;
    }

    // Validasi kelengkapan rekening Mandiri bila salah satu diisi
    const norek = mandiriNomor.trim().replace(/\s+/g, "");
    const atasNama = mandiriAtasNama.trim();
    if ((norek && !atasNama) || (!norek && atasNama)) {
      const msg = "Jika ingin mengaktifkan Transfer Mandiri, isi Nomor Rekening sekaligus Nama Pemilik Rekening.";
      setErrorMandiri(msg);
      toast.error(msg);
      return;
    }
    if (norek && !/^\d{8,20}$/.test(norek)) {
      const msg = "Nomor rekening Mandiri harus berupa 8–20 digit angka yang valid.";
      setErrorMandiri(msg);
      toast.error(msg);
      return;
    }

    // Validasi konfigurasi Jam Mulai & Jam Selesai Pengantaran
    const cekJam = validasiKonfigurasiJamAntarAdmin(jamMulaiAntar, jamSelesaiAntar, antarAktif);
    if (!cekJam.valid) {
      setErrorJamMulai(cekJam.errorMulai ?? null);
      setErrorJamSelesai(cekJam.errorSelesai ?? null);
      toast.error(
        cekJam.errorSelesai ??
          cekJam.errorMulai ??
          "Konfigurasi jam pengantaran tidak valid.",
      );
      return;
    }

    const infoTerformat = formatInfoPembayaran({
      mandiriNomor: norek,
      mandiriAtasNama: atasNama,
      qrisAktif: true,
      pickupAktif,
      antarAktif,
      jamMulaiAntar: cekJam.jamMulaiNormal,
      jamSelesaiAntar: cekJam.jamSelesaiNormal,
      infoPengantaran,
      instruksiTambahan,
    });

    setSibuk(true);
    await onSimpan({
      minggu: v.minggu,
      nama: v.nama,
      harga: v.harga,
      kuota: v.kuota,
      maks_per_order: v.maks_per_order,
      maks_topping: v.maks_topping,
      buka_at: inputWibKeIso(v.buka_at),
      tutup_at: inputWibKeIso(v.tutup_at),
      tanggal_ambil: v.tanggal_ambil,
      info_pembayaran: infoTerformat || null,
      wa_admin: v.wa_admin || null,
      instagram: v.instagram || null,
    });
    setSibuk(false);
  }

  const angka = (nama: keyof PeriodeFormValues) => register(nama, { valueAsNumber: true });
  const err = (nama: keyof PeriodeFormValues) => errors[nama]?.message;
  const d = (id: string, hint?: string) => describedBy(id, hint, err(id as keyof PeriodeFormValues));

  return (
    <form onSubmit={handleSubmit(simpan)} noValidate className="space-y-5">
      <DialogHeader>
        <DialogTitle>{period ? `Ubah Minggu ${period.minggu} · ${period.nama}` : "Tambah Batch PO Baru"}</DialogTitle>
        <DialogDescription>
          Seluruh jadwal menggunakan waktu WIB (UTC+7). Perubahan langsung terlihat di halaman pelanggan.
        </DialogDescription>
      </DialogHeader>

      {cupTerpesan > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          Batch ini sudah memiliki <strong>{cupTerpesan} cup pesanan aktif</strong>. Kuota tidak dapat diatur di bawah {cupTerpesan} cup.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="minggu" label="Minggu / Batch ke-" error={err("minggu")}>
          <Input
            id="minggu"
            type="number"
            inputMode="numeric"
            className="h-11"
            aria-invalid={!!err("minggu")}
            aria-describedby={d("minggu")}
            {...angka("minggu")}
          />
        </Field>
        <Field id="nama" label="Nama Batch PO" error={err("nama")}>
          <Input
            id="nama"
            className="h-11"
            aria-invalid={!!err("nama")}
            aria-describedby={d("nama")}
            {...register("nama")}
          />
        </Field>
        <Field id="harga" label="Harga per Cup (Rp)" error={err("harga")}>
          <Input
            id="harga"
            type="number"
            inputMode="numeric"
            className="h-11"
            aria-invalid={!!err("harga")}
            aria-describedby={d("harga")}
            {...angka("harga")}
          />
        </Field>
        <Field
          id="kuota"
          label="Total Kuota Batch (Cup)"
          hint={cupTerpesan > 0 ? `Minimal ${cupTerpesan} cup (pesanan aktif)` : undefined}
          error={errorKuotaAktif ?? err("kuota")}
        >
          <Input
            id="kuota"
            type="number"
            inputMode="numeric"
            className="h-11"
            aria-invalid={!!(errorKuotaAktif ?? err("kuota"))}
            aria-describedby={d("kuota")}
            {...angka("kuota")}
          />
        </Field>
        <Field id="maks_per_order" label="Maksimal Cup per Transaksi" error={err("maks_per_order")}>
          <Input
            id="maks_per_order"
            type="number"
            inputMode="numeric"
            className="h-11"
            aria-invalid={!!err("maks_per_order")}
            aria-describedby={d("maks_per_order")}
            {...angka("maks_per_order")}
          />
        </Field>
        <Field id="maks_topping" label="Maksimal Topping per Cup" error={err("maks_topping")}>
          <Input
            id="maks_topping"
            type="number"
            inputMode="numeric"
            className="h-11"
            aria-invalid={!!err("maks_topping")}
            aria-describedby={d("maks_topping")}
            {...angka("maks_topping")}
          />
        </Field>
        <Field id="buka_at" label="Waktu Buka PO (WIB)" error={err("buka_at")}>
          <Input
            id="buka_at"
            type="datetime-local"
            className="h-11"
            aria-invalid={!!err("buka_at")}
            aria-describedby={d("buka_at")}
            {...register("buka_at")}
          />
        </Field>
        <Field id="tutup_at" label="Deadline / Tutup PO (WIB)" error={err("tutup_at")}>
          <Input
            id="tutup_at"
            type="datetime-local"
            className="h-11"
            aria-invalid={!!err("tutup_at")}
            aria-describedby={d("tutup_at")}
            {...register("tutup_at")}
          />
        </Field>
        <Field id="tanggal_ambil" label="Tanggal Pengambilan / Pengantaran" error={err("tanggal_ambil")}>
          <Input
            id="tanggal_ambil"
            type="date"
            className="h-11"
            aria-invalid={!!err("tanggal_ambil")}
            aria-describedby={d("tanggal_ambil")}
            {...register("tanggal_ambil")}
          />
        </Field>
        <Field
          id="wa_admin"
          label="Nomor WhatsApp Admin"
          optional
          hint="Contoh: 081234567890"
          error={err("wa_admin")}
        >
          <Input
            id="wa_admin"
            type="tel"
            inputMode="tel"
            className="h-11"
            aria-invalid={!!err("wa_admin")}
            aria-describedby={d("wa_admin", "Contoh: 081234567890")}
            {...register("wa_admin")}
          />
        </Field>
      </div>

      <Field
        id="instagram"
        label="Instagram Brand"
        optional
        hint="@puddingcreamee atau tautan profil"
        error={err("instagram")}
      >
        <Input
          id="instagram"
          className="h-11"
          aria-invalid={!!err("instagram")}
          aria-describedby={d("instagram")}
          {...register("instagram")}
        />
      </Field>

      {/* Pengaturan Rekening Mandiri & Pengantaran */}
      <div className="space-y-4 rounded-2xl border bg-secondary/50 p-4">
        <div>
          <h3 className="font-heading text-sm font-bold text-foreground">
            Konfigurasi Pembayaran (Transfer Bank Mandiri &amp; QRIS)
          </h3>
          <p className="text-xs text-muted-foreground">
            QRIS resmi P&apos;crème aktif secara bawaan. Isi nomor rekening dan nama pemilik di bawah ini untuk mengaktifkan opsi <strong>Transfer Bank Mandiri</strong> pada checkout pelanggan.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            id="mandiri-norek"
            label="Nomor Rekening Bank Mandiri"
            optional
            hint="Contoh: 1300012345678 (kosongkan jika belum siap)"
          >
            <Input
              id="mandiri-norek"
              inputMode="numeric"
              placeholder="Masukkan nomor rekening Mandiri asli"
              className="h-11 bg-card"
              value={mandiriNomor}
              onChange={(e) => {
                setMandiriNomor(e.target.value);
                setErrorMandiri(null);
              }}
            />
          </Field>

          <Field
            id="mandiri-nama"
            label="Nama Pemilik Rekening Mandiri"
            optional
            hint="Nama sesuai buku tabungan Mandiri"
          >
            <Input
              id="mandiri-nama"
              placeholder="Contoh: Nama Pemilik Asli"
              className="h-11 bg-card"
              value={mandiriAtasNama}
              onChange={(e) => {
                setMandiriAtasNama(e.target.value);
                setErrorMandiri(null);
              }}
            />
          </Field>
        </div>

        {errorMandiri && (
          <p role="alert" className="text-xs font-medium text-destructive">
            {errorMandiri}
          </p>
        )}

        <div className="grid gap-3 rounded-2xl border bg-card p-3.5 sm:grid-cols-2">
          <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border bg-secondary/40 p-3">
            <div className="space-y-0.5">
              <span className="block text-xs font-bold text-foreground">
                Opsi Ambil di Titik Kumpul (Pickup)
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Jika dinonaktifkan, opsi Pickup disembunyikan dari halaman checkout pelanggan.
              </span>
            </div>
            <Switch
              checked={pickupAktif}
              onCheckedChange={setPickupAktif}
              aria-label="Aktifkan opsi Ambil di Titik Kumpul"
            />
          </label>

          <label className="flex cursor-pointer items-start justify-between gap-3 rounded-xl border bg-secondary/40 p-3">
            <div className="space-y-0.5">
              <span className="block text-xs font-bold text-foreground">
                Opsi Diantar ke Lokasi (Delivery)
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Pelanggan dapat memilih lokasi pengantaran &amp; jam antar sesuai rentang waktu batch di bawah.
              </span>
            </div>
            <Switch
              checked={antarAktif}
              onCheckedChange={(v) => {
                setAntarAktif(v);
                if (!v) {
                  setErrorJamMulai(null);
                  setErrorJamSelesai(null);
                }
              }}
              aria-label="Aktifkan opsi Diantar ke Lokasi"
            />
          </label>
        </div>

        {/* Pengaturan Jam Pengantaran (Format 24 Jam WIB) */}
        <div className="space-y-3 rounded-2xl border bg-card p-3.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="font-heading text-xs font-bold text-foreground sm:text-sm">
                Pengaturan Jam Pengantaran (Format 24 Jam · WIB)
              </h4>
              <p className="text-[11px] text-muted-foreground">
                {antarAktif ? (
                  <>
                    Pelanggan dapat memilih jam pengantaran <strong>setelah pukul {jamMulaiAntar || "15:00"}</strong>{" "}
                    (mulai pukul <strong>{hitungMinTimePickerWib(jamMulaiAntar || "15:00")}</strong>) hingga maksimal pukul{" "}
                    <strong>{jamSelesaiAntar || "21:00"} WIB</strong>.
                  </>
                ) : (
                  "Layanan pengantaran sedang dinonaktifkan pada batch ini (konfigurasi jam opsional)."
                )}
              </p>
            </div>
            <span className="rounded-full border border-primary/20 bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-primary">
              Zona Waktu: WIB (24 Jam)
            </span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              id="jam-mulai-antar"
              label="Jam Mulai Pengantaran (WIB)"
              optional={!antarAktif}
              hint="Format 24 jam (WIB). Default: 15:00"
              error={errorJamMulai ?? undefined}
            >
              <div className="relative flex items-center">
                <Input
                  id="jam-mulai-antar"
                  type="time"
                  step={60}
                  lang="id-ID"
                  disabled={!antarAktif}
                  className="h-11 bg-card pr-14 font-medium tabular-nums"
                  value={jamMulaiAntar}
                  onChange={(e) => {
                    setJamMulaiAntar(e.target.value);
                    setErrorJamMulai(null);
                    setErrorJamSelesai(null);
                  }}
                  aria-invalid={!!errorJamMulai}
                  aria-describedby={describedBy("jam-mulai-antar", "hint", errorJamMulai ?? undefined)}
                />
                <span className="pointer-events-none absolute right-3 rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                  WIB
                </span>
              </div>
            </Field>

            <Field
              id="jam-selesai-antar"
              label="Jam Selesai Pengantaran (WIB)"
              optional={!antarAktif}
              hint="Harus lebih akhir dari jam mulai. Default: 21:00"
              error={errorJamSelesai ?? undefined}
            >
              <div className="relative flex items-center">
                <Input
                  id="jam-selesai-antar"
                  type="time"
                  step={60}
                  lang="id-ID"
                  disabled={!antarAktif}
                  className="h-11 bg-card pr-14 font-medium tabular-nums"
                  value={jamSelesaiAntar}
                  onChange={(e) => {
                    setJamSelesaiAntar(e.target.value);
                    setErrorJamMulai(null);
                    setErrorJamSelesai(null);
                  }}
                  aria-invalid={!!errorJamSelesai}
                  aria-describedby={describedBy("jam-selesai-antar", "hint", errorJamSelesai ?? undefined)}
                />
                <span className="pointer-events-none absolute right-3 rounded-md bg-secondary px-1.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                  WIB
                </span>
              </div>
            </Field>
          </div>
        </div>

        <Field
          id="info-antar"
          label="Informasi / Ketentuan Pengantaran (Delivery)"
          optional
          hint="Ditampilkan saat pelanggan memilih metode Diantar"
        >
          <Input
            id="info-antar"
            placeholder="Contoh: Pengantaran area sekitar kampus, ongkir dikonfirmasi via WhatsApp"
            className="h-11 bg-card"
            value={infoPengantaran}
            onChange={(e) => setInfoPengantaran(e.target.value)}
          />
        </Field>

        <Field
          id="instruksi-tambahan"
          label="Catatan Pembayaran Tambahan"
          optional
        >
          <Textarea
            id="instruksi-tambahan"
            rows={2}
            className="bg-card text-sm"
            placeholder="Catatan tambahan pada halaman pembayaran (opsional)"
            value={instruksiTambahan}
            onChange={(e) => setInstruksiTambahan(e.target.value)}
          />
        </Field>
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" className="h-11" onClick={onBatal} disabled={sibuk}>
          Batal
        </Button>
        <Button type="submit" className="h-11" disabled={sibuk}>
          {sibuk && <Loader2 className="animate-spin" aria-hidden />} Simpan Konfigurasi Batch
        </Button>
      </DialogFooter>
    </form>
  );
}

// ---------- Titik Ambil ----------

function TitikAmbil({ period, titik }: { period: PoPeriod; titik: PickupPoint[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [sibuk, setSibuk] = useState(false);
  const [form, setForm] = useState<{ titik: PickupPoint | null } | null>(null);
  const urut = [...titik].sort((a, b) => a.urutan - b.urutan || a.nama.localeCompare(b.nama));
  const titikAktifCount = urut.filter((t) => t.is_active).length;
  const cfg = parseInfoPembayaran(period.info_pembayaran);

  async function jalankan(fn: () => PromiseLike<{ error: GalatDb }>, sukses?: string): Promise<boolean> {
    setSibuk(true);
    const { error } = await fn();
    setSibuk(false);
    if (error) {
      toast.error(pesanDb(error));
      return false;
    }
    if (sukses) toast.success(sukses);
    router.refresh();
    return true;
  }

  async function toggleFiturPickupBatch(aktif: boolean) {
    const infoBaru = formatInfoPembayaran({
      mandiriNomor: cfg.mandiri.nomorRekening,
      mandiriAtasNama: cfg.mandiri.atasNama,
      qrisAktif: cfg.qrisAktif,
      pickupAktif: aktif,
      antarAktif: cfg.antarAktif,
      jamMulaiAntar: cfg.jamMulaiAntar,
      jamSelesaiAntar: cfg.jamSelesaiAntar,
      infoPengantaran: cfg.infoPengantaran,
      instruksiTambahan: cfg.instruksiTambahan,
    });
    await jalankan(
      () => supabase.from("po_periods").update({ info_pembayaran: infoBaru }).eq("id", period.id),
      aktif
        ? "Fitur Ambil di Titik Kumpul diaktifkan untuk batch ini"
        : "Fitur Ambil di Titik Kumpul dinonaktifkan (disembunyikan dari checkout)",
    );
  }

  async function pindahkan(dari: number, ke: number) {
    const baru = pindah(urut, dari, ke);
    const berubah = baru
      .map((t, i) => ({ t, urutan: i + 1 }))
      .filter(({ t, urutan }) => t.urutan !== urutan);
    await jalankan(async () => {
      const hasil = await Promise.all(
        berubah.map(({ t, urutan }) => supabase.from("pickup_points").update({ urutan }).eq("id", t.id)),
      );
      return { error: hasil.find((h) => h.error)?.error ?? null };
    });
  }

  return (
    <div className="space-y-3 rounded-2xl border bg-secondary/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <div className="min-w-0">
          <h3 className="font-heading text-sm font-bold text-foreground">
            Titik Pengambilan Minggu {period.minggu} ({titikAktifCount}/{urut.length} lokasi aktif)
          </h3>
          <p className="text-xs text-muted-foreground">
            Opsi Ambil di Titik Kumpul hanya tampil di checkout pelanggan apabila saklar fitur aktif dan minimal ada 1 lokasi aktif.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex min-h-9 cursor-pointer items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-2xs">
            <Switch
              checked={cfg.pickupAktif}
              disabled={sibuk}
              onCheckedChange={(v) => void toggleFiturPickupBatch(v)}
              aria-label={`Aktifkan opsi Ambil di Titik Kumpul Minggu ${period.minggu}`}
            />
            <span>{cfg.pickupAktif ? "Fitur Pickup: Aktif" : "Fitur Pickup: Nonaktif"}</span>
          </label>
          <Button size="sm" className="h-9 rounded-full" onClick={() => setForm({ titik: null })}>
            <Plus aria-hidden /> Tambah Titik
          </Button>
        </div>
      </div>

      {!cfg.pickupAktif && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          <strong>Fitur Pickup Dinonaktifkan:</strong> Opsi <em>Ambil di Titik Kumpul</em> saat ini disembunyikan dari halaman checkout pelanggan. Aktifkan saklar <strong>Fitur Pickup</strong> di atas jika ingin menampilkannya kembali.
        </div>
      )}

      {cfg.pickupAktif && titikAktifCount === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-950">
          <strong>Belum Ada Lokasi Aktif:</strong> Karena seluruh titik pengambilan nonaktif (atau kosong), opsi <em>Ambil di Titik Kumpul</em> otomatis disembunyikan dari checkout pelanggan.
        </div>
      )}

      {urut.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted-foreground">
          Belum ada titik pengambilan. Pelanggan hanya dapat memilih metode Diantar ke Lokasi.
        </p>
      ) : (
        <ul className="grid gap-2">
          {urut.map((t, i) => (
            <BarisUrut
              key={t.id}
              judul={t.nama}
              subjudul={t.jam}
              aktif={t.is_active}
              sibuk={sibuk}
              bisaNaik={i > 0}
              bisaTurun={i < urut.length - 1}
              onToggle={(aktif) =>
                void jalankan(() => supabase.from("pickup_points").update({ is_active: aktif }).eq("id", t.id))
              }
              onNaik={() => void pindahkan(i, i - 1)}
              onTurun={() => void pindahkan(i, i + 1)}
              onEdit={() => setForm({ titik: t })}
            />
          ))}
        </ul>
      )}

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent>
          {form && (
            <TitikForm
              key={form.titik?.id ?? "baru"}
              titik={form.titik}
              onBatal={() => setForm(null)}
              onSimpan={async (v) => {
                const maks = urut.reduce((n, t) => Math.max(n, t.urutan), 0);
                const ok = await jalankan(
                  () =>
                    form.titik
                      ? supabase.from("pickup_points").update(v).eq("id", form.titik.id)
                      : supabase
                          .from("pickup_points")
                          .insert({ ...v, period_id: period.id, is_active: true, urutan: maks + 1 }),
                  form.titik ? "Titik ambil diperbarui" : "Titik ambil ditambahkan",
                );
                if (ok) setForm(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TitikForm({
  titik,
  onBatal,
  onSimpan,
}: {
  titik: PickupPoint | null;
  onBatal: () => void;
  onSimpan: (v: TitikAmbilFormValues) => Promise<void>;
}) {
  const [sibuk, setSibuk] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TitikAmbilFormValues>({
    resolver: zodResolver(titikAmbilSchema),
    defaultValues: { nama: titik?.nama ?? "", jam: titik?.jam ?? "" },
  });

  async function simpan(v: TitikAmbilFormValues) {
    setSibuk(true);
    await onSimpan(v);
    setSibuk(false);
  }

  return (
    <form onSubmit={handleSubmit(simpan)} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{titik ? "Ubah Titik Pengambilan" : "Tambah Titik Pengambilan"}</DialogTitle>
        <DialogDescription>Nama lokasi dan jam pengambilan yang tampil di halaman checkout pelanggan.</DialogDescription>
      </DialogHeader>
      <Field id="titik-nama" label="Nama Titik / Lokasi" error={errors.nama?.message}>
        <Input
          id="titik-nama"
          className="h-11"
          aria-invalid={!!errors.nama}
          aria-describedby={describedBy("titik-nama", undefined, errors.nama?.message)}
          {...register("nama")}
        />
      </Field>
      <Field id="titik-jam" label="Jadwal Jam Pengambilan" hint="Contoh: Minggu 13.00 - 15.00 WIB" error={errors.jam?.message}>
        <Input
          id="titik-jam"
          className="h-11"
          aria-invalid={!!errors.jam}
          aria-describedby={describedBy("titik-jam", "Contoh: Minggu 13.00 - 15.00 WIB", errors.jam?.message)}
          {...register("jam")}
        />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" className="h-11" onClick={onBatal} disabled={sibuk}>
          Batal
        </Button>
        <Button type="submit" className="h-11" disabled={sibuk}>
          {sibuk && <Loader2 className="animate-spin" aria-hidden />} Simpan
        </Button>
      </DialogFooter>
    </form>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ChevronDown, ChevronUp, Loader2, MapPin, Pencil, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { BarisUrut } from "@/components/admin/BarisUrut";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Field, describedBy } from "@/components/public/Field";
import { pesanDb, pindah } from "@/lib/admin";
import { inputWibKeIso, isoKeInputWib, rupiah, tanggalJam, tanggalPanjang } from "@/lib/format";
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
}

type GalatDb = { message: string; code?: string } | null;

export function PeriodeManager({ periods, titik }: PeriodeManagerProps) {
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
      void jalankan(() => supabase.from("po_periods").update({ is_active: false }).eq("id", period.id), "Periode dinonaktifkan");
      return;
    }
    const lain = periods.filter((p) => p.is_active && p.id !== period.id);
    if (lain.length > 0) setAktivasi({ period, lain });
    else void jalankan(() => supabase.from("po_periods").update({ is_active: true }).eq("id", period.id), "Periode diaktifkan");
  }

  async function aktifkan(nonaktifkanLain: boolean) {
    if (!aktivasi) return;
    const { period, lain } = aktivasi;
    const ok = await jalankan(async () => {
      if (nonaktifkanLain) {
        // Nonaktifkan dulu agar aman bila ada batasan "hanya satu periode aktif" di database.
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
    }, nonaktifkanLain ? "Periode diaktifkan, yang lain dinonaktifkan" : "Periode diaktifkan");
    if (ok) setAktivasi(null);
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button className="h-11" onClick={() => setFormPeriode({ period: null })}>
          <Plus aria-hidden /> Tambah periode
        </Button>
      </div>

      {periods.length === 0 && (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Belum ada periode. Tambahkan periode PO pertama.
        </p>
      )}

      <ul className="grid gap-3">
        {periods.map((p) => {
          const titikPeriode = titik.filter((t) => t.period_id === p.id);
          const buka = terbuka === p.id;
          return (
            <li key={p.id} className="space-y-3 rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-heading text-base font-semibold">
                    Minggu {p.minggu} · {p.nama}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {rupiah(p.harga)}/cup · kuota {p.kuota} · maks {p.maks_per_order}/pesanan · topping {p.maks_topping}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Buka {tanggalJam(p.buka_at)} · tutup {tanggalJam(p.tutup_at)} · ambil {tanggalPanjang(p.tanggal_ambil)}
                  </p>
                </div>
                <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-sm font-medium">
                  <Switch
                    checked={p.is_active}
                    disabled={sibuk}
                    onCheckedChange={(v) => toggleAktif(p, v)}
                    aria-label={`Aktifkan Minggu ${p.minggu}`}
                  />
                  {p.is_active ? "Aktif" : "Nonaktif"}
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" className="h-11" disabled={sibuk} onClick={() => setFormPeriode({ period: p })}>
                  <Pencil aria-hidden /> Ubah
                </Button>
                <Button
                  variant="outline"
                  className="h-11"
                  aria-expanded={buka}
                  onClick={() => setTerbuka(buka ? null : p.id)}
                >
                  <MapPin aria-hidden /> Titik ambil ({titikPeriode.length})
                  {buka ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
                </Button>
              </div>
              {buka && <TitikAmbil period={p} titik={titikPeriode} />}
            </li>
          );
        })}
      </ul>

      <Dialog open={!!formPeriode} onOpenChange={(o) => !o && setFormPeriode(null)}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-xl">
          {formPeriode && (
            <PeriodeForm
              key={formPeriode.period?.id ?? "baru"}
              period={formPeriode.period}
              mingguBerikut={periods.reduce((n, p) => Math.max(n, p.minggu), 0) + 1}
              onBatal={() => setFormPeriode(null)}
              onSimpan={async (nilai) => {
                const ok = await jalankan(
                  () =>
                    formPeriode.period
                      ? supabase.from("po_periods").update(nilai).eq("id", formPeriode.period.id)
                      : supabase.from("po_periods").insert({ ...nilai, is_active: false }),
                  formPeriode.period ? "Periode diperbarui" : "Periode ditambahkan",
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
                  pelanggan menampilkan satu periode aktif, jadi sebaiknya yang lain dinonaktifkan.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <Button className="h-11" disabled={sibuk} onClick={() => void aktifkan(true)}>
                  {sibuk && <Loader2 className="animate-spin" aria-hidden />} Aktifkan &amp; nonaktifkan yang lain
                </Button>
                <Button variant="outline" className="h-11" disabled={sibuk} onClick={() => void aktifkan(false)}>
                  Aktifkan saja
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

// ---------- Form periode ----------

type NilaiPeriode = Omit<PoPeriod, "id" | "is_active">;

function PeriodeForm({
  period,
  mingguBerikut,
  onBatal,
  onSimpan,
}: {
  period: PoPeriod | null;
  mingguBerikut: number;
  onBatal: () => void;
  onSimpan: (nilai: NilaiPeriode) => Promise<void>;
}) {
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
          nama: "",
          harga: 15000,
          kuota: 60,
          maks_per_order: 10,
          maks_topping: 2,
          buka_at: "",
          tutup_at: "",
          tanggal_ambil: "",
          info_pembayaran: "",
          wa_admin: "",
          instagram: "",
        },
  });

  async function simpan(v: PeriodeFormValues) {
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
      info_pembayaran: v.info_pembayaran || null,
      wa_admin: v.wa_admin || null,
      instagram: v.instagram || null,
    });
    setSibuk(false);
  }

  const angka = (nama: keyof PeriodeFormValues) => register(nama, { valueAsNumber: true });
  const err = (nama: keyof PeriodeFormValues) => errors[nama]?.message;
  const d = (id: string, hint?: string) => describedBy(id, hint, err(id as keyof PeriodeFormValues));

  return (
    <form onSubmit={handleSubmit(simpan)} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>{period ? `Ubah Minggu ${period.minggu}` : "Tambah periode"}</DialogTitle>
        <DialogDescription>Waktu memakai zona WIB (UTC+7).</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="minggu" label="Minggu ke-" error={err("minggu")}>
          <Input id="minggu" type="number" inputMode="numeric" className="h-11" aria-invalid={!!err("minggu")} aria-describedby={d("minggu")} {...angka("minggu")} />
        </Field>
        <Field id="nama" label="Nama periode" error={err("nama")}>
          <Input id="nama" className="h-11" aria-invalid={!!err("nama")} aria-describedby={d("nama")} {...register("nama")} />
        </Field>
        <Field id="harga" label="Harga per cup (Rp)" error={err("harga")}>
          <Input id="harga" type="number" inputMode="numeric" className="h-11" aria-invalid={!!err("harga")} aria-describedby={d("harga")} {...angka("harga")} />
        </Field>
        <Field id="kuota" label="Kuota (cup)" error={err("kuota")}>
          <Input id="kuota" type="number" inputMode="numeric" className="h-11" aria-invalid={!!err("kuota")} aria-describedby={d("kuota")} {...angka("kuota")} />
        </Field>
        <Field id="maks_per_order" label="Maks cup per pesanan" error={err("maks_per_order")}>
          <Input id="maks_per_order" type="number" inputMode="numeric" className="h-11" aria-invalid={!!err("maks_per_order")} aria-describedby={d("maks_per_order")} {...angka("maks_per_order")} />
        </Field>
        <Field id="maks_topping" label="Maks topping per cup" error={err("maks_topping")}>
          <Input id="maks_topping" type="number" inputMode="numeric" className="h-11" aria-invalid={!!err("maks_topping")} aria-describedby={d("maks_topping")} {...angka("maks_topping")} />
        </Field>
        <Field id="buka_at" label="PO buka (WIB)" error={err("buka_at")}>
          <Input id="buka_at" type="datetime-local" className="h-11" aria-invalid={!!err("buka_at")} aria-describedby={d("buka_at")} {...register("buka_at")} />
        </Field>
        <Field id="tutup_at" label="PO tutup (WIB)" error={err("tutup_at")}>
          <Input id="tutup_at" type="datetime-local" className="h-11" aria-invalid={!!err("tutup_at")} aria-describedby={d("tutup_at")} {...register("tutup_at")} />
        </Field>
        <Field id="tanggal_ambil" label="Tanggal pengambilan" error={err("tanggal_ambil")}>
          <Input id="tanggal_ambil" type="date" className="h-11" aria-invalid={!!err("tanggal_ambil")} aria-describedby={d("tanggal_ambil")} {...register("tanggal_ambil")} />
        </Field>
        <Field id="wa_admin" label="WhatsApp admin" optional hint="Contoh: 081234567890" error={err("wa_admin")}>
          <Input id="wa_admin" type="tel" inputMode="tel" className="h-11" aria-invalid={!!err("wa_admin")} aria-describedby={d("wa_admin", "Contoh: 081234567890")} {...register("wa_admin")} />
        </Field>
      </div>
      <Field id="instagram" label="Instagram" optional hint="@namaakun atau tautan lengkap" error={err("instagram")}>
        <Input id="instagram" className="h-11" aria-invalid={!!err("instagram")} aria-describedby={d("instagram", "@namaakun atau tautan lengkap")} {...register("instagram")} />
      </Field>
      <Field id="info_pembayaran" label="Info pembayaran" optional hint="Nomor rekening/e-wallet dan atas nama. Boleh beberapa baris." error={err("info_pembayaran")}>
        <Textarea id="info_pembayaran" rows={3} className="text-base" aria-invalid={!!err("info_pembayaran")} aria-describedby={d("info_pembayaran", "Nomor rekening")} {...register("info_pembayaran")} />
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

// ---------- Titik ambil ----------

function TitikAmbil({ period, titik }: { period: PoPeriod; titik: PickupPoint[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [sibuk, setSibuk] = useState(false);
  const [form, setForm] = useState<{ titik: PickupPoint | null } | null>(null);
  const urut = [...titik].sort((a, b) => a.urutan - b.urutan || a.nama.localeCompare(b.nama));

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

  async function pindahkan(dari: number, ke: number) {
    const baru = pindah(urut, dari, ke);
    const berubah = baru.map((t, i) => ({ t, urutan: i + 1 })).filter(({ t, urutan }) => t.urutan !== urutan);
    await jalankan(async () => {
      const hasil = await Promise.all(
        berubah.map(({ t, urutan }) => supabase.from("pickup_points").update({ urutan }).eq("id", t.id)),
      );
      return { error: hasil.find((h) => h.error)?.error ?? null };
    });
  }

  return (
    <div className="space-y-2 rounded-xl bg-muted/50 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Titik ambil Minggu {period.minggu}</h3>
        <Button size="sm" className="h-11" onClick={() => setForm({ titik: null })}>
          <Plus aria-hidden /> Tambah
        </Button>
      </div>
      {urut.length === 0 ? (
        <p className="py-3 text-center text-sm text-muted-foreground">
          Belum ada titik ambil. Pelanggan hanya bisa memilih &quot;Diantar&quot;.
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
              onToggle={(aktif) => void jalankan(() => supabase.from("pickup_points").update({ is_active: aktif }).eq("id", t.id))}
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
        <DialogTitle>{titik ? "Ubah titik ambil" : "Tambah titik ambil"}</DialogTitle>
        <DialogDescription>Nama tempat dan jam pengambilan yang tampil di form pelanggan.</DialogDescription>
      </DialogHeader>
      <Field id="titik-nama" label="Nama titik" error={errors.nama?.message}>
        <Input id="titik-nama" className="h-11" aria-invalid={!!errors.nama} aria-describedby={describedBy("titik-nama", undefined, errors.nama?.message)} {...register("nama")} />
      </Field>
      <Field id="titik-jam" label="Jam" hint="Contoh: 12.00-13.00" error={errors.jam?.message}>
        <Input id="titik-jam" className="h-11" aria-invalid={!!errors.jam} aria-describedby={describedBy("titik-jam", "Contoh: 12.00-13.00", errors.jam?.message)} {...register("jam")} />
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

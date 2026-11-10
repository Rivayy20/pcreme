"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2, Loader2, Plus, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import logoImg from "@/assets/logo.png";
import produkImg from "@/assets/produk.jpg";
import qrisImg from "@/assets/qris.jpg";
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
import { Field, describedBy } from "@/components/public/Field";
import { pesanDb, pindah } from "@/lib/admin";
import { menuSchema, type MenuFormValues } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/client";
import type { MenuItem, MenuTipe } from "@/lib/types";

const JUDUL: Record<MenuTipe, string> = { rasa: "Rasa Pudding", topping: "Pilihan Topping" };

const STANDAR_RASA = ["Vanilla", "Stroberi", "Cokelat", "Mix"];
const STANDAR_TOPPING = ["Oreo", "Nyam-nyam", "Choco Crunch", "Sprinkle"];

export function MenuManager({ items }: { items: MenuItem[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [sibukSync, setSibukSync] = useState(false);

  const rasaItems = items.filter((i) => i.tipe === "rasa");
  const toppingItems = items.filter((i) => i.tipe === "topping");

  const rasaKurang = STANDAR_RASA.filter(
    (std) =>
      !rasaItems.some((r) => {
        const l = r.nama.trim().toLowerCase();
        if (std === "Stroberi") return l === "stroberi" || l === "strawberry";
        if (std === "Cokelat") return l === "cokelat" || l === "coklat";
        return l === std.toLowerCase();
      }),
  );

  const toppingKurang = STANDAR_TOPPING.filter(
    (std) => !toppingItems.some((t) => t.nama.trim().toLowerCase() === std.toLowerCase()),
  );

  const adaYangKurang = rasaKurang.length > 0 || toppingKurang.length > 0;

  async function sinkronkanMenuStandar() {
    setSibukSync(true);
    try {
      let maxRasa = rasaItems.reduce((n, i) => Math.max(n, i.urutan), 0);
      let maxTopping = toppingItems.reduce((n, i) => Math.max(n, i.urutan), 0);

      const barisBaru: Omit<MenuItem, "id">[] = [];
      for (const r of rasaKurang) {
        maxRasa += 1;
        barisBaru.push({ tipe: "rasa", nama: r, is_active: true, urutan: maxRasa });
      }
      for (const t of toppingKurang) {
        maxTopping += 1;
        barisBaru.push({ tipe: "topping", nama: t, is_active: true, urutan: maxTopping });
      }

      if (barisBaru.length > 0) {
        const { error } = await supabase.from("menu_items").insert(barisBaru);
        if (error) {
          toast.error(pesanDb(error));
          setSibukSync(false);
          return;
        }
        toast.success(`Berhasil menambahkan: ${barisBaru.map((b) => b.nama).join(", ")}`);
        router.refresh();
      }
    } finally {
      setSibukSync(false);
    }
  }

  return (
    <div className="space-y-8">
      {/* Kartu Sinkronisasi 1-Klik Menu Standar P'crème */}
      {adaYangKurang ? (
        <div className="flex flex-col justify-between gap-4 rounded-3xl border border-primary/25 bg-accent/50 p-5 sm:flex-row sm:items-center">
          <div className="space-y-1">
            <h2 className="flex items-center gap-1.5 font-heading text-base font-bold text-foreground">
              <Sparkles className="size-4 text-primary" aria-hidden />
              Lengkapi Menu Standar P&apos;crème
            </h2>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Item standar yang belum terdaftar di tabel database:{" "}
              <strong>{[...rasaKurang, ...toppingKurang].join(", ")}</strong>. Klik tombol di samping untuk menambahkannya otomatis.
            </p>
          </div>
          <Button
            type="button"
            className="h-11 shrink-0 rounded-full px-5 font-semibold"
            disabled={sibukSync}
            onClick={() => void sinkronkanMenuStandar()}
          >
            {sibukSync ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
            Lengkapi Menu Standar
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2.5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-950 sm:text-sm">
          <CheckCircle2 className="size-4 shrink-0 text-emerald-600" aria-hidden />
          <span>
            Seluruh varian rasa standar (<strong>Vanilla, Stroberi, Cokelat, Mix</strong>) dan topping standar (
            <strong>Oreo, Nyam-nyam, Choco Crunch, Sprinkle</strong>) sudah terdaftar di database.
          </span>
        </div>
      )}

      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-950 sm:text-sm">
        Mengubah nama rasa/topping <strong>tidak mengubah pesanan lama</strong> (nama disimpan sebagai snapshot saat
        pesanan dibuat). Untuk menghentikan penjualan sementara, nonaktifkan saklar item.
      </p>

      <Bagian tipe="rasa" items={rasaItems} />
      <Bagian tipe="topping" items={toppingItems} />

      {/* Ringkasan Asset Produk & QRIS Resmi */}
      <section aria-labelledby="sec-asset" className="space-y-4 rounded-3xl border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3">
          <div>
            <h2 id="sec-asset" className="font-heading text-base font-bold text-foreground">
              Asset Produk &amp; QRIS Resmi
            </h2>
            <p className="text-xs text-muted-foreground">
              Asset lokal resmi yang digunakan pada halaman pelanggan. Pengaturan harga, kuota, dan rekening Mandiri dikelola per batch di menu Periode.
            </p>
          </div>
          <Link
            href="/admin/periode"
            className="inline-flex h-9 items-center rounded-full border bg-secondary px-4 text-xs font-semibold text-primary hover:bg-secondary/80"
          >
            Atur Harga &amp; Rekening Mandiri →
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="flex items-center gap-3.5 rounded-2xl border bg-background p-3">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-[#E9DDCE] bg-[#F5E1BE]">
              <Image src={logoImg} alt="Logo Resmi P'crème" fill sizes="80px" className="object-contain" />
            </div>
            <div className="text-xs">
              <p className="font-heading font-bold text-foreground">Logo Resmi P&apos;crème</p>
              <p className="mt-0.5 text-muted-foreground">src/assets/logo.png</p>
              <p className="mt-1 font-medium text-emerald-700">✓ Aktif di Header, Hero &amp; Footer</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border bg-background p-3">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border bg-secondary">
              <Image src={produkImg} alt="Foto Produk P'crème" fill sizes="80px" className="object-cover" />
            </div>
            <div className="text-xs">
              <p className="font-heading font-bold text-foreground">Foto Produk Utama</p>
              <p className="mt-0.5 text-muted-foreground">src/assets/produk.jpg</p>
              <p className="mt-1 font-medium text-emerald-700">✓ Aktif di Hero &amp; Ringkasan Produk</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5 rounded-2xl border bg-background p-3">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border bg-white p-1">
              <Image src={qrisImg} alt="QRIS P'CREME" fill sizes="80px" className="object-contain" />
            </div>
            <div className="text-xs">
              <p className="font-heading font-bold text-foreground">QRIS Resmi P&apos;CREME</p>
              <p className="mt-0.5 text-muted-foreground">NMID: ID1026635613858</p>
              <p className="mt-1 font-medium text-emerald-700">✓ Aktif di Tahap Pembayaran</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Bagian({ tipe, items }: { tipe: MenuTipe; items: MenuItem[] }) {
  const router = useRouter();
  const [sibuk, setSibuk] = useState(false);
  const [edit, setEdit] = useState<MenuItem | null>(null);
  const urut = [...items].sort((a, b) => a.urutan - b.urutan || a.nama.localeCompare(b.nama));
  const supabase = createClient();

  const form = useForm<MenuFormValues>({ resolver: zodResolver(menuSchema), defaultValues: { nama: "" } });

  async function jalankan(
    fn: () => PromiseLike<{ error: { message: string; code?: string } | null }>,
    sukses?: string,
  ) {
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

  async function tambah(v: MenuFormValues) {
    const maks = urut.reduce((n, i) => Math.max(n, i.urutan), 0);
    const ok = await jalankan(
      () => supabase.from("menu_items").insert({ tipe, nama: v.nama, is_active: true, urutan: maks + 1 }),
      `${JUDUL[tipe]} ditambahkan`,
    );
    if (ok) form.reset({ nama: "" });
  }

  async function pindahkan(dari: number, ke: number) {
    const baru = pindah(urut, dari, ke);
    const berubah = baru
      .map((it, idx) => ({ it, urutan: idx + 1 }))
      .filter(({ it, urutan }) => it.urutan !== urutan);
    await jalankan(async () => {
      const hasil = await Promise.all(
        berubah.map(({ it, urutan }) => supabase.from("menu_items").update({ urutan }).eq("id", it.id)),
      );
      return { error: hasil.find((h) => h.error)?.error ?? null };
    });
  }

  return (
    <section aria-labelledby={`sec-${tipe}`} className="space-y-3 rounded-3xl border bg-card p-5">
      <h2 id={`sec-${tipe}`} className="font-heading text-lg font-bold text-foreground">
        {JUDUL[tipe]}
      </h2>

      <form onSubmit={form.handleSubmit(tambah)} noValidate className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={`nama-${tipe}`} className="sr-only">
            Nama {JUDUL[tipe].toLowerCase()} baru
          </label>
          <Input
            id={`nama-${tipe}`}
            placeholder={`Tambah ${JUDUL[tipe].toLowerCase()} baru…`}
            className="h-11"
            aria-invalid={!!form.formState.errors.nama}
            aria-describedby={form.formState.errors.nama ? `nama-${tipe}-error` : undefined}
            {...form.register("nama")}
          />
          {form.formState.errors.nama && (
            <p id={`nama-${tipe}-error`} role="alert" className="mt-1 text-xs font-medium text-destructive">
              {form.formState.errors.nama.message}
            </p>
          )}
        </div>
        <Button type="submit" className="h-11 rounded-full px-5" disabled={sibuk}>
          {sibuk ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />} Tambah
        </Button>
      </form>

      {urut.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          Belum ada {JUDUL[tipe].toLowerCase()}.
        </p>
      ) : (
        <ul className="grid gap-2">
          {urut.map((it, idx) => (
            <BarisUrut
              key={it.id}
              judul={it.nama}
              aktif={it.is_active}
              sibuk={sibuk}
              bisaNaik={idx > 0}
              bisaTurun={idx < urut.length - 1}
              onToggle={(aktif) =>
                void jalankan(() => supabase.from("menu_items").update({ is_active: aktif }).eq("id", it.id))
              }
              onNaik={() => void pindahkan(idx, idx - 1)}
              onTurun={() => void pindahkan(idx, idx + 1)}
              onEdit={() => setEdit(it)}
            />
          ))}
        </ul>
      )}

      <UbahNamaDialog
        item={edit}
        onClose={() => setEdit(null)}
        onSimpan={async (nama) => {
          if (!edit) return false;
          const ok = await jalankan(
            () => supabase.from("menu_items").update({ nama }).eq("id", edit.id),
            "Nama diperbarui",
          );
          if (ok) setEdit(null);
          return ok;
        }}
      />
    </section>
  );
}

function UbahNamaDialog({
  item,
  onClose,
  onSimpan,
}: {
  item: MenuItem | null;
  onClose: () => void;
  onSimpan: (nama: string) => Promise<boolean>;
}) {
  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        {item && <UbahNamaForm key={item.id} item={item} onClose={onClose} onSimpan={onSimpan} />}
      </DialogContent>
    </Dialog>
  );
}

function UbahNamaForm({
  item,
  onClose,
  onSimpan,
}: {
  item: MenuItem;
  onClose: () => void;
  onSimpan: (nama: string) => Promise<boolean>;
}) {
  const [sibuk, setSibuk] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MenuFormValues>({
    resolver: zodResolver(menuSchema),
    defaultValues: { nama: item.nama },
  });

  async function simpan(v: MenuFormValues) {
    setSibuk(true);
    await onSimpan(v.nama);
    setSibuk(false);
  }

  return (
    <form onSubmit={handleSubmit(simpan)} noValidate className="space-y-4">
      <DialogHeader>
        <DialogTitle>Ubah nama {JUDUL[item.tipe].toLowerCase()}</DialogTitle>
        <DialogDescription>Pesanan lama tidak ikut berubah.</DialogDescription>
      </DialogHeader>
      <Field id="ubah-nama" label="Nama" error={errors.nama?.message}>
        <Input
          id="ubah-nama"
          className="h-11"
          aria-invalid={!!errors.nama}
          aria-describedby={describedBy("ubah-nama", undefined, errors.nama?.message)}
          {...register("nama")}
        />
      </Field>
      <DialogFooter>
        <Button type="button" variant="outline" className="h-11" onClick={onClose} disabled={sibuk}>
          Batal
        </Button>
        <Button type="submit" className="h-11" disabled={sibuk}>
          {sibuk && <Loader2 className="animate-spin" aria-hidden />} Simpan
        </Button>
      </DialogFooter>
    </form>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { BarisUrut } from "@/components/admin/BarisUrut";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field, describedBy } from "@/components/public/Field";
import { pesanDb, pindah } from "@/lib/admin";
import { menuSchema, type MenuFormValues } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/client";
import type { MenuItem, MenuTipe } from "@/lib/types";

const JUDUL: Record<MenuTipe, string> = { rasa: "Rasa", topping: "Topping" };

export function MenuManager({ items }: { items: MenuItem[] }) {
  return (
    <div className="space-y-8">
      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
        Mengubah nama rasa/topping <strong>tidak mengubah pesanan lama</strong> (nama disimpan sebagai snapshot saat
        pesanan dibuat). Untuk menghentikan penjualan, nonaktifkan saja.
      </p>
      <Bagian tipe="rasa" items={items.filter((i) => i.tipe === "rasa")} />
      <Bagian tipe="topping" items={items.filter((i) => i.tipe === "topping")} />
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

  async function jalankan(fn: () => PromiseLike<{ error: { message: string; code?: string } | null }>, sukses?: string) {
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
    <section aria-labelledby={`sec-${tipe}`} className="space-y-3">
      <h2 id={`sec-${tipe}`} className="font-heading text-lg font-semibold">
        {JUDUL[tipe]}
      </h2>

      <form onSubmit={form.handleSubmit(tambah)} noValidate className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <label htmlFor={`nama-${tipe}`} className="sr-only">
            Nama {JUDUL[tipe].toLowerCase()} baru
          </label>
          <Input
            id={`nama-${tipe}`}
            placeholder={`Nama ${JUDUL[tipe].toLowerCase()} baru`}
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
        <Button type="submit" className="h-11" disabled={sibuk}>
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
      <DialogContent>{item && <UbahNamaForm key={item.id} item={item} onClose={onClose} onSimpan={onSimpan} />}</DialogContent>
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
  } = useForm<MenuFormValues>({ resolver: zodResolver(menuSchema), defaultValues: { nama: item.nama } });

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

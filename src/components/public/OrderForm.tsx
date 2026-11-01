"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useFieldArray, useForm, useWatch, type Resolver } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ChoiceChip } from "@/components/public/ChoiceChip";
import { Field, describedBy } from "@/components/public/Field";
import { ItemRow } from "@/components/public/ItemRow";
import { ambilPoInfo, buatPesanan } from "@/lib/api";
import { rupiah } from "@/lib/format";
import { ASAL_OPTIONS, MAKS_BARIS_ITEM, buildOrderSchema, type OrderFormValues } from "@/lib/schemas";
import { simpanSesi } from "@/lib/session";
import { useHydrated } from "@/lib/use-hydrated";
import type { PoInfoAda } from "@/lib/types";

const ITEM_KOSONG = { rasa: "", topping: [] as string[], qty: 1 };

export function OrderForm({ po: poAwal }: { po: PoInfoAda }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [po, setPo] = useState(poAwal);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const masihBuka = po.status === "buka" && po.sisa_kuota > 0;
  const maksTotalCup = Math.max(0, Math.min(po.maks_per_order, po.sisa_kuota));

  const schema = useMemo(
    () => buildOrderSchema({ maksTotalCup, maksTopping: po.maks_topping }),
    [maksTotalCup, po.maks_topping],
  );
  // Resolver membaca skema terbaru lewat ref supaya batas kuota yang di-refresh langsung berlaku.
  const schemaRef = useRef(schema);
  useEffect(() => {
    schemaRef.current = schema;
  }, [schema]);

  const form = useForm<OrderFormValues>({
    resolver: ((values, ctx, opts) =>
      zodResolver(schemaRef.current)(values, ctx, opts)) as Resolver<OrderFormValues>,
    mode: "onTouched",
    defaultValues: {
      nama: "",
      wa: "",
      asal: "",
      fulfillment: "ambil",
      pickup_point_id: po.titik_ambil.length === 1 ? po.titik_ambil[0].id : "",
      alamat: "",
      jam_antar: "",
      catatan: "",
      website: "",
      items: [ITEM_KOSONG],
    },
  });
  const { register, control, handleSubmit, setValue, formState } = form;
  const { errors } = formState;
  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const items = useWatch({ control, name: "items" });
  const fulfillment = useWatch({ control, name: "fulfillment" });
  const asal = useWatch({ control, name: "asal" });
  const pickupId = useWatch({ control, name: "pickup_point_id" });

  const totalCup = (items ?? []).reduce((n, i) => n + (Number(i?.qty) || 0), 0);
  const totalHarga = totalCup * po.harga;

  const itemsError =
    (errors.items as { message?: string; root?: { message?: string } } | undefined)?.message ??
    (errors.items as { root?: { message?: string } } | undefined)?.root?.message;

  async function segarkanPo() {
    const res = await ambilPoInfo();
    if (res.data?.ada_po) setPo(res.data);
    router.refresh(); // perbarui banner (sisa kuota) di Server Component
  }

  async function onSubmit(v: OrderFormValues) {
    // Honeypot terisi => bot. Pura-pura sukses tanpa memanggil RPC.
    if (v.website) {
      toast.success("Pesanan terkirim! Cek WhatsApp kamu ya.");
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const res = await buatPesanan({
      p_period_id: po.id,
      p_nama: v.nama,
      p_wa: v.wa,
      p_asal: v.asal,
      p_fulfillment: v.fulfillment,
      p_pickup_point_id: v.fulfillment === "ambil" ? v.pickup_point_id : null,
      p_alamat: v.fulfillment === "antar" ? v.alamat : null,
      p_jam_antar: v.fulfillment === "antar" ? v.jam_antar : null,
      p_catatan: v.catatan ? v.catatan : null,
      p_items: v.items.map((i) => ({ rasa: i.rasa, topping: i.topping, qty: i.qty })),
    });

    if (res.error !== null) {
      setFormError(res.error);
      toast.error(res.error);
      setSubmitting(false);
      await segarkanPo(); // race kuota: ambil ulang sisa kuota terbaru
      return;
    }

    simpanSesi({ kode: res.data.kode, wa: v.wa, order_id: res.data.order_id });
    toast.success("Pesanan berhasil dibuat 🎉");
    router.push(`/pesanan/${encodeURIComponent(res.data.kode)}`);
    // submitting tetap true sampai halaman berpindah (cegah dobel submit).
  }

  function onInvalid() {
    toast.error("Masih ada isian yang perlu dicek. Lihat tulisan merah ya.");
  }

  const nonaktif = submitting || !masihBuka || !hydrated;

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit, onInvalid)} noValidate className="space-y-6">
      {!masihBuka && (
        <p role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          {po.sisa_kuota <= 0
            ? "Kuota sudah habis. Terima kasih sudah mampir!"
            : "PO sudah tidak menerima pesanan."}
        </p>
      )}

      {formError && (
        <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive">
          {formError}
        </p>
      )}

      {/* Honeypot: disembunyikan dari pengguna & screen reader */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="website">Jangan diisi</label>
        <input id="website" type="text" tabIndex={-1} autoComplete="off" {...register("website")} />
      </div>

      <section aria-labelledby="sec-pemesan" className="space-y-4">
        <h2 id="sec-pemesan" className="font-heading text-lg font-semibold">
          1. Data pemesan
        </h2>
        <Field id="nama" label="Nama" error={errors.nama?.message}>
          <Input
            id="nama"
            autoComplete="name"
            className="h-11"
            aria-invalid={!!errors.nama}
            aria-describedby={describedBy("nama", undefined, errors.nama?.message)}
            {...register("nama")}
          />
        </Field>
        <Field
          id="wa"
          label="Nomor WhatsApp"
          hint="Contoh: 081234567890"
          error={errors.wa?.message}
        >
          <Input
            id="wa"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="081234567890"
            className="h-11"
            aria-invalid={!!errors.wa}
            aria-describedby={describedBy("wa", "Contoh: 081234567890", errors.wa?.message)}
            {...register("wa")}
          />
        </Field>
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Asal</legend>
          <div className="flex flex-wrap gap-2">
            {ASAL_OPTIONS.map((a) => (
              <ChoiceChip
                key={a}
                type="radio"
                name="asal"
                value={a}
                checked={asal === a}
                onChange={() => setValue("asal", a, { shouldValidate: true, shouldDirty: true })}
              >
                {a}
              </ChoiceChip>
            ))}
          </div>
          {errors.asal?.message && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {errors.asal.message}
            </p>
          )}
        </fieldset>
      </section>

      <section aria-labelledby="sec-pesanan" className="space-y-4">
        <h2 id="sec-pesanan" className="font-heading text-lg font-semibold">
          2. Pesanan
        </h2>
        <p className="text-sm text-muted-foreground">
          Maksimal {maksTotalCup} cup untuk pesanan ini (batas per pesanan {po.maks_per_order}, sisa kuota{" "}
          {po.sisa_kuota}). Topping maksimal {po.maks_topping} per cup.
        </p>
        {fields.map((field, index) => (
          <ItemRow
            key={field.id}
            index={index}
            control={control}
            errors={errors.items}
            rasaOptions={po.rasa}
            toppingOptions={po.topping}
            maksTopping={po.maks_topping}
            totalCup={totalCup}
            maksTotalCup={maksTotalCup}
            canRemove={fields.length > 1}
            onRemove={() => remove(index)}
          />
        ))}
        {itemsError && (
          <p role="alert" className="text-sm font-medium text-destructive">
            {itemsError}
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-full border-dashed"
          disabled={nonaktif || fields.length >= MAKS_BARIS_ITEM || totalCup >= maksTotalCup}
          onClick={() => append({ ...ITEM_KOSONG, topping: [] })}
        >
          <Plus aria-hidden /> Tambah rasa lain
        </Button>
      </section>

      <section aria-labelledby="sec-ambil" className="space-y-4">
        <h2 id="sec-ambil" className="font-heading text-lg font-semibold">
          3. Pengambilan
        </h2>
        <fieldset className="space-y-2">
          <legend className="sr-only">Cara pengambilan</legend>
          <div className="flex flex-wrap gap-2">
            <ChoiceChip
              type="radio"
              name="fulfillment"
              value="ambil"
              checked={fulfillment === "ambil"}
              onChange={() => setValue("fulfillment", "ambil", { shouldValidate: true })}
            >
              Ambil di titik kumpul
            </ChoiceChip>
            <ChoiceChip
              type="radio"
              name="fulfillment"
              value="antar"
              checked={fulfillment === "antar"}
              onChange={() => setValue("fulfillment", "antar", { shouldValidate: true })}
            >
              Diantar
            </ChoiceChip>
          </div>
        </fieldset>

        {fulfillment === "ambil" ? (
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Pilih titik ambil</legend>
            {po.titik_ambil.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Belum ada titik ambil. Coba pilih &quot;Diantar&quot; atau hubungi admin.
              </p>
            ) : (
              <div className="grid gap-2">
                {po.titik_ambil.map((t) => (
                  <label
                    key={t.id}
                    className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border bg-card p-3 has-[:checked]:border-primary has-[:checked]:bg-brand-pink-soft has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/60"
                  >
                    <input
                      type="radio"
                      name="pickup_point_id"
                      value={t.id}
                      checked={pickupId === t.id}
                      onChange={() =>
                        setValue("pickup_point_id", t.id, { shouldValidate: true, shouldDirty: true })
                      }
                      className="size-5 accent-primary"
                    />
                    <span>
                      <span className="block text-sm font-medium">{t.nama}</span>
                      <span className="block text-xs text-muted-foreground">{t.jam}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
            {errors.pickup_point_id?.message && (
              <p role="alert" className="text-xs font-medium text-destructive">
                {errors.pickup_point_id.message}
              </p>
            )}
          </fieldset>
        ) : (
          <div className="space-y-4">
            <Field id="alamat" label="Lokasi pengantaran" hint="Tulis lokasi yang jelas, mis. nama gedung/kos + patokan." error={errors.alamat?.message}>
              <Textarea
                id="alamat"
                rows={3}
                className="text-base"
                aria-invalid={!!errors.alamat}
                aria-describedby={describedBy("alamat", "Tulis lokasi yang jelas", errors.alamat?.message)}
                {...register("alamat")}
              />
            </Field>
            <Field id="jam_antar" label="Jam antar" error={errors.jam_antar?.message}>
              <Input
                id="jam_antar"
                type="time"
                className="h-11"
                aria-invalid={!!errors.jam_antar}
                aria-describedby={describedBy("jam_antar", undefined, errors.jam_antar?.message)}
                {...register("jam_antar")}
              />
            </Field>
          </div>
        )}
      </section>

      <section aria-labelledby="sec-catatan" className="space-y-4">
        <h2 id="sec-catatan" className="font-heading text-lg font-semibold">
          4. Catatan
        </h2>
        <Field id="catatan" label="Catatan untuk penjual" optional error={errors.catatan?.message}>
          <Textarea
            id="catatan"
            rows={2}
            className="text-base"
            aria-invalid={!!errors.catatan}
            aria-describedby={describedBy("catatan", undefined, errors.catatan?.message)}
            {...register("catatan")}
          />
        </Field>
      </section>

      <div className="sticky bottom-0 -mx-4 border-t bg-background/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div aria-live="polite">
            <p className="text-xs text-muted-foreground">{totalCup} cup</p>
            <p className="font-heading text-lg font-bold">{rupiah(totalHarga)}</p>
          </div>
          <Button type="submit" className="h-12 flex-1 rounded-full text-base font-semibold" disabled={nonaktif}>
            {submitting ? (
              <>
                <Loader2 className="animate-spin" aria-hidden /> Memproses…
              </>
            ) : (
              "Pesan Sekarang"
            )}
          </Button>
        </div>
      </div>
    </form>
  );
}

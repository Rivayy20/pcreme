"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, describedBy } from "@/components/public/Field";
import { cekStatusSchema, type CekStatusValues } from "@/lib/schemas";
import { bacaSesiMentah, parseSesi, simpanSesi } from "@/lib/session";
import { useHydrated } from "@/lib/use-hydrated";

export function CekStatusForm() {
  const router = useRouter();
  const hydrated = useHydrated();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CekStatusValues>({
    resolver: zodResolver(cekStatusSchema),
    defaultValues: { kode: "", wa: "" },
  });

  function onSubmit(v: CekStatusValues) {
    // WA dibawa lewat sessionStorage, bukan URL.
    // order_id dipertahankan bila sesi sebelumnya untuk kode yang sama (agar upload bukti tetap bisa).
    const sebelumnya = parseSesi(bacaSesiMentah(), v.kode);
    simpanSesi({ kode: v.kode, wa: v.wa, order_id: sebelumnya?.order_id });
    router.push(`/pesanan/${encodeURIComponent(v.kode)}`);
  }

  return (
    <form method="post" onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      <Field id="kode" label="Kode pesanan" hint="Contoh: PC-0001. Ada di halaman setelah kamu memesan." error={errors.kode?.message}>
        <Input
          id="kode"
          autoCapitalize="characters"
          autoComplete="off"
          className="h-11"
          aria-invalid={!!errors.kode}
          aria-describedby={describedBy("kode", "hint", errors.kode?.message)}
          {...register("kode")}
        />
      </Field>
      <Field id="wa" label="Nomor WhatsApp" hint="Nomor yang dipakai saat memesan" error={errors.wa?.message}>
        <Input
          id="wa"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="081234567890"
          className="h-11"
          aria-invalid={!!errors.wa}
          aria-describedby={describedBy("wa", "hint", errors.wa?.message)}
          {...register("wa")}
        />
      </Field>
      <Button type="submit" className="h-11 w-full rounded-full" disabled={isSubmitting || !hydrated}>
        Cek status
      </Button>
    </form>
  );
}

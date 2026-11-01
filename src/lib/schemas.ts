import { z } from "zod";
import { waValid } from "@/lib/format";

/** Skema nomor WA (cermin aturan server: 08.., 628.., +628..). */
export const waSchema = z
  .string()
  .trim()
  .min(1, "Nomor WhatsApp wajib diisi")
  .refine(waValid, "Nomor WhatsApp tidak valid. Contoh: 081234567890");

/** Form cek status: kode pesanan + nomor WA. */
export const cekStatusSchema = z.object({
  kode: z.string().trim().min(1, "Kode pesanan wajib diisi"),
  wa: waSchema,
});

export type CekStatusValues = z.infer<typeof cekStatusSchema>;

export const ASAL_OPTIONS = ["Mahasiswa", "Pelajar", "Dosen-Staf", "Lainnya"] as const;
export const MAKS_BARIS_ITEM = 10;

export interface AturanPesanan {
  /** min(maks_per_order, sisa_kuota) — hanya untuk UX; server tetap penentu. */
  maksTotalCup: number;
  maksTopping: number;
}

/** Skema form pemesanan. Cermin aturan server supaya UX bagus; server tetap sumber kebenaran. */
export function buildOrderSchema({ maksTotalCup, maksTopping }: AturanPesanan) {
  return z
    .object({
      nama: z
        .string()
        .trim()
        .min(2, "Nama minimal 2 karakter")
        .max(80, "Nama maksimal 80 karakter"),
      wa: waSchema,
      asal: z.string().refine((v) => (ASAL_OPTIONS as readonly string[]).includes(v), "Pilih asal kamu"),
      fulfillment: z.enum(["ambil", "antar"]),
      pickup_point_id: z.string(),
      alamat: z.string().trim().max(300, "Alamat maksimal 300 karakter"),
      jam_antar: z.string().trim(),
      catatan: z.string().trim().max(300, "Catatan maksimal 300 karakter"),
      /** Honeypot: harus tetap kosong. */
      website: z.string(),
      items: z
        .array(
          z.object({
            rasa: z.string().min(1, "Pilih rasanya dulu"),
            topping: z
              .array(z.string())
              .max(maksTopping, `Topping maksimal ${maksTopping} per cup`),
            qty: z.number().int().min(1, "Minimal 1 cup"),
          }),
        )
        .min(1, "Tambahkan minimal 1 rasa")
        .max(MAKS_BARIS_ITEM, `Maksimal ${MAKS_BARIS_ITEM} baris rasa`),
    })
    .superRefine((v, ctx) => {
      const total = v.items.reduce((n, i) => n + i.qty, 0);
      if (total > maksTotalCup) {
        ctx.addIssue({
          code: "custom",
          path: ["items"],
          message: `Total cup melebihi batas (maks ${maksTotalCup} cup untuk pesanan ini)`,
        });
      }
      if (v.fulfillment === "ambil" && !v.pickup_point_id) {
        ctx.addIssue({ code: "custom", path: ["pickup_point_id"], message: "Pilih titik ambil" });
      }
      if (v.fulfillment === "antar") {
        if (v.alamat.length < 5) {
          ctx.addIssue({ code: "custom", path: ["alamat"], message: "Isi lokasi pengantaran" });
        }
        if (!v.jam_antar) {
          ctx.addIssue({ code: "custom", path: ["jam_antar"], message: "Pilih jam antar" });
        }
      }
    });
}

export type OrderFormValues = z.infer<ReturnType<typeof buildOrderSchema>>;

// ---------- Admin ----------

const angka = (label: string, min: number) =>
  z
    .number({ error: `${label} harus berupa angka` })
    .int(`${label} harus bilangan bulat`)
    .min(min, `${label} minimal ${min}`);

/** Form periode PO. Waktu dalam format <input type="datetime-local"> (dianggap WIB). Kolom last_seq tidak ikut. */
export const periodeSchema = z
  .object({
    minggu: angka("Minggu", 1),
    nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(80, "Nama maksimal 80 karakter"),
    harga: angka("Harga", 1),
    kuota: angka("Kuota", 1),
    maks_per_order: angka("Maks per pesanan", 1),
    maks_topping: angka("Maks topping", 0),
    buka_at: z.string().min(1, "Isi waktu buka"),
    tutup_at: z.string().min(1, "Isi waktu tutup"),
    tanggal_ambil: z.string().min(1, "Isi tanggal pengambilan"),
    info_pembayaran: z.string().trim(),
    wa_admin: z
      .string()
      .trim()
      .refine((v) => v === "" || waValid(v), "Nomor WhatsApp admin tidak valid"),
    instagram: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    if (v.buka_at && v.tutup_at && v.tutup_at <= v.buka_at) {
      ctx.addIssue({ code: "custom", path: ["tutup_at"], message: "Waktu tutup harus setelah waktu buka" });
    }
  });

export type PeriodeFormValues = z.infer<typeof periodeSchema>;

export const titikAmbilSchema = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter").max(80, "Nama maksimal 80 karakter"),
  jam: z.string().trim().min(1, "Isi jam pengambilan").max(40, "Jam maksimal 40 karakter"),
});

export type TitikAmbilFormValues = z.infer<typeof titikAmbilSchema>;

export const menuSchema = z.object({
  nama: z.string().trim().min(1, "Nama wajib diisi").max(60, "Nama maksimal 60 karakter"),
});

export type MenuFormValues = z.infer<typeof menuSchema>;

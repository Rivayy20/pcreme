import { parseAlamatAntar, parseCatatanPesanan } from "@/lib/order-meta";
import type { OrderDenganRelasi, PoPeriod } from "@/lib/types";

export type PeriodeRingkas = Pick<PoPeriod, "id" | "minggu" | "nama" | "is_active">;

/** Periode terpilih: dari query ?periode=, lalu periode aktif, lalu yang terbaru (minggu terbesar). */
export function pilihPeriode<T extends PeriodeRingkas>(periods: T[], param?: string | string[]): T | undefined {
  const id = Array.isArray(param) ? param[0] : param;
  return (
    periods.find((p) => p.id === id) ??
    periods.find((p) => p.is_active) ??
    [...periods].sort((a, b) => b.minggu - a.minggu)[0]
  );
}

/** Lokasi pengambilan/pengantaran sebagai teks. */
export function lokasiPesanan(o: Pick<OrderDenganRelasi, "fulfillment" | "pickup_points" | "alamat_antar" | "jam_antar">): string {
  if (o.fulfillment === "ambil") {
    return o.pickup_points ? `${o.pickup_points.nama} (${o.pickup_points.jam})` : "Titik ambil";
  }
  const { alamat, patokan } = parseAlamatAntar(o.alamat_antar);
  return `Antar: ${alamat}${patokan ? ` [Patokan: ${patokan}]` : ""}${o.jam_antar ? ` (jam ${o.jam_antar})` : ""}`;
}

/** "2x Coklat (Oreo, Meses); 1x Strawberry" */
export function rincianItem(
  items: OrderDenganRelasi["order_items"],
  catatan?: string | null,
): string {
  const meta = parseCatatanPesanan(catatan, items);
  return meta.cups
    .map((c) => `Cup #${c.nomor}: ${c.qty}x ${c.labelRasa}${c.topping.length ? ` (${c.topping.join(", ")})` : ""}`)
    .join("; ");
}

/** Pesan galat Supabase yang ramah; 23505 = pelanggaran unik. */
export function pesanDb(err: { message: string; code?: string }): string {
  return err.code === "23505" ? "Data dengan nama/nilai itu sudah ada." : err.message;
}

/** Pindahkan elemen `dari` ke indeks `ke`; mengembalikan salinan baru. */
export function pindah<T>(arr: T[], dari: number, ke: number): T[] {
  const salin = [...arr];
  const [x] = salin.splice(dari, 1);
  salin.splice(ke, 0, x);
  return salin;
}

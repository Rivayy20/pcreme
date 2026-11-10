import type { PoInfo, PoInfoAda } from "@/lib/types";

/** Daftar rute pelanggan: satu sumber kebenaran agar tautan konsisten di seluruh situs. */
export const RUTE = {
  beranda: "/",
  jadwal: "/jadwal",
  pesan: "/pesan",
  cekPesanan: "/pesanan/cek",
} as const;

/** Checkout untuk batch tertentu: /pesan/<id batch>. */
export function rutePesanBatch(batchId: string): string {
  return `${RUTE.pesan}/${encodeURIComponent(batchId)}`;
}

/** Batch dapat menerima pesanan baru (status dari database: buka dan kuota masih ada). */
export function poBisaDipesan(po: PoInfo | null | undefined): po is PoInfoAda {
  return !!po && po.ada_po && po.status === "buka" && po.sisa_kuota > 0;
}

/** Tujuan tombol "Pesan Sekarang": checkout batch aktif, atau Jadwal PO bila tidak ada batch yang bisa dipesan. */
export function hrefPesanSekarang(po: PoInfo | null | undefined): string {
  return poBisaDipesan(po) ? rutePesanBatch(po.id) : RUTE.jadwal;
}

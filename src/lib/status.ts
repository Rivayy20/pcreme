import type { OrderStatus } from "@/lib/types";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  menunggu_bayar: "Menunggu bayar",
  menunggu_verifikasi: "Menunggu verifikasi",
  dibayar: "Dibayar",
  diproses: "Diproses",
  siap: "Siap diambil",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
};

/** Kelas Tailwind badge, konsisten di seluruh app (publik & admin). */
export const STATUS_BADGE: Record<OrderStatus, string> = {
  menunggu_bayar: "bg-amber-100 text-amber-900 border-amber-200",
  menunggu_verifikasi: "bg-sky-100 text-sky-900 border-sky-200",
  dibayar: "bg-emerald-100 text-emerald-900 border-emerald-200",
  diproses: "bg-violet-100 text-violet-900 border-violet-200",
  siap: "bg-pink-100 text-pink-900 border-pink-200",
  selesai: "bg-stone-200 text-stone-800 border-stone-300",
  dibatalkan: "bg-red-100 text-red-900 border-red-200",
};

/** Urutan alur normal (untuk stepper). `dibatalkan` di luar alur. */
export const STATUS_URUTAN: OrderStatus[] = [
  "menunggu_bayar",
  "menunggu_verifikasi",
  "dibayar",
  "diproses",
  "siap",
  "selesai",
];

export function indeksStatus(status: OrderStatus): number {
  return STATUS_URUTAN.indexOf(status);
}

/** Transisi status berikutnya yang diizinkan admin (selain verifikasi & pembatalan). */
export const STATUS_BERIKUTNYA: Partial<Record<OrderStatus, OrderStatus>> = {
  dibayar: "diproses",
  diproses: "siap",
  siap: "selesai",
};

export const AKSI_LABEL: Partial<Record<OrderStatus, string>> = {
  dibayar: "Mulai proses",
  diproses: "Tandai siap",
  siap: "Tandai selesai",
};

export function bisaDibatalkan(status: OrderStatus): boolean {
  return status !== "selesai" && status !== "dibatalkan";
}

export function butuhPembayaran(status: OrderStatus): boolean {
  return status === "menunggu_bayar" || status === "menunggu_verifikasi";
}

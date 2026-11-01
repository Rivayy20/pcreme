import type { SesiPesanan } from "@/lib/types";

// Hanya sessionStorage (hilang saat tab ditutup). Jangan simpan data pribadi lain.
const KEY = "pcreme:sesi-pesanan";

export function simpanSesi(sesi: SesiPesanan): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(sesi));
  } catch {
    // sessionStorage bisa diblokir (mode privat tertentu); aplikasi tetap jalan tanpa itu.
  }
}

/** Isi mentah sessionStorage (string stabil, cocok untuk useSyncExternalStore). */
export function bacaSesiMentah(): string {
  try {
    return sessionStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

/** Ambil sesi dari isi mentah bila kodenya cocok dengan halaman yang dibuka. */
export function parseSesi(raw: string, kode: string): SesiPesanan | null {
  try {
    if (!raw) return null;
    const sesi = JSON.parse(raw) as Partial<SesiPesanan>;
    if (typeof sesi.kode !== "string" || typeof sesi.wa !== "string") return null;
    if (sesi.kode.toLowerCase() !== kode.toLowerCase()) return null;
    return { kode: sesi.kode, wa: sesi.wa, order_id: sesi.order_id };
  } catch {
    return null;
  }
}

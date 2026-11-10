import type { KonfigurasiCup, MetodePembayaran } from "@/lib/order-meta";
import type { Fulfillment, OrderStatus, SesiPesanan } from "@/lib/types";

const KEY = "pcreme:sesi-pesanan";
const MAP_KEY = "pcreme:riwayat-sesi";
const SUKSES_CHECKOUT_KEY = "pcreme:sukses-checkout";

export interface SesiSuksesCheckout {
  batchId: string;
  orderId: string;
  kode: string;
  jumlahCup: number;
  total: number;
  status: OrderStatus;
  sudahKirimBukti: boolean;
  metodeBayar: MetodePembayaran;
  fulfillment: Fulfillment;
  lokasiTampil: string;
  nama: string;
  wa: string;
  cups: KonfigurasiCup[];
}

export function simpanSuksesCheckout(data: SesiSuksesCheckout): void {
  try {
    sessionStorage.setItem(SUKSES_CHECKOUT_KEY, JSON.stringify(data));
  } catch {
    // sessionStorage bisa diblokir (mode privat tertentu); aplikasi tetap jalan tanpa itu.
  }
}

export function ambilSuksesCheckout(batchId?: string): SesiSuksesCheckout | null {
  try {
    const raw = sessionStorage.getItem(SUKSES_CHECKOUT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SesiSuksesCheckout;
    if (batchId && parsed.batchId !== batchId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function hapusSuksesCheckout(): void {
  try {
    sessionStorage.removeItem(SUKSES_CHECKOUT_KEY);
  } catch {
    // sessionStorage bisa diblokir
  }
}

/** Isi mentah sukses checkout di sessionStorage (string stabil, cocok untuk useSyncExternalStore). */
export function bacaSuksesCheckoutMentah(): string {
  try {
    return sessionStorage.getItem(SUKSES_CHECKOUT_KEY) ?? "";
  } catch {
    return "";
  }
}

export function parseSuksesCheckout(raw: string, batchId?: string): SesiSuksesCheckout | null {
  try {
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SesiSuksesCheckout;
    if (batchId && parsed.batchId !== batchId) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function simpanSesi(sesi: SesiPesanan): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(sesi));
    // Simpan juga peta per kode pesanan di sessionStorage agar jika pelanggan memiliki >1 pesanan di sesi yang sama, metadata cup & metode bayar tidak hilang.
    const rawMap = sessionStorage.getItem(MAP_KEY);
    const map: Record<string, SesiPesanan> = rawMap ? (JSON.parse(rawMap) as Record<string, SesiPesanan>) : {};
    const prev = map[sesi.kode.toUpperCase()];
    map[sesi.kode.toUpperCase()] = {
      ...prev,
      ...sesi,
      order_id: sesi.order_id ?? prev?.order_id,
      metode_bayar: sesi.metode_bayar ?? prev?.metode_bayar,
      cups: sesi.cups ?? prev?.cups,
      catatan_pelanggan: sesi.catatan_pelanggan ?? prev?.catatan_pelanggan,
      patokan: sesi.patokan ?? prev?.patokan,
      kontak_antar: sesi.kontak_antar ?? prev?.kontak_antar,
    };
    sessionStorage.setItem(MAP_KEY, JSON.stringify(map));
  } catch {
    // sessionStorage bisa diblokir (mode privat tertentu); aplikasi tetap jalan tanpa itu.
  }
}

/** Isi mentah sessionStorage (string stabil, cocok untuk useSyncExternalStore). */
export function bacaSesiMentah(): string {
  try {
    const aktif = sessionStorage.getItem(KEY) ?? "";
    const map = sessionStorage.getItem(MAP_KEY) ?? "";
    return `${aktif}|||${map}`;
  } catch {
    return "";
  }
}

/** Ambil sesi dari isi mentah bila kodenya cocok dengan halaman yang dibuka. */
export function parseSesi(raw: string, kode: string): SesiPesanan | null {
  try {
    if (!raw) return null;
    const [aktifStr, mapStr] = raw.split("|||");
    const target = kode.trim().toUpperCase();

    if (mapStr) {
      const map = JSON.parse(mapStr) as Record<string, SesiPesanan>;
      if (map[target] && typeof map[target].wa === "string") {
        return map[target];
      }
    }

    if (aktifStr) {
      const sesi = JSON.parse(aktifStr) as Partial<SesiPesanan>;
      if (typeof sesi.kode === "string" && typeof sesi.wa === "string") {
        if (sesi.kode.trim().toUpperCase() === target) {
          return sesi as SesiPesanan;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}

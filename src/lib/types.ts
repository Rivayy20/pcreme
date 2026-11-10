// Tipe manual sesuai kontrak database (bagian 3). Skema DB tidak boleh diubah dari sini.

export type PoStatus = "belum_buka" | "buka" | "habis" | "tutup";

export type OrderStatus =
  | "menunggu_bayar"
  | "menunggu_verifikasi"
  | "dibayar"
  | "diproses"
  | "siap"
  | "selesai"
  | "dibatalkan";

export type Fulfillment = "ambil" | "antar";
export type MenuTipe = "rasa" | "topping";
export type Asal = "Mahasiswa" | "Pelajar" | "Dosen-Staf" | "Lainnya";

// ---------- RPC pelanggan ----------

export interface TitikAmbil {
  id: string;
  nama: string;
  jam: string;
}

export interface PoInfoKosong {
  ada_po: false;
}

export interface PoInfoAda {
  ada_po: true;
  id: string;
  nama: string;
  minggu: number;
  status: PoStatus;
  harga: number;
  kuota: number;
  sisa_kuota: number;
  maks_per_order: number;
  maks_topping: number;
  buka_at: string;
  tutup_at: string;
  tanggal_ambil: string;
  info_pembayaran: string | null;
  wa_admin: string | null;
  instagram: string | null;
  rasa: string[];
  topping: string[];
  titik_ambil: TitikAmbil[];
  server_time: string;
}

export type PoInfo = PoInfoKosong | PoInfoAda;

export interface ItemPesananInput {
  rasa: string;
  topping: string[];
  qty: number;
}

export const DAFTAR_ALASAN_TOLAK = [
  "Nominal pembayaran tidak sesuai",
  "Bukti pembayaran tidak jelas atau buram",
  "Bukti pembayaran tidak valid",
  "Rekening tujuan tidak sesuai",
  "Transaksi belum berhasil atau masih pending",
  "Alasan lainnya",
] as const;

export type RejectionReason = (typeof DAFTAR_ALASAN_TOLAK)[number];

export interface PaymentHistoryItem {
  id: string;
  tipe: "upload" | "rejection" | "approval";
  waktu: string;
  buktiPath?: string | null;
  alasan?: string | null;
  catatan?: string | null;
  adminEmail?: string | null;
}

export interface BuatPesananParams {
  p_period_id: string;
  p_nama: string;
  p_wa: string;
  p_asal: string;
  p_fulfillment: Fulfillment;
  p_pickup_point_id: string | null;
  p_alamat: string | null;
  p_jam_antar: string | null;
  p_catatan: string | null;
  p_items: ItemPesananInput[];
}

export interface BuatPesananResult {
  order_id: string;
  kode: string;
  jumlah_cup: number;
  total: number;
}

export interface StatusPesanan {
  kode: string;
  nama: string;
  status: OrderStatus;
  fulfillment: Fulfillment;
  lokasi: string | null;
  tanggal_ambil: string | null;
  jumlah_cup: number;
  total: number;
  sudah_kirim_bukti: boolean;
  info_pembayaran: string | null;
  dibuat_pada: string;
  items: ItemPesananInput[];
  order_id?: string;
  wa_admin?: string | null;
  catatan_admin?: string | null;
  alasan_penolakan?: string | null;
  catatan_penolakan?: string | null;
  riwayat_pembayaran?: PaymentHistoryItem[];
}

export interface KirimBuktiResult {
  ok: boolean;
  status: OrderStatus;
}

/** Data yang disimpan di sessionStorage/localStorage setelah memesan / saat cek status. */
export interface SesiPesanan {
  kode: string;
  wa: string;
  order_id?: string;
  metode_bayar?: "qris" | "mandiri";
  catatan_pelanggan?: string;
  patokan?: string;
  kontak_antar?: string;
  cups?: {
    nomor: number;
    labelRasa: string;
    isMix: boolean;
    rasaMix: string[];
    topping: string[];
    qty: number;
  }[];
}

// ---------- Tabel (admin) ----------

export interface PoPeriod {
  id: string;
  minggu: number;
  nama: string;
  harga: number;
  kuota: number;
  maks_per_order: number;
  maks_topping: number;
  buka_at: string;
  tutup_at: string;
  tanggal_ambil: string;
  info_pembayaran: string | null;
  wa_admin: string | null;
  instagram: string | null;
  is_active: boolean;
}

export interface MenuItem {
  id: string;
  tipe: MenuTipe;
  nama: string;
  is_active: boolean;
  urutan: number;
}

export interface PickupPoint {
  id: string;
  period_id: string;
  nama: string;
  jam: string;
  is_active: boolean;
  urutan: number;
}

export interface OrderItem {
  id: string;
  order_id: string;
  rasa: string;
  topping: string[];
  qty: number;
}

export interface Order {
  id: string;
  kode: string;
  period_id: string;
  nama: string;
  wa: string; // format 628xxx
  asal: string;
  fulfillment: Fulfillment;
  pickup_point_id: string | null;
  alamat_antar: string | null;
  jam_antar: string | null;
  catatan: string | null;
  jumlah_cup: number;
  harga_satuan: number;
  total: number;
  status: OrderStatus;
  bukti_bayar_path: string | null;
  bukti_uploaded_at: string | null;
  catatan_admin: string | null;
  alasan_penolakan?: string | null;
  catatan_penolakan?: string | null;
  riwayat_pembayaran?: PaymentHistoryItem[] | null;
  created_at: string;
  updated_at: string;
}

/** Hasil `orders.select('*, order_items(*), pickup_points(nama,jam)')`. */
export interface OrderDenganRelasi extends Order {
  order_items: OrderItem[];
  pickup_points: { nama: string; jam: string } | null;
}

// ---------- View rekap (read-only, admin) ----------

export interface RekapPeriode {
  period_id: string;
  minggu: number;
  nama: string;
  kuota: number;
  total_pesanan: number;
  cup_terpesan: number;
  sisa_kuota: number;
  omzet_terkonfirmasi: number;
  potensi_belum_bayar: number;
  belum_bayar: number;
  perlu_verifikasi: number;
  selesai: number;
  dibatalkan: number;
}

export interface RekapRasa {
  period_id: string;
  rasa: string;
  cup_dibayar: number;
  cup_semua: number;
}

export interface RekapTopping {
  period_id: string;
  topping: string;
  cup_dibayar: number;
  cup_semua: number;
}

export interface RekapPengambilan {
  period_id: string;
  fulfillment: Fulfillment;
  lokasi: string | null;
  jumlah_pesanan: number;
  jumlah_cup: number;
  sudah_selesai: number;
}

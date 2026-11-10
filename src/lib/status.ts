import type { Fulfillment, OrderStatus } from "@/lib/types";

export const STATUS_LABEL: Record<OrderStatus, string> = {
  menunggu_bayar: "Menunggu Pembayaran",
  menunggu_verifikasi: "Menunggu Verifikasi",
  dibayar: "Terkonfirmasi (Lunas)",
  diproses: "Sedang Diproses",
  siap: "Siap Diambil / Diantar",
  selesai: "Pesanan Selesai",
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
  dibayar: "Mulai Proses Produksi",
  diproses: "Tandai Siap Diambil / Diantar",
  siap: "Tandai Pesanan Selesai",
};

export function bisaDibatalkan(status: OrderStatus): boolean {
  return status !== "selesai" && status !== "dibatalkan";
}

export function butuhPembayaran(status: OrderStatus): boolean {
  return status === "menunggu_bayar" || status === "menunggu_verifikasi";
}

// ---------- Pemisahan Status Pembayaran & Status Pesanan ----------

export type PaymentStatusType =
  | "pending_payment"
  | "waiting_verification"
  | "paid"
  | "payment_rejected";

export type OrderProgressStatusType =
  | "pending"
  | "confirmed"
  | "processing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

export const PAYMENT_STATUS_LABEL: Record<PaymentStatusType, string> = {
  pending_payment: "Pending Payment",
  waiting_verification: "Waiting Verification",
  paid: "Paid (Lunas)",
  payment_rejected: "Payment Rejected",
};

export const PAYMENT_STATUS_LABEL_ID: Record<PaymentStatusType, string> = {
  pending_payment: "Menunggu Pembayaran",
  waiting_verification: "Menunggu Verifikasi",
  paid: "Lunas (Terverifikasi)",
  payment_rejected: "Bukti Ditolak",
};

export const PAYMENT_STATUS_BADGE: Record<PaymentStatusType, string> = {
  pending_payment: "bg-amber-100 text-amber-900 border-amber-200",
  waiting_verification: "bg-sky-100 text-sky-900 border-sky-200",
  paid: "bg-emerald-100 text-emerald-900 border-emerald-200",
  payment_rejected: "bg-red-100 text-red-900 border-red-200",
};

export const ORDER_PROGRESS_LABEL: Record<OrderProgressStatusType, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  ready_for_pickup: "Ready for Pickup",
  out_for_delivery: "Out for Delivery",
  completed: "Completed",
  cancelled: "Cancelled",
};

export const ORDER_PROGRESS_LABEL_ID: Record<OrderProgressStatusType, string> = {
  pending: "Pesanan Dibuat",
  confirmed: "Dikonfirmasi",
  processing: "Sedang Diproses",
  ready_for_pickup: "Siap Diambil",
  out_for_delivery: "Dalam Pengantaran",
  completed: "Pesanan Selesai",
  cancelled: "Dibatalkan",
};

export const ORDER_PROGRESS_BADGE: Record<OrderProgressStatusType, string> = {
  pending: "bg-stone-100 text-stone-800 border-stone-200",
  confirmed: "bg-teal-100 text-teal-900 border-teal-200",
  processing: "bg-violet-100 text-violet-900 border-violet-200",
  ready_for_pickup: "bg-pink-100 text-pink-900 border-pink-200",
  out_for_delivery: "bg-indigo-100 text-indigo-900 border-indigo-200",
  completed: "bg-emerald-100 text-emerald-900 border-emerald-200",
  cancelled: "bg-red-100 text-red-900 border-red-200",
};

/** Deteksi apakah pembayaran pesanan pernah ditolak berdasarkan status + bukti/catatan_admin. */
export function isPaymentRejected(
  status: OrderStatus,
  opsi?: {
    catatanAdmin?: string | null;
    buktiBayarPath?: string | null;
    sudahKirimBukti?: boolean;
    alasanPenolakan?: string | null;
  },
): boolean {
  if (status !== "menunggu_bayar") return false;
  if (opsi?.alasanPenolakan && opsi.alasanPenolakan.trim().length > 0) return true;
  const cat = opsi?.catatanAdmin ?? "";
  if (/^\[DITOLAK/i.test(cat.trim())) return true;
  if (opsi?.buktiBayarPath && cat.trim().length > 0) return true;
  return false;
}

export function bersihAlasanTolak(catatanAdmin: string | null | undefined): string | null {
  if (!catatanAdmin) return null;
  const t = catatanAdmin.trim();
  if (!t) return null;
  // Jika format [DITOLAK: ...]
  const mColon = t.match(/^\[DITOLAK:\s*([^\]]+)\]/i);
  if (mColon && mColon[1]) return mColon[1].trim();
  // Jika format [DITOLAK] ...
  const mTag = t.replace(/^\[DITOLAK\]\s*/i, "");
  // Hilangkan baris [CATATAN: ...] atau [PAYMENT_META: ...] jika ada
  const barisPertama = mTag.split("\n")[0]?.trim();
  return barisPertama || null;
}

/** Hitung status pembayaran terpisah dari status produksi/pengiriman. */
export function derivePaymentStatus(
  status: OrderStatus,
  opsi?: {
    catatanAdmin?: string | null;
    buktiBayarPath?: string | null;
    sudahKirimBukti?: boolean;
    alasanPenolakan?: string | null;
  },
): PaymentStatusType {
  if (isPaymentRejected(status, opsi)) return "payment_rejected";
  switch (status) {
    case "menunggu_bayar":
      return "pending_payment";
    case "menunggu_verifikasi":
      return "waiting_verification";
    case "dibayar":
    case "diproses":
    case "siap":
    case "selesai":
      return "paid";
    case "dibatalkan":
      return opsi?.buktiBayarPath || opsi?.sudahKirimBukti ? "payment_rejected" : "pending_payment";
  }
}

/** Hitung status operasional pesanan (produksi & pengambilan/pengantaran). */
export function deriveOrderProgressStatus(
  status: OrderStatus,
  fulfillment: Fulfillment = "ambil",
): OrderProgressStatusType {
  switch (status) {
    case "menunggu_bayar":
    case "menunggu_verifikasi":
      return "pending";
    case "dibayar":
      return "confirmed";
    case "diproses":
      return "processing";
    case "siap":
      return fulfillment === "antar" ? "out_for_delivery" : "ready_for_pickup";
    case "selesai":
      return "completed";
    case "dibatalkan":
      return "cancelled";
  }
}

/** Label dinamis untuk status `siap` berdasarkan metode pengambilan. */
export function labelStatusDinamis(status: OrderStatus, fulfillment?: Fulfillment): string {
  if (status === "siap") {
    return fulfillment === "antar" ? "Dalam Pengantaran" : "Siap Diambil";
  }
  return STATUS_LABEL[status];
}

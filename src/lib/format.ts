const TZ = "Asia/Jakarta";

const rupiahFmt = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/** 15000 -> "Rp15.000" */
export function rupiah(n: number): string {
  return `Rp${rupiahFmt.format(n)}`;
}

const tanggalFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: TZ,
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const tanggalPendekFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: TZ,
  day: "numeric",
  month: "short",
  year: "numeric",
});

const jamFmt = new Intl.DateTimeFormat("id-ID", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

/** "2026-11-07" dianggap tanggal kalender WIB (tengah hari agar aman dari pergeseran zona). */
function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00+07:00`) : new Date(value);
}

/** "Sabtu, 7 November 2026" */
export function tanggalPanjang(value: string | Date): string {
  return tanggalFmt.format(toDate(value));
}

/** "7 Nov 2026" */
export function tanggalPendek(value: string | Date): string {
  return tanggalPendekFmt.format(toDate(value));
}

/** "14.30" (WIB) */
export function jamWib(value: string | Date): string {
  return jamFmt.format(toDate(value)).replace(":", ".");
}

/** "7 Nov 2026, 14.30 WIB" */
export function tanggalJam(value: string | Date): string {
  return `${tanggalPendek(value)}, ${jamWib(value)} WIB`;
}

/**
 * Normalisasi nomor WA HANYA untuk tampilan & link wa.me:
 * hapus non-digit, "0..." -> "62...". Jangan dikirim ke RPC (server yang menormalisasi).
 */
export function normalisasiWa(input: string): string {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

/** Nomor Indonesia: 08[1-9].., 628[1-9].., atau +628[1-9].. (spasi/strip diabaikan, 10–13 digit). */
export function waValid(input: string): boolean {
  const compact = input.replace(/[\s-]/g, "");
  return /^(\+62|62|0)8[1-9]\d{7,10}$/.test(compact);
}

/** "6281234567890" -> "0812-3456-7890" untuk tampilan. */
export function tampilWa(wa: string): string {
  const n = normalisasiWa(wa);
  const lokal = n.startsWith("62") ? `0${n.slice(2)}` : n;
  return lokal.replace(/(\d{4})(\d{4})(\d+)/, "$1-$2-$3");
}

/** ISO -> nilai <input type="datetime-local"> dalam WIB (UTC+7): "2026-11-07T14:30". */
export function isoKeInputWib(iso: string): string {
  return new Date(new Date(iso).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 16);
}

/** Nilai <input type="datetime-local"> (dianggap WIB) -> ISO dengan offset: "2026-11-07T14:30:00+07:00". */
export function inputWibKeIso(value: string): string {
  return `${value}:00+07:00`;
}

export const DEFAULT_JAM_ANTAR_MULAI = "15:00";
export const DEFAULT_JAM_ANTAR_SELESAI = "21:00";

/**
 * Normalisasi input waktu pengantaran (mis. "15.30" atau "15:30:00") menjadi format "HH:MM" (WIB).
 * Mengembalikan null bila format waktu tidak valid.
 */
export function normalisasiJamAntarWib(input: string): string | null {
  const bersih = input.trim();
  const match = bersih.match(/^(\d{1,2})[:.](\d{2})(?::(\d{2}))?$/);
  if (!match) return null;

  const jam = Number(match[1]);
  const menit = Number(match[2]);
  const detik = match[3] ? Number(match[3]) : 0;

  if (
    !Number.isInteger(jam) ||
    !Number.isInteger(menit) ||
    !Number.isInteger(detik) ||
    jam < 0 ||
    jam > 23 ||
    menit < 0 ||
    menit > 59 ||
    detik < 0 ||
    detik > 59
  ) {
    return null;
  }

  return `${String(jam).padStart(2, "0")}:${String(menit).padStart(2, "0")}`;
}

/** Konversi waktu "HH:MM" ke total menit sejak 00:00 (0..1439). */
export function jamKeMenitWib(input: string): number | null {
  const norm = normalisasiJamAntarWib(input);
  if (!norm) return null;
  const [h, m] = norm.split(":").map(Number);
  return h * 60 + m;
}

/**
 * Hitung nilai atribut min pada <input type="time"> pelanggan dari jam mulai batch.
 * Karena aturan pengantaran adalah "setelah jam mulai" (mis. mulai 15:00 -> minimal 15:01),
 * fungsi ini menambahkan 1 menit pada jamMulai.
 */
export function hitungMinTimePickerWib(jamMulai = DEFAULT_JAM_ANTAR_MULAI): string {
  const menitMulai = jamKeMenitWib(jamMulai) ?? 15 * 60;
  const menitMin = Math.min(23 * 60 + 59, menitMulai + 1);
  const h = Math.floor(menitMin / 60);
  const m = menitMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Validasi konfigurasi rentang jam pengantaran yang diatur oleh Admin pada form Batch PO.
 * - Jika layanan pengantaran diaktifkan (antarAktif = true), kedua field wajib diisi dan jamMulai < jamSelesai.
 * - Jika layanan pengantaran dinonaktifkan (antarAktif = false), konfigurasi jam tidak wajib digunakan.
 */
export function validasiKonfigurasiJamAntarAdmin(
  jamMulaiRaw: string,
  jamSelesaiRaw: string,
  antarAktif: boolean,
): {
  valid: boolean;
  errorMulai?: string;
  errorSelesai?: string;
  jamMulaiNormal: string;
  jamSelesaiNormal: string;
} {
  const mulaiTrim = jamMulaiRaw.trim();
  const selesaiTrim = jamSelesaiRaw.trim();

  if (!antarAktif) {
    const mNorm = normalisasiJamAntarWib(mulaiTrim) ?? DEFAULT_JAM_ANTAR_MULAI;
    const sNorm = normalisasiJamAntarWib(selesaiTrim) ?? DEFAULT_JAM_ANTAR_SELESAI;
    const mMin = jamKeMenitWib(mNorm) ?? 900;
    const sMin = jamKeMenitWib(sNorm) ?? 1260;
    return {
      valid: true,
      jamMulaiNormal: mMin < sMin ? mNorm : DEFAULT_JAM_ANTAR_MULAI,
      jamSelesaiNormal: mMin < sMin ? sNorm : DEFAULT_JAM_ANTAR_SELESAI,
    };
  }

  let errorMulai: string | undefined;
  let errorSelesai: string | undefined;

  if (!mulaiTrim) {
    errorMulai = "Jam mulai pengantaran wajib diisi saat layanan pengantaran aktif.";
  }
  if (!selesaiTrim) {
    errorSelesai = "Jam selesai pengantaran wajib diisi saat layanan pengantaran aktif.";
  }

  const mulaiNorm = mulaiTrim ? normalisasiJamAntarWib(mulaiTrim) : null;
  const selesaiNorm = selesaiTrim ? normalisasiJamAntarWib(selesaiTrim) : null;

  if (mulaiTrim && !mulaiNorm) {
    errorMulai = "Format jam mulai tidak valid (gunakan format 24 jam HH:MM WIB).";
  }
  if (selesaiTrim && !selesaiNorm) {
    errorSelesai = "Format jam selesai tidak valid (gunakan format 24 jam HH:MM WIB).";
  }

  if (mulaiNorm && selesaiNorm) {
    const menitMulai = jamKeMenitWib(mulaiNorm)!;
    const menitSelesai = jamKeMenitWib(selesaiNorm)!;
    if (menitMulai >= menitSelesai) {
      errorSelesai = "Jam selesai pengantaran harus lebih akhir daripada jam mulai pengantaran.";
    }
  }

  return {
    valid: !errorMulai && !errorSelesai,
    errorMulai,
    errorSelesai,
    jamMulaiNormal: mulaiNorm ?? DEFAULT_JAM_ANTAR_MULAI,
    jamSelesaiNormal: selesaiNorm ?? DEFAULT_JAM_ANTAR_SELESAI,
  };
}

/**
 * Validasi jam pengantaran pelanggan dalam zona waktu Asia/Jakarta (WIB)
 * berdasarkan konfigurasi jamMulai dan jamSelesai dari batch PO di database.
 * Ketentuan:
 * - Waktu minimal: setelah jamMulai WIB (mulai jamMulai + 1 menit).
 * - Waktu maksimal: jamSelesai WIB.
 * Mengembalikan null jika valid, atau pesan error berbahasa Indonesia jika tidak valid.
 */
export function pesanErrorJamAntarWib(
  input: string | null | undefined,
  jamMulai = DEFAULT_JAM_ANTAR_MULAI,
  jamSelesai = DEFAULT_JAM_ANTAR_SELESAI,
): string | null {
  const mulaiNorm = normalisasiJamAntarWib(jamMulai) ?? DEFAULT_JAM_ANTAR_MULAI;
  const selesaiNorm = normalisasiJamAntarWib(jamSelesai) ?? DEFAULT_JAM_ANTAR_SELESAI;
  const minPilih = hitungMinTimePickerWib(mulaiNorm);

  const bersih = (input ?? "").trim();
  if (!bersih) {
    return `Pilih jam pengantaran yang diinginkan (setelah pukul ${mulaiNorm} hingga ${selesaiNorm} WIB, yaitu ${minPilih}–${selesaiNorm} WIB).`;
  }

  const match = bersih.match(/^(\d{1,2})[:.](\d{2})(?::(\d{2}))?$/);
  if (!match) {
    return `Format jam pengantaran tidak valid. Pilih waktu antara pukul ${minPilih}–${selesaiNorm} WIB.`;
  }

  const jam = Number(match[1]);
  const menit = Number(match[2]);
  const detik = match[3] ? Number(match[3]) : 0;

  if (jam < 0 || jam > 23 || menit < 0 || menit > 59 || detik < 0 || detik > 59) {
    return `Format jam pengantaran tidak valid. Pilih waktu antara pukul ${minPilih}–${selesaiNorm} WIB.`;
  }

  const menitMulai = jamKeMenitWib(mulaiNorm) ?? 15 * 60;
  const menitSelesai = jamKeMenitWib(selesaiNorm) ?? 21 * 60;

  const totalDetik = jam * 3600 + menit * 60 + detik;
  const batasBawahEksklusif = menitMulai * 60; // Tepat jamMulai ditolak (harus setelah jamMulai)
  const batasMinimumMenit = (menitMulai + 1) * 60; // jamMulai + 1 menit -> minimal valid
  const batasAtasInklusif = menitSelesai * 60; // jamSelesai -> maksimal valid

  if (totalDetik <= batasBawahEksklusif || totalDetik < batasMinimumMenit) {
    return `Jam pengantaran hanya tersedia setelah pukul ${mulaiNorm} WIB (pilih waktu antara ${minPilih}–${selesaiNorm} WIB).`;
  }

  if (totalDetik > batasAtasInklusif) {
    return `Batas maksimal jam pengantaran adalah pukul ${selesaiNorm} WIB (pilih waktu antara ${minPilih}–${selesaiNorm} WIB).`;
  }

  return null;
}

export function jamAntarValidWib(
  input: string | null | undefined,
  jamMulai = DEFAULT_JAM_ANTAR_MULAI,
  jamSelesai = DEFAULT_JAM_ANTAR_SELESAI,
): boolean {
  return pesanErrorJamAntarWib(input, jamMulai, jamSelesai) === null;
}

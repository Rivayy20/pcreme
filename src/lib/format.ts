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

/** Nomor Indonesia: 08.., 628.., atau +628.. (spasi/strip diabaikan). */
export function waValid(input: string): boolean {
  const compact = input.replace(/[\s-]/g, "");
  return /^(\+62|62|0)8\d{7,12}$/.test(compact);
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

import {
  DEFAULT_JAM_ANTAR_MULAI,
  DEFAULT_JAM_ANTAR_SELESAI,
  jamKeMenitWib,
  normalisasiJamAntarWib,
} from "@/lib/format";
import type { ItemPesananInput, PoInfo, PoInfoAda, TitikAmbil } from "@/lib/types";

export const RASA_UTAMA = ["Vanilla", "Stroberi", "Cokelat"] as const;
export const TOPPING_UTAMA = ["Oreo", "Nyam-nyam", "Choco Crunch", "Sprinkle"] as const;

export type ModeRasa = "single" | "mix";
export type MetodePembayaran = "qris" | "mandiri";

export interface KonfigurasiCup {
  id: string;
  mode: ModeRasa;
  rasaTunggal: string;
  rasaMix: string[];
  topping: string[];
  qty: number;
}

export interface CupTampil {
  nomor: number;
  labelRasa: string;
  isMix: boolean;
  rasaMix: string[];
  topping: string[];
  qty: number;
}

export interface MetadataPesanan {
  metodeBayar: MetodePembayaran | null;
  labelMetodeBayar: string;
  cups: CupTampil[];
  catatanPelanggan: string | null;
}

export interface InfoRekeningMandiri {
  aktif: boolean;
  nomorRekening: string;
  atasNama: string;
}

export interface KonfigurasiPembayaranBatch {
  mandiri: InfoRekeningMandiri;
  qrisAktif: boolean;
  pickupAktif: boolean;
  antarAktif: boolean;
  jamMulaiAntar: string;
  jamSelesaiAntar: string;
  infoPengantaran: string;
  instruksiTambahan: string;
  rawText: string;
}

/** Normalisasi nama rasa agar konsisten di UI (Coklat -> Cokelat, Strawberry -> Stroberi). */
export function normalisasiNamaRasa(nama: string): string {
  const n = nama.trim();
  const lower = n.toLowerCase();
  if (lower === "coklat" || lower === "cokelat" || lower === "chocolate") return "Cokelat";
  if (lower === "strawberry" || lower === "stroberi") return "Stroberi";
  if (lower === "vanilla" || lower === "vanila") return "Vanilla";
  if (lower === "mix" || lower.startsWith("mix ")) return n;
  return n;
}

/** Gabungkan rasa standar (Vanilla, Stroberi, Cokelat) dengan rasa tambahan dari DB (tanpa duplikat & tanpa "Mix"). */
export function gabungDaftarRasa(dbRasa: string[]): string[] {
  const hasil: string[] = [...RASA_UTAMA];
  for (const r of dbRasa) {
    const norm = normalisasiNamaRasa(r);
    if (norm.toLowerCase() === "mix") continue;
    if (!hasil.some((h) => h.toLowerCase() === norm.toLowerCase())) {
      hasil.push(norm);
    }
  }
  return hasil;
}

/** Gabungkan topping standar (Oreo, Nyam-nyam, Choco Crunch, Sprinkle) dengan topping tambahan dari DB. */
export function gabungDaftarTopping(dbTopping: string[]): string[] {
  const hasil: string[] = [...TOPPING_UTAMA];
  for (const t of dbTopping) {
    const clean = t.trim();
    if (!clean) continue;
    if (!hasil.some((h) => h.toLowerCase() === clean.toLowerCase())) {
      hasil.push(clean);
    }
  }
  return hasil;
}

/** Label rasa untuk 1 konfigurasi cup, mis. "Vanilla" atau "Mix (Vanilla + Stroberi)". */
export function labelRasaCup(cup: Pick<KonfigurasiCup, "mode" | "rasaTunggal" | "rasaMix">): string {
  if (cup.mode === "mix") {
    if (cup.rasaMix.length === 0) return "Mix (Pilih minimal 2 rasa)";
    return `Mix (${cup.rasaMix.join(" + ")})`;
  }
  return cup.rasaTunggal || "Belum pilih rasa";
}

/** Ringkasan singkat 1 konfigurasi cup. */
export function ringkasanCup(cup: Pick<KonfigurasiCup, "mode" | "rasaTunggal" | "rasaMix" | "topping" | "qty">): string {
  const rasa = labelRasaCup(cup);
  const top = cup.topping.length > 0 ? `Topping: ${cup.topping.join(", ")}` : "Tanpa topping";
  return `${rasa} · ${top} · ${cup.qty} cup`;
}

/** Cocokkan nama rasa UI ke nama rasa yang terdaftar aktif di database (agar RPC buat_pesanan selalu valid). */
function petakanRasaKeDb(namaUi: string, dbRasa: string[]): string {
  const lower = namaUi.trim().toLowerCase();
  const exact = dbRasa.find((r) => r.trim().toLowerCase() === lower);
  if (exact) return exact;

  if (lower === "cokelat" || lower === "coklat") {
    const m = dbRasa.find((r) => ["coklat", "cokelat"].includes(r.trim().toLowerCase()));
    if (m) return m;
  }
  if (lower === "stroberi" || lower === "strawberry") {
    const m = dbRasa.find((r) => ["strawberry", "stroberi"].includes(r.trim().toLowerCase()));
    if (m) return m;
  }
  if (lower === "vanilla" || lower === "vanila") {
    const m = dbRasa.find((r) => ["vanilla", "vanila"].includes(r.trim().toLowerCase()));
    if (m) return m;
  }

  return dbRasa[0] ?? namaUi;
}

/** Cocokkan daftar topping UI ke daftar topping aktif di DB (agar RPC buat_pesanan tidak menolak jika admin belum sinkron menu). */
function petakanToppingKeDb(toppingUi: string[], dbTopping: string[], maksTopping: number): string[] {
  const hasil: string[] = [];
  for (const t of toppingUi) {
    if (hasil.length >= maksTopping) break;
    const match = dbTopping.find((d) => d.trim().toLowerCase() === t.trim().toLowerCase());
    if (match && !hasil.includes(match)) {
      hasil.push(match);
    }
  }
  return hasil;
}

/**
 * Konversi konfigurasi individual cup menjadi p_items untuk RPC buat_pesanan.
 * Menjamin jumlah cup (qty) 100% akurat dan nilai rasa/topping diterima oleh validasi tabel menu_items di Supabase.
 */
export function konversiCupKeRpcItems(
  cups: KonfigurasiCup[],
  dbRasa: string[],
  dbTopping: string[],
  maksTopping: number,
): ItemPesananInput[] {
  return cups.map((cup) => {
    let rasaDb: string;
    if (cup.mode === "mix") {
      const labelLengkap = `Mix (${cup.rasaMix.join(" + ")})`;
      const adaLengkap = dbRasa.find((r) => r.toLowerCase() === labelLengkap.toLowerCase());
      const adaMix = dbRasa.find((r) => r.trim().toLowerCase() === "mix");
      if (adaLengkap) {
        rasaDb = adaLengkap;
      } else if (adaMix) {
        rasaDb = adaMix;
      } else {
        // Cari salah satu rasa penyusun Mix yang sudah aktif di dbRasa
        const kandidat = cup.rasaMix
          .map((r) => petakanRasaKeDb(r, dbRasa))
          .find((r) => dbRasa.includes(r));
        rasaDb = kandidat ?? dbRasa[0] ?? "Coklat";
      }
    } else {
      rasaDb = petakanRasaKeDb(cup.rasaTunggal, dbRasa);
    }

    return {
      rasa: rasaDb,
      topping: petakanToppingKeDb(cup.topping, dbTopping, maksTopping),
      qty: cup.qty,
    };
  });
}

/** Format catatan pesanan yang menyertakan metode bayar & rincian per cup secara terstruktur dan mudah dibaca manusia. */
export function formatCatatanPesanan(params: {
  metodeBayar: MetodePembayaran;
  cups: KonfigurasiCup[];
  catatanPelanggan?: string;
}): string {
  const { metodeBayar, cups, catatanPelanggan } = params;
  const labelBayar = metodeBayar === "mandiri" ? "Transfer Bank Mandiri" : "QRIS";
  const barisCup = cups
    .map((c, idx) => {
      const r = labelRasaCup(c);
      const t = c.topping.length > 0 ? `+ ${c.topping.join(", ")}` : "Tanpa topping";
      return `#${idx + 1} ${r} (${t}) x${c.qty}`;
    })
    .join(" ; ");

  const bagian: string[] = [
    `[Pembayaran: ${labelBayar}]`,
    `[Cup: ${barisCup}]`,
  ];

  const bersih = catatanPelanggan?.trim();
  if (bersih) {
    bagian.push(`Catatan: ${bersih}`);
  }

  return bagian.join("\n");
}

/** Parse catatan pesanan dari DB menjadi struktur Metode Pembayaran, Rincian Cup, dan Catatan Pelanggan. */
export function parseCatatanPesanan(
  catatanRaw: string | null | undefined,
  fallbackItems: ItemPesananInput[] = [],
): MetadataPesanan {
  let metodeBayar: MetodePembayaran | null = null;
  let labelMetodeBayar = "QRIS / Transfer";
  const cupsFromMeta: CupTampil[] = [];
  let catatanPelanggan: string | null = null;

  if (catatanRaw) {
    const baris = catatanRaw.split(/\r?\n/);
    const sisaBaris: string[] = [];

    for (const b of baris) {
      const trim = b.trim();
      if (!trim) continue;

      const matchBayar = trim.match(/^\[Pembayaran:\s*(.+?)\]$/i);
      if (matchBayar) {
        const val = matchBayar[1].trim();
        if (val.toLowerCase().includes("mandiri")) {
          metodeBayar = "mandiri";
          labelMetodeBayar = "Transfer Mandiri";
        } else if (val.toLowerCase().includes("qris")) {
          metodeBayar = "qris";
          labelMetodeBayar = "QRIS";
        } else {
          labelMetodeBayar = val;
        }
        continue;
      }

      const matchCup = trim.match(/^\[Cup:\s*(.+?)\]$/i);
      if (matchCup) {
        const segmen = matchCup[1].split(/\s*;\s*/);
        segmen.forEach((seg, idx) => {
          // Format: #1 Mix (Vanilla + Stroberi) (+ Oreo, Sprinkle) x2
          const m = seg.match(/^#(\d+)\s+(.+)\s+\(([^()]*)\)\s+x(\d+)$/i);
          if (m) {
            const nomor = Number(m[1]) || idx + 1;
            const labelRasa = m[2].trim();
            const rawTop = m[3].trim();
            const qty = Number(m[4]) || 1;
            const topping =
              rawTop.toLowerCase() === "tanpa topping"
                ? []
                : rawTop
                    .replace(/^\+\s*/, "")
                    .split(/\s*,\s*/)
                    .filter(Boolean);
            const matchMix = labelRasa.match(/^Mix\s*\((.+?)\)$/i);
            const isMix = !!matchMix || labelRasa.toLowerCase().startsWith("mix");
            const rasaMix = matchMix ? matchMix[1].split(/\s*\+\s*/).filter(Boolean) : [];
            cupsFromMeta.push({
              nomor,
              labelRasa,
              isMix,
              rasaMix,
              topping,
              qty,
            });
          }
        });
        continue;
      }

      const matchCatatan = trim.match(/^Catatan:\s*(.+)$/i);
      if (matchCatatan) {
        sisaBaris.push(matchCatatan[1].trim());
        continue;
      }

      sisaBaris.push(trim);
    }

    if (sisaBaris.length > 0) {
      catatanPelanggan = sisaBaris.join("\n");
    }
  }

  const cups: CupTampil[] =
    cupsFromMeta.length > 0
      ? cupsFromMeta
      : fallbackItems.map((it, idx) => {
          const normRasa = normalisasiNamaRasa(it.rasa);
          const matchMix = normRasa.match(/^Mix\s*\((.+?)\)$/i);
          const isMix = !!matchMix || normRasa.toLowerCase().startsWith("mix");
          const rasaMix = matchMix ? matchMix[1].split(/\s*\+\s*/).filter(Boolean) : [];
          return {
            nomor: idx + 1,
            labelRasa: normRasa,
            isMix,
            rasaMix,
            topping: it.topping ?? [],
            qty: it.qty,
          };
        });

  return {
    metodeBayar,
    labelMetodeBayar,
    cups,
    catatanPelanggan,
  };
}

/** Format alamat pengantaran beserta patokan & kontak penerima. */
export function formatAlamatAntar(params: {
  alamat: string;
  patokan?: string;
  kontakAntar?: string;
}): string {
  const bagian = [params.alamat.trim()];
  if (params.patokan?.trim()) {
    bagian.push(`Patokan: ${params.patokan.trim()}`);
  }
  if (params.kontakAntar?.trim()) {
    bagian.push(`Kontak Penerima: ${params.kontakAntar.trim()}`);
  }
  return bagian.join(" | ");
}

/** Parse alamat pengantaran menjadi alamat utama, patokan, dan kontak penerima. */
export function parseAlamatAntar(raw: string | null | undefined): {
  alamat: string;
  patokan: string | null;
  kontakAntar: string | null;
} {
  if (!raw) return { alamat: "-", patokan: null, kontakAntar: null };
  const parts = raw.split(/\s*\|\s*/);
  let alamat = "";
  let patokan: string | null = null;
  let kontakAntar: string | null = null;

  for (const p of parts) {
    if (/^Patokan:\s*/i.test(p)) {
      patokan = p.replace(/^Patokan:\s*/i, "").trim();
    } else if (/^Kontak Penerima:\s*/i.test(p)) {
      kontakAntar = p.replace(/^Kontak Penerima:\s*/i, "").trim();
    } else {
      alamat = alamat ? `${alamat}, ${p}` : p.trim();
    }
  }

  return { alamat: alamat || raw, patokan, kontakAntar };
}

/**
 * Parse po_periods.info_pembayaran menjadi konfigurasi Mandiri, QRIS, dan Info Pengantaran.
 * Tidak pernah mengarang nomor rekening fiktif: bila rekening masih berupa teks contoh/dummy
 * ("1234567890" / "NAMA PEMILIK") atau belum berformat Mandiri yang valid, mandiri.aktif = false.
 */
export function parseInfoPembayaran(raw: string | null | undefined): KonfigurasiPembayaranBatch {
  const teks = (raw ?? "").trim();
  let nomorRekening = "";
  let atasNama = "";
  let qrisAktif = true;
  let pickupAktif = true;
  let antarAktif = true;
  let jamMulaiAntar = DEFAULT_JAM_ANTAR_MULAI;
  let jamSelesaiAntar = DEFAULT_JAM_ANTAR_SELESAI;
  let infoPengantaran = "";
  const barisInstruksi: string[] = [];

  if (teks) {
    const baris = teks.split(/\r?\n/);
    for (const b of baris) {
      const t = b.trim();
      if (!t) continue;

      // Format terstruktur: [MANDIRI: 1300012345678 | P'crème Official]
      const mMandiriTag = t.match(/^\[MANDIRI:\s*([^|]*)\|\s*([^\]]*)\]$/i);
      if (mMandiriTag) {
        nomorRekening = mMandiriTag[1].trim().replace(/\s+/g, "");
        atasNama = mMandiriTag[2].trim();
        continue;
      }

      const mQrisTag = t.match(/^\[QRIS:\s*(ON|OFF)\]$/i);
      if (mQrisTag) {
        qrisAktif = mQrisTag[1].toUpperCase() === "ON";
        continue;
      }

      const mPickupTag = t.match(/^\[PICKUP:\s*(ON|OFF)\]$/i);
      if (mPickupTag) {
        pickupAktif = mPickupTag[1].toUpperCase() === "ON";
        continue;
      }

      const mDeliveryTag = t.match(/^\[DELIVERY:\s*(ON|OFF)\]$/i);
      if (mDeliveryTag) {
        antarAktif = mDeliveryTag[1].toUpperCase() === "ON";
        continue;
      }

      const mDeliveryHoursTag = t.match(
        /^\[DELIVERY_HOURS:\s*(\d{1,2}[:.]\d{2})\s*-\s*(\d{1,2}[:.]\d{2})\s*\]$/i,
      );
      if (mDeliveryHoursTag) {
        const mNorm = normalisasiJamAntarWib(mDeliveryHoursTag[1]);
        const sNorm = normalisasiJamAntarWib(mDeliveryHoursTag[2]);
        if (mNorm && sNorm) {
          const mMin = jamKeMenitWib(mNorm) ?? 0;
          const sMin = jamKeMenitWib(sNorm) ?? 0;
          if (mMin < sMin) {
            jamMulaiAntar = mNorm;
            jamSelesaiAntar = sNorm;
          }
        }
        continue;
      }

      const mAntarTag = t.match(/^\[ANTAR:\s*(.+?)\]$/i);
      if (mAntarTag) {
        infoPengantaran = mAntarTag[1].trim();
        continue;
      }

      // Deteksi baris bebas: "Mandiri 13000xxxx a.n. Nama"
      const mMandiriBebas = t.match(/mandiri\s*[:\-]?\s*(\d[\d\s.\-]{6,}\d)\s*(?:a\.?n\.?|atas\s+nama)?\s*(.+)?/i);
      if (mMandiriBebas && !nomorRekening) {
        nomorRekening = mMandiriBebas[1].replace(/\D/g, "");
        atasNama = (mMandiriBebas[2] ?? "").replace(/^[.:\-\s]+/, "").trim();
        continue;
      }

      // Abaikan teks placeholder awal dari seed database ("Transfer BCA 1234567890 a.n. NAMA PEMILIK")
      if (/1234567890/.test(t) || /NAMA PEMILIK/i.test(t)) {
        continue;
      }

      barisInstruksi.push(t);
    }
  }

  const isDummy =
    !nomorRekening ||
    nomorRekening === "1234567890" ||
    nomorRekening.length < 8 ||
    !atasNama ||
    /nama pemilik/i.test(atasNama);

  return {
    mandiri: {
      aktif: !isDummy,
      nomorRekening: isDummy ? "" : nomorRekening,
      atasNama: isDummy ? "" : atasNama,
    },
    qrisAktif,
    pickupAktif,
    antarAktif,
    jamMulaiAntar,
    jamSelesaiAntar,
    infoPengantaran,
    instruksiTambahan: barisInstruksi.join("\n"),
    rawText: teks,
  };
}

/** Serialisasi konfigurasi pembayaran & pengambilan dari form Admin ke kolom info_pembayaran di po_periods. */
export function formatInfoPembayaran(cfg: {
  mandiriNomor?: string;
  mandiriAtasNama?: string;
  qrisAktif?: boolean;
  pickupAktif?: boolean;
  antarAktif?: boolean;
  jamMulaiAntar?: string;
  jamSelesaiAntar?: string;
  infoPengantaran?: string;
  instruksiTambahan?: string;
}): string {
  const baris: string[] = [];
  const norek = (cfg.mandiriNomor ?? "").trim().replace(/\s+/g, "");
  const nama = (cfg.mandiriAtasNama ?? "").trim();

  if (norek && nama) {
    baris.push(`[MANDIRI: ${norek} | ${nama}]`);
    baris.push(`Transfer Bank Mandiri ${norek} a.n. ${nama}`);
  }
  baris.push(`[QRIS: ${cfg.qrisAktif === false ? "OFF" : "ON"}]`);
  baris.push(`[PICKUP: ${cfg.pickupAktif === false ? "OFF" : "ON"}]`);
  baris.push(`[DELIVERY: ${cfg.antarAktif === false ? "OFF" : "ON"}]`);

  const mulaiNorm = normalisasiJamAntarWib(cfg.jamMulaiAntar ?? "") ?? DEFAULT_JAM_ANTAR_MULAI;
  const selesaiNorm = normalisasiJamAntarWib(cfg.jamSelesaiAntar ?? "") ?? DEFAULT_JAM_ANTAR_SELESAI;
  const mMin = jamKeMenitWib(mulaiNorm) ?? 900;
  const sMin = jamKeMenitWib(selesaiNorm) ?? 1260;
  const mulaiSimpan = mMin < sMin ? mulaiNorm : DEFAULT_JAM_ANTAR_MULAI;
  const selesaiSimpan = mMin < sMin ? selesaiNorm : DEFAULT_JAM_ANTAR_SELESAI;
  baris.push(`[DELIVERY_HOURS: ${mulaiSimpan}-${selesaiSimpan}]`);

  if (cfg.infoPengantaran?.trim()) {
    baris.push(`[ANTAR: ${cfg.infoPengantaran.trim()}]`);
  }
  if (cfg.instruksiTambahan?.trim()) {
    baris.push(cfg.instruksiTambahan.trim());
  }

  return baris.join("\n");
}

/**
 * Evaluasi ketersediaan metode pengambilan (Ambil di Titik Kumpul vs Diantar ke Lokasi)
 * berdasarkan pengaturan batch dari admin dan daftar lokasi pickup yang aktif di database.
 */
export function statusMetodePengambilan(po: Pick<PoInfoAda, "info_pembayaran" | "titik_ambil">): {
  cfg: KonfigurasiPembayaranBatch;
  titikAmbilAktif: TitikAmbil[];
  opsiAmbilTersedia: boolean;
  opsiAntarTersedia: boolean;
  tidakAdaMetode: boolean;
} {
  const cfg = parseInfoPembayaran(po.info_pembayaran);
  const titikAmbilAktif = (po.titik_ambil ?? []).filter((t) => {
    if (!t || !t.id || !t.nama) return false;
    const maybeActive = (t as { is_active?: boolean }).is_active;
    return maybeActive !== false;
  });
  const opsiAmbilTersedia = cfg.pickupAktif && titikAmbilAktif.length > 0;
  const opsiAntarTersedia = cfg.antarAktif;
  const tidakAdaMetode = !opsiAmbilTersedia && !opsiAntarTersedia;

  return {
    cfg,
    titikAmbilAktif: opsiAmbilTersedia ? titikAmbilAktif : [],
    opsiAmbilTersedia,
    opsiAntarTersedia,
    tidakAdaMetode,
  };
}

/**
 * Normalisasi data PoInfo dari RPC database agar daftar titik_ambil hanya berisi lokasi aktif
 * dan dikosongkan apabila fitur pickup pada batch tersebut dinonaktifkan oleh admin.
 */
export function normalisasiPoInfo(po: PoInfo): PoInfo {
  if (!po.ada_po) return po;
  const { titikAmbilAktif } = statusMetodePengambilan(po);
  return {
    ...po,
    titik_ambil: titikAmbilAktif,
  };
}

// ---------- Sistem Penolakan & Riwayat Pembayaran ----------

export interface InfoPenolakanPembayaran {
  isRejected: boolean;
  alasan: string | null;
  catatanTambahan: string | null;
  waktuDitolak: string | null;
  ditolakOleh: string | null;
  riwayat: import("@/lib/types").PaymentHistoryItem[];
  attemptCount: number;
}

/** Berikan panduan langkah tindakan spesifik untuk pelanggan berdasarkan alasan penolakan */
export function instruksiLangkahPelanggan(alasan: string | null | undefined): string {
  if (!alasan) {
    return "Silakan periksa kembali transaksi kamu dan kirim ulang bukti pembayaran yang sah melalui form di bawah.";
  }
  const clean = alasan.toLowerCase();
  if (clean.includes("nominal")) {
    return "Nominal yang ditransfer belum sesuai dengan total tagihan pesanan. Silakan transfer kekurangan dana ke rekening atau QRIS resmi P'crème, lalu unggah bukti transfer terbaru.";
  }
  if (clean.includes("jelas") || clean.includes("buram")) {
    return "Foto bukti transfer kurang jelas atau buram. Pastikan foto baru terlihat terang, tidak terpotong, dan memuat jelas nominal serta tanggal/waktu transaksi.";
  }
  if (clean.includes("tidak valid")) {
    return "Bukti pembayaran tidak valid atau tidak terbaca sebagai transaksi yang sah. Silakan unggah tangkapan layar/struk transfer asli dari m-banking atau e-wallet kamu.";
  }
  if (clean.includes("rekening tujuan")) {
    return "Rekening tujuan transfer tidak sesuai dengan rekening resmi P'crème. Silakan transfer ke rekening Bank Mandiri atau QRIS resmi P'crème yang tertera di atas.";
  }
  if (clean.includes("pending") || clean.includes("belum berhasil")) {
    return "Status transaksi pada bukti masih pending atau belum berhasil. Silakan tunggu hingga transaksi dinyatakan berhasil di aplikasi bank/e-wallet kamu, lalu unggah bukti suksesnya.";
  }
  return "Silakan perhatikan catatan admin di atas, perbaiki transaksi pembayaran kamu, lalu kirim ulang bukti pembayaran terbaru.";
}

/**
 * Parsing informasi penolakan dan riwayat pembayaran dari catatan_admin maupun kolom baru.
 * Mendukung backward-compatibility dengan format lama [DITOLAK] maupun format baru [PAYMENT_META: ...]
 */
export function parseInfoPenolakan(
  catatanAdmin: string | null | undefined,
  opsi?: {
    alasanPenolakan?: string | null;
    catatanPenolakan?: string | null;
    riwayat?: import("@/lib/types").PaymentHistoryItem[] | null;
    buktiBayarPath?: string | null;
    buktiUploadedAt?: string | null;
  },
): InfoPenolakanPembayaran {
  const teks = (catatanAdmin ?? "").trim();
  let alasan: string | null = opsi?.alasanPenolakan ?? null;
  let catatanTambahan: string | null = opsi?.catatanPenolakan ?? null;
  let waktuDitolak: string | null = null;
  let ditolakOleh: string | null = null;
  let riwayat: import("@/lib/types").PaymentHistoryItem[] = Array.isArray(opsi?.riwayat)
    ? [...opsi.riwayat]
    : [];

  // 1. Ekstrak dari tag [PAYMENT_META: {...}] jika ada
  const metaIdx = teks.indexOf("[PAYMENT_META:");
  if (metaIdx !== -1) {
    const lineEnd = teks.indexOf("\n", metaIdx);
    const tagBlock = lineEnd === -1 ? teks.slice(metaIdx) : teks.slice(metaIdx, lineEnd);
    const jsonStart = tagBlock.indexOf("{");
    const jsonEnd = tagBlock.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd > jsonStart) {
      const jsonStr = tagBlock.slice(jsonStart, jsonEnd + 1).trim();
      try {
        const parsed = JSON.parse(jsonStr);
        if (parsed.alasan && !alasan) alasan = String(parsed.alasan);
        if (parsed.catatan && !catatanTambahan) catatanTambahan = String(parsed.catatan);
        if (parsed.waktu) waktuDitolak = String(parsed.waktu);
        if (parsed.admin) ditolakOleh = String(parsed.admin);
        if (Array.isArray(parsed.riwayat) && riwayat.length === 0) {
          riwayat = parsed.riwayat;
        }
      } catch {
        // Abaikan jika JSON tidak valid
      }
    }
  }

  // 2. Ekstrak dari [DITOLAK: ...]
  if (!alasan) {
    const dMatch = teks.match(/^\[DITOLAK:\s*([^\]\n]+)\]/i);
    if (dMatch && dMatch[1]) {
      alasan = dMatch[1].trim();
    } else if (/^\[DITOLAK\]/i.test(teks)) {
      const barisPertama = teks.replace(/^\[DITOLAK\]\s*/i, "").split("\n")[0]?.trim();
      alasan = barisPertama || "Bukti pembayaran tidak sesuai";
    }
  }

  // 3. Ekstrak dari [CATATAN: ...]
  if (!catatanTambahan) {
    const cMatch = teks.match(/\[CATATAN:\s*([^\]\n]+)\]/i);
    if (cMatch && cMatch[1]) {
      catatanTambahan = cMatch[1].trim();
    }
  }

  const isRejected = /^\[DITOLAK/i.test(teks) || Boolean(alasan);

  // Jika belum ada riwayat namun bukti_bayar_path ada, buat rekaman riwayat awal untuk bukti lama
  if (riwayat.length === 0 && opsi?.buktiBayarPath) {
    riwayat.push({
      id: "hist-upload-init",
      tipe: "upload",
      waktu: opsi.buktiUploadedAt || new Date().toISOString(),
      buktiPath: opsi.buktiBayarPath,
    });
    if (isRejected && alasan) {
      riwayat.push({
        id: "hist-reject-init",
        tipe: "rejection",
        waktu: waktuDitolak || new Date().toISOString(),
        alasan,
        catatan: catatanTambahan,
        buktiPath: opsi.buktiBayarPath,
        adminEmail: ditolakOleh,
      });
    }
  }

  // Hitung jumlah percobaan upload
  const attemptCount = Math.max(1, riwayat.filter((r) => r.tipe === "upload").length);

  return {
    isRejected,
    alasan,
    catatanTambahan,
    waktuDitolak,
    ditolakOleh,
    riwayat,
    attemptCount,
  };
}

/** Format catatan admin saat menolak pembayaran agar tersimpan terstruktur */
export function formatCatatanPenolakan(params: {
  alasan: string;
  catatanTambahan?: string;
  adminEmail?: string | null;
  buktiBayarPath?: string | null;
  riwayatLama?: import("@/lib/types").PaymentHistoryItem[];
}): { catatanAdmin: string; riwayatBaru: import("@/lib/types").PaymentHistoryItem[] } {
  const sekarang = new Date().toISOString();
  const riwayatBaru: import("@/lib/types").PaymentHistoryItem[] = [
    ...(params.riwayatLama ?? []),
    {
      id: `rej-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tipe: "rejection",
      waktu: sekarang,
      alasan: params.alasan.trim(),
      catatan: params.catatanTambahan?.trim() || null,
      buktiPath: params.buktiBayarPath || null,
      adminEmail: params.adminEmail || "Admin",
    },
  ];

  const metaObj = {
    alasan: params.alasan.trim(),
    catatan: params.catatanTambahan?.trim() || null,
    waktu: sekarang,
    admin: params.adminEmail || "Admin",
    riwayat: riwayatBaru,
  };

  const baris = [
    `[DITOLAK: ${params.alasan.trim()}]`,
    params.catatanTambahan?.trim() ? `[CATATAN: ${params.catatanTambahan.trim()}]` : null,
    `[PAYMENT_META: ${JSON.stringify(metaObj)}]`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    catatanAdmin: baris,
    riwayatBaru,
  };
}

/** Format catatan admin saat menyetujui pembayaran */
export function formatCatatanSetujui(params: {
  adminEmail?: string | null;
  buktiBayarPath?: string | null;
  riwayatLama?: import("@/lib/types").PaymentHistoryItem[];
  catatanInternal?: string | null;
}): { catatanAdmin: string; riwayatBaru: import("@/lib/types").PaymentHistoryItem[] } {
  const sekarang = new Date().toISOString();
  const riwayatBaru: import("@/lib/types").PaymentHistoryItem[] = [
    ...(params.riwayatLama ?? []),
    {
      id: `app-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      tipe: "approval",
      waktu: sekarang,
      buktiPath: params.buktiBayarPath || null,
      adminEmail: params.adminEmail || "Admin",
    },
  ];

  const metaObj = {
    disetujuiPada: sekarang,
    admin: params.adminEmail || "Admin",
    riwayat: riwayatBaru,
  };

  const internal = (params.catatanInternal ?? "").replace(/^\[DITOLAK[\s\S]*?\n(?=\[PAYMENT|$)/i, "").trim();
  const baris = [
    internal || null,
    `[PAYMENT_META: ${JSON.stringify(metaObj)}]`,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    catatanAdmin: baris,
    riwayatBaru,
  };
}

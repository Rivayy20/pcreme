import { normalisasiJamAntarWib, pesanErrorJamAntarWib } from "@/lib/format";
import { normalisasiPoInfo, statusMetodePengambilan } from "@/lib/order-meta";
import { createClient } from "@/lib/supabase/client";
import type {
  BuatPesananParams,
  BuatPesananResult,
  KirimBuktiResult,
  PoInfo,
  StatusPesanan,
} from "@/lib/types";

/**
 * Pembungkus API & RPC pelanggan untuk Client Components.
 * Pembuatan pesanan divalidasi berlapis (Client + Backend Route Handler /api/pesanan + RPC Supabase).
 */
export type ApiResult<T> = { data: T; error: null } | { data: null; error: string };

export async function ambilPoInfo(): Promise<ApiResult<PoInfo>> {
  try {
    const res = await fetch("/api/po", {
      method: "GET",
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const json = (await res.json()) as ApiResult<PoInfo>;
    if (json && json.data) {
      return { data: normalisasiPoInfo(json.data), error: null };
    }
    if (json && json.error) {
      return { data: null, error: json.error };
    }
  } catch {
    // Fallback langsung ke RPC jika endpoint lokal sedang tidak terjangkau
  }

  const { data, error } = await createClient().rpc("get_po_info");
  if (error) return { data: null, error: error.message };
  return { data: normalisasiPoInfo(data as PoInfo), error: null };
}

export async function buatPesanan(params: BuatPesananParams): Promise<ApiResult<BuatPesananResult>> {
  // Validasi format awal pada layer client API sebelum dikirim ke backend
  if (params.p_fulfillment === "antar") {
    const jamNormal = normalisasiJamAntarWib(params.p_jam_antar ?? "");
    if (!jamNormal) {
      return {
        data: null,
        error: "Pilih jam pengantaran yang valid dalam format 24 jam (WIB).",
      };
    }
  }

  // Kirim melalui Backend Route Handler (/api/pesanan) agar divalidasi di sisi server terhadap konfigurasi batch terbaru
  try {
    const res = await fetch("/api/pesanan", {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(params),
    });
    const json = (await res.json()) as ApiResult<BuatPesananResult>;
    if (json && (json.data !== null || json.error !== null)) {
      return json;
    }
  } catch {
    // Fallback validasi langsung terhadap RPC jika fetch ke route handler gagal
  }

  // Fallback pengaman langsung ke Supabase disertai verifikasi get_po_info terbaru
  const poCheck = await createClient().rpc("get_po_info");
  if (poCheck.error) return { data: null, error: poCheck.error.message };
  const po = normalisasiPoInfo(poCheck.data as PoInfo);
  if (!po.ada_po) {
    return { data: null, error: "Saat ini tidak ada batch Pre-Order yang sedang aktif." };
  }

  const { cfg, titikAmbilAktif, opsiAmbilTersedia, opsiAntarTersedia, tidakAdaMetode } =
    statusMetodePengambilan(po);

  if (tidakAdaMetode) {
    return {
      data: null,
      error: "Pemesanan belum dapat dilakukan karena metode pengambilan belum tersedia.",
    };
  }

  if (params.p_fulfillment === "ambil") {
    if (!opsiAmbilTersedia) {
      return {
        data: null,
        error: "Opsi Ambil di Titik Kumpul sedang tidak aktif pada batch ini. Silakan pilih metode pengambilan lain.",
      };
    }
    if (!params.p_pickup_point_id || !titikAmbilAktif.some((t) => t.id === params.p_pickup_point_id)) {
      return {
        data: null,
        error: "Titik pengambilan yang dipilih sudah tidak aktif. Silakan pilih titik pengambilan lain yang masih aktif.",
      };
    }
  } else {
    if (!opsiAntarTersedia) {
      return {
        data: null,
        error: "Opsi Diantar ke Lokasi sedang tidak tersedia pada batch ini.",
      };
    }
    const errJam = pesanErrorJamAntarWib(
      params.p_jam_antar,
      cfg.jamMulaiAntar,
      cfg.jamSelesaiAntar,
    );
    if (errJam) return { data: null, error: errJam };
  }

  const sanitized: BuatPesananParams = {
    ...params,
    p_pickup_point_id: params.p_fulfillment === "ambil" ? params.p_pickup_point_id : null,
    p_alamat: params.p_fulfillment === "antar" ? params.p_alamat : null,
    p_jam_antar:
      params.p_fulfillment === "antar"
        ? normalisasiJamAntarWib(params.p_jam_antar ?? "")
        : null,
  };

  const { data, error } = await createClient().rpc("buat_pesanan", sanitized);
  if (error) return { data: null, error: error.message };
  return { data: data as BuatPesananResult, error: null };
}

export async function cekStatusPesanan(kode: string, wa: string): Promise<ApiResult<StatusPesanan>> {
  const { data, error } = await createClient().rpc("cek_status_pesanan", { p_kode: kode, p_wa: wa });
  if (error) return { data: null, error: error.message };
  return { data: data as StatusPesanan, error: null };
}

export async function kirimBuktiBayar(
  kode: string,
  wa: string,
  path: string,
): Promise<ApiResult<KirimBuktiResult>> {
  try {
    const res = await fetch("/api/pesanan/bukti", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kode, wa, path }),
    });
    const json = (await res.json()) as ApiResult<KirimBuktiResult>;
    if (!res.ok) {
      return { data: null, error: json.error ?? "Gagal mengirim bukti bayar." };
    }
    return json;
  } catch {
    // Fallback jika API route tidak dapat dijangkau
    const { data, error } = await createClient().rpc("kirim_bukti_bayar", {
      p_kode: kode,
      p_wa: wa,
      p_path: path,
    });
    if (error) return { data: null, error: error.message };
    return { data: data as KirimBuktiResult, error: null };
  }
}

/** Upload ke bucket private bukti-bayar. Tanpa upsert; path wajib "<order_id>/<nama>". */
export async function unggahBukti(path: string, file: Blob): Promise<{ error: string | null }> {
  const { error } = await createClient()
    .storage.from("bukti-bayar")
    .upload(path, file, { contentType: file.type, upsert: false });
  return { error: error ? error.message : null };
}

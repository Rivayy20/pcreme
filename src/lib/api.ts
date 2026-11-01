import { createClient } from "@/lib/supabase/client";
import type {
  BuatPesananParams,
  BuatPesananResult,
  KirimBuktiResult,
  PoInfo,
  StatusPesanan,
} from "@/lib/types";

/**
 * Pembungkus RPC pelanggan untuk Client Components. Pelanggan hanya memakai RPC +
 * upload storage; pesan error dari server (sudah berbahasa Indonesia) dikembalikan apa adanya.
 */
export type ApiResult<T> = { data: T; error: null } | { data: null; error: string };

export async function ambilPoInfo(): Promise<ApiResult<PoInfo>> {
  const { data, error } = await createClient().rpc("get_po_info");
  if (error) return { data: null, error: error.message };
  return { data: data as PoInfo, error: null };
}

export async function buatPesanan(params: BuatPesananParams): Promise<ApiResult<BuatPesananResult>> {
  const { data, error } = await createClient().rpc("buat_pesanan", params);
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
  const { data, error } = await createClient().rpc("kirim_bukti_bayar", {
    p_kode: kode,
    p_wa: wa,
    p_path: path,
  });
  if (error) return { data: null, error: error.message };
  return { data: data as KirimBuktiResult, error: null };
}

/** Upload ke bucket private bukti-bayar. Tanpa upsert; path wajib "<order_id>/<nama>". */
export async function unggahBukti(path: string, file: Blob): Promise<{ error: string | null }> {
  const { error } = await createClient()
    .storage.from("bukti-bayar")
    .upload(path, file, { contentType: file.type, upsert: false });
  return { error: error ? error.message : null };
}

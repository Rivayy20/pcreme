import { normalisasiPoInfo } from "@/lib/order-meta";
import { createClient } from "@/lib/supabase/server";
import type { PoInfo } from "@/lib/types";

export type PoInfoResult = { data: PoInfo; error: null } | { data: null; error: string };

/** Memanggil RPC get_po_info() di server dan menormalisasi titik_ambil sesuai pengaturan aktif admin. */
export async function getPoInfo(): Promise<PoInfoResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return {
      data: null,
      error: "Konfigurasi Supabase belum diisi. Salin .env.example ke .env.local lalu isi URL dan anon key.",
    };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_po_info");
  if (error) return { data: null, error: error.message };
  return { data: normalisasiPoInfo(data as PoInfo), error: null };
}

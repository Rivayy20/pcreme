import { NextResponse } from "next/server";
import { normalisasiWa } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { KirimBuktiResult } from "@/lib/types";

export const dynamic = "force-dynamic";

interface BuktiRequestBody {
  kode?: string;
  wa?: string;
  path?: string;
}

export async function POST(request: Request) {
  let body: BuktiRequestBody;
  try {
    body = (await request.json()) as BuktiRequestBody;
  } catch {
    return NextResponse.json(
      { data: null, error: "Format permintaan tidak valid." },
      { status: 400 },
    );
  }

  const kode = (body.kode ?? "").trim().toUpperCase();
  const rawWa = (body.wa ?? "").trim();
  const path = (body.path ?? "").trim();

  if (!kode) {
    return NextResponse.json(
      { data: null, error: "Kode pesanan wajib diisi." },
      { status: 400 },
    );
  }

  const waNorm = normalisasiWa(rawWa);
  if (!waNorm || waNorm.length < 8) {
    return NextResponse.json(
      { data: null, error: "Nomor WhatsApp tidak valid." },
      { status: 400 },
    );
  }

  if (
    !path ||
    !path.includes("/") ||
    path.includes("..") ||
    path.includes("\\") ||
    path.startsWith("/") ||
    !/^[a-zA-Z0-9_\-\/.]+\.(jpg|jpeg|png|webp)$/i.test(path)
  ) {
    return NextResponse.json(
      { data: null, error: "Jalur file bukti pembayaran tidak valid." },
      { status: 400 },
    );
  }

  // Validasi ekstensi file bukti
  const extMatch = path.match(/\.(jpg|jpeg|png|webp)$/i);
  if (!extMatch) {
    return NextResponse.json(
      { data: null, error: "Format file bukti harus berupa JPG, PNG, atau WebP." },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // 1. Validasi status pesanan terlebih dahulu melalui cek_status_pesanan
  const { data: statusPesanan, error: errStatus } = await supabase.rpc("cek_status_pesanan", {
    p_kode: kode,
    p_wa: waNorm,
  });

  if (errStatus) {
    return NextResponse.json(
      { data: null, error: errStatus.message || "Pesanan tidak ditemukan atau nomor WhatsApp tidak sesuai." },
      { status: 400 },
    );
  }

  const orderId = (statusPesanan as { order_id?: string })?.order_id;
  if (orderId && !path.startsWith(`${orderId}/`)) {
    return NextResponse.json(
      { data: null, error: "Jalur file bukti pembayaran tidak sesuai dengan ID pesanan ini." },
      { status: 400 },
    );
  }

  const currentStatus = (statusPesanan as { status?: string })?.status;
  if (currentStatus === "dibayar" || currentStatus === "diproses" || currentStatus === "siap" || currentStatus === "selesai") {
    return NextResponse.json(
      {
        data: null,
        error: "Pembayaran pesanan ini sudah diverifikasi dan lunas. Tidak perlu mengunggah bukti lagi.",
      },
      { status: 400 },
    );
  }

  if (currentStatus === "dibatalkan") {
    return NextResponse.json(
      {
        data: null,
        error: "Pesanan ini telah dibatalkan. Tidak dapat mengunggah bukti pembayaran.",
      },
      { status: 400 },
    );
  }

  // 2. Jalankan RPC kirim_bukti_bayar
  const { data, error: errRpc } = await supabase.rpc("kirim_bukti_bayar", {
    p_kode: kode,
    p_wa: waNorm,
    p_path: path,
  });

  if (errRpc) {
    return NextResponse.json(
      { data: null, error: errRpc.message || "Gagal mencatat bukti pembayaran." },
      { status: 400 },
    );
  }

  return NextResponse.json(
    { data: data as KirimBuktiResult, error: null },
    { status: 200 },
  );
}

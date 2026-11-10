import { NextResponse } from "next/server";
import { normalisasiJamAntarWib, pesanErrorJamAntarWib } from "@/lib/format";
import { statusMetodePengambilan } from "@/lib/order-meta";
import { getPoInfo } from "@/lib/po";
import { buildOrderSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import type { BuatPesananParams, BuatPesananResult } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let body: Partial<BuatPesananParams>;
  try {
    body = (await request.json()) as Partial<BuatPesananParams>;
  } catch {
    return NextResponse.json(
      { data: null, error: "Format permintaan pesanan tidak valid." },
      { status: 400 },
    );
  }

  // 1. Ambil status PO dan titik pengambilan aktif langsung dari database di backend
  const poRes = await getPoInfo();
  if (poRes.error !== null || !poRes.data) {
    return NextResponse.json(
      { data: null, error: poRes.error ?? "Gagal memverifikasi status batch PO." },
      { status: 500 },
    );
  }

  if (!poRes.data.ada_po) {
    return NextResponse.json(
      { data: null, error: "Saat ini tidak ada batch Pre-Order yang sedang aktif." },
      { status: 400 },
    );
  }

  const po = poRes.data;
  if (po.id !== body.p_period_id) {
    return NextResponse.json(
      { data: null, error: "Periode batch PO sudah berubah. Silakan muat ulang halaman dan coba lagi." },
      { status: 400 },
    );
  }

  if (po.status !== "buka" || po.sisa_kuota <= 0) {
    return NextResponse.json(
      {
        data: null,
        error:
          po.sisa_kuota <= 0
            ? "Mohon maaf, kuota batch PO ini sudah habis."
            : "Mohon maaf, batch PO ini sedang tidak menerima pesanan.",
      },
      { status: 400 },
    );
  }

  // 2. Evaluasi status aktif metode pengambilan & daftar titik pickup aktif dari database
  const { cfg, titikAmbilAktif, opsiAmbilTersedia, opsiAntarTersedia, tidakAdaMetode } =
    statusMetodePengambilan(po);

  if (tidakAdaMetode) {
    return NextResponse.json(
      {
        data: null,
        error:
          "Pemesanan belum dapat dilakukan karena metode pengambilan maupun pengantaran pada batch ini belum tersedia.",
      },
      { status: 400 },
    );
  }

  const fulfillment = body.p_fulfillment;
  if (fulfillment !== "ambil" && fulfillment !== "antar") {
    return NextResponse.json(
      { data: null, error: "Pilih metode pengambilan pesanan yang valid." },
      { status: 400 },
    );
  }

  // 3. Validasi ketat metode Ambil di Titik Kumpul (Pickup)
  if (fulfillment === "ambil") {
    if (!opsiAmbilTersedia) {
      return NextResponse.json(
        {
          data: null,
          error:
            "Opsi Ambil di Titik Kumpul sedang dinonaktifkan oleh admin pada batch ini. Silakan pilih metode pengambilan yang tersedia.",
        },
        { status: 400 },
      );
    }

    const pickupId = (body.p_pickup_point_id ?? "").trim();
    if (!pickupId) {
      return NextResponse.json(
        { data: null, error: "Pilih salah satu lokasi titik pengambilan yang aktif." },
        { status: 400 },
      );
    }

    const titikValid = titikAmbilAktif.some((t) => t.id === pickupId);
    if (!titikValid) {
      return NextResponse.json(
        {
          data: null,
          error:
            "Titik pengambilan yang dipilih sudah tidak aktif atau tidak tersedia pada batch ini. Silakan pilih titik pengambilan lain yang masih aktif.",
        },
        { status: 400 },
      );
    }
  }

  // 4. Validasi ketat metode Diantar ke Lokasi (Delivery) & Jam Pengantaran sesuai konfigurasi batch di database
  let jamAntarNormal: string | null = null;
  if (fulfillment === "antar") {
    if (!opsiAntarTersedia) {
      return NextResponse.json(
        {
          data: null,
          error:
            "Opsi Diantar ke Lokasi sedang tidak tersedia pada batch ini. Silakan pilih metode pengambilan lain.",
        },
        { status: 400 },
      );
    }

    const alamatBersih = (body.p_alamat ?? "").trim();
    if (alamatBersih.length < 5) {
      return NextResponse.json(
        { data: null, error: "Alamat pengiriman wajib diisi lengkap (minimal 5 karakter)." },
        { status: 400 },
      );
    }

    const errJam = pesanErrorJamAntarWib(
      body.p_jam_antar,
      cfg.jamMulaiAntar,
      cfg.jamSelesaiAntar,
    );
    if (errJam) {
      return NextResponse.json({ data: null, error: errJam }, { status: 400 });
    }

    jamAntarNormal = normalisasiJamAntarWib(body.p_jam_antar ?? "");
    if (!jamAntarNormal) {
      return NextResponse.json(
        {
          data: null,
          error: `Format jam pengantaran tidak valid. Pilih waktu setelah pukul ${cfg.jamMulaiAntar} hingga pukul ${cfg.jamSelesaiAntar} WIB.`,
        },
        { status: 400 },
      );
    }
  }

  // 5. Validasi skema pesanan menyeluruh
  const maksPerOrder = po.maks_per_order > 0 ? po.maks_per_order : 10;
  const maksTotalCup = Math.max(0, Math.min(maksPerOrder, po.sisa_kuota));
  const maksTopping = po.maks_topping ?? 2;

  const schema = buildOrderSchema({
    maksTotalCup,
    maksTopping,
    opsiAmbilTersedia,
    opsiAntarTersedia,
    activePickupPointIds: titikAmbilAktif.map((t) => t.id),
    jamMulaiAntar: cfg.jamMulaiAntar,
    jamSelesaiAntar: cfg.jamSelesaiAntar,
  });

  const rawWebsite = (
    ((body as Record<string, unknown>).website ??
      (body as Record<string, unknown>).p_website ??
      "") as string
  ).trim();

  if (rawWebsite.length > 0) {
    return NextResponse.json(
      { data: null, error: "Permintaan tidak dapat diproses." },
      { status: 400 },
    );
  }

  const parsed = schema.safeParse({
    nama: body.p_nama ?? "",
    wa: body.p_wa ?? "",
    asal: body.p_asal ?? "",
    fulfillment,
    pickup_point_id: fulfillment === "ambil" ? (body.p_pickup_point_id ?? "") : "",
    alamat: fulfillment === "antar" ? (body.p_alamat ?? "") : "",
    jam_antar: fulfillment === "antar" ? (jamAntarNormal ?? "") : "",
    catatan: (body.p_catatan ?? "").slice(0, 300),
    website: rawWebsite,
    items: Array.isArray(body.p_items) ? body.p_items : [],
  });

  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { data: null, error: firstIssue?.message ?? "Data pesanan tidak valid." },
      { status: 400 },
    );
  }

  // 6. Kirim ke RPC buat_pesanan dengan parameter yang telah disanitasi
  const sanitizedParams: BuatPesananParams = {
    p_period_id: po.id,
    p_nama: parsed.data.nama,
    p_wa: parsed.data.wa,
    p_asal: parsed.data.asal,
    p_fulfillment: fulfillment,
    p_pickup_point_id: fulfillment === "ambil" ? parsed.data.pickup_point_id : null,
    p_alamat: fulfillment === "antar" ? (body.p_alamat ?? "").trim() : null,
    p_jam_antar: fulfillment === "antar" ? jamAntarNormal : null,
    p_catatan: body.p_catatan ? body.p_catatan.trim() : null,
    p_items: parsed.data.items,
  };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("buat_pesanan", sanitizedParams);
  if (error) {
    return NextResponse.json({ data: null, error: error.message }, { status: 400 });
  }

  return NextResponse.json({ data: data as BuatPesananResult, error: null }, { status: 200 });
}

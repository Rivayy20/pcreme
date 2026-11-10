-- ============================================================================
-- Migrasi: Sistem Penolakan dan Upload Ulang Bukti Pembayaran P'crème
-- Tanggal: 10 November 2026
--
-- File ini menambahkan kolom pendukung penolakan & riwayat pembayaran pada tabel orders,
-- serta memperbarui RPC cek_status_pesanan dan kirim_bukti_bayar agar sinkron
-- antara dashboard admin dan halaman pelacakan pesanan pelanggan.
--
-- Jalankan file ini di Supabase SQL Editor:
-- Dashboard Supabase -> SQL Editor -> New Query -> Tempel dan Run.
-- ============================================================================

-- 1. Tambah kolom penolakan & riwayat pada tabel orders jika belum ada
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS alasan_penolakan text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS catatan_penolakan text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS riwayat_pembayaran jsonb DEFAULT '[]'::jsonb;

-- 2. Perbarui RPC cek_status_pesanan agar mengembalikan order_id, catatan_admin,
--    alasan_penolakan, catatan_penolakan, riwayat_pembayaran, dan wa_admin
CREATE OR REPLACE FUNCTION public.cek_status_pesanan(p_kode text, p_wa text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wa text;
  v_order record;
  v_items jsonb;
  v_lokasi text;
  v_wa_admin text;
  v_info_pembayaran text;
  v_tanggal_ambil date;
BEGIN
  -- Normalisasi nomor WhatsApp: hilangkan semua karakter non-digit, ubah awalan 0/8 jadi 628
  v_wa := regexp_replace(COALESCE(p_wa, ''), '\D', '', 'g');
  IF v_wa LIKE '08%' THEN
    v_wa := '62' || substr(v_wa, 2);
  ELSIF v_wa LIKE '8%' THEN
    v_wa := '62' || v_wa;
  END IF;

  -- Cari pesanan berdasarkan kode dan nomor WA
  SELECT
    o.id,
    o.kode,
    o.nama,
    o.status,
    o.fulfillment,
    o.alamat_antar,
    o.jam_antar,
    o.jumlah_cup,
    o.total,
    o.bukti_bayar_path,
    o.catatan_admin,
    o.alasan_penolakan,
    o.catatan_penolakan,
    COALESCE(o.riwayat_pembayaran, '[]'::jsonb) AS riwayat_pembayaran,
    o.created_at,
    o.period_id,
    o.pickup_point_id
  INTO v_order
  FROM public.orders o
  WHERE UPPER(o.kode) = UPPER(TRIM(p_kode))
    AND o.wa = v_wa
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesanan dengan kode % dan nomor WhatsApp tersebut tidak ditemukan.', p_kode;
  END IF;

  -- Ambil informasi batch PO terkait
  SELECT p.wa_admin, p.info_pembayaran, p.tanggal_ambil
  INTO v_wa_admin, v_info_pembayaran, v_tanggal_ambil
  FROM public.po_periods p
  WHERE p.id = v_order.period_id
  LIMIT 1;

  -- Format lokasi (titik pickup atau alamat antar)
  IF v_order.fulfillment = 'ambil' THEN
    SELECT pp.nama || ' (' || pp.jam || ')' INTO v_lokasi
    FROM public.pickup_points pp
    WHERE pp.id = v_order.pickup_point_id;
  ELSE
    v_lokasi := v_order.alamat_antar;
    IF v_order.jam_antar IS NOT NULL AND TRIM(v_order.jam_antar) <> '' THEN
      v_lokasi := COALESCE(v_lokasi, '') || ' - ' || v_order.jam_antar;
    END IF;
  END IF;

  -- Kumpulkan items pesanan
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'rasa', oi.rasa,
        'topping', oi.topping,
        'qty', oi.qty
      )
      ORDER BY oi.id
    ),
    '[]'::jsonb
  )
  INTO v_items
  FROM public.order_items oi
  WHERE oi.order_id = v_order.id;

  -- Kembalikan JSON lengkap untuk pelanggan
  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'kode', v_order.kode,
    'nama', v_order.nama,
    'items', v_items,
    'total', v_order.total,
    'lokasi', v_lokasi,
    'status', v_order.status,
    'jumlah_cup', v_order.jumlah_cup,
    'dibuat_pada', v_order.created_at,
    'fulfillment', v_order.fulfillment,
    'tanggal_ambil', v_tanggal_ambil,
    'info_pembayaran', v_info_pembayaran,
    'wa_admin', v_wa_admin,
    'sudah_kirim_bukti', (v_order.bukti_bayar_path IS NOT NULL AND v_order.bukti_bayar_path <> ''),
    'catatan_admin', v_order.catatan_admin,
    'alasan_penolakan', v_order.alasan_penolakan,
    'catatan_penolakan', v_order.catatan_penolakan,
    'riwayat_pembayaran', v_order.riwayat_pembayaran
  );
END;
$$;

-- 3. Perbarui RPC kirim_bukti_bayar agar memvalidasi status pesanan dan mencatat riwayat
CREATE OR REPLACE FUNCTION public.kirim_bukti_bayar(p_kode text, p_wa text, p_path text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_wa text;
  v_order record;
  v_riwayat jsonb;
  v_new_item jsonb;
BEGIN
  -- Normalisasi nomor WhatsApp
  v_wa := regexp_replace(COALESCE(p_wa, ''), '\D', '', 'g');
  IF v_wa LIKE '08%' THEN
    v_wa := '62' || substr(v_wa, 2);
  ELSIF v_wa LIKE '8%' THEN
    v_wa := '62' || v_wa;
  END IF;

  -- Cari pesanan
  SELECT id, kode, status, riwayat_pembayaran
  INTO v_order
  FROM public.orders
  WHERE UPPER(kode) = UPPER(TRIM(p_kode))
    AND wa = v_wa
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pesanan tidak ditemukan atau nomor WhatsApp tidak sesuai.';
  END IF;

  -- Cegah kirim bukti jika pesanan sudah dibayar/selesai atau dibatalkan
  IF v_order.status IN ('dibayar', 'diproses', 'siap', 'selesai') THEN
    RAISE EXCEPTION 'Pembayaran pesanan ini sudah terverifikasi (lunas). Tidak perlu mengunggah bukti lagi.';
  END IF;

  IF v_order.status = 'dibatalkan' THEN
    RAISE EXCEPTION 'Pesanan ini telah dibatalkan. Tidak dapat mengunggah bukti pembayaran.';
  END IF;

  -- Siapkan item riwayat baru
  v_new_item := jsonb_build_object(
    'id', gen_random_uuid()::text,
    'tipe', 'upload',
    'waktu', now()::text,
    'buktiPath', p_path
  );

  v_riwayat := COALESCE(v_order.riwayat_pembayaran, '[]'::jsonb) || jsonb_build_array(v_new_item);

  -- Update pesanan ke status menunggu_verifikasi
  UPDATE public.orders
  SET
    bukti_bayar_path = p_path,
    bukti_uploaded_at = now(),
    status = 'menunggu_verifikasi',
    riwayat_pembayaran = v_riwayat,
    updated_at = now()
  WHERE id = v_order.id;

  RETURN jsonb_build_object('ok', true, 'status', 'menunggu_verifikasi');
END;
$$;

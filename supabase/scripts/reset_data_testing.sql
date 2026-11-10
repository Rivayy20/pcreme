-- ============================================================================
-- SCRIPT RESET DATA UJI COBA P'CRÈME & RESET PENOMORAN KODE PESANAN (PC-1-0001)
-- ============================================================================
-- Petunjuk Penggunaan:
-- 1. Buka dashboard Supabase (https://supabase.com/dashboard).
-- 2. Pilih proyek P'crème kamu -> Buka menu "SQL Editor".
-- 3. Tempel seluruh query di bawah ini, lalu klik tombol "Run".
-- ============================================================================

-- 1. Hapus semua pesanan dan rincian cup uji coba
TRUNCATE TABLE public.order_items, public.orders RESTART IDENTITY CASCADE;

-- 2. RESET COUNTER PENOMORAN KODE PESANAN DI TABEL po_periods KEMBALI KE 0
--    (Di database P'crème, kode pesanan PC-X-0001 dihitung dari kolom last_seq di tabel po_periods)
UPDATE public.po_periods
SET last_seq = 0;

-- 3. Reset juga semua SEQUENCE database PostgreSQL (jika ada sequence tambahan)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT n.nspname AS schemaname, c.relname AS sequencename
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'S'
      AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  LOOP
    BEGIN
      PERFORM setval(format('%I.%I', r.schemaname, r.sequencename)::regclass, 1, false);
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;
END $$;

-- 4. Verifikasi hasil reset: pastikan kolom last_seq bernilai 0
SELECT id, minggu, nama, last_seq, is_active
FROM public.po_periods;

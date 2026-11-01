# P'crème — Web Pre-Order

Web app Pre-Order (PO) untuk dessert pudding + es krim **P'crème**. Pembeli memesan lewat HP, upload bukti bayar, dan mengecek status; admin mengelola pesanan lewat dashboard.

Stack: Next.js (App Router, TypeScript strict) · Tailwind CSS v4 + shadcn/ui · Supabase (`@supabase/supabase-js` + `@supabase/ssr`) · zod + react-hook-form · browser-image-compression · sonner · lucide-react.

> Database Supabase **sudah disetup** (tabel, RLS, RPC, view, bucket, seed). Repo ini tidak membuat/mengubah skema, migrasi, atau policy.

## Setup lokal

Prasyarat: Node.js 20+ dan npm.

```bash
npm install
cp .env.example .env.local   # Windows PowerShell: Copy-Item .env.example .env.local
```

Isi `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon / publishable key>
```

- Pakai **anon / publishable key** saja. **Dilarang** memakai service role key di mana pun.
- `.env.local` sudah masuk `.gitignore`; jangan di-commit.

Jalankan:

```bash
npm run dev      # http://localhost:3000
npm run build    # build produksi
npm run lint     # ESLint
```

## Membuat akun admin

1. Di dashboard Supabase: **Authentication → Users → Add user** (email + password).
2. Daftarkan user tersebut di tabel `admins` (lewat SQL editor Supabase, sesuai skema `admins` yang sudah ada).
3. Login di `/admin/login`. Akun yang tidak ada di tabel `admins` akan ditolak (`is_admin()` = false).

## Deploy ke Vercel

1. Push repo ke GitHub, lalu **Add New → Project** di Vercel dan pilih repo ini (framework terdeteksi otomatis: Next.js).
2. Di **Settings → Environment Variables** isi `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Production, Preview, Development).
3. Deploy. Setelah itu tambahkan domain Vercel ke **Authentication → URL Configuration** di Supabase bila diperlukan.

## Struktur

```
src/
  app/
    (public)/          beranda + form pesan, /pesanan/[kode], /pesanan/cek
    admin/login        login admin
    admin/(panel)/     ringkasan, pesanan, rekap, periode, menu (dijaga)
  components/{ui,public,admin}
  lib/
    supabase/          client (browser), server (RSC/actions), middleware (updateSession)
    types.ts           tipe hasil RPC + tabel (manual, sesuai kontrak DB)
    schemas.ts         zod
    format.ts          rupiah, tanggal WIB, normalisasi WA
    wa.ts              link wa.me + template pesan
    status.ts          label, warna, urutan status
  proxy.ts             guard sesi /admin (nama baru dari middleware.ts di Next.js 16)
```

## Keputusan

- **`proxy.ts` bukan `middleware.ts`**: di Next.js 16 konvensi `middleware` sudah deprecated dan diganti `proxy` (dicek di `node_modules/next/dist/docs`). Helper-nya tetap bernama `lib/supabase/middleware.ts` sesuai struktur target.
- **`getClaims()` di proxy**: dipakai untuk cek sesi cepat. Pengecekan otoritatif tetap `is_admin()` di server layout (Fase 3) dan RLS di database.
- **Proxy tidak mengalihkan `/admin/login` saat sudah ada sesi**: akun non-admin masih punya sesi dan harus bisa melihat pesan "Akun ini bukan admin" di halaman login tanpa loop redirect.
- **Cache Components dimatikan**: template `create-next-app` mengaktifkan `cacheComponents` + `partialPrefetching`, tetapi data PO harus selalu segar dan sederhana (`dynamic = "force-dynamic"`, setara revalidate 0), jadi opsi itu dihapus dari `next.config.ts`.
- **Folder proyek**: `create-next-app` tidak menerima nama `PCreme` (huruf kapital), jadi nama paket npm `pcreme`.
- **Helper `cn`**: komponen shadcn hasil generate mengimpor `cn` dari paket npm `cn` (pihak ketiga, tidak dikenal). Diganti dengan helper standar `clsx` + `tailwind-merge` di `src/lib/utils.ts` dan paket `cn` dihapus. `clsx`/`tailwind-merge` adalah dependensi bawaan pola shadcn.
- **Nomor admin di halaman pesanan**: `cek_status_pesanan` tidak mengembalikan `wa_admin`, jadi nomor diambil dari `get_po_info()` (PO aktif). Bila pesanan berasal dari periode lama dengan admin berbeda, nomornya bisa tidak sesuai (lihat "Saran perubahan DB").
- **`order_id` hanya di sessionStorage**: upload bukti hanya jalan di tab yang membuat pesanan (atau cek status dari tab yang sama). Dari perangkat lain tersedia fallback kirim bukti via WhatsApp.
- **Jam antar** memakai input `type="time"` (disimpan sebagai teks `HH:MM`).
- **Guard admin dua lapis**: `src/proxy.ts` (redirect tanpa sesi) + `is_admin()` di `admin/(panel)/layout.tsx`. Layout hanya dijalankan saat halaman dimuat penuh (Next tidak merender ulang layout di navigasi klien), jadi data tetap dilindungi RLS di database. Akun non-admin diarahkan ke `/admin/keluar` (Route Handler yang menghapus sesi) lalu ke login dengan pesan "Akun ini bukan admin".
- **Update status memakai syarat status lama** (`.eq("status", lama)`): bila dua admin mengubah pesanan yang sama bersamaan, yang kedua ditolak dengan pesan dan data dimuat ulang.
- **Tambahan di luar daftar MVP (kecil)**: tombol "Tandai sudah dibayar (tanpa bukti)" untuk pesanan `menunggu_bayar` (pembayaran tunai/cek mutasi). Hapus bila tidak diinginkan.
- **Realtime**: pesanan memakai Supabase Realtime pada tabel `orders` bila diaktifkan di project, dengan polling 30 detik sebagai cadangan (aktif keduanya).
- **CSV**: BOM UTF-8; sel teks berawalan `= + - @` diberi tanda `'` (cegah formula injection dari nama yang diisi pembeli); nomor WA ditulis sebagai `="628..."` agar Excel tidak mengubahnya jadi notasi ilmiah.
- **Periode baru dibuat nonaktif**; mengaktifkan periode menawarkan menonaktifkan periode aktif lain (yang lain dinonaktifkan lebih dulu).
- **Tanpa dark mode**: `next-themes` tidak dipasang; komponen `sonner` dari shadcn disederhanakan ke tema terang.
- **Font**: Inter (teks) + Poppins (judul) lewat `next/font`.
- **Tema**: warna krem/coklat/pink strawberry didefinisikan sebagai CSS variables di `src/app/globals.css` (mudah diganti bila ada brand guideline).

## Saran perubahan DB

Tidak ada yang diubah dari sisi aplikasi; hanya saran:

1. `cek_status_pesanan` sebaiknya ikut mengembalikan `wa_admin` periode pesanan tersebut, supaya tombol "Hubungi admin" selalu memakai nomor yang benar.
2. Fallback upload bukti dari perangkat lain bisa lebih mulus bila ada RPC pembuat path upload (mis. `siapkan_upload_bukti(p_kode, p_wa)` yang mengembalikan `order_id`), karena saat ini `order_id` hanya diketahui tepat setelah memesan.

## Status pengerjaan

- [x] Fase 1 — Setup
- [x] Fase 2 — Sisi pelanggan
- [x] Fase 3 — Admin
- [x] Fase 4 — Polish & verifikasi

## Hasil verifikasi (checklist penerimaan)

Pengujian otomatis/manual dilakukan terhadap **mock Supabase lokal** (auth, PostgREST, storage) karena akun admin dan data produksi tidak dipakai untuk menulis. Yang sudah dicek terhadap Supabase asli hanya yang bersifat baca (`get_po_info()` menampilkan form saat PO buka; `/admin` tanpa sesi dialihkan ke login).

Pelanggan
- [x] Beranda: status `belum_buka`, `buka`, `habis`, `tutup`, dan tanpa PO (mock).
- [x] Form menolak WA tidak valid, topping melebihi batas (chip dikunci), total cup melebihi batas (tombol + dan "Tambah rasa lain" dikunci; skema zod juga menolak), titik ambil kosong, alamat/jam antar kosong.
- [x] Pesan multi-baris (2 Coklat + 1 Strawberry) sukses, total Rp45.000, kode tampil.
- [x] Foto 2,1 MB dikompres jadi sekitar 0,7 MB sebelum upload; file non-gambar ditolak di client. (PNG berisi noise sangat besar bisa lambat dikompres; bukti transfer biasa tidak.)
- [x] Setelah upload, status jadi "Menunggu verifikasi"; refresh halaman tetap benar (WA dari sessionStorage).
- [x] Kuota habis di tengah pengisian: pesan error server tampil dan sisa kuota ter-refresh.
- [x] WA salah di cek status: pesan error server tampil, tanpa data pesanan.
- [x] Tidak ada overflow horizontal di 360px, 768px, 1280px (semua route publik dan admin).

Admin
- [x] `/admin` tanpa login dialihkan ke login; akun non-admin ditolak dan sesinya dihapus (lewat form login maupun cookie sesi langsung).
- [x] Filter status/pencarian, ubah status sesuai alur (termasuk tolak bukti dengan alasan), batalkan pesanan (kuota terlepas di view mock), batal kadaluarsa.
- [x] Bukti bayar lewat signed URL; link WA memakai nomor 62... dengan template sesuai status.
- [x] CSV: BOM UTF-8 terverifikasi, kutip/koma ter-escape, anti formula injection. Belum dibuka langsung di Excel.
- [x] Rekap: tabel dan total (angka rekap berasal dari view di database). Tampilan print disimulasikan (menu, tombol, dan padding hilang); belum dicetak ke printer/PDF sungguhan.
- [x] Mengaktifkan periode lain: dialog menawarkan menonaktifkan yang lain; beranda membaca periode aktif dari `get_po_info()`.

Teknis
- [x] `npm run build` dan `npm run lint` bersih; tidak ada `any`, tidak ada `console.log`; satu-satunya `eslint-disable` adalah `<img>` untuk blob/signed URL (dengan alasan).
- [x] Tidak ada service role key atau secret di repo (`.env.local` di-ignore, hanya `.env.example`).

Belum dicoba (perlu data/akun asli): alur penuh pesan-upload-verifikasi ke database produksi, Realtime di project Supabase asli, pembukaan CSV di Excel, dan cetak ke PDF.

## Catatan pengujian

- Form publik dan login menonaktifkan tombol submit sampai hidrasi selesai dan memakai `method="post"`, agar submit sebelum JavaScript siap tidak mengirim data pribadi/password lewat query string URL.
- Halaman dinamis memakai `loading.tsx` (streaming). Di tab yang tersembunyi browser menunda hidrasi (`requestAnimationFrame` dijeda); di tab yang terlihat berjalan normal.

# Panduan Deploy P'crème: GitHub lalu Vercel

Panduan ini ditulis untuk dikerjakan manual, langkah demi langkah, di Windows (PowerShell). Urutannya:

- **Bagian A** — Upload kode ke GitHub (`https://github.com/Rivayy20/pcreme.git`)
- **Bagian B** — Deploy ke Vercel
- **Bagian C** — Pengaturan Supabase setelah deploy
- **Bagian D** — Cek hasil deploy
- **Bagian E** — Update berikutnya dan pemecahan masalah

Semua perintah dijalankan di folder proyek: `D:\produktivitas\Coding\PCreme`.

---

## Bagian A — Upload ke GitHub

### A0. Prasyarat

- Git sudah terpasang. Cek di PowerShell: `git --version` (harus menampilkan versi).
- Akun GitHub `Rivayy20` sudah ada, dan repositori `pcreme` sudah dibuat.
- Sebaiknya repositori `pcreme` di GitHub **masih kosong**. Saat membuatnya, jangan centang "Add a README", "Add .gitignore", atau "Choose a license". Kalau sudah terlanjur ada isinya, lihat bagian Masalah di A7.

Buka PowerShell, lalu masuk ke folder proyek:

```powershell
cd D:\produktivitas\Coding\PCreme
```

### A1. WAJIB: pastikan `.env.example` tidak berisi data asli

> **Ini langkah paling penting sebelum push.** Saat panduan ini dibuat, `.env.example` di proyekmu berisi URL dan anon key Supabase yang asli (bukan kosong). File ini ikut ter-upload ke GitHub, sedangkan fungsinya hanya contoh format. Nilai asli seharusnya hanya ada di `.env.local` (yang sudah otomatis diabaikan Git).

1. Buka `.env.example` di editor. Isinya harus persis seperti ini (nilai kosong setelah tanda `=`):

   ```
   # Pakai anon / publishable key. JANGAN pernah isi service role key di sini.
   NEXT_PUBLIC_SUPABASE_URL=
   NEXT_PUBLIC_SUPABASE_ANON_KEY=
   ```

2. Simpan filenya.
3. Pastikan nilai asli masih ada di `.env.local` (kamu akan membutuhkannya untuk Vercel di Bagian B). Cek tanpa menampilkan isinya:

   ```powershell
   Get-Content .env.local | ForEach-Object { ($_ -split '=')[0] }
   ```

   Hasilnya harus menampilkan dua nama variabel: `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Pastikan `.env.example` sudah bersih. Perintah ini **tidak boleh menampilkan apa pun**:

   ```powershell
   Select-String -Path .env.example -Pattern '^[A-Z_]+=.+'
   ```

   Kalau masih ada baris yang muncul, berarti masih ada nilai di belakang `=`. Kosongkan lagi.

Catatan: anon key memang dirancang boleh terlihat publik (keamanan data dijaga oleh RLS di Supabase), jadi ini bukan keadaan darurat. Tapi kebiasaan yang benar adalah tidak menaruh nilai asli di file contoh. **Service role key tidak boleh muncul di mana pun**, di repo maupun di Vercel.

### A2. Pastikan kode lolos build dan lint

```powershell
npm run lint
npm run build
```

Keduanya harus selesai tanpa error. Kalau build gagal di komputermu, build di Vercel juga akan gagal.

### A3. Cek identitas Git

```powershell
git config user.name
git config user.email
```

Harus menampilkan nama dan emailmu (sudah terisi: Raihan dan email yang terhubung ke GitHub). Kalau kosong:

```powershell
git config --global user.name "Nama Kamu"
git config --global user.email "emailkamu@contoh.com"
```

Gunakan email yang sama dengan akun GitHub supaya commit tercatat atas namamu.

### A4. Lihat apa yang akan di-commit

```powershell
git status
```

Kamu akan melihat daftar file yang berubah (modified), dihapus (deleted), dan baru (untracked). Itu normal, karena proyek ini dibangun di atas template awal.

Tambahkan semua file:

```powershell
git add .
```

Periksa **sebelum commit**, pastikan tidak ada file rahasia atau file hasil build:

```powershell
git diff --cached --name-only | Select-String "env|node_modules|\.next"
```

Hasil yang benar hanya satu baris: `.env.example`. Kalau muncul `.env.local`, **berhenti**, jangan commit. Jalankan `git reset` lalu cek ulang `.gitignore`.

Kamu mungkin melihat peringatan `LF will be replaced by CRLF`. Itu normal di Windows dan aman diabaikan.

### A5. Commit

```powershell
git commit -m "Web pre-order P'creme: sisi pelanggan dan dashboard admin"
```

Kalau Git meminta konfigurasi nama/email, kembali ke A3.

### A6. Hubungkan ke GitHub dan push

1. Cek remote yang ada (sebaiknya masih kosong):

   ```powershell
   git remote -v
   ```

2. Tambahkan remote:

   ```powershell
   git remote add origin https://github.com/Rivayy20/pcreme.git
   ```

   Kalau muncul `error: remote origin already exists`, jalankan ini lalu ulangi:

   ```powershell
   git remote set-url origin https://github.com/Rivayy20/pcreme.git
   ```

3. Pastikan nama branch `main` (sudah `main` di proyekmu):

   ```powershell
   git branch --show-current
   ```

   Kalau bukan `main`: `git branch -M main`.

4. Push:

   ```powershell
   git push -u origin main
   ```

5. **Login.** Windows akan membuka jendela "Connect to GitHub" lewat Git Credential Manager. Pilih **Sign in with your browser**, login ke akun `Rivayy20`, lalu klik **Authorize**. Setelah itu push berjalan sendiri.

   Kalau tidak muncul jendela login, dan GitHub meminta password di terminal: GitHub tidak lagi menerima password akun. Pakai **Personal Access Token**:
   - GitHub → klik foto profil → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token (classic)**.
   - Beri nama (mis. `pcreme-push`), masa berlaku secukupnya, centang scope **`repo`**, lalu **Generate token**.
   - Salin token sekali itu saja. Saat Git meminta password, tempel token tersebut (bukan password akun).
   - Simpan token di tempat aman. Jangan masukkan ke file proyek.

### A7. Masalah umum saat push

| Pesan | Penyebab | Solusi |
| --- | --- | --- |
| `! [rejected] main -> main (fetch first)` atau `non-fast-forward` | Repo GitHub sudah berisi file (mis. README) yang belum ada di lokalmu | `git pull origin main --rebase --allow-unrelated-histories`, selesaikan konflik jika ada (biasanya di `README.md`; pilih versi lokal), lalu `git push -u origin main` |
| `Repository not found` / `403` | Akun yang login bukan pemilik repo, atau token tanpa scope `repo` | Pastikan login sebagai `Rivayy20`. Hapus kredensial lama di Windows: **Credential Manager → Windows Credentials → hapus entri `git:https://github.com`**, lalu push ulang |
| `fatal: not a git repository` | Terminal tidak berada di folder proyek | `cd D:\produktivitas\Coding\PCreme` |
| Push sangat lama | Ada folder besar ikut terunggah | Cek `git diff --cached --name-only`; `node_modules` dan `.next` harus tidak ada |

### A8. Verifikasi di GitHub

Buka `https://github.com/Rivayy20/pcreme` dan periksa:

- Folder `src`, file `package.json`, `README.md`, `PANDUAN-DEPLOY.md`, `.env.example` ada.
- File `.env.local` **tidak** ada.
- Klik `.env.example`: nilai di belakang `=` harus kosong.
- Repo bisa public atau private. Vercel mendukung keduanya. Kalau bisnis ini tidak perlu kodenya dilihat orang lain, pilih **private** (Settings → General → Danger Zone → Change visibility).

---

## Bagian B — Deploy ke Vercel

### B0. Catatan paket Vercel

Paket gratis **Hobby** dari Vercel ditujukan untuk penggunaan **pribadi/non-komersial**. Karena P'crème menjual produk, ketentuan Vercel bisa mengharuskan paket berbayar (Pro). Baca ketentuan terbaru di halaman Fair Use / Terms Vercel sebelum dipakai untuk jualan sungguhan, lalu putuskan sendiri.

### B1. Masuk ke Vercel

1. Buka `https://vercel.com` dan klik **Sign Up** (atau **Log In** bila sudah punya akun).
2. Pilih **Continue with GitHub**, lalu **Authorize Vercel** dengan akun `Rivayy20`.
3. Kalau diminta memilih paket, pilih **Hobby** (lihat B0). Isi nama bila diminta.

### B2. Import repositori

1. Di dashboard Vercel klik **Add New…** → **Project**.
2. Di bagian **Import Git Repository**, cari `pcreme`.
3. Kalau repo **tidak muncul**:
   - Klik **Adjust GitHub App Permissions** (atau **Configure GitHub App**).
   - Di halaman GitHub, bagian **Repository access**, pilih **Only select repositories** lalu pilih `pcreme` (atau **All repositories**).
   - Klik **Save**, kembali ke Vercel, lalu muat ulang daftar.
4. Klik **Import** di samping `Rivayy20/pcreme`.

### B3. Konfigurasi proyek (jangan banyak diubah)

Di halaman **Configure Project**:

- **Project Name**: `pcreme` (menentukan alamat `pcreme.vercel.app` bila masih tersedia; boleh diganti).
- **Framework Preset**: **Next.js** (terdeteksi otomatis).
- **Root Directory**: `./` (biarkan).
- **Build and Output Settings**: biarkan semua default (`next build`). Jangan di-override.

### B4. Isi Environment Variables (jangan dilewati)

Masih di halaman yang sama, buka bagian **Environment Variables**.

1. Buka `.env.local` di komputermu untuk menyalin nilainya.
2. Tambahkan dua variabel. Nama harus persis, huruf besar semua:

   | Name | Value |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase (`https://xxxx.supabase.co`) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon / publishable key |

   Cara cepat: salin kedua baris dari `.env.local`, tempel ke kolom **Key** pada form. Vercel akan memisahkannya otomatis menjadi dua variabel.
3. Biarkan **Environments** terpilih semuanya (Production, Preview, Development).
4. **Jangan** menambahkan service role key.

Pastikan tidak ada spasi atau tanda kutip di awal/akhir nilai.

> Variabel berawalan `NEXT_PUBLIC_` "dibakar" ke dalam kode saat build. Kalau kamu mengubahnya di kemudian hari, kamu **harus Redeploy** supaya berlaku (lihat E2).

### B5. Deploy

1. Klik **Deploy**.
2. Tunggu 1–3 menit. Kamu bisa melihat log build secara langsung (klik **Build Logs** untuk memperluas).
3. Kalau berhasil, muncul layar selamat dengan pratinjau situs. Klik gambar atau tombol **Continue to Dashboard**.
4. Alamat produksi ada di bagian **Domains** (mis. `https://pcreme.vercel.app`). Klik untuk membuka.

---

## Bagian C — Pengaturan Supabase setelah deploy

### C1. URL Configuration (disarankan)

1. Buka dashboard Supabase → proyekmu → **Authentication** → **URL Configuration**.
2. **Site URL**: isi dengan alamat Vercel, mis. `https://pcreme.vercel.app`.
3. **Redirect URLs**: klik **Add URL**, isi `https://pcreme.vercel.app/**` (ganti sesuai domainmu).
4. Klik **Save**.

Login admin memakai email + password, jadi tetap bisa jalan tanpa langkah ini. Pengaturan ini tetap sebaiknya diisi supaya fitur Supabase Auth lain (mis. reset password via email) mengarah ke domain yang benar.

### C2. Akun admin

Akun admin di Supabase harus sudah ada dan terdaftar di tabel `admins`. Caranya ada di `README.md` bagian "Membuat akun admin". Bila belum, lakukan sekarang, karena tanpa itu kamu tidak bisa login di `/admin/login`.

### C3. Realtime (opsional)

Dashboard pesanan memperbarui diri lewat Supabase Realtime bila tabel `orders` diaktifkan untuk Realtime, dan memakai polling 30 detik sebagai cadangan. Jadi **tidak wajib**. Kalau mau, aktifkan sendiri di Supabase (Database → Publications → `supabase_realtime` → centang tabel `orders`). Ini perubahan konfigurasi database, jadi keputusanmu.

---

## Bagian D — Cek hasil deploy

Buka alamat Vercel dan cek satu per satu:

1. **Beranda `/`**: header P'crème, banner PO, dan form pemesanan muncul (bila PO berstatus buka).
   - Kalau tampil tulisan merah "Konfigurasi Supabase belum diisi", berarti environment variables belum terbaca. Lihat Masalah E3.
2. **`/pesanan/cek`**: halaman cek status tampil, tombol panah kembali ke beranda berfungsi.
3. **`/admin`** tanpa login: otomatis diarahkan ke `/admin/login`.
4. **Login admin** dengan akunmu: masuk ke Ringkasan. Kartu "Link form pemesanan" menampilkan alamat Vercel yang benar.
5. **Uji satu pesanan** (opsional, ini membuat data sungguhan di database):
   - Pesan 1 cup dengan nomor WA-mu sendiri, catat kodenya.
   - Upload bukti bayar (foto apa saja), pastikan status berubah ke "Menunggu verifikasi".
   - Di admin, buka pesanan itu, lihat bukti bayarnya, lalu **Batalkan pesanan** supaya kuota kembali.
6. **Layar HP**: buka dari HP, cek form nyaman dipakai.

---

## Bagian E — Update berikutnya dan pemecahan masalah

### E1. Alur update rutin

Setiap kali kode berubah:

```powershell
cd D:\produktivitas\Coding\PCreme
npm run lint
npm run build
git add .
git commit -m "Jelaskan perubahan singkat"
git push
```

Vercel otomatis membangun dan men-deploy setiap push ke `main` (jadi versi produksi). Push ke branch lain atau Pull Request menghasilkan **Preview URL** terpisah.

Sebelum `git add .`, selalu cek `git status` bahwa tidak ada `.env.local` atau file rahasia lain.

### E2. Mengubah environment variable

1. Vercel → proyek `pcreme` → **Settings** → **Environment Variables**.
2. Edit nilainya, klik **Save**.
3. Buka tab **Deployments**, klik titik tiga (⋯) pada deployment terbaru → **Redeploy**.
4. Matikan opsi "Use existing Build Cache" bila ada, lalu konfirmasi.

Tanpa redeploy, nilai lama tetap dipakai.

### E3. Pemecahan masalah

| Gejala | Kemungkinan penyebab | Solusi |
| --- | --- | --- |
| Beranda menampilkan "Konfigurasi Supabase belum diisi" | Env var belum diisi, salah nama, atau belum redeploy | Cek nama persis `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` di Settings → Environment Variables, lalu Redeploy (E2) |
| Build gagal dengan error TypeScript/ESLint | Ada error yang tidak muncul di lokal, atau file belum ter-commit | Jalankan `npm run lint` dan `npm run build` di lokal, perbaiki, commit, push |
| Build gagal soal versi Node | Versi Node di Vercel tidak cocok | Settings → **General** → **Node.js Version** → pilih 22.x atau 24.x, lalu Redeploy |
| `/admin/login` menolak akun yang benar | Akun belum ada di tabel `admins`, atau env var salah | Lihat README "Membuat akun admin"; cek juga bahwa URL dan key Supabase yang dipakai di Vercel sama dengan `.env.local` |
| Error 500 di `/admin` | Env var kosong atau salah | Periksa env var, Redeploy. Lihat detail di Vercel → **Logs** |
| Form pemesanan tidak muncul padahal PO ada | Status PO bukan "buka" (periode belum diaktifkan, atau di luar jadwal buka/tutup) | Admin → Periode: pastikan periode aktif dan jadwalnya benar |
| Gambar bukti bayar tidak tampil di admin | Bucket `bukti-bayar` atau policy admin di Supabase belum benar | Itu pengaturan database; cek bahwa admin boleh membaca bucket tersebut |
| Perubahan kode tidak muncul di situs | Belum di-push, atau yang dibuka Preview, bukan Production | Cek `git log`, tab Deployments di Vercel, dan pastikan membuka domain produksi |
| Situs lama tersaji setelah mengubah env | Belum redeploy | E2 |

### E4. Domain sendiri (opsional)

1. Vercel → proyek → **Settings** → **Domains** → **Add**, isi domainmu (mis. `pcreme.id`).
2. Vercel menampilkan record DNS yang harus dipasang (biasanya `A` ke alamat IP yang ditampilkan, atau `CNAME` untuk subdomain). Pasang **persis seperti yang ditampilkan Vercel** di pengelola DNS tempat kamu membeli domain.
3. Tunggu propagasi (beberapa menit sampai beberapa jam), sampai statusnya **Valid Configuration**.
4. Perbarui **Site URL** dan **Redirect URLs** di Supabase (C1) ke domain baru.

### E5. Pengingat keamanan

- Yang boleh ada di Vercel dan browser hanya `NEXT_PUBLIC_SUPABASE_URL` dan anon key.
- **Service role key jangan pernah** dimasukkan ke repo, `.env.example`, maupun Vercel. Bila suatu hari tidak sengaja ter-upload, segera ganti (rotate) key-nya di Supabase.
- `.env.local` tidak boleh di-commit (sudah diblokir `.gitignore`).
- Token GitHub yang dibuat di A6 hanya untuk push dari komputermu; hapus di GitHub bila sudah tidak dipakai.

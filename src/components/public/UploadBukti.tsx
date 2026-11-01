"use client";

import imageCompression from "browser-image-compression";
import { ImagePlus, Loader2, MessageCircle, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { kirimBuktiBayar, unggahBukti } from "@/lib/api";
import { linkWa, pesanBuktiKeAdmin } from "@/lib/wa";

const TIPE_DIIZINKAN: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAKS_BYTE = 5 * 1024 * 1024;

interface UploadBuktiProps {
  kode: string;
  wa: string;
  /** Hanya diketahui di perangkat yang membuat pesanan (dari sessionStorage). */
  orderId?: string;
  waAdmin: string | null;
  sudahKirim: boolean;
  onSelesai: () => void;
}

export function UploadBukti({ kode, wa, orderId, waAdmin, sudahKirim, onSelesai }: UploadBuktiProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [tahap, setTahap] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewRef = useRef<string | null>(null);

  function ganti(f: File | null) {
    if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    previewRef.current = f ? URL.createObjectURL(f) : null;
    setFile(f);
    setPreview(previewRef.current);
  }

  // Bebaskan object URL saat komponen dilepas.
  useEffect(() => {
    return () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    };
  }, []);

  // Tanpa order_id, upload ke storage tidak mungkin (path harus "<order_id>/..."): pakai WA.
  if (!orderId) {
    return (
      <div className="space-y-3 rounded-2xl border bg-card p-4">
        <h3 className="font-heading text-sm font-semibold">Kirim bukti bayar</h3>
        <p className="text-sm text-muted-foreground">
          Upload bukti hanya bisa dari perangkat yang tadi dipakai memesan. Dari sini, kirim buktinya lewat
          WhatsApp ke admin ya.
        </p>
        {waAdmin ? (
          <a
            href={linkWa(waAdmin, pesanBuktiKeAdmin(kode))}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-emerald-600 px-5 text-sm font-semibold text-white outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
          >
            <MessageCircle className="size-4" aria-hidden /> Kirim bukti via WhatsApp ke admin
          </a>
        ) : (
          <p className="text-sm font-medium">Nomor WhatsApp admin belum tersedia. Hubungi admin lewat Instagram.</p>
        )}
      </div>
    );
  }

  function pilihFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    setError(null);
    if (!f) return;
    if (!(f.type in TIPE_DIIZINKAN)) {
      ganti(null);
      toast.error("File harus berupa foto (JPG, PNG, atau WebP).");
      return;
    }
    ganti(f);
  }

  async function kirim() {
    if (!file || !orderId) return;
    setError(null);
    try {
      setTahap("Mengompres foto…");
      const kecil = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1600,
        useWebWorker: true,
      });
      const ext = TIPE_DIIZINKAN[kecil.type];
      if (!ext) throw new Error("Format foto tidak didukung. Pakai JPG, PNG, atau WebP.");
      if (kecil.size > MAKS_BYTE) throw new Error("Foto masih terlalu besar (maks 5 MB). Coba foto lain.");

      setTahap("Mengunggah…");
      const path = `${orderId}/${crypto.randomUUID()}.${ext}`;
      const up = await unggahBukti(path, kecil);
      if (up.error) throw new Error(up.error);

      setTahap("Mengirim ke admin…");
      const res = await kirimBuktiBayar(kode, wa, path);
      if (res.error) throw new Error(res.error);

      toast.success("Bukti bayar terkirim. Admin akan segera memeriksanya 💗");
      ganti(null);
      onSelesai();
    } catch (err) {
      const pesan = err instanceof Error ? err.message : "Gagal mengirim bukti bayar.";
      setError(pesan);
      toast.error(pesan);
    } finally {
      setTahap(null);
    }
  }

  const sibuk = tahap !== null;

  return (
    <div className="space-y-3 rounded-2xl border bg-card p-4">
      <h3 className="font-heading text-sm font-semibold">
        {sudahKirim ? "Kirim ulang bukti bayar" : "Upload bukti bayar"}
      </h3>
      <p className="text-xs text-muted-foreground">
        Foto JPG, PNG, atau WebP. Foto besar otomatis dikecilkan sebelum diunggah.
      </p>

      <label
        className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border bg-background px-4 text-sm font-medium has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/60 ${
          sibuk ? "pointer-events-none opacity-50" : ""
        }`}
      >
        <ImagePlus className="size-4" aria-hidden />
        {file ? "Ganti foto" : "Pilih foto"}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={pilihFile}
          disabled={sibuk}
        />
      </label>

      {preview && (
        <div className="overflow-hidden rounded-xl border bg-muted">
          {/* eslint-disable-next-line @next/next/no-img-element -- blob: URL lokal, tidak cocok untuk next/image */}
          <img src={preview} alt="Pratinjau bukti bayar" className="mx-auto max-h-72 object-contain" />
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm font-medium text-destructive">
          {error}
        </p>
      )}

      <Button
        type="button"
        className="h-11 w-full rounded-full"
        onClick={kirim}
        disabled={!file || sibuk}
      >
        {sibuk ? (
          <>
            <Loader2 className="animate-spin" aria-hidden /> {tahap}
          </>
        ) : (
          <>
            <Upload aria-hidden /> Kirim bukti bayar
          </>
        )}
      </Button>
    </div>
  );
}

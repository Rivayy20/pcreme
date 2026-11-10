import { AtSign, Building2, MessageCircle, QrCode } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import logoImg from "@/assets/logo.png";
import type { PoInfo } from "@/lib/types";
import { linkInstagram, linkWa } from "@/lib/wa";

export function PublicFooter({ po }: { po: PoInfo | null }) {
  const poAda = po?.ada_po ? po : null;
  const waAdmin = poAda?.wa_admin ?? null;
  const instagram = poAda?.instagram ?? "@puddingcreamee";

  return (
    <footer className="mt-12 border-t bg-secondary/70 pb-[max(2.5rem,env(safe-area-inset-bottom))] pt-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {/* Kolom 1: Brand */}
          <div className="space-y-3">
            <Link href="/" className="inline-flex items-center gap-3">
              <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#E9DDCE] bg-[#F5E1BE] shadow-2xs">
                <Image
                  src={logoImg}
                  alt="Logo Resmi P'crème"
                  width={48}
                  height={48}
                  className="h-full w-full object-contain"
                />
              </span>
              <div>
                <span className="block font-heading text-xl font-bold leading-tight text-primary">
                  P&apos;crème
                </span>
                <span className="block text-[11px] font-medium text-muted-foreground">
                  Dessert &amp; Pudding Pre-Order
                </span>
              </div>
            </Link>
            <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
              A Little Sweetness in Your Day. Pudding lembut dengan es krim dingin dan pilihan topping favorit, dibuat fresh setiap batch Pre-Order.
            </p>
          </div>

          {/* Kolom 2: Navigasi */}
          <div className="space-y-2.5">
            <h3 className="font-heading text-sm font-bold text-foreground">Navigasi Pelanggan</h3>
            <ul className="space-y-2 text-xs text-muted-foreground sm:text-sm">
              <li>
                <Link href="/" className="hover:text-primary hover:underline">
                  Beranda
                </Link>
              </li>
              <li>
                <Link href="/pesan" className="hover:text-primary hover:underline">
                  Pesan Pre-Order
                </Link>
              </li>
              <li>
                <Link href="/jadwal" className="hover:text-primary hover:underline">
                  Jadwal Batch PO
                </Link>
              </li>
              <li>
                <Link href="/pesanan/cek" className="hover:text-primary hover:underline">
                  Cek Status Pesanan
                </Link>
              </li>
            </ul>
          </div>

          {/* Kolom 3: Informasi Pembayaran */}
          <div className="space-y-2.5">
            <h3 className="font-heading text-sm font-bold text-foreground">Metode Pembayaran</h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-start gap-2 rounded-xl border bg-card p-2.5">
                <QrCode className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="font-semibold text-foreground">QRIS Resmi P&apos;CREME</p>
                  <p>Mendukung GoPay, OVO, Dana, ShopeePay &amp; seluruh m-banking</p>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl border bg-card p-2.5">
                <Building2 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                <div>
                  <p className="font-semibold text-foreground">Transfer Bank Mandiri</p>
                  <p>Pembayaran melalui transfer bank manual</p>
                </div>
              </div>
            </div>
          </div>

          {/* Kolom 4: Kontak & Bantuan */}
          <div className="space-y-2.5">
            <h3 className="font-heading text-sm font-bold text-foreground">Kontak &amp; Media Sosial</h3>
            <div className="space-y-2 text-xs sm:text-sm">
              {waAdmin && (
                <a
                  href={linkWa(waAdmin, "Halo kak, aku mau tanya info PO P'crème 🍮")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 font-medium text-foreground transition-colors hover:bg-accent/50"
                >
                  <MessageCircle className="size-4 text-emerald-600" aria-hidden />
                  <span>WhatsApp Admin</span>
                </a>
              )}
              {instagram && (
                <a
                  href={linkInstagram(instagram)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 font-medium text-foreground transition-colors hover:bg-accent/50"
                >
                  <AtSign className="size-4 text-brand-pink" aria-hidden />
                  <span>Instagram {instagram.startsWith("@") ? instagram : `@${instagram}`}</span>
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center justify-between gap-2 border-t pt-5 text-xs text-muted-foreground sm:flex-row">
          <p>© {new Date().getFullYear()} P&apos;crème Dessert Pre-Order. All rights reserved.</p>
          <p>Dibuat hangat untuk pecinta pudding &amp; es krim.</p>
        </div>
      </div>
    </footer>
  );
}

"use client";

import { CalendarRange, Home, Menu, Search, ShoppingBag, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import logoImg from "@/assets/logo.png";
import { RUTE } from "@/lib/routes";
import { cn } from "@/lib/utils";

export function PublicNav() {
  const pathname = usePathname();
  const [menuTerbuka, setMenuTerbuka] = useState(false);

  const links = [
    { href: RUTE.beranda, label: "Beranda", icon: Home, match: (p: string) => p === "/" },
    { href: RUTE.jadwal, label: "Jadwal PO", icon: CalendarRange, match: (p: string) => p.startsWith("/jadwal") },
    { href: RUTE.cekPesanan, label: "Cek Pesanan", icon: Search, match: (p: string) => p.startsWith("/pesanan") },
  ];
  // "/pesan" dan "/pesan/<batch>" saja; "/pesanan/..." adalah Cek Pesanan.
  const pesanAktif = pathname === RUTE.pesan || pathname.startsWith(`${RUTE.pesan}/`);

  function tutupMenu() {
    setMenuTerbuka(false);
  }

  return (
    <header className="sticky top-0 z-30 border-b bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        {/* Brand Header (Logo Resmi + Nama Brand + Deskripsi Singkat) */}
        <Link
          href="/"
          onClick={tutupMenu}
          className="flex min-w-0 items-center gap-2.5 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/60"
        >
          <span className="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#E9DDCE] bg-[#F5E1BE] shadow-2xs sm:size-11">
            <Image
              src={logoImg}
              alt="Logo Resmi P'crème"
              width={44}
              height={44}
              priority
              className="h-full w-full object-contain"
            />
          </span>
          <div className="min-w-0">
            <span className="block truncate font-heading text-base font-bold leading-tight tracking-tight text-primary sm:text-lg">
              P&apos;crème
            </span>
            <span className="block truncate text-[11px] font-medium text-muted-foreground">
              Artisanal Pudding &amp; Ice Cream
            </span>
          </div>
        </Link>

        {/* Navigasi Horizontal (Desktop) */}
        <nav aria-label="Navigasi utama" className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const aktif = l.match(pathname);
            return (
              <Link
                key={l.href}
                href={l.href}
                aria-current={aktif ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                  aktif
                    ? "bg-secondary font-semibold text-primary"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                )}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        {/* CTA Desktop & Tombol Hamburger Mobile */}
        <div className="flex shrink-0 items-center gap-2">
          <Link
            href={RUTE.pesan}
            aria-current={pesanAktif ? "page" : undefined}
            className={cn(
              "hidden h-10 items-center gap-1.5 rounded-full bg-primary px-5 font-heading text-xs font-semibold text-primary-foreground shadow-xs transition-opacity hover:opacity-95 md:inline-flex",
              pesanAktif && "ring-2 ring-primary/30 ring-offset-2 ring-offset-background",
            )}
          >
            <ShoppingBag className="size-3.5" aria-hidden /> Pesan Sekarang
          </Link>

          <button
            type="button"
            onClick={() => setMenuTerbuka((v) => !v)}
            aria-expanded={menuTerbuka}
            aria-controls="mobile-nav-menu"
            aria-label={menuTerbuka ? "Tutup menu navigasi" : "Buka menu navigasi"}
            className="inline-flex size-11 items-center justify-center rounded-xl border bg-card text-foreground shadow-2xs transition-colors hover:bg-secondary focus-visible:ring-3 focus-visible:ring-ring/60 md:hidden"
          >
            {menuTerbuka ? (
              <X className="size-5 text-primary" aria-hidden />
            ) : (
              <Menu className="size-5 text-primary" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {/* Menu Navigasi Slide-Down (Mobile) */}
      {menuTerbuka && (
        <nav
          id="mobile-nav-menu"
          aria-label="Menu navigasi mobile"
          className="border-t bg-card/98 px-4 pb-4 pt-3 shadow-md backdrop-blur md:hidden"
        >
          <ul className="mx-auto max-w-6xl space-y-1.5">
            {links.map((l) => {
              const aktif = l.match(pathname);
              const Icon = l.icon;
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    onClick={tutupMenu}
                    aria-current={aktif ? "page" : undefined}
                    className={cn(
                      "flex min-h-11 w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                      aktif
                        ? "border border-[#DFC8AC] bg-secondary font-semibold text-primary"
                        : "text-foreground hover:bg-secondary/60",
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", aktif ? "text-primary" : "text-muted-foreground")} aria-hidden />
                    <span>{l.label}</span>
                  </Link>
                </li>
              );
            })}
            <li className="pt-1.5">
              <Link
                href={RUTE.pesan}
                onClick={tutupMenu}
                aria-current={pesanAktif ? "page" : undefined}
                className={cn(
                  "flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 py-2.5 font-heading text-sm font-semibold text-primary-foreground shadow-xs transition-opacity hover:opacity-95",
                  pesanAktif && "ring-2 ring-primary/30 ring-offset-2 ring-offset-card",
                )}
              >
                <ShoppingBag className="size-4 shrink-0" aria-hidden />
                <span>Pesan Sekarang</span>
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}

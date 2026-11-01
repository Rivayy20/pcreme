"use client";

import { CalendarRange, ClipboardList, ExternalLink, LayoutDashboard, LogOut, Printer, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/admin/pesanan", label: "Pesanan", icon: ClipboardList },
  { href: "/admin/rekap", label: "Rekap", icon: Printer },
  { href: "/admin/periode", label: "Periode", icon: CalendarRange },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
];

export function AdminShell({ email, children }: { email: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const aktif = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname.startsWith(href));

  async function keluar() {
    const { error } = await createClient().auth.signOut();
    if (error) {
      toast.error(error.message);
      return;
    }
    router.replace("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="no-print hidden w-56 shrink-0 flex-col border-r bg-sidebar p-4 md:flex">
        <Link href="/admin" className="mb-6 font-heading text-xl font-bold text-primary">
          P&apos;crème <span className="text-sm font-medium text-muted-foreground">admin</span>
        </Link>
        <nav aria-label="Menu admin" className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={aktif(href) ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none focus-visible:ring-3 focus-visible:ring-ring/60",
                aktif(href) ? "bg-sidebar-accent text-sidebar-accent-foreground" : "hover:bg-muted",
              )}
            >
              <Icon className="size-4" aria-hidden /> {label}
            </Link>
          ))}
        </nav>
        <div className="space-y-2 border-t pt-3">
          <a
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/60"
          >
            <ExternalLink className="size-4" aria-hidden /> Form pelanggan
          </a>
          <p className="truncate text-xs text-muted-foreground" title={email}>
            {email}
          </p>
          <button
            type="button"
            onClick={keluar}
            className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium hover:bg-muted"
          >
            <LogOut className="size-4" aria-hidden /> Keluar
          </button>
        </div>
      </aside>

      {/* Topbar (mobile) */}
      <header className="no-print sticky top-0 z-30 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur md:hidden">
        <Link href="/admin" className="font-heading text-lg font-bold text-primary">
          P&apos;crème admin
        </Link>
        <button
          type="button"
          onClick={keluar}
          className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm font-medium"
        >
          <LogOut className="size-4" aria-hidden /> Keluar
        </button>
      </header>

      <main className="min-w-0 flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>

      {/* Bottom nav (mobile) */}
      <nav
        aria-label="Menu admin"
        className="no-print fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background/95 backdrop-blur md:hidden"
      >
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            aria-current={aktif(href) ? "page" : undefined}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
              aktif(href) ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" aria-hidden /> {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

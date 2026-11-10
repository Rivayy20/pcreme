import { MenuManager } from "@/components/admin/MenuManager";
import { createClient } from "@/lib/supabase/server";
import type { MenuItem } from "@/lib/types";

export const metadata = { title: "Konfigurasi Produk & Menu" };

export default async function AdminMenuPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .order("urutan", { ascending: true })
    .returns<MenuItem[]>();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          Konfigurasi Rasa, Topping &amp; Asset Resmi
        </span>
        <h1 className="font-heading text-2xl font-bold text-foreground">
          Produk, Rasa &amp; Topping P&apos;crème
        </h1>
      </div>
      {error ? (
        <p role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Gagal memuat menu: {error.message}
        </p>
      ) : (
        <MenuManager items={data ?? []} />
      )}
    </div>
  );
}

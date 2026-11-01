import { MenuManager } from "@/components/admin/MenuManager";
import { createClient } from "@/lib/supabase/server";
import type { MenuItem } from "@/lib/types";

export const metadata = { title: "Menu" };

export default async function AdminMenuPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .order("urutan", { ascending: true })
    .returns<MenuItem[]>();

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-heading text-2xl font-semibold">Menu rasa &amp; topping</h1>
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

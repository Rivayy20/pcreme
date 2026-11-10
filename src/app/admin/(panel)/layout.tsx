import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * Lapis kedua guard admin (lapis pertama: src/proxy.ts). Dijalankan saat halaman dimuat penuh;
 * data tetap dilindungi RLS di database untuk navigasi berikutnya.
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/admin/login");

  const { data: admin } = await supabase.rpc("is_admin");
  if (admin !== true) redirect("/admin/keluar?alasan=bukan-admin");

  return <AdminShell email={userData.user.email ?? ""}>{children}</AdminShell>;
}

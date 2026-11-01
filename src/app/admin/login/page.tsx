import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/LoginForm";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Login" };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const { error } = await searchParams;

  if (error !== "bukan-admin" && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims) {
      const { data: admin } = await supabase.rpc("is_admin");
      redirect(admin === true ? "/admin" : "/admin/keluar?alasan=bukan-admin");
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <p className="text-4xl" aria-hidden>
            🍮
          </p>
          <h1 className="mt-2 font-heading text-2xl font-bold text-primary">P&apos;crème Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Masuk untuk mengelola pesanan.</p>
        </div>
        <div className="rounded-3xl border bg-card p-5 shadow-sm">
          <LoginForm awalError={error === "bukan-admin" ? "Akun ini bukan admin." : undefined} />
        </div>
      </div>
    </main>
  );
}

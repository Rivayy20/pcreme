import Image from "next/image";
import { redirect } from "next/navigation";
import logoImg from "@/assets/logo.png";
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
          <div className="mx-auto flex size-16 items-center justify-center overflow-hidden rounded-2xl border border-[#E9DDCE] bg-[#F5E1BE] shadow-xs">
            <Image
              src={logoImg}
              alt="Logo Resmi P'crème"
              width={64}
              height={64}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <h1 className="mt-3 font-heading text-2xl font-bold text-primary">P&apos;crème Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Masuk untuk mengelola pesanan.</p>
        </div>
        <div className="rounded-3xl border bg-card p-5 shadow-sm">
          <LoginForm awalError={error === "bukan-admin" ? "Akun ini bukan admin." : undefined} />
        </div>
      </div>
    </main>
  );
}

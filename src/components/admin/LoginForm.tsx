"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/public/Field";
import { createClient } from "@/lib/supabase/client";
import { useHydrated } from "@/lib/use-hydrated";

export function LoginForm({ awalError }: { awalError?: string }) {
  const router = useRouter();
  const hydrated = useHydrated();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(awalError);

  async function masuk(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Email dan password wajib diisi.");
      return;
    }
    setLoading(true);
    setError(undefined);
    const supabase = createClient();

    const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (authError) {
      setError(authError.message === "Invalid login credentials" ? "Email atau password salah." : authError.message);
      setLoading(false);
      return;
    }

    const { data: admin, error: adminError } = await supabase.rpc("is_admin");
    if (adminError || admin !== true) {
      await supabase.auth.signOut();
      setError(adminError ? adminError.message : "Akun ini bukan admin.");
      setLoading(false);
      return;
    }

    router.replace("/admin");
    router.refresh();
  }

  return (
    <form method="post" onSubmit={masuk} noValidate className="space-y-4">
      {error && (
        <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {error}
        </p>
      )}
      <Field id="email" label="Email">
        <Input
          id="email"
          type="email"
          autoComplete="username"
          className="h-11"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <Field id="password" label="Password">
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          className="h-11"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </Field>
      <Button type="submit" className="h-11 w-full rounded-full" disabled={loading || !hydrated}>
        {loading && <Loader2 className="animate-spin" aria-hidden />} Masuk
      </Button>
    </form>
  );
}

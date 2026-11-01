"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function CopyButton({
  text,
  label = "Salin",
  className,
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function salin() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Berhasil disalin");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Gagal menyalin. Salin manual ya.");
    }
  }

  return (
    <Button type="button" variant="outline" className={`h-11 px-3 ${className ?? ""}`} onClick={salin}>
      {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
      {copied ? "Tersalin" : label}
    </Button>
  );
}
